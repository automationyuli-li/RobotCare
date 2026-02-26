// src/pages/api/invitations/send.ts - 发送邀请
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db/operations';
import { v4 as uuidv4 } from 'uuid';
import { 
  api, 
  withErrorHandler, 
  withAuth, 
  withPermission 
} from '@/lib/api';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return api.methodNotAllowed(res, '只允许POST请求');
  }
  
  const user = (req as any).user;
  const { invitee_email, role, invitation_type } = req.body;
  
  if (!invitee_email || !role || !invitation_type) {
    return api.badRequest(res, '请填写完整信息');
  }
  
  // 邮箱格式验证
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(invitee_email)) {
    return api.badRequest(res, '邮箱格式错误');
  }
  
  // 验证角色
  const validRoles = ['end_admin', 'end_engineer', 'service_engineer'];
  if (!validRoles.includes(role)) {
    return api.badRequest(res, '角色无效');
  }
  
  // 验证邀请类型
  const validTypes = ['customer', 'engineer'];
  if (!validTypes.includes(invitation_type)) {
    return api.badRequest(res, '邀请类型无效');
  }
  
  try {
    // 检查邮箱是否已存在
    const existingUser = await db.findOne('users', { email: invitee_email });
    
    if (existingUser) {
      if (existingUser.org_id === user.org_id) {
        return api.badRequest(res, '该用户已在您的组织中');
      }
      
      if (invitation_type === 'customer') {
        return api.badRequest(res, '该邮箱已被其他组织注册');
      }
    }
    
    // 检查是否已有待处理的邀请
    const existingInvitation = await db.findOne('invitations', {
      invitee_email,
      status: 'pending',
      inviter_user_id: user._id,
    });
    
    if (existingInvitation) {
      return api.badRequest(res, '该邮箱已有待处理的邀请');
    }
    
    // 检查数量限制
    const organization = await db.findOne('organizations', { _id: user.org_id });
    
    if (!organization) {
      return api.internalError(res, '组织信息不存在');
    }
    
    if (invitation_type === 'customer') {
      const customerCount = await db.count('organizations', {
        service_provider_id: user.org_id,
        type: 'end_customer',
        status: 'active',
      });
      
      if (customerCount >= organization.max_customers) {
        return api.badRequest(res, '客户数量已达上限，请升级套餐');
      }
    } else if (invitation_type === 'engineer') {
      const engineerRole = organization.type === 'service_provider' ? 'service_engineer' : 'end_engineer';
      const engineerCount = await db.count('users', {
        org_id: user.org_id,
        role: engineerRole,
        status: 'active',
      });
      
      if (engineerCount >= organization.max_engineers) {
        return api.badRequest(res, '工程师数量已达上限，请升级套餐');
      }
    }
    
    // 创建邀请记录
    const invitationToken = `invite_${uuidv4()}_${Date.now()}`;
    
    const invitationData = {
      token: invitationToken,
      invitation_type,
      invitee_email,
      inviter_user_id: user._id,
      inviter_org_id: user.org_id,
      role,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    const invitation = await db.insert('invitations', invitationData);
    
    // 生成邀请链接（实际应该通过邮件发送）
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const invitationUrl = `${baseUrl}/register/invite/${invitationToken}`;
    
    // 注意：这里应该集成邮件发送服务
    console.log('📧 邀请链接:', invitationUrl);
    
    return api.created(res, {
      invitation,
      invitation_url: invitationUrl,
      expires_at: invitationData.expires_at,
    }, '邀请已发送');
    
  } catch (error: any) {
    console.error('发送邀请错误:', error);
    return api.internalError(res, '发送邀请失败: ' + error.message);
  }
}

// 需要认证和管理权限
export default withErrorHandler(withAuth(withPermission('users', 'manage')(handler)));