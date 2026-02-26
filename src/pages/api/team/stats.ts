// pages/api/team/stats.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db/operations';
import { api, withErrorHandler, withAuth } from '@/lib/api';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return api.methodNotAllowed(res, '只允许GET请求');
  }

  try {
    const user = (req as any).user;
    
    // 获取当前组织的所有工程师
    const engineers = await db.find('users', {
      org_id: user.org_id,
      role: { $in: ['service_engineer', 'end_engineer'] },
      status: 'active'
    });

    // 获取所有工单
    const tickets = await db.find('tickets', {
      org_id: user.org_id // 假设工单有org_id字段
    });

    // 计算每个工程师的工单统计
    const engineerStatsPromises = engineers.map(async (engineer: any) => {
      const engineerTickets = tickets.filter((ticket: any) => 
        ticket.assigned_to === engineer._id
      );
      
      const openTickets = engineerTickets.filter((t: any) => 
        t.status === 'open' || t.status === 'in_progress'
      );
      
      const resolvedTickets = engineerTickets.filter((t: any) => 
        t.status === 'resolved' || t.status === 'closed'
      );

      return {
        engineer_id: engineer._id,
        open_count: openTickets.length,
        resolved_count: resolvedTickets.length,
        total_count: engineerTickets.length,
        current_status: openTickets.length > 2 ? 'busy' : openTickets.length > 0 ? 'working' : 'idle'
      };
    });

    const engineerStats = await Promise.all(engineerStatsPromises);

    // 计算总体统计
    const total_engineers = engineers.length;
    const active_engineers = engineers.filter((e: any) => 
      e.last_login_at && new Date(e.last_login_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;
    
    const idle_engineers = engineerStats.filter(s => s.current_status === 'idle').length;
    const working_engineers = engineerStats.filter(s => s.current_status === 'working').length;
    const busy_engineers = engineerStats.filter(s => s.current_status === 'busy').length;
    
    const total_tickets = tickets.length;
    
    // 计算平均解决时间（简化版）
    const resolvedTickets = tickets.filter((t: any) => 
      t.status === 'resolved' && t.created_at && t.resolved_at
    );
    
    let avg_resolution_time = 0;
    if (resolvedTickets.length > 0) {
      const totalTime = resolvedTickets.reduce((acc: number, ticket: any) => {
        const created = new Date(ticket.created_at).getTime();
        const resolved = new Date(ticket.resolved_at).getTime();
        return acc + (resolved - created);
      }, 0);
      avg_resolution_time = totalTime / resolvedTickets.length / (1000 * 60 * 60 * 24); // 转换为天数
    }

    // 找到最佳表现者
    const topPerformer = engineerStats.reduce((best, current) => {
      return current.resolved_count > (best?.resolved_count || 0) ? current : best;
    }, null as any);

    return api.success(res, {
      total_engineers,
      active_engineers,
      idle_engineers,
      working_engineers,
      busy_engineers,
      total_tickets,
      avg_resolution_time,
      top_performer: topPerformer ? {
        engineer_id: topPerformer.engineer_id,
        engineer_name: engineers.find((e: any) => e._id === topPerformer.engineer_id)?.display_name,
        resolved_count: topPerformer.resolved_count
      } : undefined
    });

  } catch (error: any) {
    console.error('获取团队统计失败:', error);
    return api.internalError(res, '获取团队统计失败: ' + error.message);
  }
}

export default withErrorHandler(withAuth(handler));