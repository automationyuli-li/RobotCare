// src/app/tickets/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Plus, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  XCircle,
  ChevronRight,
  ExternalLink,
  User,
  Bot,
  Building2,
  Calendar,
  BarChart3,
  Download,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Navigation from '@/components/layout/Navigation';

// 工单状态配置 - 修复类型定义
const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  icon: React.ComponentType<any>;
}> = {
  open: { 
    label: '待处理', 
    color: 'bg-amber-100 text-amber-700', 
    icon: AlertCircle 
  },
  in_progress: { 
    label: '处理中', 
    color: 'bg-blue-100 text-blue-700', 
    icon: Clock 
  },
  pending: { 
    label: '等待中', 
    color: 'bg-gray-100 text-gray-700', 
    icon: Clock 
  },
  resolved: { 
    label: '已解决', 
    color: 'bg-green-100 text-green-700', 
    icon: CheckCircle 
  },
  closed: { 
    label: '已关闭', 
    color: 'bg-gray-100 text-gray-700', 
    icon: XCircle 
  },
};

const PRIORITY_CONFIG = {
  low: { label: '低', color: 'bg-gray-100 text-gray-700' },
  medium: { label: '中', color: 'bg-blue-100 text-blue-700' },
  high: { label: '高', color: 'bg-amber-100 text-amber-700' },
  urgent: { label: '紧急', color: 'bg-red-100 text-red-700' },
};

// 定义工单类型
type TicketStatus = keyof typeof STATUS_CONFIG;
type TicketPriority = keyof typeof PRIORITY_CONFIG;

