// src/pages/api/notifications/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, withErrorHandler, allowMethods } from '@/lib/api';
import { db } from '@/lib/db/operations';
import { api } from '@/lib/api';

export default withErrorHandler(
  withAuth(
    allowMethods(['POST'])(
      async (req: NextApiRequest, res: NextApiResponse) => {
        const user = (req as any).user;

        try {
          const { type, ticket_id, message, recipients } = req.body;

          // 验证必要字段
          if (!type || !ticket_id) {
            return api.badRequest(res, '缺少必要参数');
          }

          // 获取工单信息
          const ticket = await db.findOne('tickets', { _id: ticket_id });
          if (!ticket) {
            return api.notFound(res, '工单不存在');
          }

          // 创建通知记录
          const notification = await db.insert('notifications', {
            type,
            ticket_id,
            title: getNotificationTitle(type),
            message: message || getDefaultMessage(type, ticket),
            recipients: recipients || [],
            created_by: user._id,
            created_at: new Date(),
            status: 'pending'
          });

          // 这里可以集成实际的邮件/消息发送服务
          // 例如：发送邮件、企业微信消息等
          if (recipients && recipients.length > 0) {
            // await sendEmail(recipients, notification);
            console.log('发送通知给:', recipients, '内容:', notification);
          }

          return api.created(res, notification, '通知创建成功');
        } catch (error: any) {
          console.error('创建通知失败:', error);
          return api.internalError(res, '创建通知失败');
        }
      }
    )
  )
);

function getNotificationTitle(type: string): string {
  const titles: Record<string, string> = {
    'summary_completed': '工单完成总结',
    'customer_confirmed': '客户已确认',
    'assigned': '工单分配',
    'status_changed': '状态变更',
    'comment_added': '新评论'
  };
  return titles[type] || '工单通知';
}

function getDefaultMessage(type: string, ticket: any): string {
  switch (type) {
    case 'summary_completed':
      return `工单 ${ticket.ticket_number} 已完成总结，请客户确认`;
    case 'customer_confirmed':
      return `工单 ${ticket.ticket_number} 已获得客户确认`;
    case 'assigned':
      return `工单 ${ticket.ticket_number} 已分配`;
    default:
      return `工单 ${ticket.ticket_number} 有新的更新`;
  }
}