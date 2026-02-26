// app/team/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  UserCog,
  Mail,
  Phone,
  Calendar,
  Wrench,
  Clock,
  CheckCircle,
  Trash2,
  MoreVertical,
  Search,
  Filter,
  Download,
  RefreshCw,
  Shield,
  Star,
  Award,
  TrendingUp,
  Activity,
  LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Navigation from '@/components/layout/Navigation';
import { cn } from '@/lib/utils/cn';
import { formatDate } from '@/lib/utils/format';

// 工程师状态类型
type EngineerStatus = 'idle' | 'working' | 'busy';
type EngineerRole = 'service_engineer' | 'end_engineer';

// 工程师接口
interface Engineer {
  _id: string;
  display_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  role: EngineerRole;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  last_login_at?: string;
  // 动态计算的字段
  ticket_stats: {
    total: number;
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
  };
  current_status: EngineerStatus;
  active_tickets: Array<{
    _id: string;
    ticket_number: string;
    title: string;
    status: string;
    priority: string;
  }>;
}

// 团队统计数据接口
interface TeamStats {
  total_engineers: number;
  active_engineers: number;
  idle_engineers: number;
  working_engineers: number;
  busy_engineers: number;
  total_tickets: number;
  avg_resolution_time: number;
  top_performer?: {
    engineer_id: string;
    engineer_name: string;
    resolved_count: number;
  };
}

// 状态配置
const STATUS_CONFIG: Record<EngineerStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
}> = {
  idle: {
    label: '空闲',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: UserCheck
  },
  working: {
    label: '工作中',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    icon: Clock
  },
  busy: {
    label: '忙碌',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    icon: Activity
  }
};

// 角色配置
const ROLE_CONFIG: Record<EngineerRole, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  service_engineer: {
    label: '服务商工程师',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  end_engineer: {
    label: '客户工程师',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50'
  }
};

