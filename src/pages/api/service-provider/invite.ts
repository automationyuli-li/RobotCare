// src/pages/api/service-provider/invite.ts //发送客户邀请
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db/operations';
import { sessionManager } from '@/lib/auth/session';
import { api, withErrorHandler } from '@/lib/api';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail } from '@/lib/email/sendEmail';

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

      // 检查是否已经邀请过（同一服务商对同一邮箱的待处理邀请）
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

      // 客户未注册，发送邀请（用于客户注册 + 激活合约）
      const invitationData = {
        _id: uuidv4(),
        token: uuidv4(),
        contract_id: contract._id, // 关联合约
        service_provider_id: sessionData.orgId,
        inviter_org_id: sessionData.orgId,
        invitee_email: invitee_email,
        inviter_user_id: sessionData.userId,
        role: 'end_admin',
        invitation_type: 'customer',
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        created_at: new Date(),
        updated_at: new Date(),
      };

      await db.insert('invitations', invitationData);

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      const invitationUrl = `${baseUrl}/register/invite/${invitationData.token}`;

      try {
        const emailResult = await sendEmail({
          to: invitee_email,
          subject: 'RobotCare：邀请您作为终端客户加入平台',
          text: `您好，${sessionData.organizationName} 邀请您作为终端客户加入 RobotCare 平台，请打开链接完成注册：${invitationUrl}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6;">
              <h2>合作邀请</h2>
              <p>${sessionData.organizationName} 邀请您作为终端客户加入 RobotCare 平台，并创建服务合约。</p>
              <p style="margin: 24px 0;">
                <a href="${invitationUrl}" style="display: inline-block; padding: 10px 16px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px;">
                  接受邀请并注册
                </a>
              </p>
              <p style="color: #6b7280; font-size: 12px;">如果按钮不可用，请复制此链接到浏览器打开：<br/>${invitationUrl}</p>
            </div>
          `,
        });

        if (emailResult.simulated) {
          console.log('📧 客户邀请链接（SMTP未配置，模拟发送）:', invitationUrl);
        }
      } catch (emailErr: any) {
        console.error('发送客户邀请邮件失败（记录仍然创建）:', emailErr);
      }

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