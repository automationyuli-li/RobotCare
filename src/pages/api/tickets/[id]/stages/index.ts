// src/pages/api/tickets/[id]/stages/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, withErrorHandler, allowMethods } from '@/lib/api';
import { db } from '@/lib/db/operations';
import { api } from '@/lib/api';

export default withErrorHandler(
  withAuth(
    allowMethods(['GET', 'POST'])(
      async (req: NextApiRequest, res: NextApiResponse) => {
        const { id } = req.query;
        const user = (req as any).user;

        if (req.method === 'GET') {
          try {
            // 验证工单存在
            const ticket = await db.findOne('tickets', { _id: id as string });
            if (!ticket) {
              return api.notFound(res, '工单不存在');
            }

            // 权限检查
            const hasPermission = await checkTicketPermission(user, ticket);
            if (!hasPermission) {
              return api.forbidden(res, '没有权限查看此工单');
            }

            // 获取工单所有阶段
            const stages = await db.find('ticket_stages', { 
              ticket_id: id as string 
            }, { sort: { created_at: 1 } });
            
            return api.success(res, { stages });
          } catch (error: any) {
            console.error('获取工单阶段失败:', error);
            return api.internalError(res, '获取工单阶段失败');
          }
          
        } else if (req.method === 'POST') {
          try {
            // 验证请求数据
            const { stage_type, content, attachments = [], expected_date } = req.body;

            if (!stage_type || typeof content === 'undefined') {
              return api.badRequest(res, '阶段类型和内容为必填项');
            }

            // 验证阶段类型
            const validTypes = [
              'abnormal_description',
              'abnormal_analysis', 
              'required_parts',
              'on_site_solution',
              'summary',
              'customer_confirmation'
            ];
            if (!validTypes.includes(stage_type)) {
              return api.badRequest(res, '无效的阶段类型');
            }

            // 验证工单存在
            const ticket = await db.findOne('tickets', { _id: id as string });
            if (!ticket) {
              return api.notFound(res, '工单不存在');
            }

            // 权限检查
            const hasPermission = await checkTicketPermission(user, ticket);
            if (!hasPermission) {
              return api.forbidden(res, '没有权限修改此工单');
            }

            // 查找是否已存在该阶段
            const existingStage = await db.findOne('ticket_stages', {
              ticket_id: id,
              stage_type
            });

            let stage;
            if (existingStage) {
              // 更新现有阶段
              stage = await db.update('ticket_stages', existingStage._id, {
                content: String(content), // 确保是字符串
                attachments: Array.isArray(attachments) ? attachments : [],
                expected_date: expected_date ? new Date(expected_date) : null,
                updated_at: new Date(),
                updated_by: user._id,
                status: content ? 'in_progress' : existingStage.status
              });
            } else {
              // 创建新阶段
              stage = await db.insert('ticket_stages', {
                ticket_id: id,
                stage_type,
                content: String(content),
                attachments: Array.isArray(attachments) ? attachments : [],
                created_by: user._id,
                expected_date: expected_date ? new Date(expected_date) : null,
                created_at: new Date(),
                updated_at: new Date(),
                status: content ? 'in_progress' : 'not_started'
              });
            }

            // 更新或创建时间线
            const startDate = stage.created_at || new Date();
            const endDate = expected_date ? new Date(expected_date) : null;

            const timelineExisting = await db.findOne('ticket_timeline', {
              ticket_id: id,
              stage_type
            });

            if (timelineExisting) {
              await db.update('ticket_timeline', timelineExisting._id, {
                start_date: startDate,
                end_date: endDate,
                status: stage.status,
                updated_at: new Date()
              });
            } else {
              await db.insert('ticket_timeline', {
              ticket_id: id,
              stage_type,
              start_date: startDate,
              end_date: endDate,
              status: stage.status,
              created_at: new Date()
            });
          }
            // 添加时间线事件
            await db.insert('timeline_events', {
              ticket_id: id as string,
              robot_id: (await db.findOne('tickets', { _id: id as string })).robot_id,
              event_type: 'stage_updated',
              title: getStageTitle(stage_type),
              description: `${user.display_name || user.email} 更新了${getStageTitle(stage_type)}阶段`,
              metadata: {
                stage_type,
                updated_by: user._id,
                has_attachments: attachments.length > 0,
                ticket_number: ticket.ticket_number
              },
              created_by: user._id,
              created_at: new Date(),
            });

            return api.success(res, stage, '阶段保存成功');
            
          } catch (error: any) {
            console.error('保存工单阶段失败:', error);
            return api.internalError(res, '保存工单阶段失败');
          }
        }
      }
    )
  )
);

// 权限检查函数
async function checkTicketPermission(user: any, ticket: any): Promise<boolean> {
  try {
    if (user.role.includes('service_admin')) {
      // 服务商管理员：检查是否是自己的客户
      const contract = await db.findOne('service_contracts', {
        service_provider_id: user.org_id,
        end_customer_id: ticket.customer_id,
        status: 'active',
      });
      return !!contract;
    } else if (user.role.includes('end_admin')) {
      // 终端客户管理员：检查是否是自己的工单
      return ticket.customer_id === user.org_id;
    } else if (user.role.includes('engineer')) {
      // 工程师：检查是否被分配或属于相关组织
      return ticket.assigned_to === user._id || 
             (user.org_id === ticket.customer_id) ||
             (user.org_id === ticket.service_provider_id);
    }
    return false;
  } catch (error) {
    console.error('权限检查失败:', error);
    return false;
  }
}

function getStageTitle(stageType: string): string {
  const titles: Record<string, string> = {
    'abnormal_description': '异常描述',
    'abnormal_analysis': '异常分析',
    'required_parts': '所需备件',
    'on_site_solution': '现场解决',
    'summary': '完成总结',
    'customer_confirmation': '客户确认',
  };
  return titles[stageType] || stageType;
}