export default function TeamPage() {
  const router = useRouter();
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [stats, setStats] = useState<TeamStats>({
    total_engineers: 0,
    active_engineers: 0,
    idle_engineers: 0,
    working_engineers: 0,
    busy_engineers: 0,
    total_tickets: 0,
    avg_resolution_time: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'service_engineer'
  });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string>('');

  // 获取当前用户信息和团队数据
  const fetchTeamData = useCallback(async () => {
    setLoading(true);
    try {
      // 获取当前用户信息
      const userResponse = await fetch('/api/auth/session');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        if (userData.success) {
          setCurrentUser(userData.data.user);
        }
      }

      // 获取团队统计数据
      const statsResponse = await fetch('/api/team/stats');
      const statsData = await statsResponse.json();
      if (statsData.success) {
        setStats(statsData.data);
      }

      // 获取工程师列表
      const engineersResponse = await fetch('/api/team/engineers');
      const engineersData = await engineersResponse.json();
      if (engineersData.success) {
        setEngineers(engineersData.data);
      }
    } catch (error) {
      console.error('获取团队数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始化加载数据
  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  // 发送邀请
  const handleSendInvite = async () => {
    if (!inviteForm.email.trim()) {
      setInviteError('请输入邮箱地址');
      return;
    }

    setInviteLoading(true);
    setInviteError('');

    try {
      const response = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitee_email: inviteForm.email,
          role: inviteForm.role,
          invitation_type: 'engineer'
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setInviteForm({ email: '', role: 'service_engineer' });
        setShowInviteForm(false);
        // 显示成功消息
        alert('邀请已发送！');
        // 刷新数据
        fetchTeamData();
      } else {
        setInviteError(data.error || data.message || '发送邀请失败');
      }
    } catch (error: any) {
      setInviteError('网络错误，请重试');
      console.error('发送邀请失败:', error);
    } finally {
      setInviteLoading(false);
    }
  };

  // 删除工程师
  const handleDeleteEngineer = async (engineerId: string, engineerName: string) => {
    if (!confirm(`确定要删除工程师 "${engineerName}" 吗？此操作不可撤销。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/team/engineers/${engineerId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        alert('工程师已删除');
        fetchTeamData(); // 刷新列表
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除工程师失败:', error);
      alert('删除失败，请重试');
    }
  };

  // 过滤工程师
  const filteredEngineers = engineers.filter(engineer => {
    // 搜索过滤
    const matchesSearch = searchQuery === '' || 
      engineer.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      engineer.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 角色过滤
    const matchesRole = filterRole === 'all' || engineer.role === filterRole;
    
    // 状态过滤
    const matchesStatus = filterStatus === 'all' || engineer.current_status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // 是否是管理员
  const isAdmin = currentUser?.role?.includes('admin');

  // 获取状态图标组件
  const getStatusIcon = (status: EngineerStatus) => {
    const Icon = STATUS_CONFIG[status].icon;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <>
      <Navigation />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 页面标题和操作按钮 */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <motion.h1 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-3xl font-bold text-gray-900"
                >
                  团队管理
                </motion.h1>
                <p className="text-gray-600 mt-2">
                  管理您的工程师团队，监控工作状态和效率
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  icon={<Download className="w-4 h-4" />}
                  onClick={() => {/* 导出功能 */}}
                >
                  导出
                </Button>
                
                {isAdmin && (
                  <Button
                    variant="primary"
                    icon={<UserPlus className="w-4 h-4" />}
                    onClick={() => setShowInviteForm(true)}
                  >
                    邀请工程师
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* 统计卡片区 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* 总工程师数 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">总工程师数</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.total_engineers}
                  </p>
                  <div className="flex items-center mt-2 text-sm">
                    <span className="text-green-600 flex items-center">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      {stats.active_engineers} 人在线
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>

            {/* 工作中工程师 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">工作中</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    {stats.working_engineers}
                  </p>
                  <div className="flex items-center mt-2 text-sm">
                    <span className="text-blue-600 flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      正在处理工单
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </motion.div>

            {/* 空闲工程师 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">空闲</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {stats.idle_engineers}
                  </p>
                  <div className="flex items-center mt-2 text-sm">
                    <span className="text-green-600 flex items-center">
                      <UserCheck className="w-4 h-4 mr-1" />
                      可分配任务
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </motion.div>

            {/* 处理工单数 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">本月处理工单</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">
                    {stats.total_tickets}
                  </p>
                  <div className="flex items-center mt-2 text-sm">
                    <span className="text-purple-600 flex items-center">
                      <Wrench className="w-4 h-4 mr-1" />
                      平均 {stats.avg_resolution_time.toFixed(1)} 天
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* 搜索和过滤栏 */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm mb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              {/* 搜索框 */}
              <div className="md: w-2/5">
               <div className="h-10">
                <Input
                  icon={<Search className="w-4 h-4" />}
                  placeholder="搜索工程师姓名或邮箱..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10"
                />
               </div>
              </div>

              {/* 角色过滤 */}
              <div className="md:w-1/5">
               <div className="h-10">
                <select
                  className="w-full h-10 border border-gray-300 rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                >
                  <option value="all">所有角色</option>
                  <option value="service_engineer">服务商工程师</option>
                  <option value="end_engineer">客户工程师</option>
                </select>
               </div>
              </div>

              {/* 状态过滤 */}
              <div className="md:w-1/5">
               <div className="h-10">
                <select
                  className="w-full h-10 border border-gray-300 rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">所有状态</option>
                  <option value="idle">空闲</option>
                  <option value="working">工作中</option>
                  <option value="busy">忙碌</option>
                </select>
               </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex-1">
               <div className="flex justify-end space-x-2 h-10">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<RefreshCw className="w-4 h-4" />}
                  onClick={fetchTeamData}
                  loading={loading}
                  className="h-9 px-3"
                >
                  刷新
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Filter className="w-4 h-4" />}
                  onClick={() => {
                    setSearchQuery('');
                    setFilterRole('all');
                    setFilterStatus('all');
                  }}
                  className="h-9 px-3"
                >
                  清除筛选
                </Button>
               </div>
              </div>
            </div>
          </div>

          {/* 工程师列表 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-500">加载团队数据中...</p>
              </div>
            ) : filteredEngineers.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无工程师</h3>
                <p className="text-gray-500 mb-6">当前筛选条件下没有找到工程师</p>
                {isAdmin && (
                  <Button variant="primary" onClick={() => setShowInviteForm(true)}>
                    邀请第一个工程师
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        工程师
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        工单统计
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        联系方式
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        最后登录
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEngineers.map((engineer, index) => (
                      <motion.tr
                        key={engineer._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className={cn(
                                "h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold",
                                engineer.role === 'service_engineer' 
                                  ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                                  : 'bg-gradient-to-r from-teal-500 to-cyan-500'
                              )}>
                                {engineer.display_name.charAt(0)}
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="flex items-center">
                                <p className="text-sm font-medium text-gray-900">
                                  {engineer.display_name}
                                </p>
                                {engineer.ticket_stats.resolved > 10 && (
                                  <Award className="w-4 h-4 ml-2 text-amber-500" />
                                )}
                              </div>
                              <div className="mt-1">
                                <span className={cn(
                                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                  ROLE_CONFIG[engineer.role].bgColor,
                                  ROLE_CONFIG[engineer.role].color
                                )}>
                                  {ROLE_CONFIG[engineer.role].label}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-4">
                            <div className="text-center">
                              <p className="text-lg font-bold text-gray-900">
                                {engineer.ticket_stats.total}
                              </p>
                              <p className="text-xs text-gray-500">总计</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-blue-600">
                                {engineer.ticket_stats.open + engineer.ticket_stats.in_progress}
                              </p>
                              <p className="text-xs text-gray-500">进行中</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-green-600">
                                {engineer.ticket_stats.resolved}
                              </p>
                              <p className="text-xs text-gray-500">已解决</p>
                            </div>
                          </div>
                          {engineer.active_tickets.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 truncate">
                                {engineer.active_tickets.map(t => t.ticket_number).join(', ')}
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <div className={cn(
                              "inline-flex items-center px-3 py-1.5 rounded-full",
                              STATUS_CONFIG[engineer.current_status].bgColor,
                              STATUS_CONFIG[engineer.current_status].color
                            )}>
                              {getStatusIcon(engineer.current_status)}
                              <span className="ml-1.5 text-sm font-medium">
                                {STATUS_CONFIG[engineer.current_status].label}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail className="w-4 h-4 mr-2" />
                              <a 
                                href={`mailto:${engineer.email}`}
                                className="hover:text-blue-600 hover:underline"
                              >
                                {engineer.email}
                              </a>
                            </div>
                            {engineer.phone && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Phone className="w-4 h-4 mr-2" />
                                <span>{engineer.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {engineer.last_login_at ? (
                              <>
                                <Calendar className="w-4 h-4 inline mr-1 mb-0.5" />
                                {formatDate(engineer.last_login_at)}
                              </>
                            ) : (
                              '从未登录'
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/tickets?engineer=${engineer._id}`)}
                            >
                              查看工单
                            </Button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteEngineer(engineer._id, engineer.display_name)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="删除工程师"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 邀请工程师模态框 */}
          {showInviteForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl p-6 max-w-md w-full"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">邀请工程师</h3>
                  <button
                    onClick={() => setShowInviteForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      邮箱地址
                    </label>
                    <Input
                      type="email"
                      placeholder="输入工程师邮箱"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                      error={inviteError}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      角色
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm({...inviteForm, role: e.target.value})}
                    >
                      <option value="service_engineer">服务商工程师</option>
                      <option value="end_engineer">客户工程师</option>
                    </select>
                  </div>
                  
                  <div className="pt-4 flex justify-end space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowInviteForm(false)}
                      disabled={inviteLoading}
                    >
                      取消
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleSendInvite}
                      loading={inviteLoading}
                    >
                      发送邀请
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}