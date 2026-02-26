// src/app/robots/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Plus,
  Download,
  Trash2,
  Eye,
  Edit,
  Grid,
  List,
  MoreVertical,
  Calendar,
  MapPin,
  Building,
  User,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RobotStatusBadge } from '@/components/robots/RobotStatusBadge';
import { WarrantyStatus } from '@/components/robots/WarrantyStatus';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/hooks/useAuth';

interface Robot {
  _id: string;
  sn: string;
  brand: string;
  model: string;
  org_id: string;
  service_provider_id: string;
  location?: string;
  status: 'active' | 'maintenance' | 'fault' | 'inactive';
  specs?: {
    manufacture_date?: Date;
    warranty_end?: Date;
    last_maintenance_date?: Date;
    next_maintenance_date?: Date;
  };
  org_name?: string; // 客户端组织名称
  provider_name?: string; // 服务商组织名称
}

export default function RobotsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRobots, setSelectedRobots] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    maintenance: 0,
    fault: 0,
    inactive: 0,
  });

  // 页面权限检查
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      fetchRobots();
    }
  }, [user]);

  const fetchRobots = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/robots', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.success) {
        setRobots(data.data);
        calculateStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching robots:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (robotList: Robot[]) => {
    const stats = {
      total: robotList.length,
      active: robotList.filter(r => r.status === 'active').length,
      maintenance: robotList.filter(r => r.status === 'maintenance').length,
      fault: robotList.filter(r => r.status === 'fault').length,
      inactive: robotList.filter(r => r.status === 'inactive').length,
    };
    setStats(stats);
  };

  const handleSelectRobot = (robotId: string) => {
    setSelectedRobots(prev =>
      prev.includes(robotId)
        ? prev.filter(id => id !== robotId)
        : [...prev, robotId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRobots.length === filteredRobots.length) {
      setSelectedRobots([]);
    } else {
      setSelectedRobots(filteredRobots.map(r => r._id));
    }
  };

  const handleDeleteSelected = async () => {
    if (!user?.role.includes('end_admin')) {
      alert('只有终端客户管理员可以删除机器人');
      return;
    }

    if (!confirm(`确定要删除选中的 ${selectedRobots.length} 台机器人吗？`)) {
      return;
    }

    try {
      const response = await fetch('/api/robots/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ robotIds: selectedRobots }),
      });

      const data = await response.json();
      if (data.success) {
        setSelectedRobots([]);
        fetchRobots();
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('Error deleting robots:', error);
      alert('删除失败，请重试');
    }
  };

  const filteredRobots = robots.filter(robot => {
    const matchesSearch = searchQuery === '' ||
      robot.sn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      robot.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      robot.model.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || robot.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const isEndCustomerAdmin = user?.role === 'end_admin';

  // 如果还在检查认证状态，显示加载中
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 如果未登录，不显示内容
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题和操作按钮 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">机器人管理</h1>
              <p className="text-gray-600 mt-1">管理和监控所有机器人设备</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                icon={<Download className="w-4 h-4" />}
              >
                导出数据
              </Button>
              <Button
                icon={<Plus className="w-4 h-4" />}
                onClick={() => router.push('/robots/new')}
              >
                创建机器人
              </Button>
            </div>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">总机器人</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">运行正常</div>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">维护中</div>
              <div className="text-2xl font-bold text-amber-600">{stats.maintenance}</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">故障</div>
              <div className="text-2xl font-bold text-red-600">{stats.fault}</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">离线</div>
              <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
            </div>
          </div>
        </div>

        {/* 搜索和筛选栏 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <Input
                icon={<Search className="w-4 h-4" />}
                placeholder="搜索机器人序列号、品牌、型号..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                variant="filled"
              />
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'list' ? 'primary' : 'outline'}
                  size="sm"
                  icon={<List className="w-4 h-4" />}
                  onClick={() => setViewMode('list')}
                >
                  列表
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'outline'}
                  size="sm"
                  icon={<Grid className="w-4 h-4" />}
                  onClick={() => setViewMode('grid')}
                >
                  网格
                </Button>
              </div>

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
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-gray-200"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      状态筛选
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">全部状态</option>
                      <option value="active">运行正常</option>
                      <option value="maintenance">维护中</option>
                      <option value="fault">故障</option>
                      <option value="inactive">离线</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 批量操作栏 */}
        {selectedRobots.length > 0 && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-medium">{selectedRobots.length}</span>
                </div>
                <span className="text-blue-700 font-medium">
                  已选择 {selectedRobots.length} 台机器人
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {isEndCustomerAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Trash2 className="w-4 h-4" />}
                    onClick={handleDeleteSelected}
                  >
                    批量删除
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRobots([])}
                >
                  取消选择
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 结果提示 */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            找到 {filteredRobots.length} 台机器人
            {searchQuery && `，搜索词："${searchQuery}"`}
          </p>
        </div>

        {/* 机器人列表/网格 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">正在加载机器人数据...</p>
          </div>
        ) : filteredRobots.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">没有找到机器人</h3>
            <p className="text-gray-600 mb-6">尝试修改搜索条件或创建新的机器人</p>
            <Button onClick={() => router.push('/robots/new')}>
              创建第一台机器人
            </Button>
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* 表头 */}
            <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="col-span-1">
                <input
                  type="checkbox"
                  checked={selectedRobots.length === filteredRobots.length && filteredRobots.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2 font-medium text-gray-700">序列号</div>
              <div className="col-span-2 font-medium text-gray-700">品牌型号</div>
              <div className="col-span-2 font-medium text-gray-700">位置</div>
              <div className="col-span-2 font-medium text-gray-700">
                {user?.role.includes('service') ? '客户' : '服务商'}
              </div>
              <div className="col-span-2 font-medium text-gray-700">状态</div>
              <div className="col-span-1 font-medium text-gray-700">操作</div>
            </div>

            {/* 列表项 */}
            <div className="divide-y divide-gray-100">
              {filteredRobots.map((robot) => (
                <motion.div
                  key={robot._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="col-span-1 flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedRobots.includes(robot._id)}
                      onChange={() => handleSelectRobot(robot._id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <div className="font-medium text-gray-900">{robot.sn}</div>
                    <div className="text-sm text-gray-500">
                      <WarrantyStatus warrantyEnd={robot.specs?.warranty_end} />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div className="font-medium text-gray-900">{robot.brand}</div>
                    <div className="text-sm text-gray-500">{robot.model}</div>
                  </div>

                  <div className="col-span-2">
                    <div className="flex items-center text-gray-700">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                      {robot.location || '未设置位置'}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div className="flex items-center">
                      <Building className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-gray-700">
                        {user?.role.includes('service') ? robot.org_name : robot.provider_name}
                      </span>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <RobotStatusBadge status={robot.status} />
                  </div>

                  <div className="col-span-1">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => router.push(`/robots/${robot._id}`)}
                        className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => router.push(`/robots/${robot._id}/edit`)}
                        className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* 分页 */}
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  显示 1 - {filteredRobots.length} 条，共 {stats.total} 条
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">上一页</Button>
                  <Button variant="outline" size="sm">1</Button>
                  <Button variant="outline" size="sm">2</Button>
                  <Button variant="outline" size="sm">下一页</Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // 网格视图
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRobots.map((robot) => (
              <motion.div
                key={robot._id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  {/* 网格视图头部 */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900">{robot.brand} {robot.model}</h3>
                      <p className="text-sm text-gray-500">{robot.sn}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedRobots.includes(robot._id)}
                      onChange={() => handleSelectRobot(robot._id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>

                  {/* 状态和保修 */}
                  <div className="flex items-center justify-between mb-6">
                    <RobotStatusBadge status={robot.status} />
                    <WarrantyStatus warrantyEnd={robot.specs?.warranty_end} />
                  </div>

                  {/* 详细信息 */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-gray-700">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{robot.location || '未设置位置'}</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <Building className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                      <span className="truncate">
                        {user?.role.includes('service') ? robot.org_name : robot.provider_name}
                      </span>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      fullWidth
                      size="sm"
                      onClick={() => router.push(`/robots/${robot._id}`)}
                    >
                      查看详情
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/robots/${robot._id}/edit`)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}