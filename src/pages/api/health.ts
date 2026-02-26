// src/pages/api/health.ts - 健康检查
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectionPool } from '@/lib/db/connection-pool';
import { api, withErrorHandler } from '@/lib/api';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return api.methodNotAllowed(res, '只允许GET请求');
  }
  
  try {
    // 数据库健康检查
    const dbHealth = await connectionPool.healthCheck();
    
    // 服务状态
    const status = {
      timestamp: new Date().toISOString(),
      service: 'RobotCare API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: dbHealth,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
    
    // 确定整体状态
    const overallHealthy = dbHealth.healthy;
    
    return res.status(overallHealthy ? 200 : 503).json({
      ...status,
      status: overallHealthy ? 'healthy' : 'unhealthy',
    });
    
  } catch (error: any) {
    console.error('健康检查错误:', error);
    
    return res.status(503).json({
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      service: 'RobotCare API',
      error: error.message,
    });
  }
}

export default withErrorHandler(handler);