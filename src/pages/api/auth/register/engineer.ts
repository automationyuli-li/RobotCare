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
    displayName,
    password,
    phone,
  } = req.body;

  if (!token || !displayName || !password) {
    return api.badRequest(res, '请填写完整信息');
  }

  try {
    // 1. 查找并验证邀请
    const invitation = await db.findOne('invitations', {
      token,
      status: 'pending',
    });

    if (!invitation) {
      return api.badRequest(res, '邀请链接无效或已过期');
    }

    if (invitation.invitation_type !== 'engineer') {
      return api.badRequest(res, '邀请类型错误');
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await db.update('invitations', invitation._id, {
        status: 'expired',
        updated_at: new Date(),
      });
      return api.badRequest(res, '邀请链接已过期');
    }

    const email = invitation.invitee_email;

    // 2. 检查邮箱是否已被注册
    const existingUser = await db.findOne('users', { email });
    if (existingUser) {
      return api.badRequest(res, '该邮箱已创建账号，请直接登录');
    }

    // 3. 检查组织是否存在且可用
    const organization = await db.findOne('organizations', {
      _id: invitation.inviter_org_id,
      status: 'active',
    });

    if (!organization) {
      return api.internalError(res, '邀请组织不存在或已禁用');
    }

    // 4. 验证密码强度并加密
    const passwordValidation = passwordManager.validateStrength(password);
    if (!passwordValidation.valid) {
      return api.badRequest(res, passwordValidation.errors.join(', '));
    }

    const passwordHash = await passwordManager.hash(password);

    // 5. 创建工程师用户
    const userData = {
      _id: uuidv4(),
      email,
      password_hash: passwordHash,
      display_name: displayName,
      phone: phone || '',
      role: invitation.role, // service_engineer / end_engineer
      org_id: organization._id,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
      metadata: {
        avatar_color: 'bg-teal-500 text-white',
      },
    };

    const user = await db.insert('users', userData);

    // 6. 更新邀请为已完成
    await db.update('invitations', invitation._id, {
      status: 'completed',
      accepted_by: user._id,
      accepted_at: new Date(),
      updated_at: new Date(),
    });

    // 7. 通知邀请人
    await db.insert('notifications', {
      _id: uuidv4(),
      user_id: invitation.inviter_user_id,
      type: 'invitation_accepted',
      title: '工程师邀请已被接受',
      message: `${displayName} 已接受您的邀请并加入团队`,
      data: {
        engineer_id: user._id,
        org_id: organization._id,
      },
      read: false,
      created_at: new Date(),
    });

    const { password_hash, ...userWithoutPassword } = user;

    return api.created(
      res,
      {
        user: userWithoutPassword,
        organization,
      },
      '工程师注册成功'
    );
  } catch (error: any) {
    console.error('工程师注册错误:', error);
    return api.internalError(res, '注册失败: ' + error.message);
  }
});

