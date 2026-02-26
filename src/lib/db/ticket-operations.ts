// src/lib/db/ticket-operations.ts
import { db } from './operations';

export const ticketOperations = {
  // 获取工单阶段
  async getTicketStages(ticketId: string) {
    return await db.find('ticket_stages', { 
      ticket_id: ticketId 
    }, { 
      sort: { created_at: 1 } 
    });
  },
  
  // 创建或更新工单阶段
  async upsertTicketStage(stageData: any) {
    const { ticket_id, stage_type } = stageData;
    
    // 查找是否已存在
    const existing = await db.findOne('ticket_stages', {
      ticket_id,
      stage_type
    });
    
    if (existing) {
      // 更新
      return await db.update('ticket_stages', existing._id, {
        ...stageData,
        updated_at: new Date()
      });
    } else {
      // 创建
      return await db.insert('ticket_stages', {
        ...stageData,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  },
  
  // 获取工单时间线
  async getTicketTimeline(ticketId: string) {
    return await db.find('timeline_events', {
      ticket_id: ticketId
    }, {
      sort: { created_at: -1 }
    });
  }
};