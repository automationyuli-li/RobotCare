// src/pages/api/dashboard/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db/operations';
import { api, withErrorHandler, withAuth } from '@/lib/api';

// 定义类型
interface PriorityOrder {
  urgent: number;
  high: number;
  medium: number;
  low: number;
}

interface TicketData {
  priority: keyof PriorityOrder;
  created_at?: Date;
  resolved_at?: Date;
  customer?: any;
  robot?: any;
  metadata?: any;
  due_date?: Date;
}

interface RobotData {
  _id: string;
  sn: string;
  model: string;
  location?: string;
  status: 'active' | 'maintenance' | 'fault';
  fault_since?: Date;
  last_error?: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return api.methodNotAllowed(res, '只允许GET请求');
  }

  try {
    const user = (req as any).user;
    
    // 根据用户角色返回不同的Dashboard数据
    switch (user.role) {
      case 'service_admin':
        return await getServiceProviderAdminData(user, res);
      case 'service_engineer':
        return await getServiceProviderEngineerData(user, res);
      case 'end_admin':
        return await getEndCustomerAdminData(user, res);
      case 'end_engineer':
        return await getEndCustomerEngineerData(user, res);
      default:
        return api.forbidden(res, '未授权的用户角色');
    }
    
  } catch (error: any) {
    console.error('获取Dashboard数据失败:', error);
    return api.internalError(res, '获取Dashboard数据失败: ' + error.message);
  }
}

// 服务商管理员Dashboard数据
async function getServiceProviderAdminData(user: any, res: NextApiResponse) {
  const serviceProviderId = user.org_id;
  
  // 1. 获取客户数量
  const contracts = await db.find('service_contracts', {
    service_provider_id: serviceProviderId,
    status: 'active',
  });
  const customerCount = contracts.length;
  
  // 2. 获取机器人数量（所有客户）
  const robotCount = await db.count('robots', {
    service_provider_id: serviceProviderId,
    status: { $ne: 'inactive' },
  });
  
  // 3. 获取工单统计
  const tickets = await db.find('tickets', {
    service_provider_id: serviceProviderId,
  });
  const ticketCount = tickets.length;
  const urgentTickets = tickets.filter((t: any) => 
    t.status === 'open' && t.priority === 'urgent'
  ).slice(0, 5);
  
  // 4. 获取工程师数量
  const engineerCount = await db.count('users', {
    org_id: serviceProviderId,
    role: 'service_engineer',
    status: 'active',
  });
  
  return api.success(res, {
    role: 'service_admin',
    organization_name: user.organization?.name || user.org_id,
    stats: {
      customers: customerCount,
      robots: robotCount,
      tickets: ticketCount,
      engineers: engineerCount,
    },
    urgent_tickets: urgentTickets.map((ticket: any) => ({
      _id: ticket._id,
      ticket_number: ticket.ticket_number,
      title: ticket.title,
      priority: ticket.priority,
      status: ticket.status,
      assigned_to: ticket.assigned_to,
      customer_name: ticket.customer?.name,
      robot_info: ticket.robot ? `${ticket.robot.brand} ${ticket.robot.model}` : '',
    })),
  });
}

// 服务商工程师Dashboard数据
async function getServiceProviderEngineerData(user: any, res: NextApiResponse) {
  const engineerId = user._id;
  
  // 1. 获取该工程师的工单统计
  const allTickets = await db.find('tickets', {
    assigned_to: engineerId,
  });
  
  const completedTickets = allTickets.filter((t: any) => 
    t.status === 'resolved' || t.status === 'closed'
  );
  const pendingTickets = allTickets.filter((t: any) => 
    t.status === 'open' || t.status === 'in_progress'
  ).sort((a: TicketData, b: TicketData) => {
    // 按优先级排序：urgent > high > medium > low
    const priorityOrder: PriorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    // 使用类型断言确保安全性
    const priorityA = a.priority as keyof PriorityOrder;
    const priorityB = a.priority as keyof PriorityOrder;
    // 给默认值
    const orderA = priorityOrder[priorityA] ?? 3;
    const orderB = priorityOrder[priorityA] ?? 3;

    return orderA - orderB;
  });
  
  // 2. 计算平均解决时间
  let avgResolutionTime = 0;
  if (completedTickets.length > 0) {
    const totalTime = completedTickets.reduce((acc: number, ticket: any) => {
      if (ticket.created_at && ticket.resolved_at) {
        const created = new Date(ticket.created_at).getTime();
        const resolved = new Date(ticket.resolved_at).getTime();
        return acc + (resolved - created);
      }
      return acc;
    }, 0);
    avgResolutionTime = totalTime / completedTickets.length / (1000 * 60 * 60 * 24); // 转换为天数
  }
  
  // 3. 客户满意度（暂时用占位数据）
  const satisfactionScore = 4.8;
  
  return api.success(res, {
    role: 'service_engineer',
    display_name: user.display_name,
    stats: {
      completed_tickets: completedTickets.length,
      avg_resolution_time: avgResolutionTime.toFixed(1),
      customer_satisfaction: satisfactionScore.toFixed(1),
    },
    pending_tasks: pendingTickets.slice(0, 5).map((ticket: any) => ({
      _id: ticket._id,
      ticket_number: ticket.ticket_number,
      title: ticket.title,
      priority: ticket.priority,
      status: ticket.status,
      customer_name: ticket.customer?.name,
      robot_info: ticket.robot ? `${ticket.robot.brand} ${ticket.robot.model}` : '',
      due_date: ticket.due_date,
      metadata: ticket.metadata || {},
    })),
  });
}

