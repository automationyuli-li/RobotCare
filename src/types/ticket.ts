// src/types/ticket.ts
export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  PENDING = 'pending',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum TicketStageType {
  ABNORMAL_DESCRIPTION = 'abnormal_description',
  ABNORMAL_ANALYSIS = 'abnormal_analysis',
  REQUIRED_PARTS = 'required_parts',
  ON_SITE_SOLUTION = 'on_site_solution',
  SUMMARY = 'summary',
  CUSTOMER_CONFIRMATION = 'customer_confirmation'
}

export interface Ticket {
  _id: string;
  ticket_number: string;
  title: string;
  description: string;
  customer_id: string;
  robot_id: string;
  service_provider_id: string;
  created_by: string;
  assigned_to?: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: Date;
  updated_at: Date;
  due_date?: Date;
  resolution_notes?: string;
  metadata?: {
    estimated_time?: number;
    actual_time?: number;
    location?: string;
    contact_person?: string;
    contact_phone?: string;
  };
}

export interface TicketStage {
  _id: string;
  ticket_id: string;
  stage_type: TicketStageType;
  content: any;
  attachments: Array<{
    name: string;
    url: string;
    size: number;
    type: string;
    uploaded_by: string;
    uploaded_at: Date;
  }>;
  created_by: string;
  expected_date?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface TicketTimeline {
  _id: string;
  ticket_id: string;
  stage_type: TicketStageType;
  start_date: Date;
  end_date: Date;
  status: 'not_started' | 'in_progress' | 'completed';
  color?: string;
}

export interface TicketCreateInput {
  title: string;
  description: string;
  robot_id: string;
  customer_id: string;
  priority: TicketPriority;
  assigned_to?: string;
  due_date?: Date;
  metadata?: {
    estimated_time?: number;
    location?: string;
    contact_person?: string;
    contact_phone?: string;
  };
}

export interface TicketUpdateInput {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_to?: string;
  due_date?: Date;
  resolution_notes?: string;
  metadata?: {
    estimated_time?: number;
    actual_time?: number;
    location?: string;
    contact_person?: string;
    contact_phone?: string;
  };
}