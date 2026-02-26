// src/pages/api/users/profile.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db/operations';
import { sessionManager } from '@/lib/auth/session';
import { api, withErrorHandler } from '@/lib/api';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 验证会话
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

  // GET - 获取个人资料
  if (req.method === 'GET') {
    try {
      const user = await db.findOne('users', { _id: sessionData.userId });
      
      if (!user) {
        return api.notFound(res, '用户不存在');
      }

      // 移除敏感信息
      const { password_hash, ...userWithoutPassword } = user;
      
      return api.success(res, userWithoutPassword);
      
    } catch (error) {
      return api.internalError(res, '获取个人资料失败');
    }
  }

  // PUT - 更新个人资料
  if (req.method === 'PUT') {
    try {
      const { display_name, real_name, phone, metadata } = req.body;

      // 验证必填字段
      if (!display_name?.trim()) {
        return api.badRequest(res, '昵称不能为空');
      }

      const updateData = {
        display_name,
        real_name: real_name || undefined,
        phone: phone || undefined,
        metadata: {
          ...metadata,
          updated_at: new Date(),
        },
        updated_at: new Date(),
      };

      const updatedUser = await db.update('users', sessionData.userId, updateData);
      
      // 移除敏感信息
      const { password_hash, ...userWithoutPassword } = updatedUser;

      return api.success(res, userWithoutPassword, '个人资料更新成功');
      
    } catch (error) {
      return api.internalError(res, '更新个人资料失败');
    }
  }

  return api.methodNotAllowed(res);
}

export default withErrorHandler(handler);