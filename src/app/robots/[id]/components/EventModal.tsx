// 创建 /src/app/robots/[id]/components/EventModal.tsx
'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  AlertCircle,
  Wrench,
  FileText,
  MessageSquare,
  Bot,
  User,
  Calendar,
  Upload,
  Plus,
  Check,
  Trash2,
  Paperclip,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { set } from 'date-fns';
import { metadata } from '../../../layout';
import { ca } from 'date-fns/locale';

interface EventModalProps {
  robotId: string;
  robotSn: string;
  eventType: 'ticket' | 'maintenance' | 'document' | 'comment' | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EventModal({ 
  robotId, 
  robotSn, 
  eventType, 
  onClose, 
  onSuccess 
}: EventModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 添加上传文件的ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 上报异常表单状态
  const [ticketData, setTicketData] = useState({
    title: '',
    description: '',
    frequency: '',
    attempted_actions: '',
    robot_status: 'fault' as 'active' | 'maintenance' | 'fault' | 'inactive',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    attachments: [] as File[]
  });

  // 维修记录表单状态
  const [maintenanceData, setMaintenanceData] = useState({
    title: '',
    operation_content: '',
    operation_result: '',
    maintenance_type: 'repair' as 'routine' | 'repair' | 'inspection',
    duration: '',
    parts_used: '',
    attachments: [] as File[]
  });

  // 文档上传状态
  const [documentData, setDocumentData] = useState({
    title: '',
    description: '',
    file: null as File | null
  });

  // 评论状态
  const [commentData, setCommentData] = useState({
    content: '',
    attachments: [] as File[]
  });

  // 文件处理函数
  const handleFileSelect = (type: 'ticket' | 'maintenance' | 'comment') => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'ticket' | 'maintenance' | 'comment') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    switch (type) {
      case 'ticket':
        setTicketData(prev => ({
          ...prev,
          attachments: [...prev.attachments, ...Array.from(files)]
        }));
        break;
      case 'maintenance':
        setMaintenanceData(prev => ({
          ...prev,
          attachments: [...prev.attachments, ...Array.from(files)]
        }));
        break;
      case 'comment':
        setCommentData(prev => ({
          ...prev,
          attachments: [...prev.attachments, ...Array.from(files)]
        }));
        break;
    }
    
