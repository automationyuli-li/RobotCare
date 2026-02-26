//src/pages/api/maintenance/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, withErrorHandler, allowMethods } from '@/lib/api';
import { db } from '@/lib/db/operations';
import { api } from '@/lib/api';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = (req as any).user;

  if (req.method === 'GET') {
    try {
      const { robot_id, page = '1', limit = '20', type } = req.query;
      
      // 构建查询条件
      const query: any = {};
      
      if (robot_id) {
        query.robot_id = robot_id as string;
      }
      
      if (type) {
        query.maintenance_type = type;
      }
      
      // 权限检查：只能查看自己组织相关的维修记录
      const robots = await db.find('robots', {
        $or: [
          { org_id: user.org_id },
          { service_provider_id: user.org_id }
        ]
      });
      
      const robotIds = robots.map(r => r._id);
      query.robot_id = { $in: robotIds };
      
      // 分页查询
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;
      
      const total = await db.count('maintenance_log', query);
      const logs = await db.find('maintenance_log', query, {
        sort: { created_at: -1 },
        limit: limitNum,
        skip
      });
      
      // 获取关联信息
      const enrichedLogs = await Promise.all(
        logs.map(async (log) => {
          const [robot, technician] = await Promise.all([
            db.findOne('robots', { _id: log.robot_id }),
            log.technician_id ? db.findOne('users', { _id: log.technician_id }) : null
          ]);
          
          return {
            ...log,
            robot: robot ? {
              _id: robot._id,
              sn: robot.sn,
              brand: robot.brand,
              model: robot.model
            } : null,
            technician: technician ? {
              _id: technician._id,
              display_name: technician.display_name
            } : null
          };
        })
      );
      
      return api.success(res, {
        logs: enrichedLogs,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      });
      
    } catch (error: any) {
      console.error('获取维修记录失败:', error);
      return api.internalError(res, '获取维修记录失败');
    }
  }

  if (req.method === 'POST') {
    try {
      const maintenanceData = req.body;
      
      // 验证必填字段
      if (!maintenanceData.robot_id || !maintenanceData.title || !maintenanceData.operation_content) {
        return api.badRequest(res, '缺少必要字段');
      }
      
      // 检查机器人是否存在且有权限
      const robot = await db.findOne('robots', { _id: maintenanceData.robot_id });
      if (!robot) {
        return api.notFound(res, '机器人不存在');
      }
      
      // 权限检查：必须是机器人所属组织或服务商
      const hasPermission = robot.org_id === user.org_id || 
                           robot.service_provider_id === user.org_id;
      if (!hasPermission) {
        return api.forbidden(res, '无权为此机器人添加维修记录');
      }
      
      // 创建维修记录
      const maintenanceLog = await db.insert('maintenance_log', {
        ...maintenanceData,
        created_by: user._id,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      // 创建时间线事件
      await db.insert('timeline_events', {
        robot_id: maintenanceData.robot_id,
        event_type: 'maintenance',
        reference_id: maintenanceLog._id,
        title: `维修记录: ${maintenanceData.title}`,
        description: maintenanceData.operation_content,
        metadata: {
          maintenance_type: maintenanceData.maintenance_type,
          duration: maintenanceData.duration,
          is_successful: maintenanceData.is_successful
        },
        created_by: user._id,
        created_at: new Date()
      });
      
      // 更新机器人的最后维修时间
      await db.update('robots', maintenanceData.robot_id, {
        'specs.last_maintenance_date': new Date(),
        updated_at: new Date()
      });
      
      return api.created(res, maintenanceLog, '维修记录创建成功');
      
    } catch (error: any) {
      console.error('创建维修记录失败:', error);
      return api.internalError(res, '创建维修记录失败');
    }
  }
  
  return api.methodNotAllowed(res);
}

export default withErrorHandler(withAuth(allowMethods(['GET', 'POST'])(handler)));