// src/app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users,
  Bot,
  Ticket,
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle,
  MapPin,
  ChevronRight,
  ExternalLink,
  Building,
  User,
  TrendingUp,
  Activity,
  Shield,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Navigation from '@/components/layout/Navigation';
import { cn } from '@/lib/utils/cn';
import { formatDate } from '@/lib/utils/format';

// Dashboard组件类型
interface DashboardData {
  role: string;
  organization_name?: string;
  display_name?: string;
  stats?: any;
  urgent_tickets?: any[];
  pending_tasks?: any[];
  robot_stats?: any;
  fault_robots?: any[];
  ticket_stats?: any;
}

type TicketPriority = 'urgent' | 'high' | 'medium' | 'low';

// 优先级配置
const PRIORITY_CONFIG: Record<TicketPriority, {
  label: string;
  color: string;
}> = {
  urgent: { label: '紧急', color: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: '高', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  medium: { label: '中', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  low: { label: '低', color: 'bg-gray-100 text-gray-700 border-gray-200' },
};

// 状态配置
const STATUS_CONFIG = {
  active: { label: '正常', color: 'text-green-600', emoji: '🟢' },
  maintenance: { label: '维护', color: 'text-amber-600', emoji: '🟡' },
  fault: { label: '异常', color: 'text-red-600', emoji: '🔴' },
};

// 定义子组件的props接口
interface DashboardComponentProps {
  data: DashboardData;
  onTicketClick: (ticketId: string) => void;
  onRobotClick: (robotId: string) => void;
}

export default function DashboardPage() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // 获取Dashboard数据
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/dashboard');
      const data = await response.json();
      
      if (data.success) {
        setDashboardData(data.data);
      } else {
        setError(data.error || '获取数据失败');
      }
    } catch (error: any) {
      console.error('获取Dashboard数据失败:', error);
      setError('网络连接失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // 跳转到工单详情
  const handleTicketClick = (ticketId: string) => {
    router.push(`/tickets/${ticketId}`);
  };

  // 跳转到机器人详情
  const handleRobotClick = (robotId: string) => {
    router.push(`/robots/${robotId}`);
  };

  // 加载状态
  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">加载Dashboard中...</p>
          </div>
        </div>
      </>
    );
  }

  // 错误状态
  if (error) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">加载失败</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button variant="primary" onClick={fetchDashboardData} icon={<RefreshCw className="w-4 h-4" />}>
              重试
            </Button>
          </div>
        </div>
      </>
    );
  }

  // 根据角色渲染不同的Dashboard
  const renderDashboard = () => {
    if (!dashboardData) return null;

    const props: DashboardComponentProps = {
      data: dashboardData,
      onTicketClick: handleTicketClick,
      onRobotClick: handleRobotClick,
    };

    switch (dashboardData.role) {
      case 'service_admin':
        return <ServiceProviderAdminDashboard {...props} />;
      case 'service_engineer':
        return <ServiceProviderEngineerDashboard {...props} />;
      case 'end_admin':
        return <EndCustomerAdminDashboard {...props} />;
      case 'end_engineer':
        return <EndCustomerEngineerDashboard {...props} />;
      default:
        return <ErrorDashboard />;
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        {renderDashboard()}
      </div>
    </>
  );
}

