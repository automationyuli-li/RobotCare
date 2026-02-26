// src/lib/db/library-operations.ts
import { db } from './operations';
import type { 
  LibraryDocument, 
  LibraryAttachment, 
  LibraryCategory,
  LibrarySearchFilters 
} from '@/types/library';

export class LibraryOperations {
  // 文档操作
  static async createDocument(data: Omit<LibraryDocument, '_id' | 'created_at' | 'updated_at' | 'view_count' | 'helpful_count'>) {
    const document: Omit<LibraryDocument, '_id'> = {
      ...data,
      view_count: 0,
      helpful_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    return await db.insert('library', document);
  }

  static async getDocumentById(id: string) {
    const document = await db.findOne('library', { _id: id });
    if (document) {
      // 增加查看次数
      await db.update('library', id, {
        view_count: (document.view_count || 0) + 1,
        updated_at: new Date(),
      });
      return { ...document, view_count: (document.view_count || 0) + 1 };
    }
    return null;
  }

  static async updateDocument(id: string, data: Partial<LibraryDocument>, updatedBy: string) {
    const updateData = {
      ...data,
      updated_at: new Date(),
      updated_by: updatedBy,
    };
    
    return await db.update('library', id, updateData);
  }

  static async deleteDocument(id: string) {
    // 删除文档前先删除关联的附件
    await db.deleteMany('library_attachments', { document_id: id });
    return await db.delete('library', id);
  }

  static async searchDocuments(filters: LibrarySearchFilters, orgId: string) {
    const {
      search,
      category,
      status,
      created_by,
      date_from,
      date_to,
      sort_by = 'created_at',
      sort_order = 'desc',
      page = 1,
      limit = 20,
    } = filters;

    // 构建查询条件
    const query: any = { org_id: orgId };
    
    // 状态筛选
    if (status) {
      query.status = status;
    }
    
    // 分类筛选
    if (category) {
      query.category = category;
    }
    
    // 创建人筛选
    if (created_by) {
      query.created_by = created_by;
    }
    
    // 时间范围筛选
    if (date_from || date_to) {
      query.created_at = {};
      if (date_from) {
        query.created_at.$gte = new Date(date_from);
      }
      if (date_to) {
        query.created_at.$lte = new Date(date_to);
      }
    }
    
    // 关键词搜索
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'content.fault_phenomenon': { $regex: search, $options: 'i' } },
        { 'content.diagnosis_steps': { $regex: search, $options: 'i' } },
        { 'content.solution': { $regex: search, $options: 'i' } },
        { 'content.preventive_measures': { $regex: search, $options: 'i' } },
        { keywords: { $regex: search, $options: 'i' } },
      ];
    }

    // 计算分页
    const skip = (page - 1) * limit;

    // 获取总数
    const total = await db.count('library', query);

    // 获取文档列表
    const documents = await db.find('library', query, {
      skip,
      limit,
      sort: { [sort_by]: sort_order === 'desc' ? -1 : 1 },
    });

    // 获取创建人信息
    const enrichedDocuments = await Promise.all(
      documents.map(async (doc: any) => {
        const creator = await db.findOne('users', { _id: doc.created_by });
        return {
          ...doc,
          created_by_name: creator?.display_name,
          created_by_email: creator?.email,
        };
      })
    );

    return {
      documents: enrichedDocuments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 附件操作
  static async createAttachment(data: Omit<LibraryAttachment, '_id' | 'uploaded_at'>) {
    const attachment: Omit<LibraryAttachment, '_id'> = {
      ...data,
      uploaded_at: new Date(),
    };
    
    return await db.insert('library_attachments', attachment);
  }

  static async getDocumentAttachments(documentId: string) {
    return await db.find('library_attachments', { 
      document_id: documentId 
    }, {
      sort: { content_section: 1, sort_order: 1 }
    });
  }

  static async deleteAttachment(attachmentId: string) {
    return await db.delete('library_attachments', attachmentId);
  }

  static async updateAttachment(attachmentId: string, data: Partial<LibraryAttachment>) {
    return await db.update('library_attachments', attachmentId, {
      ...data,
      updated_at: new Date(),
    });
  }

  // 分类操作
  static async getCategories(orgId: string) {
    return await db.find('library_categories', { org_id: orgId }, {
      sort: { sort_order: 1 }
    });
  }

  static async createCategory(data: Omit<LibraryCategory, '_id' | 'created_at' | 'updated_at'>) {
    const category: Omit<LibraryCategory, '_id'> = {
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    return await db.insert('library_categories', category);
  }

  // 权限检查：检查客户是否有权限访问服务商的知识库
  static async checkCustomerAccess(customerOrgId: string, serviceProviderOrgId: string) {
    const contract = await db.findOne('service_contracts', {
      service_provider_id: serviceProviderOrgId,
      end_customer_id: customerOrgId,
      status: 'active',
    });
    
    return !!contract;
  }
}

export default LibraryOperations;