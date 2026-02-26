// src/pages/api/auth/logout.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sessionManager } from '@/lib/auth/session';
import { api, withErrorHandler } from '@/lib/api';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return api.methodNotAllowed(res, '只允许POST请求');
  }
  
  try {
    // 从cookie获取session token
    const cookies = req.headers.cookie || '';
    const sessionCookie = cookies
      .split(';')
      .find(c => c.trim().startsWith('session='));
    
    if (sessionCookie) {
      const sessionToken = sessionCookie.split('=')[1];
      await sessionManager.deleteSession(sessionToken);
    }
    
    // 清除cookie
    res.setHeader('Set-Cookie', [
      'session=; Max-Age=0; Path=/; HttpOnly',
      'session.sig=; Max-Age=0; Path=/; HttpOnly',
    ]);
    
    return api.success(res, null, '退出登录成功');
    
  } catch (error: any) {
    console.error('Logout error:', error);
    return api.internalError(res, '退出登录失败: ' + error.message);
  }
}

export default withErrorHandler(handler);