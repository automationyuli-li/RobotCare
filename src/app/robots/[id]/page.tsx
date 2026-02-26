// src/app/robots/[id]/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Cpu,
  MapPin,
  Wrench,
  AlertCircle,
  FileText,
  MessageSquare,
  Plus,
  Download,
  Settings,
  Zap,
  Wifi,
  Eye,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Search,
  Filter,
  ChevronDown,
  X,
  Upload,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { RobotStatusBadge } from '@/components/robots/RobotStatusBadge';
import { WarrantyStatus } from '@/components/robots/WarrantyStatus';
import EventModal from './components/EventModal';
import ExportModal from './components/ExportModal';
import { calculateOperatingDuration } from '@/lib/utils/robot';

// 导入类型定义
import type { 
  Robot, 
  TimelineEvent as TimelineEventType, 
  User as UserType,
  Ticket,
  MaintenanceLog,
  Comment
} from '@/types';



// 事件类型映射
const EVENT_TYPES = {
  'ticket_created': { label: '上报异常', icon: AlertCircle, color: 'text-red-500' },
  'maintenance': { label: '记录维修', icon: Wrench, color: 'text-blue-500' },
  'document_added': { label: '上传文档', icon: FileText, color: 'text-green-500' },
  'comment_added': { label: '添加评论', icon: MessageSquare, color: 'text-purple-500' },
  'status_changed': { label: '状态变更', icon: Settings, color: 'text-amber-500' },
} as const;

