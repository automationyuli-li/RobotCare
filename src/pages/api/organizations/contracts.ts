// src/pages/api/organizations/contracts.ts
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

  if (req.method === 'GET') {
    try {
      const userOrgId = sessionData.orgId;
      const userRole = sessionData.role;
      
      let partners: any[] = [];

      if (userRole.includes('service_admin') || userRole.includes('service_engineer')) {
        // 服务商：获取所有签约的客户
        const contracts = await db.find('service_contracts', {
          service_provider_id: userOrgId,
          status: 'active'
        });

        // 获取客户组织信息
        const customerIds = contracts.map(c => c.end_customer_id);
        if (customerIds.length > 0) {
          partners = await db.find('organizations', {
            _id: { $in: customerIds },
            type: 'end_customer'
          });
        }

      } else if (userRole.includes('end_admin') || userRole.includes('end_engineer')) {
        // 终端客户：获取所有签约的服务商
        const contracts = await db.find('service_contracts', {
          end_customer_id: userOrgId,
          status: 'active'
        });

        // 获取服务商组织信息
        const providerIds = contracts.map(c => c.service_provider_id);
        if (providerIds.length > 0) {
          partners = await db.find('organizations', {
            _id: { $in: providerIds },
            type: 'service_provider'
          });
        }
      }

      // 添加合约信息
      const partnersWithContracts = await Promise.all(
        partners.map(async (partner) => {
          let contract;
          
          if (userRole.includes('service')) {
            contract = await db.findOne('service_contracts', {
              service_provider_id: userOrgId,
              end_customer_id: partner._id,
              status: 'active'
            });
          } else {
            contract = await db.findOne('service_contracts', {
              service_provider_id: partner._id,
              end_customer_id: userOrgId,
              status: 'active'
            });
          }

          return {
            ...partner,
            contract_id: contract?._id,
            contract_end_date: contract?.end_date,
          };
        })
      );

      return api.success(res, partnersWithContracts);
      
    } catch (error: any) {
      console.error('Error fetching contracted organizations:', error);
      return api.internalError(res, '获取签约组织失败');
    }
  }

  return api.methodNotAllowed(res);
}

export default withErrorHandler(handler);