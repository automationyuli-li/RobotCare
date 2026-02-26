// src/app/knowledge-base/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Plus,
  FileText,
  Download,
  Eye,
  Edit,
  Trash2,
  Tag,
  Calendar,
  User,
  BarChart3,
  ChevronRight,
  ExternalLink,
  Layers,
  BookOpen,
  CheckCircle,
  Archive,
  Clock,
  RefreshCw,
  X,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Navigation from '@/components/layout/Navigation';
import { cn } from '@/lib/utils/cn';
import { formatDate } from '@/lib/utils/format';

// 知识库文档类型
interface LibraryDoc {
  _id: string;
  title: string;
  content: {
    fault_phenomenon: string;
    diagnosis_steps: string;
    solution: string;
    preventive_measures: string;
  };
  keywords: string[];
  status: 'draft' | 'published' | 'archived';
  category?: string;
  created_by: string;
  created_by_name: string;
  created_by_email: string;
  created_at: string;
  updated_at: string;
  view_count: number;
  helpful_count: number;
}

// 状态配置
const STATUS_CONFIG = {
  draft: {
    label: '草稿',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: Clock,
  },
  published: {
    label: '已发布',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: CheckCircle,
  },
  archived: {
    label: '已归档',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: Archive,
  },
};

export default function KnowledgeBasePage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<LibraryDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    sortBy: 'created_at',
    sortOrder: 'desc' as 'asc' | 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [serviceProviders, setServiceProviders] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    published: 0,
    archived: 0,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasCreatePermission, setHasCreatePermission] = useState(false);

  // 获取当前用户信息和服务商列表
  const fetchUserAndProviders = useCallback(async () => {
    try {
      // 获取当前用户
      const userResponse = await fetch('/api/auth/session');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        if (userData.success) {
          setCurrentUser(userData.data.user);
          // 检查创建权限
          setHasCreatePermission(
            userData.data.user.role.includes('service')
          );
        }
      }

      // 如果是客户，获取可访问的服务商列表
      if (currentUser?.role.includes('end')) {
        const contractsResponse = await fetch('/api/organizations/contracts');
        if (contractsResponse.ok) {
          const contractsData = await contractsResponse.json();
          if (contractsData.success) {
            setServiceProviders(contractsData.data);
            if (contractsData.data.length > 0) {
              setSelectedProvider(contractsData.data[0]._id);
            }
          }
        }
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  }, [currentUser?.role]);

  // 获取知识库文档
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/api/library?';
      const params = new URLSearchParams();

      if (searchQuery) params.append('search', searchQuery);
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);
      params.append('sort_by', filters.sortBy);
      params.append('sort_order', filters.sortOrder);
      params.append('page', page.toString());
      params.append('limit', '20');

      // 如果是客户，需要指定服务商ID
      if (currentUser?.role.includes('end') && selectedProvider) {
        params.append('provider_id', selectedProvider);
      }

      url += params.toString();

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setDocuments(data.data.documents);
        setTotalPages(data.data.totalPages);
        
        // 计算统计数据
        const stats = {
          total: data.data.total,
          draft: data.data.documents.filter((d: LibraryDoc) => d.status === 'draft').length,
          published: data.data.documents.filter((d: LibraryDoc) => d.status === 'published').length,
          archived: data.data.documents.filter((d: LibraryDoc) => d.status === 'archived').length,
        };
        setStats(stats);
      }
    } catch (error) {
      console.error('获取知识库失败:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters, page, currentUser?.role, selectedProvider]);

  // 获取分类
  const fetchCategories = async () => {
    try {
      // 这里需要根据实际情况实现获取分类的API
      // 暂时使用空数组
      setCategories([]);
    } catch (error) {
      console.error('获取分类失败:', error);
    }
  };

  useEffect(() => {
    fetchUserAndProviders();
    fetchCategories();
  }, [fetchUserAndProviders]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleSearch = () => {
    setPage(1);
    fetchDocuments();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilters({
      category: '',
      status: '',
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
    setPage(1);
  };

  const handleCreateDocument = () => {
    router.push('/knowledge-base/new');
  };

  const handleViewDocument = (id: string) => {
    router.push(`/knowledge-base/${id}`);
  };

  const handleEditDocument = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/knowledge-base/${id}?edit=true`);
  };

  const handleDeleteDocument = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm(`确定要删除文档"${title}"吗？此操作不可撤销。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/library/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        alert('文档删除成功');
        fetchDocuments(); // 刷新列表
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除文档失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleExportDocument = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const response = await fetch(`/api/library/export/${id}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        alert(data.error || '导出失败');
      }
    } catch (error) {
      console.error('导出文档失败:', error);
      alert('导出失败，请重试');
    }
  };

  const renderStatusBadge = (status: LibraryDoc['status']) => {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    
    return (
      <span className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
        config.color
      )}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  return (
    <>
      <Navigation />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 页面标题和操作按钮 */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <BookOpen className="w-6 h-6 mr-3 text-blue-600" />
                  知识库
                </h1>
                <p className="text-gray-600 mt-2">
                  积累和分享机器人维护经验，提高问题解决效率
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                {currentUser?.role.includes('end') && serviceProviders.length > 0 && (
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    className="border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {serviceProviders.map(provider => (
                      <option key={provider._id} value={provider._id}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                )}
                
                <Button
                  variant="outline"
                  icon={<Download className="w-4 h-4" />}
                  onClick={() => {/* 批量导出功能 */}}
                >
                  批量导出
                </Button>
                
                {hasCreatePermission && (
                  <Button
                    variant="primary"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={handleCreateDocument}
                  >
                    新建文档
                  </Button>
                )}
              </div>
            </div>
          </motion.div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">文档总数</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">草稿</p>
                  <p className="text-3xl font-bold text-gray-600 mt-2">{stats.draft}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">已发布</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{stats.published}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">总浏览量</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">
                    {documents.reduce((acc, doc) => acc + doc.view_count, 0)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* 搜索和筛选栏 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6"
          >
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* 搜索框 */}
              <div className="flex-1">
                <Input
                  icon={<Search className="w-4 h-4" />}
                  placeholder="搜索文档标题、关键词或内容..."
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

              {/* 搜索按钮 */}
              <Button
                variant="primary"
                icon={<Search className="w-4 h-4" />}
                onClick={handleSearch}
              >
                搜索
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* 分类筛选 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        分类
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={filters.category}
                        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                      >
                        <option value="">全部分类</option>
                        {categories.map(category => (
                          <option key={category._id} value={category._id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

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

                    {/* 排序方式 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        排序方式
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={filters.sortBy}
                        onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                      >
                        <option value="created_at">创建时间</option>
                        <option value="updated_at">更新时间</option>
                        <option value="view_count">浏览量</option>
                        <option value="helpful_count">有用数</option>
                      </select>
                    </div>

                    {/* 排序顺序 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        排序顺序
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={filters.sortOrder}
                        onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value as 'asc' | 'desc' })}
                      >
                        <option value="desc">降序</option>
                        <option value="asc">升序</option>
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
          </motion.div>

          {/* 文档列表 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
          >
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-500">加载知识库中...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无文档</h3>
                <p className="text-gray-500 mb-6">当前筛选条件下没有找到文档</p>
                {hasCreatePermission && (
                  <Button variant="primary" onClick={handleCreateDocument}>
                    创建第一个文档
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {documents.map((doc, index) => (
                  <motion.div
                    key={doc._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-6 hover:bg-gray-50 transition-colors group cursor-pointer"
                    onClick={() => handleViewDocument(doc._id)}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between">
                      {/* 左侧：文档信息 */}
                      <div className="flex-1">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                {doc.title}
                              </h3>
                              {renderStatusBadge(doc.status)}
                            </div>
                            
                            {/* 文档摘要 */}
                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                              {doc.content.fault_phenomenon.slice(0, 200)}
                              {doc.content.fault_phenomenon.length > 200 ? '...' : ''}
                            </p>
                            
                            {/* 标签 */}
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              {doc.keywords.map((keyword, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
                                >
                                  <Tag className="w-3 h-3 mr-1" />
                                  {keyword}
                                </span>
                              ))}
                            </div>
                            
                            {/* 元数据 */}
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <div className="flex items-center">
                                <User className="w-4 h-4 mr-1" />
                                <span>{doc.created_by_name}</span>
                              </div>
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                <span>{formatDate(doc.updated_at)}</span>
                              </div>
                              <div className="flex items-center">
                                <Eye className="w-4 h-4 mr-1" />
                                <span>{doc.view_count} 浏览</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* 右侧：操作按钮 */}
                      <div className="mt-4 md:mt-0 md:ml-4 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleExportDocument(doc._id, doc.title, e)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="导出HTML"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        
                        {hasCreatePermission && (
                          <>
                            <button
                              onClick={(e) => handleEditDocument(doc._id, e)}
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="编辑"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={(e) => handleDeleteDocument(doc._id, doc.title, e)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            
            {/* 分页 */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    第 {page} 页，共 {totalPages} 页
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
}