    // 重置文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number, type: 'ticket' | 'maintenance' | 'comment') => {
    switch (type) {
      case 'ticket':
        setTicketData(prev => ({
          ...prev,
          attachments: prev.attachments.filter((_, i) => i !== index)
        }));
        break;
      case 'maintenance':
        setMaintenanceData(prev => ({
          ...prev,
          attachments: prev.attachments.filter((_, i) => i !== index)
        }));
        break;
      case 'comment':
        setCommentData(prev => ({
          ...prev,
          attachments: prev.attachments.filter((_, i) => i !== index)
        }));
        break;
    }
  };

  const handleSubmitTicket = async () => {
    if (!ticketData.title || !ticketData.description) {
      setError('请填写标题,异常描述和选择优先级');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('robot_id', robotId);
      formData.append('title', ticketData.title);
      formData.append('description', ticketData.description);
      formData.append('robot_status', ticketData.robot_status);
      formData.append('priority', ticketData.priority);
      // 添加其他元数据
      const metadata = {
        frequency: ticketData.frequency,
        attempted_actions: ticketData.attempted_actions,
        attachments_count: ticketData.attachments.length
      };
      formData.append('metadata', JSON.stringify(metadata));

      // 添加上传的附件
      ticketData.attachments.forEach((file, index) => {
        formData.append(`attachments`, file);
      });

      console.log('提交工单数据:', {
        robot_id: robotId,
        title: ticketData.title,
        description: ticketData.description,
        attachments: ticketData.attachments.length
      });

      const response = await fetch('/api/tickets', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      console.log('工单创建响应:', data);

      if (!response.ok) {
        throw new Error(data.error || data.message || '上报异常失败');
      }

      if (data.success) {
      // 显示成功消息
      alert('异常上报成功！工单号：' + data.data.ticket_number);
      onSuccess();
      onClose();
      }
    } catch (error: any) {
      console.error('上报异常失败:', error);
      setError(error.message || '提交失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitMaintenance = async () => {
    if (!maintenanceData.title || !maintenanceData.operation_content) {
      setError('请填写维修主题和操作内容');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // 先处理文件上传（如果有）
      const attachmentUrls: string[] = [];
      if (maintenanceData.attachments.length > 0) {
        // 这里需要实现文件上传逻辑
        console.log('需要上传附件:', maintenanceData.attachments);
      }

      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          robot_id: robotId,
          title: maintenanceData.title,
          operation_content: maintenanceData.operation_content,
          operation_result: maintenanceData.operation_result || '',
          maintenance_type: maintenanceData.maintenance_type,
          duration: maintenanceData.duration ? parseInt(maintenanceData.duration) : undefined,
          parts_used: maintenanceData.parts_used 
            ? maintenanceData.parts_used.split(',').map(p => p.trim()).filter(p => p)
            : [],
          attachments: attachmentUrls,
          is_successful: true // 默认成功，可以根据实际情况调整
        })
      });

      const data = await response.json();
      console.log('维修记录响应:', data);

      if (!response.ok) {
        throw new Error(data.error || data.message || '记录维修失败');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('记录维修失败:', error);
      setError(error.message || '提交失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentData.content.trim()) {
      setError('请填写评论内容');
      return;
    }

    if (commentData.content.length > 200) {
      setError('评论内容不能超过200字');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          robot_id: robotId,
          content: commentData.content
        })
      });

      const data = await response.json();
      console.log('评论响应:', data);
      
      if (!response.ok) {
        throw new Error(data.error || data.message || '添加评论失败');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('添加评论失败:', error);
      setError(error.message || '提交失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 修复上传文件的UI部分
  const renderFileUpload = (type: 'ticket' | 'maintenance' | 'comment', files: File[]) => {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          附件上传（照片/视频）
        </label>
        
        {/* 隐藏的文件输入 */}
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
          onChange={(e) => handleFileChange(e, type)}
          className="hidden"
        />
        
        {/* 文件列表 */}
        {files.length > 0 && (
          <div className="mb-3 space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Paperclip className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700 truncate max-w-xs">
                    {file.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index, type)}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* 上传区域 */}
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          onClick={() => handleFileSelect(type)}
        >
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-1">
            点击或拖放文件到此处上传
          </p>
          <p className="text-xs text-gray-500">
            支持图片、视频、PDF、Word、Excel文件
          </p>
        </div>
      </div>
    );
  };

  const renderForm = () => {
    switch (eventType) {
      case 'ticket':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                异常主题 *
              </label>
              <input
                type="text"
                value={ticketData.title}
                onChange={(e) => setTicketData({...ticketData, title: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="例如：机器人轴1运行异常"
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                异常现象描述 *
              </label>
              <textarea
                value={ticketData.description}
                onChange={(e) => setTicketData({...ticketData, description: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32"
                placeholder="详细描述异常现象..."
                disabled={loading}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  发生频率
                </label>
                <input
                  type="text"
                  value={ticketData.frequency}
                  onChange={(e) => setTicketData({...ticketData, frequency: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="例如：每天3-4次"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  已尝试操作
                </label>
                <input
                  type="text"
                  value={ticketData.attempted_actions}
                  onChange={(e) => setTicketData({...ticketData, attempted_actions: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="例如：重启控制器"
                  disabled={loading}
                />
              </div>              
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  机器人状态 *
                </label>
                <select
                  value={ticketData.robot_status}
                  onChange={(e) => setTicketData({...ticketData, robot_status: e.target.value as any})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  disabled={loading}
                >
                  <option value="fault">故障</option>
                  <option value="maintenance">维护中</option>
                  <option value="inactive">离线</option>
                  <option value="active">运行正常</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  处理优先级 *
                </label>
                <select
                  value={ticketData.priority}
                  onChange={(e) => setTicketData({...ticketData, priority: e.target.value as any})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  disabled={loading}
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                  <option value="urgent">紧急</option>
                </select>
              </div>
            </div>

            {renderFileUpload('ticket', ticketData.attachments)}
        </div>
      );

      case 'maintenance':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                维修主题 *
              </label>
              <input
                type="text"
                value={maintenanceData.title}
                onChange={(e) => setMaintenanceData({...maintenanceData, title: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="例如：更换伺服电机"
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                操作内容 *
              </label>
              <textarea
                value={maintenanceData.operation_content}
                onChange={(e) => setMaintenanceData({...maintenanceData, operation_content: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32"
                placeholder="详细描述维修操作步骤..."
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                操作结果
              </label>
              <textarea
                value={maintenanceData.operation_result}
                onChange={(e) => setMaintenanceData({...maintenanceData, operation_result: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24"
                placeholder="描述维修后的结果..."
                disabled={loading}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  维修类型
                </label>
                <select
                  value={maintenanceData.maintenance_type}
                  onChange={(e) => setMaintenanceData({...maintenanceData, maintenance_type: e.target.value as any})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  disabled={loading}
                >
                  <option value="routine">常规维护</option>
                  <option value="repair">故障维修</option>
                  <option value="inspection">检查巡检</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  耗时（分钟）
                </label>
                <input
                  type="number"
                  value={maintenanceData.duration}
                  onChange={(e) => setMaintenanceData({...maintenanceData, duration: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="例如：120"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  使用备件
                </label>
                <input
                  type="text"
                  value={maintenanceData.parts_used}
                  onChange={(e) => setMaintenanceData({...maintenanceData, parts_used: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="用逗号分隔"
                  disabled={loading}
                />
              </div>
            </div>
            {renderFileUpload('maintenance', maintenanceData.attachments)}
          </div>
        );

      case 'comment':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                评论内容 *
              </label>
              <textarea
                value={commentData.content}
                onChange={(e) => setCommentData({...commentData, content: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32"
                placeholder="请输入评论内容（最多200字）"
                maxLength={200}
                disabled={loading}
              />
              <div className="text-right text-sm text-gray-500 mt-1">
                {commentData.content.length}/200
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getModalTitle = () => {
    switch (eventType) {
      case 'ticket': return '上报异常';
      case 'maintenance': return '记录维修';
      case 'document': return '上传文档';
      case 'comment': return '添加评论';
      default: return '添加事件';
    }
  };

  const handleSubmit = () => {
    switch (eventType) {
      case 'ticket': handleSubmitTicket(); break;
      case 'maintenance': handleSubmitMaintenance(); break;
      case 'comment': handleSubmitComment(); break;
      case 'document':
        setError('文档上传功能尚未实现');
        break;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* 头部 */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">{getModalTitle()}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* 机器人信息 */}
          <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
            <Bot className="w-6 h-6 text-blue-500" />
            <div>
              <p className="font-medium text-gray-900">机器人: {robotSn}</p>
              <p className="text-sm text-gray-500">上报人: {user?.display_name}</p>
            </div>
            <div className="ml-auto text-sm text-gray-500">
              {new Date().toLocaleString('zh-CN')}
            </div>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* 表单内容 */}
        <div className="p-6">
          {renderForm()}
        </div>

        {/* 底部操作 */}
        <div className="border-t border-gray-200 p-6 flex items-center justify-end space-x-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button
            loading={loading}
            onClick={handleSubmit}
            icon={eventType === 'comment' ? <MessageSquare className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            disabled={loading || (eventType === 'document')}
          >
            {eventType === 'comment' ? '发表评论' : 
             eventType === 'document' ? '开发中' : '提交' }
          </Button>
        </div>
      </motion.div>
    </div>   
  );
}