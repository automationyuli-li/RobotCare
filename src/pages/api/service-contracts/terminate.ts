// src/pages/api/service-contracts/terminate.ts //解除合约
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

  if (req.method === 'POST') {
    try {
      const { organizationIds, reason } = req.body;
      
      if (!Array.isArray(organizationIds) || organizationIds.length === 0) {
        return api.badRequest(res, '请选择要解除合约的组织');
      }

      if (!reason || reason.trim().length < 10) {
        return api.badRequest(res, '请详细说明解除合约的原因（至少10个字符）');
      }

      const isServiceProvider = sessionData.role.includes('service');
      let contracts = [];

      // 查找相关合约
      for (const orgId of organizationIds) {
        const query = isServiceProvider 
          ? { 
              service_provider_id: sessionData.orgId,
              end_customer_id: orgId,
              status: 'active',
            }
          : {
              service_provider_id: orgId,
              end_customer_id: sessionData.orgId,
              status: 'active',
            };

        const contract = await db.findOne('service_contracts', query);
        
        if (contract) {
          contracts.push(contract);
        }
      }

      if (contracts.length === 0) {
        return api.badRequest(res, '未找到有效的活跃合约');
      }

      // 更新合约状态为terminated
      const updatePromises = contracts.map(contract =>
        db.update('service_contracts', contract._id, {
          status: 'terminated',
          terminated_by: sessionData.userId,
          termination_reason: reason,
          termination_date: new Date(),
          updated_at: new Date(),
        })
      );

      await Promise.all(updatePromises);

      // 为每个相关组织创建通知
      const notificationPromises = contracts.map(async (contract) => {
        const otherPartyId = isServiceProvider 
          ? contract.end_customer_id 
          : contract.service_provider_id;

        // 查找对方组织的管理员
        const org = await db.findOne('organizations', { _id: otherPartyId });
        if (org) {
          // 这里应该发送邮件通知
          console.log(`发送解除合约通知给: ${org.contact_email}`);
          
          // 创建系统通知
          await db.insert('notifications', {
            _id: Date.now().toString(),
            organization_id: otherPartyId,
            type: 'contract_terminated',
            title: '服务合约解除通知',
            message: `${sessionData.organizationName} 请求解除服务合约，原因: ${reason}`,
            data: { 
              contract_id: contract._id,
              terminated_by: sessionData.userId,
              reason: reason,
            },
            read: false,
            created_at: new Date(),
          });
        }
      });

      await Promise.all(notificationPromises);

      return api.success(res, {
        terminated_count: contracts.length,
        organizations: organizationIds,
      }, '已发送解除合约请求，等待对方确认');
      
    } catch (error: any) {
      console.error('Error terminating contracts:', error);
      return api.internalError(res, '解除合约失败');
    }
  }

  return api.methodNotAllowed(res);
}

export default withErrorHandler(handler);