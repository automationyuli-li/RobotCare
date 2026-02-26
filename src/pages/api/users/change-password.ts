// src/pages/api/users/change-password.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db/operations';
import { sessionManager } from '@/lib/auth/session';
import { passwordManager } from '@/lib/auth/password';
import { api, withErrorHandler } from '@/lib/api';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return api.methodNotAllowed(res, '只允许POST请求');
  }

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

  try {
    const { currentPassword, newPassword } = req.body;

    // 验证输入
    if (!currentPassword || !newPassword) {
      return api.badRequest(res, '请填写完整信息');
    }

    // 验证新密码强度
    const passwordValidation = passwordManager.validateStrength(newPassword);
    if (!passwordValidation.valid) {
      return api.badRequest(res, passwordValidation.errors.join(', '));
    }

    // 获取用户信息
    const user = await db.findOne('users', { _id: sessionData.userId });
    
    if (!user) {
      return api.notFound(res, '用户不存在');
    }

    // 验证当前密码
    const isValid = await passwordManager.verify(currentPassword, user.password_hash);
    
    if (!isValid) {
      return api.badRequest(res, '当前密码错误');
    }
    // 确保新旧密码不同
    if (currentPassword === newPassword) {
      return api.badRequest(res, '新密码不能与当前密码相同');
    }

    // 哈希新密码
    const newPasswordHash = await passwordManager.hash(newPassword);

    // 更新密码
    await db.update('users', sessionData.userId, {
      password_hash: newPasswordHash,
      password_updated_at: new Date(),
      updated_at: new Date(),
    });

    return api.success(res, null, '密码修改成功');

  } catch (error) {
    return api.internalError(res, '密码修改失败');
  }
}

export default withErrorHandler(handler);