// 服务商管理员Dashboard
function ServiceProviderAdminDashboard({ data, onTicketClick }: DashboardComponentProps) {
  const router = useRouter();
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 欢迎横幅 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-gray-900">
          👤 欢迎回来，{data.organization_name}
        </h1>
        <p className="text-gray-600 mt-2">以下是您服务的整体概况</p>
      </motion.div>

      {/* 关键指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* 客户数 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">客户数</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {data.stats?.customers || 0}
              </p>
              <div className="flex items-center mt-2 text-sm text-green-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>+2本月新增</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        {/* 机器人 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">机器人</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {data.stats?.robots || 0}
              </p>
              <div className="flex items-center mt-2 text-sm text-gray-600">
                <Activity className="w-4 h-4 mr-1" />
                <span>89%正常</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Bot className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        {/* 工单数 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">工单数</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {data.stats?.tickets || 0}
              </p>
              <div className="flex items-center mt-2 text-sm text-amber-600">
                <AlertTriangle className="w-4 h-4 mr-1" />
                <span>{data.urgent_tickets?.length || 0}个紧急</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Ticket className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </motion.div>

        {/* 工程师 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">工程师</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {data.stats?.engineers || 0}
              </p>
              <div className="flex items-center mt-2 text-sm text-blue-600">
                <Wrench className="w-4 h-4 mr-1" />
                <span>5人在线</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <User className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* 紧急工单提醒 */}
      {data.urgent_tickets && data.urgent_tickets.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl border border-red-200 shadow-sm mb-8 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-red-50 to-amber-50 px-6 py-4 border-b border-red-100">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">🔧 紧急工单提醒</h2>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {data.urgent_tickets.map((ticket, any) => (
              <div
                key={ticket._id}
                className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onTicketClick(ticket._id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={cn(
                      "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border",
                      PRIORITY_CONFIG[ticket.priority as TicketPriority]?.color || 'bg-gray-100 text-gray-700'
                    )}>
                      {PRIORITY_CONFIG[ticket.priority as TicketPriority]?.label || ticket.priority || '未知'}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{ticket.title}</p>
                      <p className="text-sm text-gray-500">
                        {ticket.customer_name} • {ticket.robot_info}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    {ticket.assigned_to ? (
                      <span className="text-sm text-gray-600">已指派</span>
                    ) : (
                      <span className="text-sm text-amber-600">待处理</span>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 快速操作 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <button
          onClick={() => router.push('/tickets/new')}
          className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-blue-300 text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-blue-600" />
            </div>
            <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">创建新工单</h3>
          <p className="text-sm text-gray-500">为机器人创建维修或保养工单</p>
        </button>

        <button
          onClick={() => router.push('/robots')}
          className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-green-300 text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Bot className="w-5 h-5 text-green-600" />
            </div>
            <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">查看所有机器人</h3>
          <p className="text-sm text-gray-500">管理客户的所有机器人设备</p>
        </button>

        <button
          onClick={() => router.push('/organizations')}
          className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-purple-300 text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Building className="w-5 h-5 text-purple-600" />
            </div>
            <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">客户管理</h3>
          <p className="text-sm text-gray-500">查看和管理所有服务客户</p>
        </button>
      </motion.div>
    </div>
  );
}

// 服务商工程师Dashboard
function ServiceProviderEngineerDashboard({ data, onTicketClick }: DashboardComponentProps) {
  const router = useRouter();
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 欢迎横幅 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-gray-900">
          👨‍🔧 工程师面板 - {data.display_name}
        </h1>
        <p className="text-gray-600 mt-2">这是您的工作统计和待处理任务</p>
      </motion.div>

      {/* 我的工作统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
        >
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-sm text-gray-500">已完成工单</p>
            <p className="text-4xl font-bold text-gray-900 mt-2">
              {data.stats?.completed_tickets || 0}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
        >
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-sm text-gray-500">平均解决时间</p>
            <p className="text-4xl font-bold text-gray-900 mt-2">
              {data.stats?.avg_resolution_time || '0.0'}天
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
        >
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-amber-600" />
            </div>
            <p className="text-sm text-gray-500">客户满意度</p>
            <p className="text-4xl font-bold text-gray-900 mt-2">
              {data.stats?.customer_satisfaction || '0.0'}/5.0
            </p>
          </div>
        </motion.div>
      </div>

      {/* 待处理任务 */}
      {data.pending_tasks && data.pending_tasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-8 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">🚨 待处理任务（最优先）</h2>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {data.pending_tasks.map((task: any, index: number) => (
              <div
                key={task._id}
                className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onTicketClick(task._id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-gray-400 text-sm font-medium">
                        {index + 1}.
                      </span>
                      <span className={cn(
                        "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border",
                        PRIORITY_CONFIG[task.priority as TicketPriority]?.color || 'bg-gray-100 text-gray-700'
                      )}>
                        {PRIORITY_CONFIG[task.priority as TicketPriority]?.label || task.priority}
                      </span>
                      <h3 className="font-medium text-gray-900">{task.title}</h3>
                    </div>
                    
                    <div className="ml-6 space-y-2">
                      <p className="text-sm text-gray-600">
                        {task.customer_name} • {task.robot_info}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        {task.due_date ? (
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            <span>
                              {new Date(task.due_date) < new Date()
                                ? `超时: ${Math.floor((Date.now() - new Date(task.due_date).getTime()) / (1000 * 60 * 60))}小时`
                                : `剩余: ${Math.floor((new Date(task.due_date).getTime() - Date.now()) / (1000 * 60 * 60))}小时`
                              }
                            </span>
                          </div>
                        ) : null}
                        
                        {task.metadata?.location && (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span>{task.metadata.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center ml-4">
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 快速操作 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => router.push('/tickets?status=open,in_progress')}
          className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-blue-300 text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-blue-600" />
            </div>
            <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">查看我的工单</h3>
          <p className="text-sm text-gray-500">查看所有分配给您的工单</p>
        </button>

        <button
          onClick={() => router.push('/robots')}
          className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-green-300 text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Bot className="w-5 h-5 text-green-600" />
            </div>
            <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">查看机器人</h3>
          <p className="text-sm text-gray-500">查看您负责的机器人状态</p>
        </button>
      </div>
    </div>
  );
}

// 终端客户管理员Dashboard
function EndCustomerAdminDashboard({ data, onRobotClick }: DashboardComponentProps) {
  const router = useRouter();
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 欢迎横幅 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-gray-900">
          🏢 {data.organization_name} - 机器人管理中心
        </h1>
        <p className="text-gray-600 mt-2">实时监控您的机器人运行状态</p>
      </motion.div>

      {/* 机器人位置分布 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-8 overflow-hidden"
      >
        <div className="bg-gradient-to-r from-gray-50 to-green-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <MapPin className="w-5 h-5 text-green-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900">📍 机器人位置分布（位置概览）</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/robots')}
            >
              查看详情
            </Button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            {data.robot_stats?.by_location?.map((location: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{location.location}</h3>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center">
                      <span className="mr-2">🟢</span>
                      <span className="text-sm text-gray-600">{location.active}台</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">🟡</span>
                      <span className="text-sm text-gray-600">{location.maintenance}台</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">🔴</span>
                      <span className="text-sm text-gray-600">{location.fault}台</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">总计</p>
                  <p className="text-xl font-bold text-gray-900">{location.total}台</p>
                </div>
              </div>
            ))}
            
            {/* 总计统计 */}
            {data.robot_stats?.total && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center space-x-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-500">正常</p>
                    <p className="text-2xl font-bold text-green-600">{data.robot_stats.total.active}台</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">维护</p>
                    <p className="text-2xl font-bold text-amber-600">{data.robot_stats.total.maintenance}台</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">异常</p>
                    <p className="text-2xl font-bold text-red-600">{data.robot_stats.total.fault}台</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">总计</p>
                    <p className="text-2xl font-bold text-gray-900">{data.robot_stats.total_robots}台</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* 当前异常机器人 */}
      {data.fault_robots && data.fault_robots.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden"
        >
          <div className="bg-gradient-to-r from-red-50 to-amber-50 px-6 py-4 border-b border-red-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
                <h2 className="text-lg font-semibold text-gray-900">⚠️ 当前异常机器人</h2>
              </div>
              <span className="text-sm font-medium text-red-600">
                {data.fault_robots.length}个异常
              </span>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {data.fault_robots.map((robot: any, index: number) => (
              <div
                key={robot._id}
                className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onRobotClick(robot._id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-gray-400 text-sm font-medium">
                        {index + 1}.
                      </span>
                      <h3 className="font-medium text-gray-900">
                        机器人{robot.sn}
                      </h3>
                      <span className="text-sm text-red-600">• 异常</span>
                    </div>
                    
                    <div className="ml-6 space-y-2">
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>{robot.fault_duration}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span>{robot.location}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <Wrench className="w-4 h-4 mr-1" />
                          <span className={cn(
                            robot.active_ticket?.status === 'in_progress'
                              ? 'text-blue-600'
                              : 'text-amber-600'
                          )}>
                            {robot.active_ticket?.assigned_to 
                              ? '服务商: 处理中'
                              : '服务商: 已处理'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center ml-4">
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// 终端客户工程师Dashboard
function EndCustomerEngineerDashboard({ data, onRobotClick }: DashboardComponentProps) {
  const router = useRouter();
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 欢迎横幅 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-gray-900">
          👨‍💼 {data.display_name} - 设备维护面板
        </h1>
        <p className="text-gray-600 mt-2">监控您负责的机器人运行状态</p>
      </motion.div>

      {/* 机器人位置分布 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-8 overflow-hidden"
      >
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <MapPin className="w-5 h-5 text-blue-600 mr-3" />
            <h2 className="text-lg font-semibold text-gray-900">📍 机器人位置分布（位置概览）</h2>
          </div>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            {data.robot_stats?.by_location?.map((location: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{location.location}</h3>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center">
                      <span className="mr-2">🟢</span>
                      <span className="text-sm text-gray-600">{location.active}台</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">🟡</span>
                      <span className="text-sm text-gray-600">{location.maintenance}台</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">🔴</span>
                      <span className="text-sm text-gray-600">{location.fault}台</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">总计</p>
                  <p className="text-xl font-bold text-gray-900">{location.total}台</p>
                </div>
              </div>
            ))}
            
            {/* 总计统计 */}
            {data.robot_stats?.total && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center space-x-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-500">正常</p>
                    <p className="text-2xl font-bold text-green-600">{data.robot_stats.total.active}台</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">维护</p>
                    <p className="text-2xl font-bold text-amber-600">{data.robot_stats.total.maintenance}台</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">异常</p>
                    <p className="text-2xl font-bold text-red-600">{data.robot_stats.total.fault}台</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">总计</p>
                    <p className="text-2xl font-bold text-gray-900">{data.robot_stats.total_robots}台</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* 我提交的异常状态总结 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
      >
        <div className="bg-gradient-to-r from-gray-50 to-purple-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <BarChart3 className="w-5 h-5 text-purple-600 mr-3" />
            <h2 className="text-lg font-semibold text-gray-900">📋 我提交的异常状态总结</h2>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <p className="text-sm text-gray-500">已解决异常</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {data.ticket_stats?.resolved || 0}
              </p>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-gray-500">异常处理中</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {data.ticket_stats?.in_progress || 0}
              </p>
            </div>
            
            <div className="text-center p-4 bg-amber-50 rounded-xl">
              <p className="text-sm text-gray-500">异常未指派</p>
              <p className="text-3xl font-bold text-amber-600 mt-2">
                {data.ticket_stats?.unassigned || 0}
              </p>
            </div>
          </div>
          
          {/* 异常机器人列表 */}
          {data.fault_robots && data.fault_robots.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 mb-3">异常未指派机器人</h3>
              {data.fault_robots.map((robot: any, index: number) => (
                <div
                  key={robot._id}
                  className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100 hover:bg-red-100 transition-colors cursor-pointer"
                  onClick={() => onRobotClick(robot._id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <span className="text-red-600 font-medium">🔴</span>
                      <span className="font-medium text-gray-900">机器人{robot.sn}</span>
                      <span className="text-sm text-gray-600">({robot.model})</span>
                    </div>
                    <div className="ml-6 space-y-1">
                      <p className="text-sm text-gray-600">{robot.location}</p>
                      <p className="text-sm text-red-600">{robot.issue}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// 错误Dashboard
function ErrorDashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-2xl p-8 text-center">
        <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">无法加载Dashboard</h2>
        <p className="text-gray-600 mb-6">您的用户角色未正确配置，请联系管理员</p>
        <Button variant="primary" onClick={() => window.location.reload()}>
          刷新页面
        </Button>
      </div>
    </div>
  );
}