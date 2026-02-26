// src/pages/api/organizations/[id].ts //更新组织信息
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db/operations';
import { sessionManager } from '@/lib/auth/session';
import { api, withErrorHandler } from '@/lib/api';

interface ExtendedNextApiRequest extends NextApiRequest {
  query: Partial<{
    id: string;
  }>;
}

async function handler(req: ExtendedNextApiRequest, res: NextApiResponse) {
  // 检查会话
  const cookies = req.headers.cookie || '';
  const sessionCookie = cookies.split(';').find(c => c.trim().startsWith('session='));
  
  if (!sessionCookie) {
    console.log('❌ 未找到session token');
    return api.unauthorized(res, '请先登录');
  }

  const sessionToken = sessionCookie.split('=')[1];
  const sessionData = await sessionManager.verifySession(sessionToken);
  
  if (!sessionData) {
    console.log('❌ session验证失败');
    return api.unauthorized(res, '会话已过期');
  }

  const orgId = (req as ExtendedNextApiRequest).query.id;
  if (!orgId) {
    return api.badRequest(res, '无效的组织ID');
  }

  if (req.method === 'GET') {
    try {
      const organization = await db.findOne('organizations', { _id: orgId });
      
      if (!organization) {
        return api.notFound(res, '组织不存在');
      }

      // 只能查看自己的组织信息
      if (organization._id !== sessionData.orgId) {
        console.log('❌ 组织ID不匹配:', {
          orgId: organization._id,
          sessionOrgId: sessionData.orgId
        });
        return api.forbidden(res, '无权查看此组织信息');
      }

      return api.success(res, organization);
      
    } catch (error: any) {
      console.error('❌ 获取组织信息错误:', error);
      console.error('Error fetching organization:', error);
      return api.internalError(res, '获取组织信息失败');
    }
  }

  if (req.method === 'PUT') {
    try {
      const organization = await db.findOne('organizations', { _id: orgId });
      
      if (!organization) {
        return api.notFound(res, '组织不存在');
      }

      // 组织检查：只能更新自己的组织信息
      if (organization._id !== sessionData.orgId) {
        return api.forbidden(res, '无权更新此组织信息');
      }
      // 角色检查：只有管理员可以修改组织信息
      if (!sessionData.role.includes('admin')) {
        return api.forbidden(res, '只有管理员可以修改组织信息');
      }

      const updateData = req.body;
      
      // 不允许修改的字段
      delete updateData._id;
      delete updateData.type;
      delete updateData.subscription_plan;
      delete updateData.status;
      delete updateData.created_at;

      const updatedOrg = await db.update('organizations', orgId, {
        ...updateData,
        updated_at: new Date(),
      });

      return api.success(res, updatedOrg, '组织信息更新成功');
      
    } catch (error: any) {
      console.error('Error updating organization:', error);
      return api.internalError(res, '更新组织信息失败');
    }
  }

  return api.methodNotAllowed(res);
}

export default withErrorHandler(handler);