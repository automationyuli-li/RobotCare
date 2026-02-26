// src/pages/api/tickets/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, withErrorHandler, allowMethods } from '@/lib/api';
import { db } from '@/lib/db/operations';
import { api } from '@/lib/api';
import { uploadFile } from '@/lib/storage';

import { IncomingForm } from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false, // 禁用默认的 bodyParser
  },
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const user = (req as any).user;
    const { 
      page = '1', 
      limit = '20', 
      status, 
      priority, 
      search,
      customer_id,
      robot_id,
      assigned_to
    } = req.query;

    try {
      // 构建查询条件
      const query: any = {};
      
      // 权限过滤：服务商只能看到自己客户的工单，终端客户只能看到自己的工单
      if (user.role.includes('service')) {
        // 服务商：获取自己服务客户的工单
        const contracts = await db.find('service_contracts', { 
          service_provider_id: user.org_id,
          status: 'active'
        });
        
        const customerIds = contracts.map(c => c.end_customer_id);
        if (customerIds.length > 0) {
          query.customer_id = { $in: customerIds };
        } else {
          // 没有客户，返回空数组
          return api.success(res, { tickets: [], total: 0, page: 1, totalPages: 0 });
        }
      } else if (user.role.includes('end')) {
        // 终端客户：只能看到自己的工单
        query.customer_id = user.org_id;
      }

      // 状态筛选
      if (status) {
        query.status = status;
      }

      // 优先级筛选
      if (priority) {
        query.priority = priority;
      }

      // 客户筛选
      if (customer_id) {
        query.customer_id = customer_id;
      }

      // 机器人筛选
      if (robot_id) {
        query.robot_id = robot_id;
      }

      // 添加工程师筛选
      if (assigned_to) {
        if (assigned_to === 'none') {
          query.assigned_to = { $in: [null, {$exists: false }] };
        } else  if (assigned_to) {
          query.assigned_to = assigned_to;
        }
      }

      // 搜索条件（工单号或标题）
      if (search) {
        query.$or = [
          { ticket_number: { $regex: search, $options: 'i' } },
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      // 计算分页
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // 获取工单总数
      const total = await db.count('tickets', query);

      // 获取工单列表
      const tickets = await db.find('tickets', query, {
        limit: limitNum,
        skip,
        sort: { created_at: -1 }
      });

      // 获取关联数据（客户、机器人、用户信息）
      const enrichedTickets = await Promise.all(
        tickets.map(async (ticket) => {
          const [customer, robot, createdByUser, assignedUser] = await Promise.all([
            db.findOne('organizations', { _id: ticket.customer_id }),
            db.findOne('robots', { _id: ticket.robot_id }),
            db.findOne('users', { _id: ticket.created_by }),
            ticket.assigned_to ? db.findOne('users', { _id: ticket.assigned_to }) : null,
          ]);

          return {
            ...ticket,
            customer: customer ? {
              _id: customer._id,
              name: customer.name,
              type: customer.type
            } : null,
            robot: robot ? {
              _id: robot._id,
              sn: robot.sn,
              brand: robot.brand,
              model: robot.model
            } : null,
            created_by_user: createdByUser ? {
              _id: createdByUser._id,
              display_name: createdByUser.display_name,
              email: createdByUser.email
            } : null,
            assigned_to_user: assignedUser ? {
              _id: assignedUser._id,
              display_name: assignedUser.display_name,
              email: assignedUser.email
            } : null,
          };
        })
      );

      return api.success(res, {
        tickets: enrichedTickets,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        meta: {
          filters: { status, priority, search }
        }
      });

    } catch (error: any) {
      console.error('获取工单列表失败:', error);
      return api.internalError(res, '获取工单列表失败');
    }
  } else if (req.method === 'POST') {
    // 创建工单
    try {
      // 使用 formidable 解析 multipart/form-data
      const form = new IncomingForm({
        multiples: true,
        maxFileSize: 100 * 1024 * 1024, // 100MB
        keepExtensions: true,
      });

      return new Promise<void>((resolve, reject) => {
        form.parse(req, async (err, fields, files) => {
          if (err) {
            console.error('解析表单数据失败:', err);
            api.badRequest(res, '表单数据解析失败');
            return reject(err);
          }

          const user = (req as any).user;
          
          // 获取字段值的辅助函数
          const getFieldValue = (field: any): string => {
            if (Array.isArray(field)) return field[0] || '';
            return field || '';
          };

          const title = getFieldValue(fields.title);
          const robot_id = getFieldValue(fields.robot_id);
          const description = getFieldValue(fields.description);
          const robot_status = getFieldValue(fields.robot_status) || 'fault'; // 默认故障状态
          const priority = getFieldValue(fields.priority) || 'medium'; // 默认中优先级
          const metadataStr = getFieldValue(fields.metadata);
          

          // 验证必填字段
          if (!title || !robot_id) {
            return api.badRequest(res, '标题和机器人ID为必填项');
          }

          try {
            // 检查机器人是否存在且有权限
            const robot = await db.findOne('robots', { _id: robot_id });
            if (!robot) {
              return api.notFound(res, '机器人不存在');
            }
          
            let hasPermission = false;

            // 如果是终端用户，只能为自己的机器人创建工单
            if (user.role.includes('end')) {
              hasPermission = robot.org_id === user.org_id;
            } 
            // 如果是服务商，只能为自己服务的客户创建工单
            else if (user.role.includes('service')) {
              // 检查是否存在有效的服务合约
              const activeContract = await db.findOne('service_contracts', {
                service_provider_id: user.org_id,
                end_customer_id: robot.org_id,
                status: 'active'
              });
              hasPermission = !!activeContract;
            }

            if (!hasPermission) {
              console.error('权限不足:', {
                userRole: user.role,
                userOrg: user.org_id,
                robotOrg: robot.org_id,
                robotProvider: robot.service_provider_id
              });
              return api.forbidden(res, '您无权为此机器人创建工单');
            }
            // 验证机器人状态值
            const validRobotStatuses = ['active', 'maintenance', 'fault', 'inactive'];
            if (!validRobotStatuses.includes(robot_status)) {
              return api.badRequest(res, '机器人状态值无效');
            }

            // 验证优先级值
            const validPriorities = ['low', 'medium', 'high', 'urgent'];
            if (!validPriorities.includes(priority)) {
              return api.badRequest(res, '优先级值无效');
            }
            // 获取工单序号
            const lastTicket = await db.find('tickets', {}, { 
              limit: 1, 
              sort: { created_at: -1 } 
            });
            let lastNumber = 0;
            if (lastTicket.length > 0 && lastTicket[0].ticket_number) {
              const match = lastTicket[0].ticket_number.match(/RB(\d+)/);
              if (match) lastNumber = parseInt(match[1], 10);
            }
            const ticketNumber = `RB${String(lastNumber + 1).padStart(5, '0')}`;

            // 解析元数据
            let metadata = {};
            if (metadataStr) {
              try {
                metadata = JSON.parse(metadataStr);
              } catch (e) {
                console.error('解析metadata失败:', e);
                // 如果解析失败，创建一个默认的metadata
                metadata = { raw_metadata: metadataStr };
              }
            }

            // 构建工单数据
            const newTicket : any = { // 注意：any 类型，后续可以定义更严格的类型
              ticket_number: ticketNumber,
              title: title,
              description: description || '',
              customer_id: robot.org_id,
              robot_id: robot_id,
              service_provider_id: robot.service_provider_id,
              created_by: user._id,
              status: 'open',
              priority: priority,
              metadata: {
                ...metadata,
                attachments_count: files.attachments ? 
                  (Array.isArray(files.attachments) ? files.attachments.length : 1) : 0
              },
              created_at: new Date(),
              updated_at: new Date(),

            };

            console.log('准备插入工单数据:', newTicket);

            const ticket = await db.insert('tickets', newTicket);
            console.log('工单创建成功，ID:', ticket._id);

            // 更新机器人状态
            console.log(`更新机器人状态: ${robot.status} -> ${robot_status}`);
            await db.update('robots', robot_id, {
              status: robot_status,
              updated_at: new Date(),
            });

            // 创建机器人状态变更的时间线事件
            if (robot.status !== robot_status) {
              await db.insert('timeline_events', {
                robot_id: robot_id,
                event_type: 'status_changed',
                title: '状态变更',
                description: `机器人状态从"${getStatusChinese(robot.status)}"变更为"${getStatusChinese(robot_status)}"`,
                metadata: {
                  previous_status: robot.status,
                  new_status: robot_status,
                  changed_by: user._id,
                  reason: `工单创建: ${ticketNumber}`
                },
                created_by: user._id,
                created_at: new Date(),
              });
              console.log('机器人状态变更事件创建成功');
            }

            // 处理文件上传（如果有）
            const attachmentIds: string[] = [];
            // 在 form.parse 回调内，处理完字段后，处理文件
            if (files.attachments) {
              const attachments = Array.isArray(files.attachments) ? files.attachments : [files.attachments];
              const uploadPromises = attachments.map(async (file) => {
                const fileContent = await fs.promises.readFile(file.filepath);
                const fileId = await uploadFile(fileContent, `tickets/${ticketNumber}/${file.originalFilename}`);
                return {
                  fileId,
                  name: file.originalFilename,
                  size: file.size,
                  type: file.mimetype,
                };
              });
              const uploadedFiles = await Promise.all(uploadPromises);
              // 存入工单数据
              newTicket.attachments = uploadedFiles;
            }

            // 创建初始时间线事件
            const timelineEvent = await db.insert('timeline_events', {
              robot_id: robot_id,
              event_type: 'ticket_created',
              reference_id: ticket._id,
              title: '工单创建',
              description: `创建了工单 ${ticketNumber}: ${title}`,
              metadata: {
                ticket_number: ticketNumber,
                priority: priority,
                robot_status: robot_status,
                created_by: user._id,
                attachments_count: attachmentIds.length
              },
              created_by: user._id,
              created_at: new Date(),
            });

            console.log('时间线事件创建成功:', timelineEvent._id);

            return api.created(res, {
              ...ticket,
              timeline_event_id: timelineEvent._id,
              attachment_ids: attachmentIds,
              robot_status_updated: robot_status,
              previous_robot_status: robot.status
            }, '工单创建成功');
            resolve();
          } catch (error: any) {
            console.error('创建工单失败:', error);
            console.error('错误堆栈:', error.stack);
            api.internalError(res, `创建工单失败: ${error.message}`);
            return reject(error);
          }
        });
      });
      // 在文件末尾添加辅助函数
      function getStatusChinese(status: string): string {
        const map: Record<string, string> = {
          'active': '运行正常',
          'maintenance': '维护中',
          'fault': '故障',
          'inactive': '离线'
        };
        return map[status] || status;
      }

    } catch (error: any) {
      console.error('处理工单创建请求失败:', error);
      console.error('错误堆栈:', error.stack);
      return api.internalError(res, `处理工单创建请求失败: ${error.message}`);
    }
  }
}

export default withErrorHandler(withAuth(allowMethods(['GET', 'POST'])(handler)));