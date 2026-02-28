import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { db } from '@/lib/db/operations';
import { api, withErrorHandler } from '@/lib/api';

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export default withErrorHandler(async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return api.methodNotAllowed(res, '只允许GET请求');
  }

  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    return api.badRequest(res, '缺少验证令牌');
  }

  try {
    const tokenHash = sha256(token);

    const verification = await db.findOne('email_verifications', {
      token_hash: tokenHash,
      status: 'pending',
    });

    if (!verification) {
      return api.notFound(res, '验证链接无效或已被使用');
    }

    if (new Date(verification.expires_at) < new Date()) {
      await db.update('email_verifications', verification._id, {
        status: 'expired',
        updated_at: new Date(),
      });
      return api.badRequest(res, '验证链接已过期');
    }

    const user = await db.findOne('users', { _id: verification.user_id });
    const organization = await db.findOne('organizations', { _id: verification.org_id });

    if (!user || !organization) {
      return api.internalError(res, '账户或组织信息不存在');
    }

    // 幂等：如果已经激活，直接视为成功
    if (user.status === 'active' && organization.status === 'active') {
      await db.update('email_verifications', verification._id, {
        status: 'used',
        used_at: new Date(),
        updated_at: new Date(),
      });
      return api.success(res, { activated: true }, '邮箱已验证');
    }

    await db.update('users', user._id, {
      status: 'active',
      email_verified_at: new Date(),
      updated_at: new Date(),
    });

    await db.update('organizations', organization._id, {
      status: 'active',
      updated_at: new Date(),
    });

    await db.update('email_verifications', verification._id, {
      status: 'used',
      used_at: new Date(),
      updated_at: new Date(),
    });

    return api.success(res, { activated: true }, '邮箱验证成功，账户已激活');
  } catch (error: any) {
    console.error('verify-email error:', error);
    return api.internalError(res, '邮箱验证失败: ' + error.message);
  }
});

