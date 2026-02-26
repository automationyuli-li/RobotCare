// src/pages/api/service-provider/invite.ts //发送客户邀请
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db/operations';
import { sessionManager } from '@/lib/auth/session';
import { api, withErrorHandler } from '@/lib/api';
import { v4 as uuidv4 } from 'uuid';

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
  if (!sessionData.role.includes('service_admin')) {
    return api.forbidden(res, '无权发送邀请');
  }

  if (req.method === 'POST') {
    try {
      const { email, invitee_email } = req.body;
      
      if (!email || !invitee_email) {
        return api.badRequest(res, '邮箱不能为空');
      }

      // 检查邀请邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(invitee_email)) {
        return api.badRequest(res, '邮箱格式不正确');
      }

      // 检查是否已经邀请过
      const existingInvitation = await db.findOne('invitations', {
        invitee_email: invitee_email,
        service_provider_id: sessionData.orgId,
        status: 'pending',
      });

      if (existingInvitation) {
        return api.badRequest(res, '已向该邮箱发送过邀请，请等待对方接受');
      }

      // 检查对方是否已经是客户
      const existingOrg = await db.findOne('organizations', {
        contact_email: invitee_email,
        type: 'end_customer',
      });

      // ✅ 无论客户是否已注册，都创建合约（状态为pending）
    const contractData = {
      _id: uuidv4(),
      service_provider_id: sessionData.orgId,
      end_customer_id: existingOrg?._id || `pending_${uuidv4()}`, // 待确认时使用临时ID
      contract_number: `CONTRACT-${Date.now()}`,
      start_date: null, // 等待客户接受后才设置
      end_date: null,   // 等待客户接受后才设置
      status: 'pending', // ✅ 改为待确认状态
      invitation_email: invitee_email,
      created_by: sessionData.userId,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const contract = await db.insert('service_contracts', contractData);

    if (existingOrg) {
      // 客户已注册，更新合约的客户ID
      await db.update('service_contracts', contract._id, {
        end_customer_id: existingOrg._id,
        // 注意：不改为active，需要客户确认
      });

      // 创建通知
      await db.insert('notifications', {
        _id: uuidv4(),
        organization_id: existingOrg._id,
        type: 'contract_pending',
        title: '新的服务合约待确认',
        message: `${sessionData.organizationName} 希望与您签订服务合约`,
        data: { contract_id: contract._id },
        read: false,
        created_at: new Date(),
      });

      return api.success(res, { 
        existing: true, 
        contract,
        status: 'pending' 
      }, '已发送合约确认请求，等待客户确认');
    }

    // 客户未注册，发送邀请
    const invitationData = {
      _id: uuidv4(),
      token: uuidv4(),
      contract_id: contract._id, // 关联合约
      service_provider_id: sessionData.orgId,
      invitee_email: invitee_email,
      inviter_user_id: sessionData.userId,
      role: 'end_admin',
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      created_at: new Date(),
    };

    await db.insert('invitations', invitationData);
    
    console.log('邀请链接:', `/register/invite/${invitationData.token}`);

    return api.success(res, { 
      existing: false, 
      contract,
      invitation: invitationData 
    }, '邀请已发送，客户注册后将自动建立合约');
      
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      return api.internalError(res, '发送邀请失败');
    }
  }

  return api.methodNotAllowed(res);
}

export default withErrorHandler(handler);