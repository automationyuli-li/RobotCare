console.log('🔥🔥🔥 LOGIN API CALLED 🔥🔥🔥');
console.log('环境变量检查:', {
  asEnvId: !!process.env.TEST_ONLY,
  hasEnvId: !!process.env.CLOUDBASE_ENV_ID,
  hasSecretId: !!process.env.CLOUDBASE_SECRET_ID,
  hasSecretKey: !!process.env.CLOUDBASE_SECRET_KEY,
});

// src/pages/api/auth/login.ts - 用户登录
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db/operations';
import { passwordManager } from '@/lib/auth/password';
import { sessionManager } from '@/lib/auth/session';
import { api, withErrorHandler } from '@/lib/api';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return api.methodNotAllowed(res, '只允许POST请求');
  }
  
  const { email, password } = req.body;
  
  if (!email || !password) {
    return api.badRequest(res, '邮箱和密码不能为空');
  }
  
  try {
    // 查找用户
    const user = await db.findOne('users', { email });
    
    if (!user) {
      return api.unauthorized(res, '邮箱或密码错误');
    }
    
    // 检查用户状态
    if (user.status !== 'active') {
      const statusMessages = {
        'inactive': '账户已禁用',
        'pending': '账户待激活',
        'suspended': '账户已暂停',
      } as const;
      const status = user.status as keyof typeof statusMessages;
      const message = statusMessages[status] || '账户不可用';
      return api.forbidden(res, message);
    }
    
    // 验证密码
    const isValidPassword = await passwordManager.verify(password, user.password_hash);
    
    if (!isValidPassword) {
      return api.unauthorized(res, '邮箱或密码错误');
    }
    
    // 获取组织信息
    const organization = await db.findOne('organizations', { 
      _id: user.org_id,
      status: 'active'
    });
    
    if (!organization) {
      return api.internalError(res, '关联组织不存在或已禁用');
    }
    
    // 更新最后登录时间
    await db.update('users', user._id, {
      last_login_at: new Date(),
      login_count: (user.login_count || 0) + 1,
    });
    
    // 创建会话
    const sessionToken = await sessionManager.createSession(user);
    console.log('Login API - Created session token:', sessionToken); // 调试信息
    
    // 修复：正确设置cookie，防止编码问题
    const cookieOptions = [
      `session=${sessionToken}`,
      'Path=/',
      `Max-Age=${24 * 60 * 60}`,
      'SameSite=Lax'
    ];
    
    if (process.env.NODE_ENV === 'production') {
      cookieOptions.push('Secure');
    }
    
    res.setHeader('Set-Cookie', cookieOptions.join('; '));
    
    // 返回用户信息（移除敏感信息）
    const { password_hash, ...userWithoutPassword } = user;
    
    return api.success(res, {
      user: userWithoutPassword,
      organization,
    }, '登录成功');
    
  } catch (error: any) {
    console.error('登录过程错误:', error);
    return api.internalError(res, '登录失败: ' + error.message);
  }
}

export default withErrorHandler(handler);