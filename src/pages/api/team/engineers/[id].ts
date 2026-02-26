// pages/api/team/engineers/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db/operations';
import { api, withErrorHandler, withAuth, withPermission } from '@/lib/api';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return api.methodNotAllowed(res, '只允许DELETE请求');
  }

  try {
    const user = (req as any).user;
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return api.badRequest(res, '缺少工程师ID');
    }

    // 检查权限 - 只有管理员可以删除
    if (!user.role.includes('admin')) {
      return api.forbidden(res, '只有管理员可以删除工程师');
    }

    // 检查工程师是否存在且属于同一组织
    const engineer = await db.findOne('users', {
      _id: id,
      org_id: user.org_id,
      role: { $in: ['service_engineer', 'end_engineer'] }
    });

    if (!engineer) {
      return api.notFound(res, '工程师不存在或无权操作');
    }

    // 检查工程师是否有关联的工单
    const assignedTickets = await db.find('tickets', {
      assigned_to: id,
      status: { $in: ['open', 'in_progress'] }
    });

    if (assignedTickets.length > 0) {
      return api.badRequest(res, '该工程师有进行中的工单，请先重新分配工单');
    }

    // 更新工程师状态为inactive（软删除）
    await db.update('users', id, {
      status: 'inactive',
      updated_at: new Date()
    });

    // 可选：将工程师从所有工单中移除
    const allTickets = await db.find('tickets', { assigned_to: id });
    for (const ticket of allTickets) {
      await db.update('tickets', ticket._id, {
        assigned_to: null,
        updated_at: new Date()
      });
    }

    return api.success(res, { message: '工程师已成功删除' });

  } catch (error: any) {
    console.error('删除工程师失败:', error);
    return api.internalError(res, '删除工程师失败: ' + error.message);
  }
}

export default withErrorHandler(withAuth(handler));