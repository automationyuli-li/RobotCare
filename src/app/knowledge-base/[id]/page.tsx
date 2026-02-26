// src/app/knowledge-base/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  Edit,
  Save,
  X,
  Eye,
  Download,
  ChevronLeft,
  Tag,
  Calendar,
  User,
  BarChart3,
  Image as ImageIcon,
  Video,
  FileText,
  CheckCircle,
  Clock,
  Archive,
  Send,
  Copy,
  Link as LinkIcon,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Navigation from '@/components/layout/Navigation';
import { cn } from '@/lib/utils/cn';
import { formatDate } from '@/lib/utils/format';
import RichTextEditor from '@/components/editor/RichTextEditor';

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
  updated_by?: string;
  updated_by_name?: string;
  view_count: number;
  helpful_count: number;
  org_id: string;
}

interface Attachment {
  _id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  cloud_path: string;
  content_section: 'fault_phenomenon' | 'diagnosis_steps' | 'solution' | 'preventive_measures';
  description?: string;
  uploaded_by: string;
  uploaded_at: string;
  sort_order: number;
}

export default function KnowledgeBaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  // 安全地获取 id
  const id = params?.id as string;
  
  const [document, setDocument] = useState<LibraryDoc | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [isServiceProvider, setIsServiceProvider] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // 编辑状态数据
  const [editData, setEditData] = useState<Partial<LibraryDoc>>({});
  const [saving, setSaving] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');

  // 检查是否在编辑模式
  useEffect(() => {
    const edit = searchParams?.get('edit');
    if (edit === 'true') {
      setEditing(true);
    }
  }, [searchParams]);

  // 获取当前用户信息和文档详情
  const fetchData = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // 获取当前用户
      const userResponse = await fetch('/api/auth/session');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        if (userData.success) {
          setCurrentUser(userData.data.user);
          setIsServiceProvider(userData.data.user.role.includes('service'));
        }
      }

      // 获取文档详情
      const docResponse = await fetch(`/api/library/${id}`);
      const docData = await docResponse.json();
      
      if (docData.success) {
        setDocument(docData.data.document);
        setAttachments(docData.data.attachments || []);
        // 初始化编辑数据
        setEditData(docData.data.document);
      } else {
        console.error('获取文档失败:', docData.error);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 切换编辑模式
  const toggleEditMode = () => {
    if (editing) {
      // 退出编辑模式，重置数据
      setEditData(document || {});
    }
    setEditing(!editing);
  };

  // 保存编辑
  const handleSave = async () => {
    if (!document) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/library/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });

      const data = await response.json();
      
      if (data.success) {
        setDocument(data.data);
        setEditing(false);
        alert('文档更新成功！');
      } else {
        throw new Error(data.error || '更新失败');
      }
    } catch (error: any) {
      console.error('保存失败:', error);
      alert(`保存失败: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // 添加关键词
  const addKeyword = () => {
    const keyword = newKeyword.trim();
    if (keyword && !editData.keywords?.includes(keyword)) {
      setEditData(prev => ({
        ...prev,
        keywords: [...(prev.keywords || []), keyword],
      }));
      setNewKeyword('');
    }
  };

  // 移除关键词
  const removeKeyword = (keyword: string) => {
    setEditData(prev => ({
      ...prev,
      keywords: prev.keywords?.filter(k => k !== keyword) || [],
    }));
  };

  // 导出文档
  const handleExport = async () => {
    if (!document) return;
    
    try {
      const response = await fetch(`/api/library/export/${id}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = globalThis.URL.createObjectURL(blob); // 创建下载链接， globalthis 兼容 SSR 可以是 window;
        const link = globalThis.document.createElement('a');
        link.href = url;
        link.download = `${document.title}.html`;
        globalThis.document.body.appendChild(link);
        link.click();
        globalThis.URL.revokeObjectURL(url);
        globalThis.document.body.removeChild(link);
      } else {
        const data = await response.json();
        alert(data.error || '导出失败');
      }
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    }
  };

  // 标记为有用
  const markHelpful = async () => {
    if (!document) return;
    
    try {
      const response = await fetch(`/api/library/${id}/helpful`, {
        method: 'POST',
      });

      const data = await response.json();
      
      if (data.success) {
        setDocument(prev => prev ? {
          ...prev,
          helpful_count: data.data.helpful_count,
        } : null);
      }
    } catch (error) {
      console.error('标记失败:', error);
    }
  };

  // 获取特定内容区域的附件
  const getAttachmentsBySection = (section: Attachment['content_section']) => {
    return attachments.filter(a => a.content_section === section);
  };

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

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">加载文档中...</p>
          </div>
        </div>
      </>
    );
  }

  if (!document) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">文档不存在</h2>
            <p className="text-gray-600 mb-6">您访问的文档可能已被删除或没有访问权限</p>
            <Button variant="primary" onClick={() => router.push('/knowledge-base')}>
              返回知识库
            </Button>
          </div>
        </div>
      </>
    );
  }

  const statusConfig = STATUS_CONFIG[document.status];
  const StatusIcon = statusConfig.icon;

  // 渲染内容函数 - 修复了原代码中的错误
  const renderContent = (content: string) => {
    return (
      <div className="prose max-w-none">
        <pre className="whitespace-pre-wrap font-sans text-gray-700">
          {content}
        </pre>
      </div>
    );
  };

  return (
    <>
      <Navigation />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 返回和操作栏 */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.push('/knowledge-base')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              返回知识库
            </button>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                icon={<Download className="w-4 h-4" />}
                onClick={handleExport}
              >
                导出HTML
              </Button>
              
              {isServiceProvider && document.org_id === currentUser?.org_id && (
                <>
                  {!editing ? (
                    <Button
                      variant="primary"
                      icon={<Edit className="w-4 h-4" />}
                      onClick={toggleEditMode}
                    >
                      编辑文档
                    </Button>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        icon={<X className="w-4 h-4" />}
                        onClick={toggleEditMode}
                        disabled={saving}
                      >
                        取消
                      </Button>
                      <Button
                        variant="primary"
                        icon={<Save className="w-4 h-4" />}
                        onClick={handleSave}
                        loading={saving}
                      >
                        保存修改
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 文档头部 */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm mb-8"
          >
            {editing ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    文档标题
                  </label>
                  <input
                    type="text"
                    value={editData.title || ''}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    className="w-full text-2xl font-bold text-gray-900 bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500 pb-2"
                    placeholder="输入文档标题"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      状态
                    </label>
                    <select
                      value={editData.status || 'draft'}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                        <option key={value} value={value}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      关键词
                    </label>
                    <div className="space-y-3">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newKeyword}
                          onChange={(e) => setNewKeyword(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                          placeholder="输入关键词后按回车"
                          className="flex-1 border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <Button
                          variant="outline"
                          onClick={addKeyword}
                          icon={<Tag className="w-4 h-4" />}
                        >
                          添加
                        </Button>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {editData.keywords?.map((keyword, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm"
                          >
                            <Tag className="w-3 h-3 mr-1.5" />
                            {keyword}
                            <button
                              type="button"
                              onClick={() => removeKeyword(keyword)}
                              className="ml-2 text-blue-500 hover:text-blue-700"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-3 mb-3">
                      <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
                      <span className={cn(
                        "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border",
                        statusConfig.color
                      )}>
                        <StatusIcon className="w-4 h-4 mr-1.5" />
                        {statusConfig.label}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {document.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-700"
                        >
                          <Tag className="w-3 h-3 mr-1.5" />
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={markHelpful}
                      className="flex items-center space-x-1 text-gray-600 hover:text-green-600 transition-colors"
                    >
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm">{document.helpful_count}</span>
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    <span>{document.created_by_name}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>创建: {formatDate(document.created_at)}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>更新: {formatDate(document.updated_at)}</span>
                  </div>
                  <div className="flex items-center">
                    <Eye className="w-4 h-4 mr-2" />
                    <span>{document.view_count} 浏览</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

            {/* 左侧：文档内容 */}
              {/* 故障现象 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4">故障现象</h2>
                
                {editing ? (
                  <RichTextEditor
                    value={editData.content?.fault_phenomenon || ''}
                    onChange={(value) => setEditData(prev => ({
                      ...prev,
                      content: { ...prev.content!, fault_phenomenon: value }
                    }))}
                    height="200px"
                  />
                ) : (
                  renderContent(document.content.fault_phenomenon)
                )}
                
                {/* 附件 */}
                <AttachmentSection
                  attachments={getAttachmentsBySection('fault_phenomenon')}
                  isServiceProvider={isServiceProvider}
                />
              </motion.div>

              {/* 诊断步骤 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4">诊断步骤</h2>
                
                {editing ? (
                  <RichTextEditor
                    value={editData.content?.diagnosis_steps || ''}
                    onChange={(value) => setEditData(prev => ({
                      ...prev,
                      content: { ...prev.content!, diagnosis_steps: value }
                    }))}
                    height="200px"
                  />
                ) : (
                  renderContent(document.content.diagnosis_steps)
                )}
                
                {/* 附件 */}
                <AttachmentSection
                  attachments={getAttachmentsBySection('diagnosis_steps')}
                  isServiceProvider={isServiceProvider}
                />
              </motion.div>
              {/* 解决方案 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4">解决方案</h2>
                
                {editing ? (
                  <RichTextEditor
                    value={editData.content?.solution || ''}
                    onChange={(value) => setEditData(prev => ({
                      ...prev,
                      content: { ...prev.content!, solution: value }
                    }))}
                    height="200px"
                  />
                ) : (
                  renderContent(document.content.solution)
                )}
                
                {/* 附件 */}
                <AttachmentSection
                  attachments={getAttachmentsBySection('solution')}
                  isServiceProvider={isServiceProvider}
                />
              </motion.div>

              {/* 预防措施 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4">预防措施</h2>
                
                {editing ? (
                  <RichTextEditor
                    value={editData.content?.preventive_measures || ''}
                    onChange={(value) => setEditData(prev => ({
                      ...prev,
                      content: { ...prev.content!, preventive_measures: value }
                    }))}
                    height="200px"
                  />
                ) : (
                  renderContent(document.content.preventive_measures)
                )}
                
                {/* 附件 */}
                <AttachmentSection
                  attachments={getAttachmentsBySection('preventive_measures')}
                  isServiceProvider={isServiceProvider}
                />
              </motion.div>
            </div>
      </div>
    </>
  );
}

// 附件显示组件
function AttachmentSection({ attachments, isServiceProvider }: { 
  attachments: Attachment[];
  isServiceProvider: boolean;
}) {
  if (attachments.length === 0) return null;

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <h3 className="text-sm font-medium text-gray-700 mb-3">相关附件</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {attachments.map((attachment) => (
          <AttachmentCard key={attachment._id} attachment={attachment} />
        ))}
      </div>
    </div>
  );
}

// 附件卡片组件
function AttachmentCard({ attachment }: { attachment: Attachment }) {
  const isImage = attachment.file_type.startsWith('image/');
  const isVideo = attachment.file_type.startsWith('video/');
  const cloudBaseEnvId = process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID;
  
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 hover:bg-white transition-colors">
      <div className="p-3">
        {isImage ? (
          <div className="aspect-square mb-2 rounded overflow-hidden bg-white">
            <img
              src={`https://${cloudBaseEnvId}.tcb.qcloud.la/${attachment.cloud_path}`}
              alt={attachment.description || attachment.file_name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-image.png';
              }}
            />
          </div>
        ) : isVideo ? (
          <div className="aspect-square mb-2 rounded bg-gray-100 flex items-center justify-center">
            <Video className="w-8 h-8 text-gray-400" />
          </div>
        ) : (
          <div className="aspect-square mb-2 rounded bg-gray-100 flex items-center justify-center">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
        )}
        
        <p className="text-xs text-gray-600 truncate mb-1" title={attachment.file_name}>
          {attachment.file_name}
        </p>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {isImage ? '图片' : isVideo ? '视频' : '文档'}
          </span>
          <span>{(attachment.file_size / 1024).toFixed(1)} KB</span>
        </div>
        
        {attachment.description && (
          <p className="text-xs text-gray-500 mt-2 truncate" title={attachment.description}>
            {attachment.description}
          </p>
        )}
      </div>
      
      <div className="px-3 pb-3 pt-0">
        <a
          href={`https://${cloudBaseEnvId}.tcb.qcloud.la/${attachment.cloud_path}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center text-xs text-blue-600 hover:text-blue-800 w-full py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 transition-colors"
        >
          <ExternalLink className="w-3 h-3 mr-1.5" />
          查看原文件
        </a>
      </div>
    </div>
  );
}