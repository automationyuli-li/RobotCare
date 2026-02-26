// src/pages/api/end-customer/providers.ts //客户获取服务商列表
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

  // 只允许终端客户访问
  if (!sessionData.role.includes('end')) {
    return api.forbidden(res, '无权访问');
  }

  if (req.method === 'GET') {
    try {
      const customerId = sessionData.orgId;
      
      // 获取所有活跃的合约
      const contracts = await db.find('service_contracts', {
        end_customer_id: customerId,
        status: 'active',
      });

      // 获取服务商组织信息
      const providerIds = contracts.map(c => c.service_provider_id);
      let providers: any[] = [];

      if (providerIds.length > 0) {
        providers = await db.find('organizations', {
          _id: { $in: providerIds },
          type: 'service_provider',
        });
      }

      // 合并合约信息
      const providersWithContracts = await Promise.all(
        providers.map(async (provider) => {
          const contract = contracts.find(c => c.service_provider_id === provider._id);
          
          // 获取服务商管理的机器人数量
          const robotCount = await db.count('robots', {
            org_id: customerId,
            service_provider_id: provider._id,
            status: { $ne: 'inactive' },
          });

          return {
            ...provider,
            contract_id: contract?._id,
            contract_end_date: contract?.end_date,
            contract_status: contract?.status,
            robot_count: robotCount,
          };
        })
      );

      return api.success(res, providersWithContracts);
      
    } catch (error: any) {
      console.error('Error fetching providers:', error);
      return api.internalError(res, '获取服务商列表失败');
    }
  }

  return api.methodNotAllowed(res);
}

export default withErrorHandler(handler);