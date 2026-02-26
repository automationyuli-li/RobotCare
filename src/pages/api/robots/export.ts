//src/pages/api/robots/export.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import * as XLSX from 'xlsx';
import { withAuth, withErrorHandler } from '@/lib/api';
import { db } from '@/lib/db/operations';
import { api } from '@/lib/api';
import { format } from 'date-fns';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return api.methodNotAllowed(res);
  }

  const user = (req as any).user;
  const { 
    robot_id: robotId,
    start_date, 
    end_date, 
    event_types, 
    include_attachments = false,
    format = 'excel'
   } = req.body;

   // 验证必要参数
  if (!robotId) {
    return api.badRequest(res, '机器人ID不能为空');
  }

  try {
    // 检查机器人权限
    const robot = await db.findOne('robots', { _id: robotId });
    if (!robot) {
      return api.notFound(res, '机器人不存在');
    }
    
    const hasPermission = robot.org_id === user.org_id || 
                         robot.service_provider_id === user.org_id;
    if (!hasPermission) {
      return api.forbidden(res, '无权导出此机器人的报告');
    }
    
    // 构建查询条件
    const query: any = { robot_id: robotId };
    
    if (start_date || end_date) {
      query.created_at = {};
      if (start_date) {
        query.created_at.$gte = new Date(start_date);
      }
      if (end_date) {
        query.created_at.$lte = new Date(end_date);
      }
    }
    
    if (event_types && event_types.length > 0) {
      query.event_type = { $in: event_types };
    }
    
    // 获取时间线事件
    const timelineEvents = await db.find('timeline_events', query, {
      sort: { created_at: -1 }
    });
    
    // 获取事件详情
    const eventsWithDetails = await Promise.all(
      timelineEvents.map(async (event) => {
        let details = {};
        let referenceData = null;
        
        // 根据事件类型获取关联数据
        switch (event.event_type) {
          case 'ticket_created':
            const ticket = await db.findOne('tickets', { _id: event.reference_id });
            if (ticket) {
              referenceData = {
                ticket_number: ticket.ticket_number,
                status: ticket.status,
                priority: ticket.priority
              };
            }
            break;
            
          case 'maintenance':
            const maintenance = await db.findOne('maintenance_log', { _id: event.reference_id });
            if (maintenance) {
              referenceData = {
                maintenance_type: maintenance.maintenance_type,
                duration: maintenance.duration,
                parts_used: maintenance.parts_used?.join(', ')
              };
            }
            break;
            
          case 'document_added':
            const document = await db.findOne('library', { _id: event.reference_id });
            if (document) {
              referenceData = {
                document_type: document.document_type,
                file_name: document.file_name
              };
            }
            break;
            
          case 'comment_added':
            const comment = await db.findOne('comments', { _id: event.reference_id });
            if (comment) {
              referenceData = {
                author: comment.author_name,
                content: comment.content
              };
            }
            break;
        }
        
        // 获取创建者信息
        const creator = await db.findOne('users', { _id: event.created_by });
        
        return {
          事件类型: getEventTypeChinese(event.event_type),
          标题: event.title,
          描述: event.description,
          关联数据: referenceData ? JSON.stringify(referenceData) : '',
          创建人: creator?.display_name || '未知',
          创建时间: new Date(event.created_at).toLocaleString('zh-CN'),
          备注: event.metadata ? JSON.stringify(event.metadata) : ''
        };
      })
    );
    
    // 创建Excel工作簿
    const wb = XLSX.utils.book_new();
    
    // 添加事件工作表
    const wsEvents = XLSX.utils.json_to_sheet(eventsWithDetails);
    XLSX.utils.book_append_sheet(wb, wsEvents, '时间线事件');
    
    // 添加机器人基本信息工作表
    const robotData = [
      {
        字段: '序列号',
        值: robot.sn
      },
      {
        字段: '品牌型号',
        值: `${robot.brand} ${robot.model}`
      },
      {
        字段: '安装位置',
        值: robot.location || '未设置'
      },
      {
        字段: '当前状态',
        值: getStatusChinese(robot.status)
      },
      {
        字段: '安装时间',
        值: robot.specs?.installation_date 
          ? new Date(robot.specs.installation_date).toLocaleDateString('zh-CN') 
          : '未知'
      },
      {
        字段: '保修截止',
        值: robot.specs?.warranty_end 
          ? new Date(robot.specs.warranty_end).toLocaleDateString('zh-CN') 
          : '未知'
      },
      {
        字段: '最后维修',
        值: robot.specs?.last_maintenance_date 
          ? new Date(robot.specs.last_maintenance_date).toLocaleDateString('zh-CN') 
          : '从未维修'
      }
    ];
    const wsRobot = XLSX.utils.json_to_sheet(robotData);
    XLSX.utils.book_append_sheet(wb, wsRobot, '机器人信息');
    
    // 设置列宽
    const wscols = [
      { wch: 15 }, // 事件类型
      { wch: 30 }, // 标题
      { wch: 50 }, // 描述
      { wch: 30 }, // 关联数据
      { wch: 15 }, // 创建人
      { wch: 20 }, // 创建时间
      { wch: 30 }  // 备注
    ];
    wsEvents['!cols'] = wscols;
    
    // 生成Excel文件
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // 设置响应头
    const fileName = `机器人报告_${robot.sn}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    
    return res.status(200).send(excelBuffer);
    
  } catch (error: any) {
    console.error('导出报告失败:', error);
    return api.internalError(res, '导出报告失败: ' + error.message);
  }
}

// 辅助函数
function getEventTypeChinese(type: string): string {
  const map: Record<string, string> = {
    'ticket_created': '上报异常',
    'maintenance': '记录维修',
    'document_added': '上传文档',
    'comment_added': '添加评论',
    'status_changed': '状态变更'
  };
  return map[type] || type;
}

function getStatusChinese(status: string): string {
  const map: Record<string, string> = {
    'active': '运行正常',
    'maintenance': '维护中',
    'fault': '故障',
    'inactive': '离线'
  };
  return map[status] || status;
}

export default withErrorHandler(withAuth(handler));