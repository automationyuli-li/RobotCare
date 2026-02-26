// src/pages/api/timeline/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db/operations';
import { sessionManager } from '@/lib/auth/session';
import { api, withErrorHandler } from '@/lib/api';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 检查会话
  const cookies = req.headers.cookie || '';
  const sessionCookie = cookies.split(';').find(c => c.trim().startsWith('session='));
  
  if (!sessionCookie) {
    return api.unauthorized(res, '请先登录');
  }

  const sessionToken = sessionCookie.split('=')[1];
  const sessionData = await sessionManager.verifySession(sessionToken);
  
  if (!sessionData) {
    return api.unauthorized(res, '会话已过期');
  }

  if (req.method === 'GET') {
    try {
      const { robot_id } = req.query;
      
      if (!robot_id) {
        return api.badRequest(res, '机器人ID不能为空');
      }

      // 首先检查是否有权限访问此机器人的时间线
      const robot = await db.findOne('robots', { _id: robot_id as string });
      
      if (!robot) {
        return api.notFound(res, '机器人不存在');
      }

      // 权限检查
      const hasAccess = 
        robot.org_id === sessionData.orgId || 
        robot.service_provider_id === sessionData.orgId;
      
      if (!hasAccess) {
        // 检查合约权限
        const contract = await db.findOne('service_contracts', {
          $or: [
            { service_provider_id: sessionData.orgId, end_customer_id: robot.org_id, status: 'active' },
            { service_provider_id: robot.service_provider_id, end_customer_id: sessionData.orgId, status: 'active' }
          ]
        });
        
        if (!contract) {
          return api.forbidden(res, '无权访问此机器人的时间线');
        }
      }

      

      // 获取时间线事件
      const events = await db.find('timeline_events', { 
        robot_id: robot_id as string 
      }, {
        orderBy: { field: 'created_at', direction: 'desc' } // 按创建时间升序排列 desc是降序
      });

      // 获取事件创建者信息
      const eventsWithCreators = await Promise.all(
        events.map(async (event) => {
          const creator = await db.findOne('users', { _id: event.created_by });
          return {
            ...event,
            created_by: {
              name: creator?.display_name || '未知用户',
              role: creator?.role || 'user',
            }
          };
        })
      );

      return api.success(res, eventsWithCreators);
      
    } catch (error: any) {
      console.error('Error fetching timeline:', error);
      return api.internalError(res, '获取时间线失败');
    }
  } else 
  if (req.method === 'DELETE') {
    try {
      const { event_id } = req.body;
      
      if (!event_id) {
        return api.badRequest(res, '事件ID不能为空');
      }

      // 获取事件信息
      const event = await db.findOne('timeline_events', { _id: event_id });
      if (!event) {
        return api.notFound(res, '事件不存在');
      }

      // 权限检查：只能删除自己创建的事件
      if (event.created_by !== sessionData.userId) {
        return api.forbidden(res, '只能删除自己创建的事件');
      }

      // 删除事件
      await db.delete('timeline_events', event_id);

      // 如果是工单事件，同时删除对应的工单
      if (event.event_type === 'ticket_created' && event.reference_id) {
        await db.delete('tickets', event.reference_id);
      }
      // 如果是维修记录事件，同时删除对应的维修记录
      if (event.event_type === 'maintenance' && event.reference_id) {
        await db.delete('maintenance_log', event.reference_id);
      }
      // 如果是评论事件，同时删除对应的评论
      if (event.event_type === 'comment_added' && event.reference_id) {
        await db.delete('comments', event.reference_id);
      }

      return api.success(res, null, '事件删除成功');
      
    } catch (error: any) {
      console.error('Error deleting timeline event:', error);
      return api.internalError(res, '删除事件失败');
    }
  }

  if (req.method === 'POST') {
    try {
      const eventData = req.body;
      
      // 验证必填字段
      if (!eventData.robot_id || !eventData.type || !eventData.title) {
        return api.badRequest(res, '缺少必要字段');
      }

      // 检查机器人是否存在
      const robot = await db.findOne('robots', { _id: eventData.robot_id });
      if (!robot) {
        return api.notFound(res, '机器人不存在');
      }

      // 权限检查：可以添加事件的权限
      const canAddEvent = 
        robot.org_id === sessionData.orgId || 
        robot.service_provider_id === sessionData.orgId;
      
      if (!canAddEvent) {
        return api.forbidden(res, '无权为此机器人添加事件');
      }

      // 创建时间线事件
      const event = await db.insert('timeline_events', {
        ...eventData,
        created_by: sessionData.userId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      return api.created(res, event, '事件添加成功');
      
    } catch (error: any) {
      console.error('Error creating timeline event:', error);
      return api.internalError(res, '添加事件失败');
    }
  }

  return api.methodNotAllowed(res);
}

export default withErrorHandler(handler);