// 终端客户管理员Dashboard数据
async function getEndCustomerAdminData(user: any, res: NextApiResponse) {
  const customerId = user.org_id;
  
  // 1. 获取机器人位置分布统计
  const robots = await db.find('robots', {
    org_id: customerId,
    status: { $ne: 'inactive' },
  }) as RobotData[];
  
  // 按位置分组统计状态
  const locationStats: Record<string, { active: number, maintenance: number, fault: number }> = {};
  let totalStats = { active: 0, maintenance: 0, fault: 0 };
  
  robots.forEach((robot: RobotData) => {
    const location = robot.location || '未知位置';
    if (!locationStats[location]) {
      locationStats[location] = { active: 0, maintenance: 0, fault: 0 };
    }
    
    if (robot.status === 'active') {
      locationStats[location].active++;
      totalStats.active++;
    } else if (robot.status === 'maintenance') {
      locationStats[location].maintenance++;
      totalStats.maintenance++;
    } else if (robot.status === 'fault') {
      locationStats[location].fault++;
      totalStats.fault++;
    }
  });
  
  // 2. 获取异常机器人
  const faultRobots = robots.filter((r: any) => r.status === 'fault').slice(0, 5);
  
  // 获取关联的工单信息
  const enrichedFaultRobots = await Promise.all(
    faultRobots.map(async (robot: any) => {
      const ticket = await db.findOne('tickets', {
        robot_id: robot._id,
        status: { $in: ['open', 'in_progress'] },
      });
      
      return {
        ...robot,
        active_ticket: ticket ? {
          _id: ticket._id,
          status: ticket.status,
          assigned_to: ticket.assigned_to,
        } : null,
      };
    })
  );
  
  return api.success(res, {
    role: 'end_admin',
    organization_name: user.organization?.name || user.org_id,
    robot_stats: {
      by_location: Object.entries(locationStats).map(([location, stats]) => ({
        location,
        ...stats,
        total: stats.active + stats.maintenance + stats.fault,
      })),
      total: totalStats,
      total_robots: robots.length,
    },
    fault_robots: enrichedFaultRobots.map((robot: any) => ({
      _id: robot._id,
      sn: robot.sn,
      model: robot.model,
      location: robot.location,
      status: robot.status,
      fault_duration: robot.fault_since 
        ? Math.floor((Date.now() - new Date(robot.fault_since).getTime()) / (1000 * 60 * 60)) + '小时'
        : '未知',
      active_ticket: robot.active_ticket,
    })),
  });
}

// 终端客户工程师Dashboard数据
async function getEndCustomerEngineerData(user: any, res: NextApiResponse) {
  const customerId = user.org_id;
  const engineerId = user._id;
  
  // 1. 获取机器人位置分布统计（与管理员相同）
  const robots = await db.find('robots', {
    org_id: customerId,
    status: { $ne: 'inactive' },
  });
  
  const locationStats: Record<string, { active: number, maintenance: number, fault: number }> = {};
  let totalStats = { active: 0, maintenance: 0, fault: 0 };
  
  robots.forEach((robot: any) => {
    const location = robot.location || '未知位置';
    if (!locationStats[location]) {
      locationStats[location] = { active: 0, maintenance: 0, fault: 0 };
    }
    
    if (robot.status === 'active') {
      locationStats[location].active++;
      totalStats.active++;
    } else if (robot.status === 'maintenance') {
      locationStats[location].maintenance++;
      totalStats.maintenance++;
    } else if (robot.status === 'fault') {
      locationStats[location].fault++;
      totalStats.fault++;
    }
  });
  
  // 2. 获取该工程师提交的工单统计
  const submittedTickets = await db.find('tickets', {
    created_by: engineerId,
  });
  
  const resolvedTickets = submittedTickets.filter((t: any) => 
    t.status === 'resolved' || t.status === 'closed'
  );
  const inProgressTickets = submittedTickets.filter((t: any) => 
    t.status === 'in_progress'
  );
  const unassignedTickets = submittedTickets.filter((t: any) => 
    t.status === 'open' && !t.assigned_to
  );
  
  // 3. 获取异常机器人详情
  const faultRobots = robots.filter((r: any) => r.status === 'fault');
  
  return api.success(res, {
    role: 'end_engineer',
    display_name: user.display_name,
    robot_stats: {
      by_location: Object.entries(locationStats).map(([location, stats]) => ({
        location,
        ...stats,
        total: stats.active + stats.maintenance + stats.fault,
      })),
      total: totalStats,
      total_robots: robots.length,
    },
    ticket_stats: {
      submitted: submittedTickets.length,
      resolved: resolvedTickets.length,
      in_progress: inProgressTickets.length,
      unassigned: unassignedTickets.length,
    },
    fault_robots: faultRobots.slice(0, 5).map((robot: any) => ({
      _id: robot._id,
      sn: robot.sn,
      model: robot.model,
      location: robot.location,
      issue: robot.last_error || '未知异常',
    })),
  });
}

export default withErrorHandler(withAuth(handler));