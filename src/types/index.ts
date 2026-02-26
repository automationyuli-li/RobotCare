// src/types/index.ts - 核心类型定义
// 用户相关类型
export interface User {
  _id: string;
  email: string;
  password_hash?: string;
  display_name: string;
  role: 'service_admin' | 'service_engineer' | 'end_admin' | 'end_engineer';
  org_id: string;
  avatar_url?: string;
  phone?: string;
  status: 'active' | 'inactive' | 'pending';
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// 组织相关类型
export interface Organization {
  _id: string;
  name: string;
  type: 'service_provider' | 'end_customer';
  contact_email: string;
  contact_phone?: string;
  subscription_plan: 'free' | 'silver' | 'gold' | 'premium';
  max_robots: number;
  max_customers: number;
  max_engineers: number;
  status: 'active' | 'inactive' | 'suspended';
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

// 机器人相关类型
export interface Robot {
  _id: string;
  sn: string;
  brand: string;
  model: string;
  org_id: string; // 所属客户组织
  service_provider_id: string; // 服务商组织
  location?: string;
  status: 'active' | 'maintenance' | 'fault' | 'inactive';
  specs?: {
    installation_date?: Date;
    warranty_end?: Date;
    last_maintenance_date?: Date;
    next_maintenance_date?: Date;
    operating_hours?: number;
  };
  metadata?: Record<string, any>;
  org_name?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  provider_name?: string;
}

// 工单相关类型
export interface Ticket {
  _id: string;
  robot_id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string; // 工程师ID
  created_by: string;
  created_at: Date;
  updated_at: Date;
  resolved_at?: Date;
  resolution_notes?: string;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface Engineer {
  _id: string;
  display_name: string;
  email: string;
  role: 'service_engineer' | 'end_engineer';
  status: 'active' | 'inactive' | 'pending';
  current_status?: 'idle' | 'working' | 'busy';
  ticket_stats?: {
    total: number;
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
  };
  active_tickets?: Array<{
    _id: string;
    ticket_number: string;
    title: string;
    status: string;
    priority: string;
  }>;
}

// 工程师统计类型
export interface EngineerStats {
  total: number;
  busy: number;      // 正在处理工单的工程师
  available: number; // 空闲工程师
  on_leave: number;  // 休假中的工程师
}

// 工程师列表项类型
export interface EngineerListItem {
  _id: string;
  email: string;
  display_name: string;
  role: 'service_engineer' | 'end_engineer';
  avatar_url?: string;
  status: 'active' | 'inactive' | 'on_leave';
  ticket_count: number;  // 负责的工单数量
  last_active_at?: Date;
  phone?: string;
}

// 邀请表单类型
export interface InvitationFormData {
  email: string;
  role: 'service_engineer' | 'end_engineer';
  invitation_type: 'engineer';
}


// 维修记录类型
export interface MaintenanceLog {
  _id: string;
  robot_id: string;
  title: string;
  operation_content: string;      // 操作内容
  operation_result: string;       // 操作结果
  maintenance_type: 'routine' | 'repair' | 'inspection'; // 维修类型
  duration?: number;              // 耗时（分钟）
  parts_used?: string[];          // 使用的零部件
  technician_id?: string;         // 技术人员ID
  attachments?: string[];         // 附件ID列表
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

// 评论类型
export interface Comment {
  _id: string;
  robot_id: string;
  content: string;
  author_id: string;
  author_name: string;
  attachments?: string[];         // 附件ID列表
  created_at: Date;
  updated_at: Date;
}

// 时间线事件类型
export interface TimelineEvent {
  icon: any;
  _id: string;
  robot_id: string;
  event_type: 'ticket_created' | 'maintenance' | 'document_added' | 'comment_added' | 'status_changed';
  reference_id?: string;          // 关联的ticket/maintenance/comment/document ID
  title: string;
  description: string;
  metadata?: Record<string, any>;
  created_by: {
    name: string;
    role: string;
  };
  created_at: Date;
}

// 导出报告配置类型
export interface ExportConfig {
  start_date?: Date;
  end_date?: Date;
  event_types?: string[];
  include_attachments?: boolean;
  format?: 'excel' | 'pdf';
}

// 用户资料类型
interface UserProfile {
  _id: string;
  email: string;
  display_name: string;
  real_name?: string;      // 真实姓名（可能需要添加）
  phone?: string;          // 联系电话（可能需要添加）
  role: string;
  org_id: string;
  status: 'active' | 'inactive' | 'pending';
  metadata?: {
    avatar_color?: string;
    department?: string;
    position?: string;
  };
  created_at: Date;
  updated_at: Date;
}

// 密码修改请求
interface PasswordChange {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}