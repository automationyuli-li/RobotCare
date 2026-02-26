// src/pages/api/tickets/[id]/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, withErrorHandler, allowMethods } from '@/lib/api';
import { db } from '@/lib/db/operations';
import { api } from '@/lib/api';

export default withErrorHandler(
  withAuth(
    allowMethods(['GET', 'PUT', 'DELETE'])(
      async (req: NextApiRequest, res: NextApiResponse) => {
        const { id } = req.query;
        const user = (req as any).user;

        try {
          // 获取工单详情
          if (req.method === 'GET') {
            const ticket = await db.findOne('tickets', { _id: id as string });
            
            if (!ticket) {
              return api.notFound(res, '工单不存在');
            }

            // 权限检查
            const hasPermission = await checkTicketPermission(user, ticket);
            if (!hasPermission) {
              return api.forbidden(res, '没有权限访问此工单');
            }

            // 获取关联数据
            const [
              customer,
              robot,
              serviceProvider,
              createdBy,
              assignedTo,
              stages,
              timeline
            ] = await Promise.all([
              db.findOne('organizations', { _id: ticket.customer_id }),
              db.findOne('robots', { _id: ticket.robot_id }),
              db.findOne('organizations', { _id: ticket.service_provider_id }),
              db.findOne('users', { _id: ticket.created_by }),
              ticket.assigned_to ? db.findOne('users', { _id: ticket.assigned_to }) : null,
              db.find('ticket_stages', { ticket_id: id as string }, { sort: { created_at: 1 } }),
              db.find('ticket_timeline', { ticket_id: id as string }, { sort: { start_date: 1 } }),
            ]);

            // 获取时间线事件
            const timelineEvents = await db.find('timeline_events', {
              ticket_id: id as string,
            }, { sort: { created_at: -1 } });

            return api.success(res, {
              ticket: {
                ...ticket,
                customer,
                robot,
                service_provider: serviceProvider,
                created_by_user: createdBy,
                assigned_to_user: assignedTo,
                stages,
                timeline,
                timeline_events: timelineEvents,
              },
            });

          } else if (req.method === 'PUT') {
            // 更新工单
            const ticket = await db.findOne('tickets', { _id: id as string });
            
            if (!ticket) {
              return api.notFound(res, '工单不存在');
            }

            // 权限检查
            const hasPermission = await checkTicketPermission(user, ticket);
            if (!hasPermission) {
              return api.forbidden(res, '没有权限修改此工单');
            }

            const updateData = req.body;
            
            // 状态变更时记录时间线
            if (updateData.status && updateData.status !== ticket.status) {
              await db.insert('timeline_events', {
                ticket_id: id as string,
                robot_id: ticket.robot_id,
                event_type: 'status_changed',
                title: '状态变更',
                description: `工单状态从 ${ticket.status} 变更为 ${updateData.status}`,
                metadata: {
                  from_status: ticket.status,
                  to_status: updateData.status,
                  changed_by: user._id,
                },
                created_by: user._id,
                created_at: new Date(),
              });
            }

            // 如果分配了工程师，记录时间线事件
            if (updateData.assigned_to && updateData.assigned_to !== ticket.assigned_to) {
              const assignedUser = await db.findOne('users', { _id: updateData.assigned_to });
              
              await db.insert('timeline_events', {
                ticket_id: id as string,
                robot_id: ticket.robot_id,
                event_type: 'assigned',
                title: '工单分配',
                description: assignedUser 
                  ? `工单分配给 ${assignedUser.display_name}`
                  : '工单已分配',
                metadata: {
                  assigned_to: updateData.assigned_to,
                  assigned_by: user._id,
                  previous_assigned_to: ticket.assigned_to || null
                },
                created_by: user._id,
                created_at: new Date(),
              });

            // 发送通知（未来实现）
              console.log(`工单 ${ticket.ticket_number} 分配给 ${updateData.assigned_to}`);
            }

            const updatedTicket = await db.update('tickets', id as string, {
              ...updateData,
              updated_at: new Date(),
            } );
            return api.success(res, updatedTicket, '工单更新成功');

          } else if (req.method === 'DELETE') {
            // 删除工单（软删除）
            await db.update('tickets', id as string, {
              status: 'closed',
              deleted_at: new Date(),
            });
            
            return api.success(res, null, '工单已关闭');
          }
        } catch (error: any) {
          console.error('工单操作失败:', error);
          return api.internalError(res, '操作失败');
        }
      }
    )
  )
);

// 权限检查函数
async function checkTicketPermission(user: any, ticket: any): Promise<boolean> {
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
    // 工程师：检查是否被分配
    return ticket.assigned_to === user._id || 
           (user.org_id === ticket.customer_id) ||
           (user.org_id === ticket.service_provider_id);
  }
  return false;
}