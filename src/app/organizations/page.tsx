// src/app/organizations/page.tsx - 优化后的完整代码
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Plus,
  Mail,
  Phone,
  MapPin,
  Building,
  Calendar,
  Eye,
  Unlink,
  Check,
  AlertCircle,
  User,
  Globe,
  Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/hooks/useAuth';

interface Organization {
  _id: string;
  name: string;
  type: 'service_provider' | 'end_customer';
  contact_email: string;
  contact_phone?: string;
  subscription_plan?: string;
  status: 'active' | 'inactive';
  metadata?: {
    industry?: string;
    address?: string;
    province?: string;
    city?: string;
    website?: string;
    description?: string;
  };
  contract_id?: string;
  contract_end_date?: Date;
  contract_status?: 'active' | 'pending' | 'expired' | 'terminated';
  robot_count?: number;
  created_at: Date;
}

// 筛选状态类型
interface FilterState {
  contractStatus: string;
  industry: string;
  sortBy: string;
}

export default function OrganizationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  // 数据状态
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 选择状态
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  
  // 搜索和筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    contractStatus: '',
    industry: '',
    sortBy: 'name_asc'
  });
  
  // 模态框状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [terminateReason, setTerminateReason] = useState('');
  const [newPartnerEmail, setNewPartnerEmail] = useState('');
  const [selectedContract, setSelectedContract] = useState<string>('');
  const [renewEndDate, setRenewEndDate] = useState('');
  
  // 操作状态
  const [addingPartner, setAddingPartner] = useState(false);
  const [terminating, setTerminating] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 权限判断
  const isServiceProvider = user?.role?.includes('service') ?? false;
  const isAdmin = user?.role?.includes('admin') ?? false;
  const canAddPartner = isServiceProvider && isAdmin;
  const pageTitle = isServiceProvider ? '客户管理' : '服务商管理';
  const partnerType = isServiceProvider ? '客户' : '服务商';

  // 加载数据
  useEffect(() => {
    if (!authLoading && user) {
      fetchOrganizations();
    }
  }, [authLoading, user]);

  // 加载状态
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 未登录重定向
  if (!user) {
    router.push('/');
    return null;
  }

  // API 调用
  const fetchOrganizations = async () => {
    setLoading(true);
    setError('');
    
    try {
      const endpoint = isServiceProvider
        ? '/api/service-provider/customers'
        : '/api/end-customer/providers';
      
      const response = await fetch(endpoint, { credentials: 'include' });
      const data = await response.json();
      
      if (data.success) {
        setOrganizations(data.data || []);
      } else {
        setError(data.error || '加载失败');
      }
    } catch (error) {
      setError('网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  // 选择操作
  const handleSelectOrg = (orgId: string) => {
    setSelectedOrgs(prev =>
      prev.includes(orgId)
        ? prev.filter(id => id !== orgId)
        : [...prev, orgId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrgs.length === filteredOrgs.length) {
      setSelectedOrgs([]);
    } else {
      setSelectedOrgs(filteredOrgs.map(org => org._id));
    }
  };

  // 添加客户
  const handleAddPartner = async () => {
    if (!canAddPartner) {
      setError('您没有权限添加客户');
      return;
    }

    if (!newPartnerEmail) {
      setError(`请输入${partnerType}邮箱`);
      return;
    }

    setAddingPartner(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/service-provider/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: newPartnerEmail,
          invitee_email: newPartnerEmail
        }),
        credentials: 'include'
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(data.message || '邀请已发送');
        setNewPartnerEmail('');
        setShowAddModal(false);
        fetchOrganizations();
      } else {
        setError(data.error || '发送邀请失败');
      }
    } catch (error) {
      setError('发送邀请失败');
    } finally {
      setAddingPartner(false);
    }
  };

  // 解除合约
  const handleTerminateContract = async () => {
    if (!terminateReason.trim()) {
      setError('请填写解除合约原因');
      return;
    }

    setTerminating(true);
    setError('');

    try {
      const response = await fetch('/api/service-contracts/terminate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          organizationIds: selectedOrgs,
          reason: terminateReason
        }),
        credentials: 'include'
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(data.message || '解除合约请求已发送');
        setSelectedOrgs([]);
        setTerminateReason('');
        setShowTerminateModal(false);
        fetchOrganizations();
      } else {
        setError(data.error || '解除合约失败');
      }
    } catch (error) {
      setError('解除合约失败');
    } finally {
      setTerminating(false);
    }
  };

  // 续约handler
  const handleRenewContract = async () => {
    if (!selectedContract) {
      setError('合约信息不存在');
      return;
    }

    if (!renewEndDate) {
      setError('请选择新的到期日期');
      return;
    }

    setRenewing(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/service-contracts/${selectedContract}/renew`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endDate: renewEndDate }),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('合约续期成功');
        setShowRenewModal(false);
        setSelectedContract('');
        setRenewEndDate('');
        fetchOrganizations(); // 刷新列表
      } else {
        setError(data.error || '续约失败');
      }
    } catch (error) {
      setError('续约失败，请稍后重试');
    } finally {
      setRenewing(false);
    }
  };

  // 打开续约模态框（用于批量操作）
  const handleOpenRenewModal = () => {
    if (selectedOrgs.length !== 1) {
      setError('请选择一个客户进行续约');
      return;
    }

    const selectedOrg = organizations.find(org => org._id === selectedOrgs[0]);
    if (!selectedOrg || !selectedOrg.contract_id) {
      setError('合约信息不存在');
      return;
    }

    if (selectedOrg.contract_status !== 'active') {
      setError('只有生效中的合约可以续约');
      return;
    }

    setSelectedContract(selectedOrg.contract_id);
    setRenewEndDate(
      new Date(selectedOrg.contract_end_date || Date.now() + 365 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0]
    );
    setShowRenewModal(true);
  };

  // 查看机器人
  const handleViewRobots = (orgId: string) => {
    if (isServiceProvider) {
      router.push(`/robots?customer=${orgId}`);
    } else {
      router.push(`/robots?provider=${orgId}`);
    }
  };

  // ✅ 筛选和排序逻辑
  const filteredOrgs = organizations
    .filter(org => {
      // 1. 搜索匹配
      const matchesSearch = searchQuery === '' ||
        org.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.contact_phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.metadata?.industry?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.metadata?.province?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.metadata?.city?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 2. 合约状态筛选
      if (filters.contractStatus && org.contract_status !== filters.contractStatus) {
        return false;
      }

      // 3. 行业筛选（仅服务商）
      if (isServiceProvider && filters.industry && org.metadata?.industry !== filters.industry) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'date_asc':
          return new Date(a.contract_end_date || 0).getTime() - new Date(b.contract_end_date || 0).getTime();
        case 'date_desc':
          return new Date(b.contract_end_date || 0).getTime() - new Date(a.contract_end_date || 0).getTime();
        default:
          return 0;
      }
    });

  // 状态样式
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-amber-100 text-amber-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'active': return '合约生效中';
      case 'pending': return '待确认';
      case 'expired': return '已过期';
      case 'terminated': return '已解除';
      default: return '未知';
    }
  };

  // 计算合约剩余天数
  const getDaysLeft = (endDate?: Date) => {
    if (!endDate) return null;
    const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
              <p className="text-gray-600 mt-1">
                {isServiceProvider 
                  ? '管理您的签约客户和机器人服务' 
                  : '查看为您提供服务的服务商'}
              </p>
            </div>
            
            {canAddPartner && (
              <Button
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setShowAddModal(true)}
              >
                添加{partnerType}
              </Button>
            )}
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">签约{partnerType}</div>
              <div className="text-2xl font-bold text-gray-900">
                {organizations.filter(o => o.contract_status === 'active').length}
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">待确认</div>
              <div className="text-2xl font-bold text-blue-600">
                {organizations.filter(o => o.contract_status === 'pending').length}
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">机器人总数</div>
              <div className="text-2xl font-bold text-green-600">
                {organizations.reduce((sum, org) => sum + (org.robot_count || 0), 0)}
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">7天内到期</div>
              <div className="text-2xl font-bold text-amber-600">
                {organizations.filter(o => {
                  const days = getDaysLeft(o.contract_end_date);
                  return days !== null && days >= 0 && days <= 7;
                }).length}
              </div>
            </div>
          </div>
        </div>

        {/* 提示消息 */}
        <AnimatePresence>
          {(error || success) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-6 p-4 rounded-xl ${
                error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
              }`}
            >
              <div className="flex items-start space-x-3">
                {error ? (
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                ) : (
                  <Check className="w-5 h-5 text-green-500 mt-0.5" />
                )}
                <p className={error ? 'text-red-600' : 'text-green-600'}>
                  {error || success}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 搜索和筛选 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <Input
                icon={<Search className="w-4 h-4" />}
                placeholder={`搜索${partnerType}名称、行业、联系人...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                variant="filled"
              />
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

          {/* 筛选面板 */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-gray-200"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      合约状态
                    </label>
                    <select
                      value={filters.contractStatus}
                      onChange={(e) => setFilters(prev => ({ ...prev, contractStatus: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">全部状态</option>
                      <option value="active">生效中</option>
                      <option value="pending">待确认</option>
                      <option value="expired">已过期</option>
                      <option value="terminated">已解除</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isServiceProvider ? '行业' : '地区'}
                    </label>
                    <select
                      value={filters.industry}
                      onChange={(e) => setFilters(prev => ({ ...prev, industry: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">全部</option>
                      {isServiceProvider ? (
                        <>
                          <option value="汽车制造">汽车制造</option>
                          <option value="电子产品">电子产品</option>
                          <option value="机械加工">机械加工</option>
                        </>
                      ) : (
                        <>
                          <option value="北京">北京</option>
                          <option value="上海">上海</option>
                          <option value="广东">广东</option>
                        </>
                      )}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      排序方式
                    </label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="name_asc">名称 A-Z</option>
                      <option value="name_desc">名称 Z-A</option>
                      <option value="date_asc">合约到期 从近到远</option>
                      <option value="date_desc">合约到期 从远到近</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 批量操作 - 修复续约按钮 */}
        {selectedOrgs.length > 0 && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-medium">{selectedOrgs.length}</span>
                </div>
                <span className="text-blue-700 font-medium">
                  已选择 {selectedOrgs.length} 个{partnerType}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {/* 续约按钮 - 只有选择一个客户且是服务商时才显示 */}
                {isServiceProvider && selectedOrgs.length === 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenRenewModal}
                  >
                    续约
                  </Button>
                )}
                {/* 解除合约按钮 */}
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Unlink className="w-4 h-4" />}
                  onClick={() => setShowTerminateModal(true)}
                >
                  解除合约
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedOrgs([])}
                >
                  取消选择
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 结果统计 */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            找到 {filteredOrgs.length} 个{partnerType}
            {searchQuery && `，搜索词："${searchQuery}"`}
            {filters.contractStatus && `，状态：${filters.contractStatus}`}
          </p>
        </div>

        {/* 组织列表 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">加载数据中...</p>
          </div>
        ) : filteredOrgs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              暂无{partnerType}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || filters.contractStatus 
                ? '没有找到匹配的结果' 
                : isServiceProvider 
                  ? '通过添加客户邀请签订服务合约' 
                  : '请联系服务商签订服务合约'}
            </p>
            {canAddPartner && !searchQuery && !filters.contractStatus && (
              <Button onClick={() => setShowAddModal(true)}>
                添加第一个{partnerType}
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* 表头 */}
            <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="col-span-1">
                <input
                  type="checkbox"
                  checked={selectedOrgs.length === filteredOrgs.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-3 font-medium text-gray-700">名称</div>
              <div className="col-span-2 font-medium text-gray-700">
                {isServiceProvider ? '行业/地区' : '地区/套餐'}
              </div>
              <div className="col-span-2 font-medium text-gray-700">联系人</div>
              <div className="col-span-3 font-medium text-gray-700">合约信息</div>
              <div className="col-span-1 font-medium text-gray-700">操作</div>
            </div>

            {/* 列表行 */}
            <div className="divide-y divide-gray-100">
              {filteredOrgs.map((org) => {
                const daysLeft = getDaysLeft(org.contract_end_date);
                
                return (
                  <motion.div
                    key={org._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="col-span-1 flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedOrgs.includes(org._id)}
                        onChange={() => handleSelectOrg(org._id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>

                    <div className="col-span-3">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-green-100 
                                      flex items-center justify-center mr-3">
                          {isServiceProvider ? (
                            <User className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Building className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{org.name}</div>
                          <div className="text-sm text-gray-500">{org.contact_email}</div>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-2">
                      {isServiceProvider ? (
                        <>
                          <div className="text-gray-700">
                            {org.metadata?.industry || '未设置行业'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {org.metadata?.province || '--'} {org.metadata?.city || '--'}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-gray-700">
                            {org.metadata?.province || '--'} {org.metadata?.city || '--'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {org.subscription_plan || '免费版'}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="col-span-2">
                      <div className="text-gray-700">{org.name}</div>
                      <div className="text-sm text-gray-500">
                        {org.contact_phone || '未设置电话'}
                      </div>
                    </div>

                    <div className="col-span-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(org.contract_status)}`}>
                            {getStatusText(org.contract_status)}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center">
                            <Cpu className="w-3 h-3 mr-1" />
                            {org.robot_count || 0} 台
                          </span>
                        </div>
                        
                        {org.contract_end_date && (
                          <div className="text-xs flex items-center">
                            <Calendar className="w-3 h-3 mr-1 text-gray-400" />
                            <span className="text-gray-600">
                              {new Date(org.contract_end_date).toLocaleDateString('zh-CN')}
                            </span>
                            {daysLeft !== null && daysLeft < 0 && (
                              <span className="ml-2 text-red-500">已过期</span>
                            )}
                            {daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && (
                              <span className="ml-2 text-orange-500">{daysLeft}天后到期</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="col-span-1">
                      <button
                        onClick={() => handleViewRobots(org._id)}
                        className="p-1 hover:bg-gray-200 rounded-lg transition-colors group"
                        title="查看机器人"
                      >
                        <Eye className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* 添加模态框 */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                添加{partnerType}
              </h3>
              
              <Input
                type="email"
                placeholder={`${partnerType}邮箱`}
                value={newPartnerEmail}
                onChange={(e) => setNewPartnerEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
              />

              <div className="mt-6 flex items-center justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewPartnerEmail('');
                    setError('');
                  }}
                >
                  取消
                </Button>
                <Button
                  loading={addingPartner}
                  onClick={handleAddPartner}
                >
                  {addingPartner ? '发送中...' : '发送邀请'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 解除合约模态框 */}
      <AnimatePresence>
        {showTerminateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md p-6"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mr-4">
                  <Unlink className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">解除合约</h3>
                  <p className="text-sm text-gray-600">
                    将向 {selectedOrgs.length} 个{partnerType}发送解除请求
                  </p>
                </div>
              </div>

              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                rows={3}
                placeholder="请填写解除合约的原因..."
                value={terminateReason}
                onChange={(e) => setTerminateReason(e.target.value)}
              />

              <div className="mt-6 flex items-center justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTerminateModal(false);
                    setTerminateReason('');
                  }}
                >
                  取消
                </Button>
                <Button
                  loading={terminating}
                  onClick={handleTerminateContract}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {terminating ? '处理中...' : '确认解除'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 续约模态框 - 修复Input组件 */}
      <AnimatePresence>
        {showRenewModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">合约续期</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    新的到期日期 *
                  </label>
                  <Input
                    type="date"
                    value={renewEndDate}
                    onChange={(e) => setRenewEndDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    ⚠️ 续约后将自动延长合约有效期，机器人服务不会中断。
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRenewModal(false);
                    setSelectedContract('');
                    setRenewEndDate('');
                  }}
                >
                  取消
                </Button>
                <Button
                  loading={renewing}
                  onClick={handleRenewContract}
                >
                  {renewing ? '处理中...' : '确认续约'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}