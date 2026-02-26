//src/pages/api/comments/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, withErrorHandler, allowMethods } from '@/lib/api';
import { db } from '@/lib/db/operations';
import { api } from '@/lib/api';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = (req as any).user;

  if (req.method === 'GET') {
    try {
      const { robot_id, page = '1', limit = '20' } = req.query;
      
      if (!robot_id) {
        return api.badRequest(res, '机器人ID不能为空');
      }
      
      // 检查机器人权限
      const robot = await db.findOne('robots', { _id: robot_id as string });
      if (!robot) {
        return api.notFound(res, '机器人不存在');
      }
      
      const hasPermission = robot.org_id === user.org_id || 
                           robot.service_provider_id === user.org_id;
      if (!hasPermission) {
        return api.forbidden(res, '无权查看此机器人的评论');
      }
      
      // 分页查询
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;
      
      const query = { robot_id: robot_id as string };
      const total = await db.count('comments', query);
      const comments = await db.find('comments', query, {
        sort: { created_at: -1 },
        limit: limitNum,
        skip
      });
      
      return api.success(res, {
        comments,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      });
      
    } catch (error: any) {
      console.error('获取评论失败:', error);
      return api.internalError(res, '获取评论失败');
    }
  }

  if (req.method === 'POST') {
    try {
      const { robot_id, content, attachments = [] } = req.body;
      
      // 验证必填字段
      if (!robot_id || !content) {
        return api.badRequest(res, '缺少必要字段');
      }
      
      if (content.length > 200) {
        return api.badRequest(res, '评论内容不能超过200字');
      }
      
      // 检查机器人权限
      const robot = await db.findOne('robots', { _id: robot_id });
      if (!robot) {
        return api.notFound(res, '机器人不存在');
      }
      
      const hasPermission = robot.org_id === user.org_id || 
                           robot.service_provider_id === user.org_id;
      if (!hasPermission) {
        return api.forbidden(res, '无权为此机器人添加评论');
      }
      
      // 创建评论
      const comment = await db.insert('comments', {
        robot_id,
        content,
        author_id: user._id,
        author_name: user.display_name,
        attachments,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      // 创建时间线事件
      await db.insert('timeline_events', {
        robot_id,
        event_type: 'comment_added',
        reference_id: comment._id,
        title: '添加评论',
        description: content,
        metadata: {
          author: user.display_name
        },
        created_by: user._id,
        created_at: new Date()
      });
      
      return api.created(res, comment, '评论添加成功');
      
    } catch (error: any) {
      console.error('添加评论失败:', error);
      return api.internalError(res, '添加评论失败');
    }
  }
  
  return api.methodNotAllowed(res);
}

export default withErrorHandler(withAuth(allowMethods(['GET', 'POST'])(handler)));