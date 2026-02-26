// src/pages/api/robots/index.ts
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
      // 根据用户角色获取机器人列表
      const isServiceProvider = sessionData.role.includes('service');
      
      let query: any = {};
      
      if (isServiceProvider) {
        // 服务商：获取其服务的所有机器人和自己的机器人的机器人和
        query.service_provider_id = sessionData.orgId;
      } else {
        // 终端客户：获取自己拥有的机器人和
        query.org_id = sessionData.orgId;
      }
      
      const robots = await db.find('robots', query);
      
      // 获取关联的组织名称
      const robotsWithNames = await Promise.all(
        robots.map(async (robot) => {
          const [org, provider] = await Promise.all([
            db.findOne('organizations', { _id: robot.org_id }),
            db.findOne('organizations', { _id: robot.service_provider_id })
          ]);
          
          return {
            ...robot,
            org_name: org?.name,
            provider_name: provider?.name,
          };
        })
      );
      
      return api.success(res, robotsWithNames);
      
    } catch (error: any) {
      console.error('Error fetching robots:', error);
      return api.internalError(res, '获取机器人列表失败');
    }
  }

  if (req.method === 'POST') {
    try {
      const robotData = req.body;
      
      // 验证必填字段
      if (!robotData.sn || !robotData.brand || !robotData.model) {
        return api.badRequest(res, '缺少必要字段');
      }
      
      // 检查序列号是否已存在
      const existingRobot = await db.findOne('robots', { sn: robotData.sn });
      if (existingRobot) {
        return api.badRequest(res, '序列号已存在');
      }
      
      // 创建机器人
      const robot = await db.insert('robots', {
        ...robotData,
        created_by: sessionData.userId,
        created_at: new Date(),
        updated_at: new Date(),
        status: robotData.status || 'active',
      });
      
      return api.created(res, robot, '机器人创建成功');
      
    } catch (error: any) {
      console.error('Error creating robot:', error);
      return api.internalError(res, '创建机器人失败');
    }
  }

  return api.methodNotAllowed(res);
}

export default withErrorHandler(handler);