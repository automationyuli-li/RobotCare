// src/pages/api/auth/register.ts - 修复版
import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { db } from '@/lib/db/operations';
import { passwordManager } from '@/lib/auth/password';
import { api, withErrorHandler } from '@/lib/api';
import { sendEmail } from '@/lib/email/sendEmail';

// 套餐配置
const SUBSCRIPTION_PLANS = {
  free: { max_robots: 5, max_customers: 1, max_engineers: 2 },
  silver: { max_robots: 100, max_customers: 5, max_engineers: 10 },
  gold: { max_robots: 1000, max_customers: 50, max_engineers: 20 },
  premium: { max_robots: 5000, max_customers: 200, max_engineers: 9999 },
};

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export default withErrorHandler(async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return api.methodNotAllowed(res, '只允许POST请求');
  }

  const {
    organizationName,
    contactEmail,
    contactPhone,
    adminEmail,
    adminPassword,
    adminDisplayName,
    subscriptionPlan = 'free',
  } = req.body;

  // 验证必填字段
  if (!organizationName || !contactEmail || !adminEmail || !adminPassword || !adminDisplayName) {
    return api.badRequest(res, '请填写所有必填字段');
  }

  // 验证密码强度
  const passwordValidation = passwordManager.validateStrength(adminPassword);
  if (!passwordValidation.valid) {
    return api.badRequest(res, passwordValidation.errors.join(', '));
  }

  try {
    // 检查邮箱是否已注册
    const existingUser = await db.findOne('users', { email: adminEmail });
    if (existingUser) {
      return api.badRequest(res, '邮箱已被注册');
    }

    // 检查组织邮箱是否已注册
    const existingOrg = await db.findOne('organizations', { contact_email: contactEmail });
    if (existingOrg) {
      return api.badRequest(res, '组织邮箱已被注册');
    }

    // 哈希密码
    const passwordHash = await passwordManager.hash(adminPassword);

    // 获取套餐配额
    const planConfig = SUBSCRIPTION_PLANS[subscriptionPlan as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.free;

    // 创建组织
    const orgData = {
      name: organizationName,
      type: 'service_provider',
      contact_email: contactEmail,
      contact_phone: contactPhone || '',
      subscription_plan: subscriptionPlan,
      ...planConfig,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    };

    const organization = await db.insert('organizations', orgData);

    // 创建管理员用户
    const userData = {
      email: adminEmail,
      password_hash: passwordHash,
      display_name: adminDisplayName,
      role: 'service_admin',
      org_id: organization._id,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
      metadata: {
        avatar_color: `bg-blue-500 text-white`,
        is_org_admin: true,
      },
    };

    const user = await db.insert('users', userData);

    // 创建订阅记录
    const subscriptionData = {
      org_id: organization._id,
      plan: subscriptionPlan,
      start_date: new Date(),
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1年后
      status: 'active',
      payment_status: subscriptionPlan === 'free' ? 'free' : 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db.insert('subscriptions', subscriptionData);

    // 创建邮箱验证记录并发送激活邮件
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.insert('email_verifications', {
      token_hash: tokenHash,
      user_id: user._id,
      org_id: organization._id,
      email: adminEmail,
      purpose: 'service_provider_activation',
      status: 'pending',
      expires_at: expiresAt,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const verifyUrl = `${baseUrl}/verify-email/${rawToken}`;

    let emailSent = false;
    let emailSimulated = false;

    try {
      const emailResult = await sendEmail({
        to: adminEmail,
        subject: 'RobotCare：请验证邮箱以激活账号',
        text: `请打开链接完成邮箱验证并激活账号：${verifyUrl}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6;">
            <h2>请验证您的邮箱</h2>
            <p>您正在注册 RobotCare 服务商账号。请在 24 小时内点击下方按钮完成激活。</p>
            <p style="margin: 24px 0;">
              <a href="${verifyUrl}" style="display: inline-block; padding: 10px 16px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px;">
                验证邮箱并激活
              </a>
            </p>
            <p style="color: #6b7280; font-size: 12px;">如果按钮不可用，请复制此链接到浏览器打开：<br/>${verifyUrl}</p>
          </div>
        `,
      });

      emailSent = emailResult.sent;
      emailSimulated = emailResult.simulated;

      if (emailResult.simulated) {
        console.log('📧 验证链接（SMTP未配置，模拟发送）:', verifyUrl);
      }
    } catch (emailErr: any) {
      console.error('发送激活邮件失败（账号保持待激活）:', emailErr);
      emailSent = false;
      emailSimulated = false;
    }

    // 返回结果（移除敏感信息）
    const { password_hash, ...userWithoutPassword } = user;

    return api.created(res, {
      organization,
      user: userWithoutPassword,
      subscription: subscriptionData,
      email_verification_required: true,
      email_sent: emailSent,
      email_simulated: emailSimulated,
    }, '注册成功，请查收邮件完成激活');

  } catch (error: any) {
    console.error('注册过程错误:', error);
    return api.internalError(res, '注册失败: ' + error.message);
  }
});