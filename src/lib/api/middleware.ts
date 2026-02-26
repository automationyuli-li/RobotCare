// src/lib/api/middleware.ts - 只负责中间件逻辑
import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { sessionManager } from '@/lib/auth/session';
import { permissionManager } from '@/lib/auth/permissions';

// 错误处理中间件
export function withErrorHandler(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error: any) {
      console.error('API Error:', error);
      
      // 根据错误类型处理
      let status = 500;
      let errorCode = 'INTERNAL_ERROR';
      let message = '服务器内部错误';
      
      if (error.name === 'ValidationError') {
        status = 400;
        errorCode = 'VALIDATION_ERROR';
        message = error.message;
      } else if (error.code === 'UNAUTHORIZED') {
        status = 401;
        errorCode = 'UNAUTHORIZED';
        message = error.message;
      } else if (error.code === 'FORBIDDEN') {
        status = 403;
        errorCode = 'FORBIDDEN';
        message = error.message;
      }
      
      res.status(status).json({
        success: false,
        error: errorCode,
        message,
      });
    }
  };
}

// 认证中间件
export function withAuth(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const sessionToken = req.cookies.session;
    
    if (!sessionToken) {
      throw { code: 'UNAUTHORIZED', message: '请先登录' };
    }
    
    const sessionData = await sessionManager.verifySession(sessionToken);
    
    if (!sessionData) {
      throw { code: 'UNAUTHORIZED', message: '会话已过期，请重新登录' };
    }
    
    // 添加用户信息到请求对象
    (req as any).user = {
      _id: sessionData.userId,
      email: sessionData.userEmail,
      role: sessionData.role,
      org_id: sessionData.orgId,
    };
    
    return handler(req, res);
  };
}

// 权限检查中间件
export function withPermission(resource: string, action: string) {
  return function (handler: NextApiHandler): NextApiHandler {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const user = (req as any).user;
      
      if (!user) {
        throw { code: 'UNAUTHORIZED', message: '请先登录' };
      }
      
      const hasPermission = permissionManager.hasPermission(
        user.role as any,
        resource,
        action
      );
      
      if (!hasPermission) {
        throw { 
          code: 'FORBIDDEN', 
          message: `需要 ${resource} 资源的 ${action} 权限` 
        };
      }
      
      return handler(req, res);
    };
  };
}

// 请求方法验证
export function allowMethods(methods: string[]) {
  return function (handler: NextApiHandler): NextApiHandler {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      if (!methods.includes(req.method || '')) {
        throw { 
          code: 'METHOD_NOT_ALLOWED', 
          message: `只允许 ${methods.join(', ')} 请求` 
        };
      }
      
      return handler(req, res);
    };
  };
}