interface Ticket {
  _id: string;
  ticket_number: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  due_date?: string;
  customer_id?: string;
  robot_id?: string;
  assigned_to?: string;
  customer?: {
    _id: string;
    name: string;
  };
  robot?: {
    _id: string;
    sn: string;
    brand: string;
    model: string;
  };
  created_by_user?: {
    display_name: string;
  };
  assigned_to_user?: {
    _id: string;
    display_name: string;
  };
}

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    customer_id: '',
    assigned_to: '',
  });
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [selectedEngineer, setSelectedEngineer] = useState('');

  // 获取工单列表
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append('search', searchQuery);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.priority) queryParams.append('priority', filters.priority);
      if (filters.customer_id) queryParams.append('customer_id', filters.customer_id);
      if (filters.assigned_to === 'unassigned') {
        queryParams.append('assigned_to', 'none');
      } else if (filters.assigned_to) {
        queryParams.append('assigned_to', filters.assigned_to);
      }

      const response = await fetch(`/api/tickets?${queryParams.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setTickets(data.data.tickets);
        // 计算统计数据
        const stats = {
          total: data.data.total,
          open: data.data.tickets.filter((t: Ticket) => t.status === 'open').length,
          in_progress: data.data.tickets.filter((t: Ticket) => t.status === 'in_progress').length,
          resolved: data.data.tickets.filter((t: Ticket) => t.status === 'resolved' || t.status === 'closed').length,
          unassigned: data.data.tickets.filter((t: Ticket) => !t.assigned_to).length,
        };
        setStats(stats);
      }
    } catch (error) {
      console.error('获取工单失败:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters]);

  // 获取客户列表（用于筛选）
  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/organizations?type=end_customer');
      const data = await response.json();
      if (data.success) {
        setCustomers(data.data.organizations);
      }
    } catch (error) {
      console.error('获取客户列表失败:', error);
    }
  };

  // 获取工程师列表
  const fetchEngineers = async () => {
    try {
      const response = await fetch('/api/team/engineers?include_stats=false');
      const data = await response.json();
      if (data.success) {
        setEngineers(data.data);
      }
    } catch (error) {
      console.error('获取工程师列表失败:', error);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchCustomers();
    fetchEngineers();
  }, [fetchTickets]);

  const handleSearch = () => {
    fetchTickets();
  };

  const clearFilters = () => {
    setFilters({ status: '', priority: '', customer_id: '', assigned_to: '' });
    setSearchQuery('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleTicketClick = (ticketId: string) => {
    router.push(`/tickets/${ticketId}`);
  };

  const handleCustomerClick = (customerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/robots?customer=${customerId}`);
  };

  const handleCreateTicket = () => {
    router.push('/tickets/new');
  };

  // 辅助函数：渲染状态图标
  const renderStatusIcon = (status: TicketStatus) => {
    const IconComponent = STATUS_CONFIG[status].icon;
    return <IconComponent className="w-3 h-3 mr-1" />;
  };

  return (
    <>
      <Navigation />
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 页面标题和操作按钮 */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">工单管理</h1>
                <p className="text-gray-600 mt-1">管理与跟踪所有机器人的维保工单</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  icon={<Download className="w-4 h-4" />}
                  onClick={() => {/* 导出功能 */}}
                >
                  导出
                </Button>
                <Button
                  variant="primary"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={handleCreateTicket}
                >
                  创建工单
                </Button>
              </div>
            </div>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">总工单数</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">待处理</p>
                  <p className="text-3xl font-bold text-amber-600 mt-2">{stats.open}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">处理中</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{stats.in_progress}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">已解决</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{stats.resolved}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* 搜索和筛选栏 */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 mb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* 搜索框 */}
              <div className="flex-1">
                <Input
                  icon={<Search className="w-4 h-4" />}
                  placeholder="搜索工单号、标题或描述..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              {/* 筛选按钮 */}
              <Button
                variant="secondary"
                icon={<Filter className="w-4 h-4" />}
                onClick={() => setShowFilters(!showFilters)}
              >
                筛选
              </Button>

              {/* 刷新按钮 */}
              <Button
                variant="ghost"
                icon={<RefreshCw className="w-4 h-4" />}
                onClick={fetchTickets}
                loading={loading}
              >
                刷新
              </Button>
            </div>

            {/* 筛选选项 */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 pt-6 border-t border-gray-200"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 状态筛选 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        状态
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      >
                        <option value="">全部状态</option>
                        {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                          <option key={value} value={value}>
                            {config.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 优先级筛选 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        优先级
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={filters.priority}
                        onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                      >
                        <option value="">全部优先级</option>
                        {Object.entries(PRIORITY_CONFIG).map(([value, config]) => (
                          <option key={value} value={value}>
                            {config.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 客户筛选 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        客户
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={filters.customer_id}
                        onChange={(e) => setFilters({ ...filters, customer_id: e.target.value })}
                      >
                        <option value="">全部客户</option>
                        {customers.map(customer => (
                          <option key={customer._id} value={customer._id}>
                            {customer.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* 指派工程师筛选 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        分配工程师
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={filters.assigned_to || ''}
                        onChange={(e) => setFilters({ ...filters, assigned_to: e.target.value })}
                      >
                        <option value="">全部</option>
                        <option value="unassigned">未分配</option>
                        {engineers.map(engineer => (
                          <option key={engineer._id} value={engineer._id}>
                            {engineer.display_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end space-x-3">
                    <Button variant="outline" onClick={clearFilters}>
                      清除筛选
                    </Button>
                    <Button variant="primary" onClick={handleSearch}>
                      应用筛选
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 工单列表 */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-500">加载工单中...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无工单</h3>
                <p className="text-gray-500 mb-6">当前筛选条件下没有找到工单</p>
                <Button variant="primary" onClick={handleCreateTicket}>
                  创建第一个工单
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        工单号
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        客户
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        机器人
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        异常描述
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        优先级
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        指派
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        创建时间
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tickets.map((ticket) => {
                      const StatusIcon = STATUS_CONFIG[ticket.status].icon;
                      
                      return (
                        <motion.tr
                          key={ticket._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleTicketClick(ticket._id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-blue-600">
                                {ticket.ticket_number}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {ticket.customer ? (
                              <button
                                onClick={(e) => handleCustomerClick(ticket.customer!._id, e)}
                                className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 hover:underline"
                              >
                                <Building2 className="w-4 h-4" />
                                <span>{ticket.customer.name}</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {ticket.robot ? (
                              <div className="flex items-center space-x-2">
                                <Bot className="w-4 h-4 text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {ticket.robot.brand} {ticket.robot.model}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    SN: {ticket.robot.sn}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="max-w-xs">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {ticket.title}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {ticket.description || '暂无描述'}
                              </p>
                              {ticket.created_by_user && (
                                <p className="text-xs text-gray-400 mt-1">
                                  <User className="w-3 h-3 inline mr-1" />
                                  {ticket.created_by_user.display_name}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[ticket.status].color}`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {STATUS_CONFIG[ticket.status].label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${PRIORITY_CONFIG[ticket.priority].color}`}>
                              {PRIORITY_CONFIG[ticket.priority].label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {ticket.assigned_to_user ? (
                              <div className="flex items-center space-x-2">
                                <User className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-medium text-gray-900">
                                  {ticket.assigned_to_user.display_name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">未分配</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-500">
                              <Calendar className="w-4 h-4 mr-2" />
                              {formatDate(ticket.created_at)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}