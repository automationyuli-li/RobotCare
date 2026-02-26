// src/types/library/index.ts
export interface LibraryDocument {
  _id: string;
  org_id: string;                    // 所属服务商组织ID
  title: string;                     // 主题/标题
  content: {
    fault_phenomenon: string;        // 故障现象
    diagnosis_steps: string;         // 诊断步骤
    solution: string;                // 解决方案
    preventive_measures: string;     // 预防措施
  };
  keywords: string[];                // 关键词标签
  status: 'draft' | 'published' | 'archived';
  category?: string;                 // 分类
  created_by: string;                // 创建人用户ID
  created_at: Date;
  updated_at: Date;
  updated_by?: string;               // 最后更新人
  view_count: number;                // 查看次数
  helpful_count: number;             // 有帮助次数
}

export interface LibraryAttachment {
  _id: string;
  document_id: string;               // 关联的知识库文档ID
  file_name: string;                 // 原始文件名
  file_type: string;                 // 文件类型：image/jpeg, video/mp4, application/pdf等
  file_size: number;                 // 文件大小（字节）
  cloud_path: string;                // 云存储路径
  thumbnail_url?: string;            // 缩略图URL（针对图片/视频）
  content_section: 'fault_phenomenon' | 'diagnosis_steps' | 'solution' | 'preventive_measures';
  description?: string;              // 附件描述/说明
  uploaded_by: string;               // 上传人用户ID
  uploaded_at: Date;
  sort_order: number;                // 在同内容区域内的排序
}

export interface LibraryCategory {
  _id: string;
  org_id: string;                    // 所属服务商组织ID
  name: string;                      // 分类名称
  description?: string;              // 分类描述
  sort_order: number;                // 排序
  created_at: Date;
  updated_at: Date;
}

export interface LibrarySearchFilters {
  search?: string;                   // 关键词搜索
  category?: string;                 // 分类筛选
  status?: LibraryDocument['status']; // 状态筛选
  created_by?: string;               // 创建人筛选
  date_from?: string;                // 创建时间范围
  date_to?: string;
  sort_by?: 'created_at' | 'updated_at' | 'view_count' | 'helpful_count';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface LibraryExportOptions {
  include_attachments: boolean;      // 是否包含附件
  format: 'html' | 'pdf' | 'markdown'; // 导出格式
  style: 'default' | 'simple' | 'detailed'; // 样式
}