export default function RobotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const robotId = params?.id as string;
  
  // 状态管理
  
  const [robot, setRobot] = useState<Robot | null>(null);
  const [loading, setLoading] = useState(true);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEventType[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<TimelineEventType[]>([]);
  const [showAddSpec, setShowAddSpec] = useState(false);
  const [showAddPeripheral, setShowAddPeripheral] = useState(false);
  const [newSpec, setNewSpec] = useState({ key: '', value: '' });
  const [newPeripheral, setNewPeripheral] = useState({ 
    name: '', 
    type: '', 
    description: '', 
    status: 'connected' as 'connected' | 'disconnected' 
  });
  
  // 权限状态
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  
  // 模态框状态
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<
    'ticket' | 'maintenance' | 'document' | 'comment' | null
  >(null);
  
  // 筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [timeFilter, setTimeFilter] = useState<string>('all'); // all, today, week, month, custom
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  
  // 导出状态
  const [showExportModal, setShowExportModal] = useState(false);

  // 初始化加载
  useEffect(() => {
    fetchRobotDetails();
    fetchTimelineEvents();
  }, [robotId]);

  // 应用筛选
  useEffect(() => {
    let filtered = timelineEvents;
    
    // 按类型筛选
    if (filterType !== 'all') {
      filtered = filtered.filter(event => event.event_type === filterType);
    }
    // 按时间段筛选
    if (timeFilter !== 'all') {
      const now = new Date();
      
      switch (timeFilter) {
        case 'today': {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          filtered = filtered.filter(event => new Date(event.created_at) >= today);
          break;
        }
        case 'week': {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          filtered = filtered.filter(event => new Date(event.created_at) >= weekAgo);
          break;
        }
        case 'month': {
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          filtered = filtered.filter(event => new Date(event.created_at) >= monthAgo);
          break;
        }
        case 'custom': {
          if (customStartDate) {
            const start = new Date(customStartDate);
            start.setHours(0, 0, 0, 0);
            filtered = filtered.filter(event => new Date(event.created_at) >= start);
          }
          if (customEndDate) {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(event => new Date(event.created_at) <= end);
          }
          break;
        }
      }
    }
    // 按搜索词筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query)
      );
    }
    
    setFilteredEvents(filtered);
  }, [timelineEvents, filterType, timeFilter, searchQuery, customStartDate, customEndDate]);

  // 获取时间筛选标签
  const getTimeFilterLabel = (filter: string, startDate: string, endDate: string) => {
    switch (filter) {
      case 'today': return '今天';
      case 'week': return '本周';
      case 'month': return '本月';
      case 'custom': 
        return startDate && endDate 
          ? `${startDate} 至 ${endDate}`
          : startDate ? `${startDate} 至今` : '自定义时间段';
      default: return '';
    }
  };

  const fetchRobotDetails = async () => {
    try {
      const response = await fetch(`/api/robots/${robotId}`);
      const data = await response.json();
      if (data.success) {
        // 确保机器人状态有值
        const robotData = {
          ...data.data,
          status: data.data.status || 'inactive' // 添加默认值
        };
        setRobot(data.data);
        
        // 权限判断：所有人都可以编辑，只有管理员可以删除
        const isAdmin = ['service_admin', 'end_admin'].includes(user?.role || '');
        setCanEdit(true); // 所有人都可以编辑
        setCanDelete(isAdmin); // 只有管理员可以删除
      }
    } catch (error) {
      console.error('Error fetching robot:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimelineEvents = async () => {
    try {
      const response = await fetch(`/api/timeline?robot_id=${robotId}`);
      const data = await response.json();
      if (data.success) {
        const eventsWithIcons = data.data.map((event: any) => {
          const eventTypeInfo = EVENT_TYPES[event.event_type as keyof typeof EVENT_TYPES] || 
                               { label: event.event_type, icon: Clock, color: 'text-gray-500' };
          return {
            ...event,
            icon: eventTypeInfo.icon,
            color: eventTypeInfo.color,
            typeLabel: eventTypeInfo.label
          };
        });
        setTimelineEvents(eventsWithIcons);
        setFilteredEvents(eventsWithIcons);
      }
    } catch (error) {
      console.error('Error fetching timeline:', error);
    }
  };

  // 技术规格操作
  const handleAddSpec = async () => {
    if (!newSpec.key || !newSpec.value) return;
    
    try {
      const response = await fetch(`/api/robots/${robotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            ...robot?.metadata,
            specifications: [
              ...(robot?.metadata?.specifications || []),
              newSpec
            ]
          }
        }),
      });

      const data = await response.json();
      if (data.success) {
        // 确保状态正确设置
        const updatedRobot = {
          ...data.data,
          status: data.data.status || 'active' // 确保状态有值
        };
        setRobot(updatedRobot);
        setNewSpec({ key: '', value: '' });
        setShowAddSpec(false);
      }
    } catch (error) {
      console.error('Error adding spec:', error);
    }
  };

  const handleAddPeripheral = async () => {
    if (!newPeripheral.name || !newPeripheral.type) return;
    
    try {
      const response = await fetch(`/api/robots/${robotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            ...robot?.metadata,
            peripherals: [
              ...(robot?.metadata?.peripherals || []),
              newPeripheral
            ]
          }
        }),
      });

      const data = await response.json();
      if (data.success) {
        // 确保状态正确设置
        const updatedRobot = {
          ...data.data,
          status: data.data.status || 'active' // 确保状态有值
        };
        setRobot(updatedRobot);
        setNewPeripheral({ name: '', type: '', description: '', status: 'connected' });
        setShowAddPeripheral(false);
      }
    } catch (error) {
      console.error('Error adding peripheral:', error);
    }
  };

  const handleDeleteRobot = async () => {
    if (!confirm('确定要删除这台机器人吗？此操作不可恢复。')) return;
    
    try {
      const response = await fetch(`/api/robots/${robotId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        router.push('/robots');
      }
    } catch (error) {
      console.error('Error deleting robot:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('确定要删除这个事件吗？此操作不可恢复。')) return;
    
    try {
      const response = await fetch(`/api/timeline`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '删除失败');
      }
      if (data.success) {
        fetchTimelineEvents(); // 刷新时间线
      }
    } catch (error: any) {
      console.error('Error deleting event:', error);
      alert(`删除失败: ${error.message}`);
    }
  };

  // 事件处理函数
  const handleAddEvent = (type: 'ticket' | 'maintenance' | 'document' | 'comment') => {
    setSelectedEventType(type);
    setShowEventModal(true);
  };

  const handleEventSuccess = () => {
    fetchTimelineEvents(); // 刷新时间线
    if (selectedEventType === 'ticket') {
      // 如果创建的是工单，可以跳转到工单列表或刷新相关数据
    }
  };

  // 导出报告
  const handleExport = async (config: any) => {
    try {
      const response = await fetch(`/api/robots/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          robot_id: robotId,
          ...config}),
      });

      if (!response.ok) {
        throw new Error('导出失败');
      }

      // 创建下载链接
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `机器人报告_${robot?.sn}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setShowExportModal(false);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    }
  };

  // 计算运行时长
  const operatingDuration = robot?.specs?.installation_date 
    ? calculateOperatingDuration(robot)
    : { days: 0, formatted: '未知' };

  // 获取事件图标组件
  const getEventIcon = (eventType: string) => {
    const IconComponent = EVENT_TYPES[eventType as keyof typeof EVENT_TYPES]?.icon || Clock;
    const color = EVENT_TYPES[eventType as keyof typeof EVENT_TYPES]?.color || 'text-gray-500';
    return <IconComponent className={`w-5 h-5 ${color}`} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在加载机器人数据...</p>
        </div>
      </div>
    );
  }

  if (!robot) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">机器人不存在</h3>
          <p className="text-gray-600 mb-6">请求的机器人数据不存在或已被删除</p>
          <Button onClick={() => router.push('/robots')}>
            返回机器人列表
          </Button>
        </div>
      </div>
    );
  }

  // 检查是否为管理员
  const isAdmin = ['service_admin', 'end_admin'].includes(user?.role || '');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部导航 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/robots')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回列表
            </button>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                icon={<Download className="w-4 h-4" />}
                onClick={() => setShowExportModal(true)}
              >
                导出报告
              </Button>
              
              {canDelete && (
                <Button
                  variant="outline"
                  icon={<Trash2 className="w-4 h-4" />}
                  onClick={handleDeleteRobot}
                  className="text-red-600 hover:text-red-700 hover:border-red-300"
                >
                  删除机器人
                </Button>
              )}
              
              {canEdit && (
                <Button
                  variant="outline"
                  icon={<Edit className="w-4 h-4" />}
                  onClick={() => router.push(`/robots/${robotId}/edit`)}
                >
                  编辑机器人
                </Button>
              )}
              
              <div className="relative">
                <Button 
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => {
                    // 显示事件类型选择下拉
                    const dropdown = document.getElementById('event-dropdown');
                    if (dropdown) {
                      dropdown.classList.toggle('hidden');
                    }
                  }}
                >
                  添加事件
                </Button>
                
                {/* 事件类型下拉菜单 */}
                <div 
                  id="event-dropdown"
                  className="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10"
                >
                  <div className="py-1">
                    <button
                      onClick={() => handleAddEvent('ticket')}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <AlertCircle className="w-4 h-4 mr-3 text-red-500" />
                      上报异常
                    </button>
                    <button
                      onClick={() => handleAddEvent('maintenance')}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Wrench className="w-4 h-4 mr-3 text-blue-500" />
                      记录维修
                    </button>
                    <button
                      onClick={() => handleAddEvent('document')}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <FileText className="w-4 h-4 mr-3 text-green-500" />
                      上传文档
                    </button>
                    <button
                      onClick={() => handleAddEvent('comment')}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <MessageSquare className="w-4 h-4 mr-3 text-purple-500" />
                      添加评论
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {robot.brand} {robot.model}
              </h1>
              <p className="text-gray-600 mt-1">序列号: {robot.sn}</p>
            </div>
            <div className="flex items-center space-x-3">
              <RobotStatusBadge status={robot.status} />
              <WarrantyStatus warrantyEnd={robot.specs?.warranty_end} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 左侧栏 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 基本信息卡片 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">基本信息</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">状态</span>
                  <RobotStatusBadge status={robot.status} size="sm" />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">保修状态</span>
                  <WarrantyStatus warrantyEnd={robot.specs?.warranty_end} />
                </div>
                
                <div className="flex items-center text-gray-700">
                  <MapPin className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                  <span>{robot.location || '未设置位置'}</span>
                </div>
                
                <div className="flex items-center text-gray-700">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                  <span>
                    安装时间: {robot.specs?.installation_date ? 
                    new Date(robot.specs.installation_date).toLocaleDateString('zh-CN') : '未知'}
                  </span>
                </div>
                
                <div className="flex items-center text-gray-700">
                  <Clock className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                  <span>运行时长: {operatingDuration.formatted}</span>
                </div>
                
                <div className="flex items-center text-gray-700">
                  <User className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                  <span>创建者: {robot.created_by || '未知'}</span>
                </div>
              </div>
            </div>

            {/* 所属关系卡片 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">所属关系</h3>
              <div className="space-y-4">
                {user?.role.includes('service') ? (
                  <>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">客户</p>
                      <p className="font-medium text-gray-900">{robot.org_name}</p>
                    </div>
                    <div className="pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-500 mb-1">服务商</p>
                      <p className="font-medium text-gray-900">您（当前账户）</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">服务商</p>
                      <p className="font-medium text-gray-900">{robot.provider_name}</p>
                    </div>
                    <div className="pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-500 mb-1">客户</p>
                      <p className="font-medium text-gray-900">您（当前账户）</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 规格配置卡片 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">技术规格</h3>
                {canEdit && (
                  <button
                    onClick={() => setShowAddSpec(!showAddSpec)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + 添加
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                {robot.metadata?.specifications?.map((spec: any, index: number) => (
                  <div key={index} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-gray-600">{spec.key}</span>
                    <span className="font-medium text-gray-900">{spec.value}</span>
                  </div>
                )) || (
                  <p className="text-gray-500 text-sm">暂无规格配置</p>
                )}
              </div>
              
              {/* 添加规格表单 */}
              {showAddSpec && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pt-4 border-t border-gray-100"
                >
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="规格名称"
                      value={newSpec.key}
                      onChange={(e) => setNewSpec({ ...newSpec, key: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="规格值"
                      value={newSpec.value}
                      onChange={(e) => setNewSpec({ ...newSpec, value: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <div className="flex items-center space-x-2">
                      <Button size="sm" onClick={handleAddSpec}>添加</Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowAddSpec(false)}>
                        取消
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* 外设配置卡片 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">外设配置</h3>
                {canEdit && (
                  <button
                    onClick={() => setShowAddPeripheral(!showAddPeripheral)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + 添加
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                {robot.metadata?.peripherals?.map((peripheral: any, index: number) => (
                  <div key={index} className="p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          peripheral.status === 'connected' ? 'bg-green-400' : 'bg-gray-400'
                        }`}></div>
                        <span className="font-medium text-gray-900">{peripheral.name}</span>
                      </div>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {peripheral.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{peripheral.description}</p>
                  </div>
                )) || (
                  <p className="text-gray-500 text-sm">暂无外设配置</p>
                )}
              </div>
              
              {/* 添加外设表单 */}
              {showAddPeripheral && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pt-4 border-t border-gray-100"
                >
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="外设名称"
                      value={newPeripheral.name}
                      onChange={(e) => setNewPeripheral({ ...newPeripheral, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="类型（如：视觉、传感器）"
                      value={newPeripheral.type}
                      onChange={(e) => setNewPeripheral({ ...newPeripheral, type: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="描述"
                      value={newPeripheral.description}
                      onChange={(e) => setNewPeripheral({ ...newPeripheral, description: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <div className="flex items-center space-x-2">
                      <Button size="sm" onClick={handleAddPeripheral}>添加</Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowAddPeripheral(false)}>
                        取消
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* 右侧时间线区域 */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* 时间线头部 - 搜索和筛选 */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">时间线</h2>
                  <div className="flex items-center space-x-2">
                    {/* 筛选按钮 */}
                    <Button 
                      variant="outline" 
                      size="sm"
                      icon={<Filter className="w-4 h-4" />}
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      筛选
                    </Button>
                  </div>
                </div>
                
                {/* 筛选面板 */}
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 pt-4 border-t border-gray-200"
                  >
                    <div className="space-y-4">
                      {/* 搜索框 */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="搜索事件主题或描述..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      {/* 时间段筛选 */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">时间段</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              setTimeFilter('all');
                              setCustomStartDate('');
                              setCustomEndDate('');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm ${
                              timeFilter === 'all' 
                                ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            全部时间
                          </button>
                          <button
                            onClick={() => setTimeFilter('today')}
                            className={`px-3 py-1.5 rounded-lg text-sm ${
                              timeFilter === 'today' 
                                ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            今天
                          </button>
                          <button
                            onClick={() => setTimeFilter('week')}
                            className={`px-3 py-1.5 rounded-lg text-sm ${
                              timeFilter === 'week' 
                                ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            本周
                          </button>
                          <button
                            onClick={() => setTimeFilter('month')}
                            className={`px-3 py-1.5 rounded-lg text-sm ${
                              timeFilter === 'month' 
                                ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            本月
                          </button>
                          <button
                            onClick={() => setTimeFilter('custom')}
                            className={`px-3 py-1.5 rounded-lg text-sm ${
                              timeFilter === 'custom' 
                                ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            自定义
                          </button>
                        </div>
                        
                        {/* 自定义时间段选择 */}
                        {timeFilter === 'custom' && (
                          <div className="mt-3 grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">开始日期</label>
                              <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                max={customEndDate || new Date().toISOString().split('T')[0]}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">结束日期</label>
                              <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                min={customStartDate}
                                max={new Date().toISOString().split('T')[0]}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 事件类型筛选 */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">事件类型</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setFilterType('all')}
                            className={`px-3 py-1.5 rounded-lg text-sm ${
                              filterType === 'all' 
                                ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            全部类型
                          </button>
                          {Object.entries(EVENT_TYPES).map(([type, config]) => (
                            <button
                              key={type}
                              onClick={() => setFilterType(type)}
                              className={`px-3 py-1.5 rounded-lg text-sm flex items-center space-x-1 ${
                                filterType === type 
                                  ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              <config.icon className="w-3.5 h-3.5" />
                              <span>{config.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* 结果统计 */}
                      <div className="text-sm text-gray-500">
                        共 {filteredEvents.length} 个事件
                        {filterType !== 'all' && (
                          <span className="ml-2">
                            （筛选: {EVENT_TYPES[filterType as keyof typeof EVENT_TYPES]?.label}）
                          </span>
                        )}
                        {timeFilter !== 'all' && (
                          <span className="ml-2">
                            （时间: {getTimeFilterLabel(timeFilter, customStartDate, customEndDate)}）
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* 时间线内容 */}
              <div className="p-6">
                {filteredEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {searchQuery || filterType !== 'all' ? '无匹配事件' : '暂无时间线事件'}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {searchQuery || filterType !== 'all' 
                        ? '尝试调整筛选条件或搜索关键词' 
                        : '添加第一个事件开始记录'}
                    </p>
                    <Button 
                      icon={<Plus className="w-4 h-4" />}
                      onClick={() => handleAddEvent('comment')}
                    >
                      添加第一个事件
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    {/* 时间轴线 */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                    
                    {/* 时间线事件列表 */}
                    <div className="space-y-8">
                      <AnimatePresence>
                        {filteredEvents.map((event, index) => {
                          const EventIcon = event.icon || Clock;
                          return (
                            <motion.div
                              key={event._id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ delay: index * 0.1 }}
                              className="relative group"
                            >
                              {/* 时间点 */}
                              <div className="absolute left-4 w-4 h-4 rounded-full bg-white 
                                            border-4 border-blue-500 z-10"></div>
                              
                              {/* 事件卡片 */}
                              <div className="ml-10">
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 
                                             hover:border-blue-300 transition-colors">
                                  {/* 事件头部 */}
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                      <div className="p-2 rounded-lg bg-white border border-gray-200">
                                        {getEventIcon(event.event_type)}
                                      </div>
                                      <div>
                                        <h3 className="font-semibold text-gray-900">{event.title}</h3>
                                        <div className="flex items-center space-x-2 mt-1">
                                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                                            event.event_type === 'ticket_created' ? 'bg-red-100 text-red-700' :
                                            event.event_type === 'maintenance' ? 'bg-blue-100 text-blue-700' :
                                            event.event_type === 'document_added' ? 'bg-green-100 text-green-700' :
                                            event.event_type === 'comment_added' ? 'bg-purple-100 text-purple-700' :
                                            'bg-gray-100 text-gray-700'
                                          }`}>
                                            {EVENT_TYPES[event.event_type as keyof typeof EVENT_TYPES]?.label || event.event_type}
                                          </span>
                                          <span className="text-sm text-gray-500">
                                            {new Date(event.created_at).toLocaleDateString('zh-CN', {
                                              year: 'numeric',
                                              month: 'short',
                                              day: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit',
                                            })}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* 操作按钮（管理员可见） */}
                                    <div className={`flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity ${
                                      isAdmin ? '' : 'hidden'
                                    }`}>
                                      <button
                                        onClick={() => handleDeleteEvent(event._id)}
                                        className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600"
                                        title="删除事件"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                  
                                  {/* 事件内容 */}
                                  <p className="text-gray-700 mb-3">{event.description}</p>
                                  
                                  {/* 事件元数据 */}
                                  {event.metadata && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                      {event.metadata.tags && (
                                        <div className="flex items-center space-x-2 mb-3">
                                          {event.metadata.tags.map((tag: string, i: number) => (
                                            <span key={i} className="px-2 py-1 text-xs bg-gray-100 
                                                                   text-gray-700 rounded-lg">
                                              {tag}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* 关联操作按钮 */}
                                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                                        {event.event_type === 'ticket_created' && (
                                          <button 
                                            onClick={() => {
                                              if (event.reference_id) {
                                                router.push(`/tickets/${event.reference_id}`);
                                              }
                                            }}
                                            className="text-blue-600 hover:text-blue-800 hover:underline"
                                          >
                                            查看工单详情 →
                                          </button>
                                        )}
                                        
                                        {event.event_type === 'maintenance' && (
                                          <button className="text-blue-600 hover:text-blue-800 hover:underline">
                                            查看维修详情 →
                                          </button>
                                        )}
                                        
                                        {event.metadata.attachments && (
                                          <div className="flex items-center space-x-1">
                                            <FileText className="w-4 h-4" />
                                            <span>{event.metadata.attachments}个附件</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* 创建者信息 */}
                                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-green-400 
                                                    flex items-center justify-center text-white text-sm font-semibold">
                                        {event.created_by?.name?.charAt(0) || 'U'}
                                      </div>
                                      <div className="text-sm">
                                        <p className="text-gray-900">{event.created_by?.name || '未知用户'}</p>
                                        <p className="text-gray-500">
                                          {event.created_by?.role === 'service_engineer' ? '工程师' : 
                                           event.created_by?.role === 'end_admin' ? '管理员' : '用户'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 事件添加模态框 */}
      <AnimatePresence>
        {showEventModal && selectedEventType && (
          <EventModal
            robotId={robotId}
            robotSn={robot.sn}
            eventType={selectedEventType}
            onClose={() => {
              setShowEventModal(false);
              setSelectedEventType(null);
            }}
            onSuccess={handleEventSuccess}
          />
        )}
      </AnimatePresence>

      {/* 导出模态框 */}
      <AnimatePresence>
        {showExportModal && (
          <ExportModal
            robotId={robotId}
            robotSn={robot.sn}
            onClose={() => setShowExportModal(false)}
            onExport={handleExport}
          />
        )}
      </AnimatePresence>
    </div>
  );
}