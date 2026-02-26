// src/pages/api/tickets/[id]/stages/summary/complete.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, withErrorHandler, allowMethods } from '@/lib/api';
import { db } from '@/lib/db/operations';
import { api } from '@/lib/api';

export default withErrorHandler(
  withAuth(
    allowMethods(['POST'])(
      async (req: NextApiRequest, res: NextApiResponse) => {
        const { id } = req.query;
        const user = (req as any).user;

        try {
          // 验证工单存在
          const ticket = await db.findOne('tickets', { _id: id as string });
          if (!ticket) {
            return api.notFound(res, '工单不存在');
          }

          // 验证权限（只有服务商可以确认完成总结）
          if (!user.role.includes('service')) {
            return api.forbidden(res, '只有服务商可以确认完成总结');
          }

          const { completed_at } = req.body;

          // 更新总结阶段状态
          const summaryStage = await db.findOne('ticket_stages', {
            ticket_id: id,
            stage_type: 'summary'
          });

          if (summaryStage) {
            await db.update('ticket_stages', summaryStage._id, {
              status: 'completed',
              completed_at: completed_at ? new Date(completed_at) : new Date(),
              updated_at: new Date()
            });
          }

          // 更新时间线
                    const timelineExisting = await db.findOne('ticket_timeline', {
                      ticket_id: id,
                      stage_type: 'summary'
                    });
          
                    if (timelineExisting) {
                      await db.update('ticket_timeline', timelineExisting._id, {
                        status: 'completed',
                        end_date: completed_at ? new Date(completed_at) : new Date(),
                        updated_at: new Date()
                      });
                    } else {
                      await db.insert('ticket_timeline', {
                        ticket_id: id,
                        stage_type: 'summary',
                        start_date: summaryStage?.created_at || new Date(),
                        end_date: completed_at ? new Date(completed_at) : new Date(),
                        status: 'completed',
                        created_at: new Date(),
                        updated_at: new Date()
                      });
                    }

          // 添加时间线事件
          await db.insert('timeline_events', {
            ticket_id: id as string,
            robot_id: ticket.robot_id,
            event_type: 'summary_completed',
            title: '完成总结确认',
            description: `完成总结已由 ${user.display_name || user.email} 确认完成`,
            metadata: {
              completed_by: user._id,
              completed_at: completed_at
            },
            created_by: user._id,
            created_at: new Date(),
          });

          // 更新工单状态为等待客户确认
          await db.update('tickets', id as string, {
            status: 'pending',
            updated_at: new Date()
          });

          return api.success(res, null, '完成总结确认成功');
        } catch (error: any) {
          console.error('确认完成总结失败:', error);
          return api.internalError(res, '确认完成总结失败');
        }
      }
    )
  )
);