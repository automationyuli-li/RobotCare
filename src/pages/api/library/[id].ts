// src/pages/api/library/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { api, withErrorHandler, withAuth } from '@/lib/api';
import LibraryOperations from '@/lib/db/library-operations';
import { permissionManager } from '@/lib/auth/permissions';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = (req as any).user;
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return api.badRequest(res, '文档ID不能为空');
  }

  // 首先获取文档信息以确定所属组织
  const document = await LibraryOperations.getDocumentById(id);
  if (!document) {
    return api.notFound(res, '文档不存在');
  }

  // 检查访问权限
  let hasAccess = false;
  
  if (user.role.includes('service')) {
    // 服务商：只能访问自己组织的文档
    hasAccess = document.org_id === user.org_id;
  } else if (user.role.includes('end')) {
    // 客户：检查是否有合约关系
    hasAccess = await LibraryOperations.checkCustomerAccess(
      user.org_id,
      document.org_id
    );
  }

  if (!hasAccess) {
    return api.forbidden(res, '没有权限访问该文档');
  }

  if (req.method === 'GET') {
    try {
      // 检查读取权限
      const hasReadPermission = permissionManager.hasPermission(
        user.role as any,
        'documents',
        'read'
      );
      
      if (!hasReadPermission) {
        return api.forbidden(res, '没有读取权限');
      }

      // 获取附件
      const attachments = await LibraryOperations.getDocumentAttachments(id);
      
      return api.success(res, {
        document,
        attachments,
      });
      
    } catch (error: any) {
      console.error('获取文档详情失败:', error);
      return api.internalError(res, '获取文档详情失败: ' + error.message);
    }
  }

  if (req.method === 'PUT') {
    try {
      // 检查更新权限
      const hasUpdatePermission = permissionManager.hasPermission(
        user.role as any,
        'documents',
        'update'
      );
      
      if (!hasUpdatePermission) {
        return api.forbidden(res, '没有更新权限');
      }

      // 只有文档所属组织的服务商可以更新
      if (!user.role.includes('service') || document.org_id !== user.org_id) {
        return api.forbidden(res, '只能更新自己组织的文档');
      }

      const updateData = req.body;
      
      // 更新文档
      const updatedDocument = await LibraryOperations.updateDocument(
        id,
        updateData,
        user._id
      );

      return api.success(res, updatedDocument, '文档更新成功');
      
    } catch (error: any) {
      console.error('更新文档失败:', error);
      return api.internalError(res, '更新文档失败: ' + error.message);
    }
  }

  if (req.method === 'DELETE') {
    try {
      // 检查删除权限
      const hasDeletePermission = permissionManager.hasPermission(
        user.role as any,
        'documents',
        'delete'
      );
      
      if (!hasDeletePermission) {
        return api.forbidden(res, '没有删除权限');
      }

      // 只有文档所属组织的服务商可以删除
      if (!user.role.includes('service') || document.org_id !== user.org_id) {
        return api.forbidden(res, '只能删除自己组织的文档');
      }

      await LibraryOperations.deleteDocument(id);

      return api.success(res, null, '文档删除成功');
      
    } catch (error: any) {
      console.error('删除文档失败:', error);
      return api.internalError(res, '删除文档失败: ' + error.message);
    }
  }

  return api.methodNotAllowed(res);
}

export default withErrorHandler(withAuth(handler));