// src/pages/api/tickets/[id]/comments.ts
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

        if (req.method === 'POST') {
          try {
            const { content } = req.body;

            if (!content || content.trim().length === 0) {
              return api.badRequest(res, '评论内容不能为空');
            }

            if (content.length > 500) {
              return api.badRequest(res, '评论内容不能超过500字');
            }

            // 验证工单存在
            const ticket = await db.findOne('tickets', { _id: id as string });
            if (!ticket) {
              return api.notFound(res, '工单不存在');
            }

            // 创建评论
            const comment = await db.insert('comments', {
              ticket_id: id,
              content: content.trim(),
              created_by: user._id,
              created_at: new Date(),
              reference_id: ticket._id, // 添加引用ID
              reference_type: 'ticket' // 添加引用类型
            });

            // 添加到时间线
            await db.insert('timeline_events', {
              ticket_id: id as string,
              robot_id: ticket.robot_id,
              event_type: 'comment_added',
              title: '添加评论',
              description: content.trim().substring(0, 100) + (content.length > 100 ? '...' : ''),
              metadata: {
                comment_id: comment._id,
                created_by: user._id
              },
              created_by: user._id,
              created_at: new Date()
            });

            // 获取用户信息
            const commentWithUser = {
              ...comment,
              created_by_user: {
                _id: user._id,
                display_name: user.display_name || user.email?.split('@')[0],
                email: user.email
              }
            };

            return api.created(res, commentWithUser, '评论添加成功');
          } catch (error: any) {
            console.error('添加评论失败:', error);
            return api.internalError(res, '添加评论失败');
          }
        }
      }
    )
  )
);