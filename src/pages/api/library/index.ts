// src/pages/api/library/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { api, withErrorHandler, withAuth } from '@/lib/api';
import LibraryOperations from '@/lib/db/library-operations';
import { permissionManager } from '@/lib/auth/permissions';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = (req as any).user;

  // 添加详细的调试信息
  console.log('🔐 知识库API - 用户信息:', {
    id: user?._id,
    email: user?.email,
    role: user?.role,
    org_id: user?.org_id,
    timestamp: new Date().toISOString()
  });
  
  let requiredAction: string;
    switch (req.method) {
      case 'GET':
        requiredAction = 'read';
        break;
      case 'POST':
        requiredAction = 'create';
        break;
      case 'PUT':
      case 'PATCH':
        requiredAction = 'update';
        break;
      case 'DELETE':
        requiredAction = 'delete';
        break;
      default:
        return api.methodNotAllowed(res);
    }

  // 检查权限
  const hasReadPermission = permissionManager.hasPermission(
    user.role as any,
    'documents',
    requiredAction
  );
  
  console.log('🔑 权限检查结果:', {
    role: user.role,
    resource: 'documents',
    action: 'read',
    hasPermission: hasReadPermission,
    allPermissions: permissionManager.getUserPermissions(user.role as any)
  });


  if (!hasReadPermission) {
    console.error('权限检查失败:', {
      role: user.role,
      action: requiredAction,
      method: req.method,
      path: req.url
    });
    return api.forbidden(res, `没有${getActionName(requiredAction)}知识库的权限`);
  }

  if (req.method === 'GET') {
    try {
      const { 
        search, 
        category, 
        status, 
        created_by,
        date_from,
        date_to,
        sort_by = 'created_at',
        sort_order = 'desc',
        page = '1',
        limit = '20'
      } = req.query;

      // 确定要查询的组织ID
      let targetOrgId: string;
      
      if (user.role.includes('service')) {
        // 服务商：查看自己的知识库
        targetOrgId = user.org_id;
      } else if (user.role.includes('end')) {
        // 客户：需要确定要查看哪个服务商的知识库
        const { provider_id } = req.query;
        if (!provider_id || typeof provider_id !== 'string') {
          return api.badRequest(res, '需要指定服务商ID');
        }
        
        // 检查客户是否有权限访问该服务商的知识库
        const hasAccess = await LibraryOperations.checkCustomerAccess(
          user.org_id,
          provider_id
        );
        
        if (!hasAccess) {
          return api.forbidden(res, '没有权限访问该服务商的知识库');
        }
        
        targetOrgId = provider_id;
      } else {
        return api.forbidden(res, '用户角色不支持');
      }

      const filters = {
        search: search as string,
        category: category as string,
        status: status as any,
        created_by: created_by as string,
        date_from: date_from as string,
        date_to: date_to as string,
        sort_by: sort_by as any,
        sort_order: sort_order as 'asc' | 'desc',
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      };

      const result = await LibraryOperations.searchDocuments(filters, targetOrgId);
      
      return api.success(res, result);
      
    } catch (error: any) {
      console.error('搜索知识库失败:', error);
      return api.internalError(res, '搜索知识库失败: ' + error.message);
    }
  }

  if (req.method === 'POST') {
    try {
      // 检查创建权限
      const hasCreatePermission = permissionManager.hasPermission(
        user.role as any,
        'documents',
        'create'
      );
      
      if (!hasCreatePermission) {
        return api.forbidden(res, '没有创建知识库的权限');
      }

      // 只有服务商可以创建知识库
      if (!user.role.includes('service')) {
        return api.forbidden(res, '只有服务商可以创建知识库');
      }

      const documentData = req.body;
      
      // 验证必填字段
      if (!documentData.title || !documentData.content?.fault_phenomenon) {
        return api.badRequest(res, '标题和故障现象为必填项');
      }

      // 创建知识库文档
      const document = await LibraryOperations.createDocument({
        org_id: user.org_id,
        title: documentData.title,
        content: {
          fault_phenomenon: documentData.content.fault_phenomenon,
          diagnosis_steps: documentData.content.diagnosis_steps || '',
          solution: documentData.content.solution || '',
          preventive_measures: documentData.content.preventive_measures || '',
        },
        keywords: documentData.keywords || [],
        status: documentData.status || 'draft',
        category: documentData.category,
        created_by: user._id,
      });

      return api.created(res, document, '知识库文档创建成功');
      
    } catch (error: any) {
      console.error('创建知识库失败:', error);
      return api.internalError(res, '创建知识库失败: ' + error.message);
    }
  }

  return api.methodNotAllowed(res);
}

function getActionName(action: string): string {
  const names: Record<string, string> = {
    'read': '访问',
    'create': '创建',
    'update': '更新',
    'delete': '删除'
  };
  return names[action] || action;
}

export default withErrorHandler(withAuth(handler));