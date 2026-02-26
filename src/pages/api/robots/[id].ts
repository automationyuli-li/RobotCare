// src/pages/api/robots/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db/operations';
import { sessionManager } from '@/lib/auth/session';
import { api, withErrorHandler } from '@/lib/api';

interface ExtendedNextApiRequest extends NextApiRequest {
  query: {
    id?: string;
  };
}

async function handler(req: ExtendedNextApiRequest, res: NextApiResponse) {
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

  const robotId = req.query.id;

  if (!robotId) {
    return api.badRequest(res, '机器人ID不能为空');
  }

  if (req.method === 'GET') {
    try {
      // 获取机器人信息
      const robot = await db.findOne('robots', { _id: robotId });
      
      if (!robot) {
        return api.notFound(res, '机器人不存在');
      }

      // 确保状态字段有值
      const robotWithDefaults = {
        ...robot,
        status: robot.status || 'inactive',
        specs: {
          ...robot.specs,
          installation_date: robot.specs?.installation_date || null,
          warranty_end: robot.specs?.warranty_end || null,
        }
      };

      // 权限检查：用户是否有权查看此机器人
      const hasAccess = 
        robot.org_id === sessionData.orgId || 
        robot.service_provider_id === sessionData.orgId ||
        (await checkContractAccess(sessionData.orgId, robot.org_id, robot.service_provider_id));

      if (!hasAccess) {
        return api.forbidden(res, '无权查看此机器人');
      }

      // 获取关联的组织信息
      const [org, provider] = await Promise.all([
        db.findOne('organizations', { _id: robot.org_id }),
        db.findOne('organizations', { _id: robot.service_provider_id })
      ]);

      // 获取创建者信息
      const creator = await db.findOne('users', { _id: robot.created_by });

      const robotWithDetails = {
        ...robotWithDefaults,
        org_name: org?.name,
        provider_name: provider?.name,
        created_by_name: creator?.display_name,
      };

      return api.success(res, robotWithDetails);
      
    } catch (error: any) {
      console.error('Error fetching robot:', error);
      return api.internalError(res, '获取机器人信息失败');
    }
  }

  if (req.method === 'PUT') {
    try {
      const robot = await db.findOne('robots', { _id: robotId });
      
      if (!robot) {
        return api.notFound(res, '机器人不存在');
      }

      // 权限检查：只有客户可以更新自己的机器人
      const isEndCustomer = robot.org_id === sessionData.orgId;
      const isServiceProvider = robot.service_provider_id === sessionData.orgId;
      const canUpdate = 
      (isEndCustomer && sessionData.role.includes('end')); // 终端客户的用户
      if (!canUpdate) {
      return api.forbidden(res, '无权更新此机器人');
      }

      const updateData = req.body;

      // 记录修改前的状态（用于时间线）
      const previousStatus = robot.status;
      
      // 不允许修改某些核心字段
      const restrictedFields = ['_id', 'org_id', 'service_provider_id', 'created_by', 'created_at', 'sn', 'brand', 'model'];
      restrictedFields.forEach(field => {
        delete updateData[field];
      });

      const updatedRobot = await db.update('robots', robotId, {
        ...updateData,
        updated_at: new Date(),
      });

      // 如果状态发生变化，创建时间线事件
      if (updateData.status && updateData.status !== previousStatus) {
        await db.insert('timeline_events', {
          robot_id: robotId,
          event_type: 'status_changed',
          title: '状态变更',
          description: `机器人状态从"${getStatusChinese(previousStatus)}"变更为"${getStatusChinese(updateData.status)}"`,
          metadata: {
            previous_status: previousStatus,
            new_status: updateData.status,
            changed_by: sessionData.userId,
            reason: '手动编辑更新'
          },
          created_by: sessionData.userId,
          created_at: new Date(),
        });
      }

      // 创建一般的编辑记录时间线事件
      const changedFields = Object.keys(updateData).filter(key => !['status', 'updated_at'].includes(key));
      if (changedFields.length > 0) {
        await db.insert('timeline_events', {
          robot_id: robotId,
          event_type: 'status_changed', // 使用状态变更类型，或者可以新增 'robot_updated' 类型
          title: '机器人信息更新',
          description: `更新了机器人的以下字段: ${changedFields.join(', ')}`,
          metadata: {
            changed_fields: changedFields,
            changed_by: sessionData.userId,
            previous_values: robot
          },
          created_by: sessionData.userId,
          created_at: new Date(),
        });
      }

      return api.success(res, updatedRobot, '机器人更新成功');
      
    } catch (error: any) {
      console.error('Error updating robot:', error);
      return api.internalError(res, '更新机器人失败');
    }
  }

  // 添加辅助函数
  function getStatusChinese(status: string): string {
    const map: Record<string, string> = {
      'active': '运行正常',
      'maintenance': '维护中',
      'fault': '故障',
      'inactive': '离线'
    };
    return map[status] || status;
  }

  if (req.method === 'DELETE') {
    try {
      const robot = await db.findOne('robots', { _id: robotId });
      
      if (!robot) {
        return api.notFound(res, '机器人不存在');
      }

      // 权限检查：只有客户可以删除自己的机器人
      if (robot.org_id !== sessionData.orgId) {
        return api.forbidden(res, '无权删除此机器人');
      }

      // 软删除机器人
      await db.update('robots', robotId, {
        status: 'inactive',
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
      });

      return api.success(res, null, '机器人删除成功');
      
    } catch (error: any) {
      console.error('Error deleting robot:', error);
      return api.internalError(res, '删除机器人失败');
    }
  }

  return api.methodNotAllowed(res);
}

// 检查合约访问权限
async function checkContractAccess(userOrgId: string, robotOrgId: string, robotProviderId: string): Promise<boolean> {
  try {
    // 检查是否存在有效合约
    const contract = await db.findOne('service_contracts', {
      $or: [
        { 
          service_provider_id: userOrgId, 
          end_customer_id: robotOrgId,
          status: 'active'
        },
        { 
          service_provider_id: robotProviderId, 
          end_customer_id: userOrgId,
          status: 'active'
        }
      ]
    });
    
    return !!contract;
  } catch (error) {
    console.error('Error checking contract access:', error);
    return false;
  }
}

export default withErrorHandler(handler);