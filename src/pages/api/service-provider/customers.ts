// src/pages/api/service-provider/customers.ts //服务商获取客户列表
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db/operations';
import { sessionManager } from '@/lib/auth/session';
import { api, withErrorHandler } from '@/lib/api';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 检查会话
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

  // 只允许服务商管理员访问
  if (!sessionData.role.includes('service')) {
    return api.forbidden(res, '无权访问');
  }

  if (req.method === 'GET') {
    try {
      const serviceProviderId = sessionData.orgId;
      
      // 获取所有活跃的合约
      const contracts = await db.find('service_contracts', {
        service_provider_id: serviceProviderId,
        status: { $in: ['active', 'pending'] },
      });

      // 获取客户组织信息
      const customerIds = contracts.map(c => c.end_customer_id);
      let customers: any[] = [];

      if (customerIds.length > 0) {
        customers = await db.find('organizations', {
          _id: { $in: customerIds },
          type: 'end_customer',
        });
      }

      // 合并合约信息
      const customersWithContracts = await Promise.all(
        customers.map(async (customer) => {
          const contract = contracts.find(c => c.end_customer_id === customer._id);
          
          // 获取客户的机器人数量
          const robotCount = await db.count('robots', {
            org_id: customer._id,
            service_provider_id: serviceProviderId,
            $or: [
              { status: 'active' },
              { status: 'maintenance' },
              { status: 'fault' }
            ]
          });

          return {
            ...customer,
            contract_id: contract?._id,
            contract_end_date: contract?.end_date,
            contract_status: contract?.status,
            robot_count: robotCount,
          };
        })
      );

      return api.success(res, customersWithContracts);
      
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      return api.internalError(res, '获取客户列表失败');
    }
  }

  return api.methodNotAllowed(res);
}

export default withErrorHandler(handler);