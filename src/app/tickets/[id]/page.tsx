// src/app/tickets/[id]/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
  Download,
  Share2,
  Calendar,
  User,
  Bot,
  Building2,
  Plus,
  MessageSquare,
  Paperclip,
  Users,
  Check,
  X,
  Send,
  Mail,
  Edit,
  Star,
  StarHalf
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Navigation from '@/components/layout/Navigation';
import GanttChart from './components/GanttChart';
import StageEditor from './components/StageEditor';
import { useAuth } from '@/hooks/useAuth';

// 工单阶段配置
const STAGE_CONFIG = {
  abnormal_description: {
    title: '异常描述',
    color: 'bg-blue-500',
    description: '详细描述机器人异常现象和发生情况',
    defaultValue: (ticketDescription: string) => ticketDescription || ''
  },
  abnormal_analysis: {
    title: '异常分析',
    color: 'bg-purple-500',
    description: '分析可能原因并提供指导方案',
    defaultValue: () => ''
  },
  required_parts: {
    title: '所需备件',
    color: 'bg-amber-500',
    description: '列出需要更换的零部件清单',
    defaultValue: () => ''
  },
  on_site_solution: {
    title: '现场解决',
    color: 'bg-green-500',
    description: '记录现场实施的具体解决方案',
    defaultValue: () => ''
  },
  summary: {
    title: '完成总结',
    color: 'bg-indigo-500',
    description: '总结维保过程并存入知识库',
    defaultValue: () => ''
  },
  customer_confirmation: {
    title: '客户确认',
    color: 'bg-teal-500',
    description: '客户确认完成并评价服务',
    defaultValue: () => ''
  }
};

interface Engineer {
  _id: string;
  display_name: string;
  email: string;
  role: string;
  current_status: 'idle' | 'working' | 'busy';
  ticket_stats?: {
    total: number;
    open: number;
    in_progress: number;
  };
}

