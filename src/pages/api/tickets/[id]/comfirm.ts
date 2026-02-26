// src/pages/api/tickets/[id]/confirm.ts
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

          // 验证权限（只有终端客户可以确认）
          if (!user.role.includes('end')) {
            return api.forbidden(res, '只有终端客户可以确认工单完成');
          }

          // 验证客户身份
          if (ticket.customer_id !== user.org_id) {
            return api.forbidden(res, '您无权确认此工单');
          }

          const { rating, comment, confirmed_at } = req.body;

          if (!rating || rating < 1 || rating > 5) {
            return api.badRequest(res, '请提供有效的评分（1-5分）');
          }

          // 创建评分记录
          const ratingRecord = await db.insert('ratings', {
            ticket_id: id,
            score: rating,
            comment: comment || '',
            created_by: user._id,
            created_at: confirmed_at ? new Date(confirmed_at) : new Date()
          });

          // 更新客户确认阶段
          const confirmStage = await db.findOne('ticket_stages', {
            ticket_id: id,
            stage_type: 'customer_confirmation'
          });

          if (confirmStage) {
            await db.update('ticket_stages', confirmStage._id, {
              status: 'completed',
              content: comment || '客户已确认',
              completed_at: confirmed_at ? new Date(confirmed_at) : new Date(),
              updated_at: new Date(),
              metadata: {
                rating,
                rating_id: ratingRecord._id
              }
            });
          } else {
            // 如果没有确认阶段，创建一个
            await db.insert('ticket_stages', {
              ticket_id: id,
              stage_type: 'customer_confirmation',
              content: comment || '客户已确认',
              status: 'completed',
              completed_at: confirmed_at ? new Date(confirmed_at) : new Date(),
              created_by: user._id,
              created_at: new Date(),
              updated_at: new Date(),
              metadata: {
                rating,
                rating_id: ratingRecord._id
              }
            });
          }

          // 更新时间线
          const timelineExisting = await db.findOne('ticket_timeline', {
            ticket_id: id,
            stage_type: 'customer_confirmation'
          });
          if (timelineExisting) {
            await db.update('ticket_timeline', timelineExisting._id, {
              status: 'completed',
              end_date: confirmed_at ? new Date(confirmed_at) : new Date(),
              updated_at: new Date()
            });
          }

          // 添加时间线事件
          await db.insert('timeline_events', {
            ticket_id: id as string,
            robot_id: ticket.robot_id,
            event_type: 'customer_confirmed',
            title: '客户确认完成',
            description: `客户已完成确认，评分：${rating}分${comment ? '，留言：' + comment : ''}`,
            metadata: {
              rating,
              comment: comment || '',
              confirmed_by: user._id,
              rating_id: ratingRecord._id
            },
            created_by: user._id,
            created_at: new Date(),
          });

          // 更新工单状态为已解决
          await db.update('tickets', id as string, {
            status: 'resolved',
            resolved_at: confirmed_at ? new Date(confirmed_at) : new Date(),
            resolution_notes: comment || '客户已确认完成',
            updated_at: new Date(),
            rating: {
              score: rating,
              comment: comment,
              created_at: confirmed_at ? new Date(confirmed_at) : new Date()
            }
          });

          return api.success(res, {
            rating: ratingRecord,
            ticket_status: 'resolved'
          }, '工单确认成功');
        } catch (error: any) {
          console.error('工单确认失败:', error);
          return api.internalError(res, '工单确认失败');
        }
      }
    )
  )
);