// src/pages/api/auth/register.ts - 修复版
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db/operations';
import { passwordManager } from '@/lib/auth/password';
import { api, withErrorHandler } from '@/lib/api';

// 套餐配置
const SUBSCRIPTION_PLANS = {
  free: { max_robots: 5, max_customers: 1, max_engineers: 2 },
  silver: { max_robots: 100, max_customers: 5, max_engineers: 10 },
  gold: { max_robots: 1000, max_customers: 50, max_engineers: 20 },
  premium: { max_robots: 5000, max_customers: 200, max_engineers: 9999 },
};

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
      status: 'active',
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
      status: 'active',
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

    // 返回结果（移除敏感信息）
    const { password_hash, ...userWithoutPassword } = user;

    return api.created(res, {
      organization,
      user: userWithoutPassword,
      subscription: subscriptionData,
    }, '注册成功');

  } catch (error: any) {
    console.error('注册过程错误:', error);
    return api.internalError(res, '注册失败: ' + error.message);
  }
});