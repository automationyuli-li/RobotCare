// pages/api/team/engineers.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db/operations';
import { api, withErrorHandler, withAuth } from '@/lib/api';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return api.methodNotAllowed(res, '只允许GET请求');
  }

  try {
    const user = (req as any).user;
    const { 
      for_ticket, 
      ticket_id, 
      include_stats = 'true' 
    } = req.query;
    
    console.log('获取工程师列表参数:', { 
      userRole: user.role, 
      userOrg: user.org_id, 
      for_ticket, 
      ticket_id,
      include_stats 
    });

    // 获取当前组织的所有工程师
    // 根据用户角色过滤
    let roleFilter: string[] = [];
    
    if (user.role.includes('service_admin') || user.role.includes('service_engineer')) {
      // 服务商：只能看到自己组织的工程师
      roleFilter = ['service_engineer'];
    } else if (user.role.includes('end_admin') || user.role.includes('end_engineer')) {
      // 终端客户：只能看到自己组织的工程师
      roleFilter = ['end_engineer'];
    } else {
      // 默认两种情况都返回
      roleFilter = ['service_engineer', 'end_engineer'];
    }

    const engineers = await db.find('users', {
      org_id: user.org_id,
      role: { $in: roleFilter },
      status: { $ne: 'pending' } // 排除待审核用户
    }, {
      orderBy: { field: 'created_at', direction: 'desc' }
    });

    console.log('查询到的工程师数量:', engineers.length);

    // 获取所有工单（用于统计）
    let tickets: any[] = [];
    
    if (include_stats === 'true') {
      // 构建工单查询条件
      let ticketQuery: any = {};
      
      // 根据用户角色过滤工单
      if (user.role.includes('service')) {
        // 服务商：获取所有服务客户的工单
        const contracts = await db.find('service_contracts', {
          service_provider_id: user.org_id,
          status: 'active'
        });
        
        const customerIds = contracts.map(c => c.end_customer_id);
        if (customerIds.length > 0) {
          ticketQuery.customer_id = { $in: customerIds };
        } else {
          tickets = []; // 没有服务客户，工单为空
        }
      } else {
        // 终端客户：只获取自己组织的工单
        ticketQuery.customer_id = user.org_id;
      }
      
      if (Object.keys(ticketQuery).length > 0) {
        tickets = await db.find('tickets', ticketQuery);
      }
    }

    // 如果是为工单分配，检查工单是否已分配
    let excludeEngineers: string[] = [];
    if (for_ticket === 'true' && ticket_id) {
      const ticket = await db.findOne('tickets', { _id: ticket_id as string });
      if (ticket && ticket.assigned_to) {
        excludeEngineers.push(ticket.assigned_to);
        console.log('工单已分配给:', ticket.assigned_to);
      }
    }

    // 处理工程师数据
    const engineersWithData = await Promise.all(engineers.map(async (engineer: any) => {
      // 如果指定了排除，则跳过已分配的工程师（除非是为重新分配）
      if (for_ticket !== 'true' && excludeEngineers.includes(engineer._id)) {
        return null;
      }

      const baseData = {
        _id: engineer._id,
        display_name: engineer.display_name || engineer.email?.split('@')[0] || '未命名用户',
        email: engineer.email,
        role: engineer.role,
        status: engineer.status,
        created_at: engineer.created_at,
        last_login_at: engineer.last_login_at
      };

      // 如果需要统计信息
      if (include_stats === 'true' && tickets.length > 0) {
        // 获取该工程师的所有工单
        const engineerTickets = tickets.filter((ticket: any) => 
          ticket.assigned_to === engineer._id
        );
        
        // 计算工单统计
        const ticketStats = {
          total: engineerTickets.length,
          open: engineerTickets.filter((t: any) => t.status === 'open').length,
          in_progress: engineerTickets.filter((t: any) => t.status === 'in_progress').length,
          resolved: engineerTickets.filter((t: any) => t.status === 'resolved').length,
          closed: engineerTickets.filter((t: any) => t.status === 'closed').length
        };
        
        // 判断当前状态
        let current_status: 'idle' | 'working' | 'busy' = 'idle';
        const activeCount = ticketStats.open + ticketStats.in_progress;
        if (activeCount > 3) {
          current_status = 'busy';
        } else if (activeCount > 0) {
          current_status = 'working';
        }
        
        // 获取当前活跃工单
        const active_tickets = engineerTickets
          .filter((t: any) => t.status === 'open' || t.status === 'in_progress')
          .slice(0, 3) // 只取最近3个
          .map((t: any) => ({
            _id: t._id,
            ticket_number: t.ticket_number || t._id,
            title: t.title,
            status: t.status,
            priority: t.priority
          }));

        return {
          ...baseData,
          ticket_stats: ticketStats,
          current_status,
          active_tickets,
          // 为工单分配页面添加额外信息
          is_assigned_to_current_ticket: for_ticket === 'true' && 
            ticket_id && 
            engineer._id === excludeEngineers[0]
        };
      } else {
        // 不需要统计信息时，返回基本数据
        return {
          ...baseData,
          ticket_stats: null,
          current_status: 'idle',
          active_tickets: [],
          is_assigned_to_current_ticket: false
        };
      }
    }));

    // 过滤掉null值
    const filteredEngineers = engineersWithData.filter(engineer => engineer !== null);

    console.log('返回工程师数量:', filteredEngineers.length);

    return api.success(res, filteredEngineers);

  } catch (error: any) {
    console.error('获取工程师列表失败:', error);
    return api.internalError(res, '获取工程师列表失败: ' + error.message);
  }
}

export default withErrorHandler(withAuth(handler));