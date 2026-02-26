// src/pages/api/service-contracts/[id]/renew.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db/operations';
import { sessionManager } from '@/lib/auth/session';
import { api, withErrorHandler } from '@/lib/api';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 从cookie中获取session token
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

  // 仅服务商管理员
  if (!sessionData.role?.includes('service_admin')) {
    return api.forbidden(res, '无权操作');
  }

  if (req.method === 'PUT') {
    try {
      // ✅ 修复：正确获取id参数
      const { id } = req.query;
      const contractId = Array.isArray(id) ? id[0] : id;
      
      if (!contractId) {
        return api.badRequest(res, '合约ID不能为空');
      }

      const { endDate } = req.body;
      
      if (!endDate) {
        return api.badRequest(res, '请选择合约到期日期');
      }

      // 验证合约是否存在
      const contract = await db.findOne('service_contracts', { _id: contractId });
      
      if (!contract) {
        return api.notFound(res, '合约不存在');
      }

      // 验证权限：只能续约自己服务商的合约
      if (contract.service_provider_id !== sessionData.orgId) {
        return api.forbidden(res, '无权操作此合约');
      }

      // 更新合约
      const updatedContract = await db.update('service_contracts', contractId, {
        end_date: new Date(endDate),
        renewed_at: new Date(),
        renewed_by: sessionData.userId,
        updated_at: new Date()
      });

      // 创建通知
      await db.insert('notifications', {
        _id: require('uuid').v4(),
        organization_id: contract.end_customer_id,
        type: 'contract_renewed',
        title: '服务合约已续期',
        message: `您的服务合约已续期至 ${new Date(endDate).toLocaleDateString('zh-CN')}`,
        data: { contract_id: contractId },
        read: false,
        created_at: new Date(),
      });

      return api.success(res, updatedContract, '合约已续期');
      
    } catch (error: any) {
      console.error('续约错误:', error);
      return api.internalError(res, '续约失败: ' + error.message);
    }
  }

  return api.methodNotAllowed(res, '只允许PUT请求');
}

export default withErrorHandler(handler);