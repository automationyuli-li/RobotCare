// src/middleware.ts - 修正版本
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 公开路径（不需要认证）
const publicPaths = [
  '/',
  '/register',
  '/register/service-provider',
  '/register/invite',
  '/register/engineer',
  '/api/auth/login',
  '/api/auth/register',
  '/api/invitations/validate',
  '/api/health',
];

const sessionCache = new Map<string, { valid: boolean; expires: number }>();

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // 1. 处理预检请求（CORS）
  if (request.method === 'OPTIONS') {
    const response = NextResponse.next();
    addCorsHeaders(response);
    addSecurityHeaders(response, request);
    return response;
  }
  
  // 2. 检查是否公开路径
  const isPublicPath = publicPaths.some(path => 
    pathname === path || pathname.startsWith(`${path}/`)
  );
  
  if (isPublicPath) {
    const response = NextResponse.next();
    addSecurityHeaders(response, request);
    return response;
  }
  
   // 3. API 路径特殊处理
  const isApiPath = pathname.startsWith('/api/');

  // 4. 私有路径：检查会话
  const sessionCookie = request.cookies.get('session');
  
  if (!sessionCookie?.value) {
    console.log(`Middleware: No session cookie for path ${pathname}`);
    
    if (isApiPath) {
      // API 路径返回 401
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, statusText: 'Unauthorized' }
      );
    } else {
      // 页面路径重定向到登录页
      const loginUrl = new URL('/', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  // 5. 简化验证：对于页面路由，只检查cookie存在
  //    对于API路由，需要更严格的验证，但这在API handler中已经做了
  if (isApiPath && pathname !== '/api/auth/session') {
    // API 路由让各自的 handler 去验证 session
    // 中间件只做基础检查
  }
  const response = NextResponse.next();
  addSecurityHeaders(response, request);
  return response;
}

// 添加CORS头
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', 
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  response.headers.set('Access-Control-Allow-Methods', 
    'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 
    'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
}

// 添加安全头（修复参数错误）
function addSecurityHeaders(response: NextResponse, request: NextRequest) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // 缓存控制
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (request.method === 'GET') {
      response.headers.set('Cache-Control', 'private, max-age=60');
    } else {
      response.headers.set('Cache-Control', 'no-store, max-age=0');
    }
  }
}

// 配置匹配规则
export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico (favicon)
     * - public文件夹
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};