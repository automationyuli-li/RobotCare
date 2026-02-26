// src/pages/api/auth/register/end-customer.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db/operations';
import { passwordManager } from '@/lib/auth/password';
import { api, withErrorHandler } from '@/lib/api';
import { v4 as uuidv4 } from 'uuid';

export default withErrorHandler(async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return api.methodNotAllowed(res, '只允许POST请求');
  }

  const {
    token,
    organizationName,
    contactEmail,
    contactPhone,
    adminName,
    adminPassword,
  } = req.body;

  // 验证必填字段
  if (!token || !organizationName || !contactEmail || !adminName || !adminPassword) {
    return api.badRequest(res, '请填写所有必填字段');
  }

  try {
    // 1. 验证邀请
    const invitation = await db.findOne('invitations', {
      token,
      status: 'pending',
      invitee_email: contactEmail,
    });

    if (!invitation) {
      return api.badRequest(res, '邀请链接无效或已过期');
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await db.update('invitations', invitation._id, {
        status: 'expired',
        updated_at: new Date(),
      });
      return api.badRequest(res, '邀请链接已过期');
    }

    // 2. 检查邮箱是否已被注册
    const existingUser = await db.findOne('users', { email: contactEmail });
    if (existingUser) {
      return api.badRequest(res, '邮箱已被注册');
    }

    // 3. 创建客户组织
    const orgData = {
      _id: uuidv4(),
      name: organizationName,
      type: 'end_customer',
      contact_email: contactEmail,
      contact_phone: contactPhone || '',
      subscription_plan: 'free', // 客户默认免费版
      max_robots: 5,
      max_customers: 0,
      max_engineers: 2,
      status: 'active',
      service_provider_id: invitation.inviter_org_id, // 关联服务商
      created_at: new Date(),
      updated_at: new Date(),
    };

    const organization = await db.insert('organizations', orgData);

    // 4. 创建管理员用户
    const passwordHash = await passwordManager.hash(adminPassword);
    const userData = {
      _id: uuidv4(),
      email: contactEmail,
      password_hash: passwordHash,
      display_name: adminName,
      role: invitation.role, // 'end_admin' 或 'end_engineer'
      org_id: organization._id,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };

    const user = await db.insert('users', userData);

    // 5. 查找或创建服务合约
    const contract = await db.findOne('service_contracts', {
    service_provider_id: invitation.inviter_org_id,
    invitation_email: contactEmail,
    status: 'pending',
    });

    if (contract) {
    await db.update('service_contracts', contract._id, {
        end_customer_id: organization._id,
        start_date: new Date(),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: 'active',
        accepted_by: user._id,
        accepted_at: new Date(),
        updated_at: new Date(),
    });
    }

    // 6. 更新邀请状态
    await db.update('invitations', invitation._id, {
      status: 'completed',
      accepted_by: user._id,
      accepted_at: new Date(),
      updated_at: new Date(),
    });

    // 7. 创建通知
    await db.insert('notifications', {
      _id: uuidv4(),
      user_id: invitation.inviter_user_id,
      type: 'invitation_accepted',
      title: '邀请已被接受',
      message: `${organizationName} 已接受您的邀请并完成注册`,
      data: {
        organization_id: organization._id,
        contract_id: contract._id,
      },
      read: false,
      created_at: new Date(),
    });

    // 返回结果（移除敏感信息）
    const { password_hash, ...userWithoutPassword } = user;

    return api.created(res, {
      organization,
      user: userWithoutPassword,
      contract,
    }, '注册成功');

  } catch (error: any) {
    console.error('终端客户注册错误:', error);
    return api.internalError(res, '注册失败: ' + error.message);
  }
});