interface Stage {
  _id?: string;
  ticket_id: string;
  stage_type: string;
  content: string;
  attachments?: any[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  expected_date?: string;
  status?: 'not_started' | 'in_progress' | 'completed';
  completed_at?: string;
}

interface Comment {
  _id: string;
  content: string;
  created_by: {
    _id: string;
    display_name: string;
    email: string;
  };
  created_at: string;
}

interface Rating {
  score: number;
  comment?: string;
  created_at: string;
  created_by: string;
}

interface TicketDetail {
  _id: string;
  ticket_number: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  due_date?: string;
  resolution_notes?: string;
  customer_id?: string;
  robot_id?: string;
  customer?: {
    _id: string;
    name: string;
    contact_email?: string;
    contact_phone?: string;
  };
  robot?: {
    _id: string;
    sn: string;
    brand: string;
    model: string;
    location?: string;
  };
  service_provider?: {
    _id: string;
    name: string;
  };
  created_by_user?: {
    _id: string;
    display_name: string;
    email: string;
  };
  assigned_to_user?: {
    _id: string;
    display_name: string;
    email: string;
  };
  assigned_to?: string;
  stages?: Stage[];
  timeline?: any[];
  timeline_events?: any[];
  comments?: Comment[];
  rating?: Rating;
}

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<string>('abnormal_description');
  const [showStageEditor, setShowStageEditor] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningEngineer, setAssigningEngineer] = useState<string>('');
  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [summaryContent, setSummaryContent] = useState('');
  const [submittingSummary, setSubmittingSummary] = useState(false);
  
  // 客户确认相关状态
  const [showCustomerConfirmModal, setShowCustomerConfirmModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [customerComment, setCustomerComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  // 判断当前用户是否为终端客户
  const isEndCustomer = user?.role?.includes('end');
  const isServiceProvider = user?.role?.includes('service');

  useEffect(() => {
    if (params?.id) {
      fetchTicket();
      fetchEngineers();
    }
  }, [params?.id]);

  const fetchTicket = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tickets/${params?.id}?include_comments=true`);
      const data = await response.json();
      
      console.log('工单详情响应:', data);
      
      if (data.success) {
        const ticketData = data.data.ticket || data.data;
        
        // 确保阶段数据格式正确
        const stages = Array.isArray(ticketData.stages) ? ticketData.stages.map((stage: any) => ({
          ...stage,
          content: typeof stage.content === 'object' 
            ? stage.content.text || JSON.stringify(stage.content)
            : stage.content || '',
          status: stage.status || (stage.content ? 'completed' : 'not_started')
        })) : [];
        
        // 为每个阶段计算甘特图所需的时间
        const stagesWithTimeline = stages.map((stage: Stage, index: number) => {
          if (!stage.expected_date) return stage;
          
          const expectedDate = new Date(stage.expected_date);
          const createdDate = stage.created_at ? new Date(stage.created_at) : new Date(ticketData.created_at);
          
          // 计算预计开始日期（基于创建时间或前一个阶段的完成时间）
          const prevStage = index > 0 ? stages[index - 1] : null;
          const startDate = prevStage?.completed_at 
            ? new Date(prevStage.completed_at)
            : createdDate;
          
          return {
            ...stage,
            start_date: startDate.toISOString().split('T')[0],
            end_date: expectedDate.toISOString().split('T')[0],
            status: stage.status || 'not_started'
          };
        });
        
        setTicket({
          ...ticketData,
          stages: stagesWithTimeline,
          description: ticketData.description || 
            stages.find((s: Stage) => s.stage_type === 'abnormal_description')?.content || 
            '',
          comments: ticketData.comments || []
        });
      } else {
        throw new Error(data.error || '获取工单失败');
      }
    } catch (error) {
      console.error('获取工单详情失败:', error);
      alert(`获取工单详情失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchEngineers = async () => {
    try {
      const response = await fetch('/api/team/engineers');
      const data = await response.json();
      
      if (data.success) {
        setEngineers(data.data || []);
      }
    } catch (error) {
      console.error('获取工程师列表失败:', error);
    }
  };

  const handleAddStageContent = (stageType: string) => {
    const existingStage = getStageContent(stageType);
    
    setEditingStage({
      ticket_id: params?.id as string,
      stage_type: stageType,
      content: existingStage?.content || STAGE_CONFIG[stageType as keyof typeof STAGE_CONFIG]?.defaultValue(ticket?.description || '') || '',
      _id: existingStage?._id,
      attachments: existingStage?.attachments || [],
      expected_date: existingStage?.expected_date || ''
    });
    setShowStageEditor(true);
  };

  const getStageContent = (stageType: string): Stage | null => {
    if (!ticket?.stages || ticket.stages.length === 0) return null;
    return ticket.stages.find(stage => stage.stage_type === stageType) || null;
  };

  const handleSaveStage = async (stageData: { content: string; attachments?: any[]; expected_date?: string }) => {
    if (!editingStage || !params?.id) return;

    try {
      // 对于异常描述阶段，同时更新工单描述
      if (editingStage.stage_type === 'abnormal_description') {
        await fetch(`/api/tickets/${params?.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: stageData.content
          })
        });
      }

      // 保存阶段内容
      const response = await fetch(`/api/tickets/${params?.id}/stages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage_type: editingStage.stage_type,
          content: stageData.content,
          attachments: stageData.attachments || [],
          expected_date: stageData.expected_date
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || '保存失败');
      }
      
      if (data.success) {
        fetchTicket(); // 刷新数据
        setShowStageEditor(false);
        setEditingStage(null);
      }
    } catch (error: any) {
      console.error('保存阶段失败:', error);
      alert(`保存失败: ${error.message || '请重试'}`);
    }
  };

  const handleAssignEngineer = async (engineerId: string) => {
    if (!params?.id) return;

    try {
      const response = await fetch(`/api/tickets/${params?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assigned_to: engineerId,
          status: 'in_progress' // 分配后自动将工单状态设为处理中
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || '分配失败');
      }
      
      if (data.success) {
        fetchTicket();
        setShowAssignModal(false);
        setAssigningEngineer('');
      }
    } catch (error: any) {
      console.error('分配工程师失败:', error);
      alert(`分配失败: ${error.message || '请重试'}`);
    }
  };

  const handleCompleteSummary = async () => {
    if (!summaryContent.trim()) {
      alert('请填写完成总结内容');
      return;
    }

    setSubmittingSummary(true);
    try {
      // 先保存总结内容
      await handleSaveStage({
        content: summaryContent,
        expected_date: new Date().toISOString().split('T')[0]
      });

      // 更新阶段状态为已完成
      const response = await fetch(`/api/tickets/${params?.id}/stages/summary/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed_at: new Date().toISOString()
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || '确认完成失败');
      }

      if (data.success) {
        // 发送通知给客户
        await fetch(`/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'summary_completed',
            ticket_id: params?.id,
            message: `工单 ${ticket?.ticket_number} 已完成，请客户确认`,
            recipients: [ticket?.customer?.contact_email]
          })
        });

        setShowConfirmModal(false);
        setSummaryContent('');
        fetchTicket();
      }
    } catch (error: any) {
      console.error('确认完成失败:', error);
      alert(`确认完成失败: ${error.message || '请重试'}`);
    } finally {
      setSubmittingSummary(false);
    }
  };

  const handleCustomerConfirm = async () => {
    if (rating === 0) {
      alert('请选择评分');
      return;
    }

    setSubmittingRating(true);
    try {
      const response = await fetch(`/api/tickets/${params?.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          comment: customerComment,
          confirmed_at: new Date().toISOString()
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || '确认失败');
      }

      if (data.success) {
        // 关闭模态框
        setShowCustomerConfirmModal(false);
        setRating(0);
        setCustomerComment('');
        
        // 刷新工单数据
        fetchTicket();
        
        // 显示成功消息
        alert('确认成功，感谢您的评价！');
      }
    } catch (error: any) {
      console.error('客户确认失败:', error);
      alert(`确认失败: ${error.message || '请重试'}`);
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentContent.trim()) {
      alert('请输入评论内容');
      return;
    }

    if (commentContent.length > 500) {
      alert('评论内容不能超过500字');
      return;
    }

    setSubmittingComment(true);
    try {
      const response = await fetch(`/api/tickets/${params?.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: commentContent.trim(),
          type: 'comment'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || '添加评论失败');
      }

      if (data.success) {
        setCommentContent('');
        fetchTicket(); // 刷新工单数据
      }
    } catch (error: any) {
      console.error('添加评论失败:', error);
      alert(`添加评论失败: ${error.message || '请重试'}`);
    } finally {
      setSubmittingComment(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('链接已复制到剪贴板');
    } catch (err) {
      // 降级方案
      const textarea = document.createElement('textarea');
      textarea.value = window.location.href;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('链接已复制到剪贴板');
    }
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">加载工单详情中...</p>
          </div>
        </div>
      </>
    );
  }

  if (!ticket) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">工单不存在</h3>
            <p className="text-gray-500 mb-6">请求的工单可能已被删除或您没有访问权限</p>
            <Button variant="primary" onClick={() => router.push('/tickets')}>
              返回工单列表
            </Button>
          </div>
        </div>
      </>
    );
  }

  // 检查总结阶段是否已完成
  const summaryStage = getStageContent('summary');
  const isSummaryCompleted = summaryStage?.status === 'completed';

  // 检查客户确认阶段
  const customerConfirmStage = getStageContent('customer_confirmation');
  const isCustomerConfirmed = !!ticket.rating || customerConfirmStage?.status === 'completed';

  return (
    <>
      <Navigation />
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 返回按钮和操作栏 */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                icon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => router.push('/tickets')}
              >
                返回列表
              </Button>
              
              <div className="flex items-center space-x-3">
                {/* 分配工程师按钮 */}
                {!ticket.assigned_to && isServiceProvider && (
                  <Button 
                    variant="outline" 
                    icon={<Users className="w-4 h-4" />}
                    onClick={() => setShowAssignModal(true)}
                  >
                    分配工程师
                  </Button>
                )}
                
                {/* 如果已分配且是服务商，显示重新分配按钮 */}
                {ticket.assigned_to && isServiceProvider && (
                  <Button 
                    variant="outline" 
                    icon={<Users className="w-4 h-4" />}
                    onClick={() => setShowAssignModal(true)}
                  >
                    重新分配
                  </Button>
                )}
                
                {/* 分享按钮 */}
                <Button
                  variant="outline"
                  icon={<Share2 className="w-4 h-4" />}
                  onClick={copyToClipboard}
                >
                  分享
                </Button>
              </div>
            </div>
          </div>

          {/* 工单头部信息 */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <span className="text-2xl font-bold text-gray-900">
                    {ticket.ticket_number}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    ticket.status === 'open' ? 'bg-amber-100 text-amber-700' :
                    ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    ticket.status === 'resolved' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {ticket.status === 'open' ? '待处理' :
                     ticket.status === 'in_progress' ? '处理中' :
                     ticket.status === 'resolved' ? '已解决' :
                     ticket.status === 'closed' ? '已关闭' : '未知'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    ticket.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                    ticket.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                    ticket.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {ticket.priority === 'urgent' ? '紧急' :
                     ticket.priority === 'high' ? '高' :
                     ticket.priority === 'medium' ? '中' : '低'}优先级
                  </span>
                </div>
                
                <h1 className="text-xl font-bold text-gray-900 mb-2">{ticket.title}</h1>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-gray-700 whitespace-pre-line">{ticket.description}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {ticket.customer && (
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">客户</p>
                        <p className="font-medium text-gray-900">{ticket.customer.name}</p>
                      </div>
                    </div>
                  )}
                  
                  {ticket.robot && (
                    <div className="flex items-center space-x-2">
                      <Bot className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">机器人</p>
                        <p className="font-medium text-gray-900">
                          {ticket.robot.brand} {ticket.robot.model}
                          {ticket.robot.sn && (
                            <span className="text-sm text-gray-500 ml-1">(SN: {ticket.robot.sn})</span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {ticket.created_by_user && (
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">上报人</p>
                        <p className="font-medium text-gray-900">{ticket.created_by_user.display_name}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">创建时间</p>
                      <p className="font-medium text-gray-900">
                        {new Date(ticket.created_at).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* 指派信息 */}
                {ticket.assigned_to_user && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Users className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="font-medium text-blue-900">已指派给</p>
                          <p className="text-blue-700">
                            {ticket.assigned_to_user.display_name}
                            <span className="text-blue-500 ml-2">
                              ({ticket.assigned_to_user.email})
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 甘特图部分 */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">进度甘特图</h2>
              <span className="text-sm text-gray-500">基于各阶段预期完成时间</span>
            </div>
            
            <GanttChart 
              ticketId={params?.id as string}
              stages={ticket.stages || []}
            />
          </div>

          {/* 阶段管理 */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
            <div className="border-b border-gray-200">
              <div className="px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">处理阶段</h2>
                <p className="text-sm text-gray-500 mt-1">按照流程完成各个阶段的工作</p>
              </div>
            </div>
            
            <div className="divide-y divide-gray-200">
              {Object.entries(STAGE_CONFIG).map(([stageType, config]) => {
                const stage = getStageContent(stageType);
                const stageContent = stage?.content || '';
                const hasContent = !!stageContent.trim();
                
                // 判断是否为完成总结阶段
                const isSummaryStage = stageType === 'summary';
                // 判断是否为客户确认阶段
                const isCustomerConfirmStage = stageType === 'customer_confirmation';
                
                return (
                  <div key={stageType} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
                          <div>
                            <h3 className="font-medium text-gray-900">{config.title}</h3>
                            <p className="text-sm text-gray-500">{config.description}</p>
                          </div>
                        </div>
                        
                        {/* 显示阶段内容 */}
                        {hasContent ? (
                          <div className="bg-gray-50 rounded-lg p-4 mb-3">
                            <div className="prose prose-sm max-w-none whitespace-pre-line">
                              {stageContent}
                            </div>
                            
                            {/* 附件显示 */}
                            {stage?.attachments && stage.attachments.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-sm font-medium text-gray-700 mb-2">附件：</p>
                                <div className="space-y-2">
                                  {stage.attachments.map((file: any, index: number) => (
                                    <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                                      <Paperclip className="w-4 h-4" />
                                      <span>{file.name || file}</span>
                                      <Download className="w-4 h-4 cursor-pointer hover:text-blue-600" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* 预期完成时间 */}
                            {stage?.expected_date && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  <Calendar className="w-4 h-4" />
                                  <span>预期完成：{new Date(stage.expected_date).toLocaleDateString('zh-CN')}</span>
                                </div>
                              </div>
                            )}

                            {/* 完成状态 */}
                            {stage?.status === 'completed' && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="flex items-center space-x-2 text-sm text-green-600">
                                  <CheckCircle className="w-4 h-4" />
                                  <span>已完成于：{new Date(stage.completed_at || '').toLocaleDateString('zh-CN')}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-4 mb-3 text-center">
                            <p className="text-gray-500">暂无内容</p>
                            <p className="text-xs text-gray-400 mt-1">点击下方按钮添加内容</p>
                          </div>
                        )}
                        
                        {/* 阶段信息 */}
                        {stage && (
                          <div className="flex items-center justify-between text-sm text-gray-500 mt-2">
                            <div className="flex items-center space-x-4">
                              <span>最后更新: {new Date(stage.updated_at || stage.created_at || Date.now()).toLocaleDateString('zh-CN')}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* 操作按钮 */}
                      <div className="ml-4 flex flex-col space-y-2">
                        {/* 编辑/添加按钮 */}
                        {(isServiceProvider || (isSummaryStage && isServiceProvider) || 
                          (isCustomerConfirmStage && isEndCustomer && !isCustomerConfirmed)) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={hasContent ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            onClick={() => handleAddStageContent(stageType)}
                          >
                            {hasContent ? '编辑' : '添加'}
                          </Button>
                        )}
                        
                        {/* 完成总结的确认按钮 */}
                        {isSummaryStage && hasContent && isServiceProvider && !isSummaryCompleted && (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<CheckCircle className="w-4 h-4" />}
                            onClick={() => {
                              setSummaryContent(stageContent);
                              setShowConfirmModal(true);
                            }}
                          >
                            确认完成
                          </Button>
                        )}
                        
                        {/* 客户确认的确认按钮 */}
                        {isCustomerConfirmStage && isEndCustomer && !isCustomerConfirmed && (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<Star className="w-4 h-4" />}
                            onClick={() => setShowCustomerConfirmModal(true)}
                          >
                            确认并评分
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 时间线评论 */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">时间线记录</h2>
            
            <div className="space-y-4">
              {(ticket.timeline_events || []).map((event: any, index: number) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
                  <div className="flex-1 bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{event.title}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(event.created_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-2">{event.description}</p>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <User className="w-4 h-4" />
                      <span>由 {event.created_by?.display_name || event.created_by || '未知用户'} 记录</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* 显示评分信息 */}
              {ticket.rating && (
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-yellow-500"></div>
                  <div className="flex-1 bg-yellow-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">客户评价</span>
                      <span className="text-sm text-gray-500">
                        {new Date(ticket.rating.created_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${
                            star <= ticket.rating!.score
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    {ticket.rating.comment && (
                      <p className="text-gray-600 mb-2">{ticket.rating.comment}</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* 添加评论 */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-start space-x-3">
                  <div className="flex-1">
                    <textarea
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="添加评论或更新状态..."
                      rows={3}
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      maxLength={500}
                    />
                    <div className="text-right text-sm text-gray-500 mt-1">
                      {commentContent.length}/500
                    </div>
                  </div>
                  <Button 
                    variant="primary" 
                    icon={<MessageSquare className="w-4 h-4" />}
                    onClick={handleAddComment}
                    loading={submittingComment}
                    disabled={!commentContent.trim()}
                  >
                    添加
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 阶段编辑器模态框 */}
      {showStageEditor && editingStage && (
        <StageEditor
          stage={editingStage}
          onSave={handleSaveStage}
          onClose={() => {
            setShowStageEditor(false);
            setEditingStage(null);
          }}
        />
      )}

      {/* 分配工程师模态框 */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl w-full max-w-md"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">分配工程师</h2>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setAssigningEngineer('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">选择工程师来处理此工单</p>
            </div>
            
            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {engineers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">暂无可用工程师</p>
                    <p className="text-sm text-gray-400 mt-1">请先在团队管理中添加工程师</p>
                  </div>
                ) : (
                  engineers.map((engineer) => (
                    <div
                      key={engineer._id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        assigningEngineer === engineer._id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                      onClick={() => setAssigningEngineer(engineer._id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            engineer.current_status === 'idle' ? 'bg-green-400' :
                            engineer.current_status === 'working' ? 'bg-amber-400' :
                            'bg-red-400'
                          }`}></div>
                          <div>
                            <p className="font-medium text-gray-900">{engineer.display_name}</p>
                            <p className="text-sm text-gray-500">{engineer.email}</p>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-500">
                          <div className="flex items-center space-x-2">
                            <span>{engineer.ticket_stats?.total || 0}个工单</span>
                            {assigningEngineer === engineer._id && (
                              <Check className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {engineer.ticket_stats && (
                        <div className="mt-3 flex items-center space-x-4 text-xs">
                          <span className="text-amber-600">
                            {engineer.ticket_stats.open}个待处理
                          </span>
                          <span className="text-blue-600">
                            {engineer.ticket_stats.in_progress}个处理中
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAssignModal(false);
                  setAssigningEngineer('');
                }}
              >
                取消
              </Button>
              <Button
                variant="primary"
                onClick={() => handleAssignEngineer(assigningEngineer)}
                disabled={!assigningEngineer}
                icon={<Send className="w-4 h-4" />}
              >
                分配
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 完成总结确认模态框 */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl w-full max-w-lg"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">确认完成总结</h2>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setSummaryContent('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                确认完成后将通知客户进行验收
              </p>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  完成总结内容
                </label>
                <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <p className="text-gray-700 whitespace-pre-line">{summaryContent}</p>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-700">
                  ⚠️ 确认完成后，工单将进入客户确认阶段，并通知客户进行验收评价。
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmModal(false);
                  setSummaryContent('');
                }}
              >
                取消
              </Button>
              <Button
                variant="primary"
                onClick={handleCompleteSummary}
                loading={submittingSummary}
                icon={<CheckCircle className="w-4 h-4" />}
              >
                确认完成
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 客户确认模态框 */}
      {showCustomerConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl w-full max-w-lg"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">服务确认与评价</h2>
                <button
                  onClick={() => {
                    setShowCustomerConfirmModal(false);
                    setRating(0);
                    setCustomerComment('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                请对本次维保服务进行评价
              </p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* 工单信息 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">工单号：{ticket.ticket_number}</p>
                <p className="text-sm text-gray-600">标题：{ticket.title}</p>
              </div>
              
              {/* 评分 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  您的评分 <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          star <= (hoverRating || rating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-500">
                    {rating ? `${rating}分` : '请选择'}
                  </span>
                </div>
              </div>
              
              {/* 评论 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  评价内容（可选）
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请分享您的服务体验..."
                  rows={4}
                  value={customerComment}
                  onChange={(e) => setCustomerComment(e.target.value)}
                  maxLength={500}
                />
                <div className="text-right text-sm text-gray-500 mt-1">
                  {customerComment.length}/500
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  ℹ️ 确认完成后，工单状态将更新为"已解决"。您的反馈将帮助改进我们的服务质量。
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCustomerConfirmModal(false);
                  setRating(0);
                  setCustomerComment('');
                }}
              >
                稍后评价
              </Button>
              <Button
                variant="primary"
                onClick={handleCustomerConfirm}
                loading={submittingRating}
                disabled={rating === 0}
                icon={<Check className="w-4 h-4" />}
              >
                确认完成
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}