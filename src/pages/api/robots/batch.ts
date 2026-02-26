// src/pages/api/robots/batch.ts
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

  if (req.method === 'POST') {
    try {
      const { robots } = req.body;
      
      if (!Array.isArray(robots) || robots.length === 0) {
        return api.badRequest(res, '机器人数据不能为空');
      }

      // 检查权限和验证数据
      const validatedRobots = [];
      const errors = [];
      
      for (const robotData of robots) {
        // 验证必填字段
        if (!robotData.sn || !robotData.brand || !robotData.model) {
          errors.push(`机器人 ${robotData.sn || '未知'} 缺少必要字段`);
          continue;
        }

        // 检查序列号是否已存在
        const existingRobot = await db.findOne('robots', { sn: robotData.sn });
        if (existingRobot) {
          errors.push(`序列号 ${robotData.sn} 已存在`);
          continue;
        }

        // 权限验证：确保用户有权为这些组织创建机器人
        const isServiceProvider = sessionData.role.includes('service');
        
        if (isServiceProvider) {
          // 服务商必须为客户创建机器人
          if (robotData.org_id !== sessionData.orgId) {
            errors.push(`无权为客户 ${robotData.org_id} 创建机器人`);
            continue;
          }
        } else {
          // 客户必须为自己创建机器人
          if (robotData.service_provider_id !== sessionData.orgId) {
            errors.push(`无权为服务商 ${robotData.service_provider_id} 创建机器人`);
            continue;
          }
        }

        validatedRobots.push({
          ...robotData,
          created_by: sessionData.userId,
          created_at: new Date(),
          updated_at: new Date(),
          status: robotData.status || 'active',
        });
      }

      if (validatedRobots.length === 0) {
        return api.badRequest(res, '没有有效的机器人数据可以导入: ' + errors.join(', '));
      }

      // 批量插入机器人
      const insertedRobots = [];
      for (const robot of validatedRobots) {
        const inserted = await db.insert('robots', robot);
        insertedRobots.push(inserted);
      }

      return api.created(res, {
        insertedCount: insertedRobots.length,
        robots: insertedRobots,
        errors: errors.length > 0 ? errors : undefined,
      }, `成功创建 ${insertedRobots.length} 台机器人${errors.length > 0 ? `，${errors.length} 条失败` : ''}`);
      
    } catch (error: any) {
      console.error('Error batch creating robots:', error);
      return api.internalError(res, '批量创建机器人失败: ' + error.message);
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { robotIds } = req.body;
      
      if (!Array.isArray(robotIds) || robotIds.length === 0) {
        return api.badRequest(res, '请选择要删除的机器人');
      }

      // 检查删除权限（只有客户可以删除自己的机器人）
      const robots = await db.find('robots', {
        _id: { $in: robotIds }
      });

      // 检查是否所有机器人都属于当前用户组织
      const unauthorizedRobots = robots.filter(robot => robot.org_id !== sessionData.orgId);
      if (unauthorizedRobots.length > 0) {
        return api.forbidden(res, '无权删除不属于您的机器人');
      }

      // 批量软删除
      const updatePromises = robotIds.map(robotId => 
        db.update('robots', robotId, {
          status: 'inactive',
          is_deleted: true,
          deleted_at: new Date(),
          updated_at: new Date(),
        })
      );

      await Promise.all(updatePromises);

      return api.success(res, null, `成功删除 ${robotIds.length} 台机器人`);
      
    } catch (error: any) {
      console.error('Error batch deleting robots:', error);
      return api.internalError(res, '批量删除机器人失败');
    }
  }

  return api.methodNotAllowed(res);
}

export default withErrorHandler(handler);