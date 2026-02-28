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
import { sendEmail } from '@/lib/email/sendEmail';

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

    // 生成邀请链接并发送邮件
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const invitationUrl =
      invitation_type === 'engineer'
        ? `${baseUrl}/register/engineer/${invitationToken}`
        : `${baseUrl}/register/invite/${invitationToken}`;

    try {
      const subject =
        invitation_type === 'engineer'
          ? 'RobotCare：邀请您作为工程师加入团队'
          : 'RobotCare：邀请您作为终端客户加入平台';

      const roleLabel =
        role === 'service_engineer'
          ? '服务商工程师'
          : role === 'end_engineer'
          ? '客户工程师'
          : '客户管理员';

      const html =
        invitation_type === 'engineer'
          ? `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6;">
              <h2>团队邀请</h2>
              <p>${organization.name} 邀请您以 <strong>${roleLabel}</strong> 身份加入 RobotCare 团队。</p>
              <p style="margin: 24px 0;">
                <a href="${invitationUrl}" style="display: inline-block; padding: 10px 16px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px;">
                  接受邀请并创建账户
                </a>
              </p>
              <p style="color: #6b7280; font-size: 12px;">如果按钮不可用，请复制此链接到浏览器打开：<br/>${invitationUrl}</p>
            </div>
          `
          : `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6;">
              <h2>合作邀请</h2>
              <p>${organization.name} 邀请您作为终端客户加入 RobotCare 平台。</p>
              <p style="margin: 24px 0;">
                <a href="${invitationUrl}" style="display: inline-block; padding: 10px 16px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px;">
                  接受邀请并注册
                </a>
              </p>
              <p style="color: #6b7280; font-size: 12px;">如果按钮不可用，请复制此链接到浏览器打开：<br/>${invitationUrl}</p>
            </div>
          `;

      const text =
        invitation_type === 'engineer'
          ? `${organization.name} 邀请您以 ${roleLabel} 身份加入 RobotCare 团队，请打开链接创建账户：${invitationUrl}`
          : `${organization.name} 邀请您作为终端客户加入 RobotCare 平台，请打开链接注册：${invitationUrl}`;

      const emailResult = await sendEmail({
        to: invitee_email,
        subject,
        text,
        html,
      });

      if (emailResult.simulated) {
        console.log('📧 邀请链接（SMTP未配置，模拟发送）:', invitationUrl);
      }
    } catch (emailErr: any) {
      console.error('发送邀请邮件失败（记录仍然创建）:', emailErr);
    }

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