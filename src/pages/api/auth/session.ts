// src/pages/api/auth/session.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sessionManager } from '@/lib/auth/session';
import { db } from '@/lib/db/operations';
import { api, withErrorHandler } from '@/lib/api';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return api.methodNotAllowed(res, '只允许GET请求');
  }
  
  try {
    // 从cookie获取session token
    const cookies = req.headers.cookie || '';
    console.log('Received cookies:', cookies); // 调试信息
    const sessionCookie = cookies
      .split(';')
      .find(c => c.trim().startsWith('session='));
    
    if (!sessionCookie) {
      console.log('No session cookie found');
      return api.unauthorized(res, '未登录');
    }
    
    const sessionToken = sessionCookie.split('=')[1].trim();
    console.log('Session token from cookie:', sessionToken); // 调试信息
    if (!sessionToken) {
      return api.unauthorized(res, '无效的会话令牌');
    }
    
    // 验证会话
    let sessionData;
    try {
       sessionData = await sessionManager.verifySession(sessionToken);
    } catch (error) {
      console.error('session verificaiton error:', error);
      return api.unauthorized(res, '会话验证失败');
    }

    if (!sessionData) {
      console.log('Session not found or expired:', sessionToken);
      res.setHeader('Set-Cookie', 'session=; Max-Age=0; Path=/');
      return api.unauthorized(res, '会话已过期或不存在');
    }
    console.log('Session found:', sessionData); // 调试信息

    // 检查会话是否过期
    if (new Date(sessionData.expiresAt) < new Date()) {
      // 删除过期会话
      await db.delete('sessions', sessionData._id);
      res.setHeader('Set-Cookie', 'session=; Max-Age=0; Path=/');
      return api.unauthorized(res, '会话已过期');
    }
    
    // 获取用户详细信息
    const user = await db.findOne('users', { _id: sessionData.userId });
    if (!user) {
      res.setHeader('Set-Cookie', 'session=; Max-Age=0; Path=/');
      return api.unauthorized(res, '用户不存在');
    }
    
    // 获取组织信息
    const organization = await db.findOne('organizations', { 
      _id: sessionData.orgId 
    });

    if (!organization) {
      return api.internalError(res, '组织信息获取失败');
    }
    
    // 移除密码等敏感信息
    const { password_hash, ...userWithoutPassword } = user;
    
    return api.success(res, {
      user: userWithoutPassword,
      organization,
      session: {
        sessionId: sessionData.sessionId,
        expiresAt: sessionData.expiresAt,
      },
    }, '会话有效');
    
  } catch (error: any) {
    console.error('Session check error:', error);
    return api.internalError(res, '会话检查失败: ' + error.message);
  }
}

export default withErrorHandler(handler);