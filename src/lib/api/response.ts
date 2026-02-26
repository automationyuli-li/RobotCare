// src/lib/api/response.ts - 只负责响应格式化
import type { NextApiResponse } from 'next';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: Record<string, any>;
}

export class ApiResponseHandler {
  // 成功响应
  static success<T>(
    res: NextApiResponse,
    data?: T,
    message?: string,
    meta?: ApiResponse['meta']
  ): void {
    res.status(200).json({
      success: true,
      data,
      message,
      meta,
    });
  }

  // 创建成功
  static created<T>(res: NextApiResponse, data?: T, message?: string): void {
    res.status(201).json({
      success: true,
      data,
      message: message || '创建成功',
    });
  }

  // 错误响应
  static error(
    res: NextApiResponse,
    status: number,
    error: string,
    message?: string
  ): void {
    res.status(status).json({
      success: false,
      error,
      message,
    });
  }

  // 快捷方法
  static badRequest(res: NextApiResponse, message?: string): void {
    this.error(res, 400, 'BAD_REQUEST', message || '请求参数错误');
  }

  static unauthorized(res: NextApiResponse, message?: string): void {
    this.error(res, 401, 'UNAUTHORIZED', message || '未授权访问');
  }

  static forbidden(res: NextApiResponse, message?: string): void {
    this.error(res, 403, 'FORBIDDEN', message || '权限不足');
  }

  static notFound(res: NextApiResponse, message?: string): void {
    this.error(res, 404, 'NOT_FOUND', message || '资源不存在');
  }

  static methodNotAllowed(res: NextApiResponse, message?: string): void {
    this.error(res, 405, 'METHOD_NOT_ALLOWED', message || '请求方法不允许');
  }

  static internalError(res: NextApiResponse, message?: string): void {
    this.error(res, 500, 'INTERNAL_ERROR', message || '服务器内部错误');
  }
}

// 导出别名
export const api = ApiResponseHandler;