// src/pages/api/invitations/validate.ts - 验证邀请
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db/operations';
import { api, withErrorHandler } from '@/lib/api';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return api.methodNotAllowed(res, '只允许GET请求');
  }
  
  const { token } = req.query;
  
  if (!token || typeof token !== 'string') {
    return api.badRequest(res, '缺少邀请令牌');
  }
  
  try {
    // 查找邀请记录
    const invitation = await db.findOne('invitations', { 
      token,
      status: 'pending'
    });
    
    if (!invitation) {
      return api.notFound(res, '邀请链接不存在或已被使用');
    }
    
    // 检查是否过期
    if (new Date(invitation.expires_at) < new Date()) {
      // 更新邀请状态为过期
      await db.update('invitations', invitation._id, {
        status: 'expired',
        updated_at: new Date(),
      });
      
      return api.badRequest(res, '邀请链接已过期');
    }
    
    // 获取邀请人信息
    const inviter = await db.findOne('users', { _id: invitation.inviter_user_id });
    const organization = await db.findOne('organizations', { _id: invitation.inviter_org_id });
    
    return api.success(res, {
      valid: true,
      invitee_email: invitation.invitee_email,
      role: invitation.role,
      invitation_type: invitation.invitation_type,
      expires_at: invitation.expires_at,
      inviter: inviter ? {
        name: inviter.display_name,
        email: inviter.email,
      } : null,
      organization: organization ? {
        name: organization.name,
        type: organization.type,
      } : null,
    });
    
  } catch (error: any) {
    console.error('验证邀请错误:', error);
    return api.internalError(res, '验证邀请失败: ' + error.message);
  }
}

export default withErrorHandler(handler);