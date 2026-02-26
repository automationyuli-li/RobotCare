// src/app/knowledge-base/new/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Save,
  X,
  Upload,
  Image as ImageIcon,
  Video,
  FileText,
  Tag,
  Eye,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Navigation from '@/components/layout/Navigation';

// 静态导入富文本编辑器
import RichTextEditor from '@/components/editor/RichTextEditor';

// 附件类型
interface Attachment {
  id: string;
  file: File;
  type: 'image' | 'video' | 'document';
  content_section: 'fault_phenomenon' | 'diagnosis_steps' | 'solution' | 'preventive_measures';
  description: string;
  previewUrl?: string;
}

export default function NewKnowledgeBasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  // 表单数据
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    keywords: [] as string[],
    content: {
      fault_phenomenon: '',
      diagnosis_steps: '',
      solution: '',
      preventive_measures: '',
    },
  });
  
  const [currentKeyword, setCurrentKeyword] = useState('');
  const [uploadingAttachments, setUploadingAttachments] = useState(false);

  // 获取分类
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // 这里需要实现获取分类的API
        // 暂时使用空数组
        setCategories([]);
      } catch (error) {
        console.error('获取分类失败:', error);
      }
    };
    
    fetchCategories();
  }, []);

  // 处理文件上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, contentSection: Attachment['content_section']) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = Array.from(files).map(file => {
      const type = file.type.startsWith('image/') ? 'image' : 
                   file.type.startsWith('video/') ? 'video' : 'document';
      
      const previewUrl = type === 'image' ? URL.createObjectURL(file) : undefined;
      
      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        type,
        content_section: contentSection,
        description: '',
        previewUrl,
      };
    });

    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = ''; // 重置文件输入
  };

  // 移除附件
  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const attachment = prev.find(a => a.id === id);
      if (attachment?.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
      return prev.filter(a => a.id !== id);
    });
  };

  // 添加关键词
  const addKeyword = () => {
    const keyword = currentKeyword.trim();
    if (keyword && !formData.keywords.includes(keyword)) {
      setFormData(prev => ({
        ...prev,
        keywords: [...prev.keywords, keyword],
      }));
      setCurrentKeyword('');
    }
  };

  // 移除关键词
  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword),
    }));
  };

  // 保存文档
  const handleSave = async (publish: boolean = false) => {
    if (!formData.title.trim()) {
      alert('请输入文档标题');
      return;
    }

    if (!formData.content.fault_phenomenon.trim()) {
      alert('请输入故障现象');
      return;
    }

    setLoading(true);

    try {
      // 1. 创建文档
      const documentData = {
        ...formData,
        status: publish ? 'published' : 'draft',
      };

      const documentResponse = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documentData),
      });

      const documentResult = await documentResponse.json();

      if (!documentResult.success) {
        throw new Error(documentResult.error || '创建文档失败');
      }

      const documentId = documentResult.data._id;

      // 2. 上传附件
      if (attachments.length > 0) {
        setUploadingAttachments(true);
        const uploadPromises = attachments.map(async (attachment) => {
          const formData = new FormData();
          formData.append('document_id', documentId);
          formData.append('content_section', attachment.content_section);
          formData.append('description', attachment.description);
          formData.append('file', attachment.file);

          const response = await fetch('/api/library/attachments', {
            method: 'POST',
            body: formData,
          });

          return response.json();
        });

        await Promise.all(uploadPromises);
      }

      alert(publish ? '文档发布成功！' : '文档保存为草稿！');
      router.push(`/knowledge-base/${documentId}`);
      
    } catch (error: any) {
      console.error('保存失败:', error);
      alert(`保存失败: ${error.message}`);
    } finally {
      setLoading(false);
      setUploadingAttachments(false);
    }
  };

  // 获取特定内容区域的附件
  const getAttachmentsBySection = (section: Attachment['content_section']) => {
    return attachments.filter(a => a.content_section === section);
  };

  return (
    <>
      <Navigation />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 页面标题和操作按钮 */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">新建知识库文档</h1>
              <p className="text-gray-600 mt-2">填写以下信息创建新的知识库文档</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                取消
              </Button>
              <Button
                variant="secondary"
                icon={<Save className="w-4 h-4" />}
                onClick={() => handleSave(false)}
                loading={loading && !uploadingAttachments}
              >
                保存为草稿
              </Button>
              <Button
                variant="primary"
                icon={<Eye className="w-4 h-4" />}
                onClick={() => handleSave(true)}
                loading={loading}
              >
                发布文档
              </Button>
            </div>
          </div>

          {/* 单列布局 - 左侧编辑框平铺延伸 */}
          <div className="space-y-8">
            {/* 基础信息卡片 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4">基础信息</h2>
              
              <div className="space-y-6">
                {/* 标题 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    文档标题 *
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="请输入文档标题，如：机器人导航模块异常处理"
                    className="text-lg w-full"
                  />
                </div>
                
                {/* 分类和关键词 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      分类
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">选择分类（可选）</option>
                      {categories.map(category => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      关键词
                    </label>
                    <div className="space-y-5">
                      <div className="flex space-x-2">
                        <Input
                          value={currentKeyword}
                          onChange={(e) => setCurrentKeyword(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                          placeholder="输入关键词后按回车"
                          className="flex-1 h-11" // 添加高度匹配按钮
                        />
                        <Button
                          variant="outline"
                          onClick={addKeyword}
                          icon={<Plus className="w-3 h-3" />}
                          className="h-11 px-3" // 调整按钮高度
                        >
                          添加
                        </Button>
                      </div>
                      
                      {formData.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.keywords.map((keyword, index) => (
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
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 故障现象 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">故障现象 *</h2>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={(e) => handleFileUpload(e, 'fault_phenomenon')}
                    className="hidden"
                    id="fault-phenomenon-upload"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Upload className="w-4 h-4" />}
                    onClick={() => {
                      const input = document.getElementById('fault-phenomenon-upload');
                      if (input) input.click();
                    }}
                  >
                    上传图片/视频
                  </Button>
                </label>
              </div>
              
              <RichTextEditor
                value={formData.content.fault_phenomenon}
                onChange={(value) => setFormData(prev => ({
                  ...prev,
                  content: { ...prev.content, fault_phenomenon: value }
                }))}
                placeholder="详细描述故障现象，包括错误代码、异常表现、发生条件等..."
                height="200px"
              />
              
              {/* 已上传的附件 */}
              {getAttachmentsBySection('fault_phenomenon').length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">相关附件</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {getAttachmentsBySection('fault_phenomenon').map(attachment => (
                      <AttachmentPreview
                        key={attachment.id}
                        attachment={attachment}
                        onRemove={() => removeAttachment(attachment.id)}
                        onDescriptionChange={(description) => {
                          setAttachments(prev => prev.map(a => 
                            a.id === attachment.id ? { ...a, description } : a
                          ));
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* 诊断步骤 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">诊断步骤</h2>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={(e) => handleFileUpload(e, 'diagnosis_steps')}
                    className="hidden"
                    id="diagnosis-steps-upload"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Upload className="w-4 h-4" />}
                    onClick={() => {
                      const input = document.getElementById('diagnosis-steps-upload');
                      if (input) input.click();
                    }}
                  >
                    上传图片/视频
                  </Button>
                </label>
              </div>
              
              <RichTextEditor
                value={formData.content.diagnosis_steps}
                onChange={(value) => setFormData(prev => ({
                  ...prev,
                  content: { ...prev.content, diagnosis_steps: value }
                }))}
                placeholder="详细描述诊断步骤，包括使用的工具、测试方法、排查流程等..."
                height="200px"
              />
              
              {/* 已上传的附件 */}
              {getAttachmentsBySection('diagnosis_steps').length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">相关附件</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {getAttachmentsBySection('diagnosis_steps').map(attachment => (
                      <AttachmentPreview
                        key={attachment.id}
                        attachment={attachment}
                        onRemove={() => removeAttachment(attachment.id)}
                        onDescriptionChange={(description) => {
                          setAttachments(prev => prev.map(a => 
                            a.id === attachment.id ? { ...a, description } : a
                          ));
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* 解决方案 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">解决方案</h2>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={(e) => handleFileUpload(e, 'solution')}
                    className="hidden"
                    id="solution-upload"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Upload className="w-4 h-4" />}
                    onClick={() => {
                      const input = document.getElementById('solution-upload');
                      if (input) input.click();
                    }}
                  >
                    上传图片/视频
                  </Button>
                </label>
              </div>
              
              <RichTextEditor
                value={formData.content.solution}
                onChange={(value) => setFormData(prev => ({
                  ...prev,
                  content: { ...prev.content, solution: value }
                }))}
                placeholder="详细描述解决方案，包括具体的修复步骤、需要的零件、技术要点等..."
                height="200px"
              />
              
              {/* 已上传的附件 */}
              {getAttachmentsBySection('solution').length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">相关附件</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {getAttachmentsBySection('solution').map(attachment => (
                      <AttachmentPreview
                        key={attachment.id}
                        attachment={attachment}
                        onRemove={() => removeAttachment(attachment.id)}
                        onDescriptionChange={(description) => {
                          setAttachments(prev => prev.map(a => 
                            a.id === attachment.id ? { ...a, description } : a
                          ));
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* 预防措施 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">预防措施</h2>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={(e) => handleFileUpload(e, 'preventive_measures')}
                    className="hidden"
                    id="preventive-measures-upload"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Upload className="w-4 h-4" />}
                    onClick={() => {
                      const input = document.getElementById('preventive-measures-upload');
                      if (input) input.click();
                    }}
                  >
                    上传图片/视频
                  </Button>
                </label>
              </div>
              
              <RichTextEditor
                value={formData.content.preventive_measures}
                onChange={(value) => setFormData(prev => ({
                  ...prev,
                  content: { ...prev.content, preventive_measures: value }
                }))}
                placeholder="描述预防措施，包括日常维护建议、定期检查项目、使用注意事项等..."
                height="200px"
              />
              
              {/* 已上传的附件 */}
              {getAttachmentsBySection('preventive_measures').length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">相关附件</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {getAttachmentsBySection('preventive_measures').map(attachment => (
                      <AttachmentPreview
                        key={attachment.id}
                        attachment={attachment}
                        onRemove={() => removeAttachment(attachment.id)}
                        onDescriptionChange={(description) => {
                          setAttachments(prev => prev.map(a => 
                            a.id === attachment.id ? { ...a, description } : a
                          ));
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}

// 附件预览组件
function AttachmentPreview({ 
  attachment, 
  onRemove, 
  onDescriptionChange 
}: { 
  attachment: Attachment;
  onRemove: () => void;
  onDescriptionChange: (description: string) => void;
}) {
  return (
    <div className="group relative border border-gray-200 rounded-lg overflow-hidden bg-gray-50 hover:bg-white transition-colors">
      {/* 删除按钮 */}
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 z-10 p-1 bg-white/80 hover:bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-3 h-3" />
      </button>
      
      {/* 预览内容 */}
      <div className="p-3">
        {attachment.previewUrl ? (
          <div className="aspect-square mb-2 rounded overflow-hidden bg-white">
            <img
              src={attachment.previewUrl}
              alt={attachment.file.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-square mb-2 rounded bg-gray-100 flex items-center justify-center">
            {attachment.type === 'image' && <ImageIcon className="w-8 h-8 text-gray-400" />}
            {attachment.type === 'video' && <Video className="w-8 h-8 text-gray-400" />}
            {attachment.type === 'document' && <FileText className="w-8 h-8 text-gray-400" />}
          </div>
        )}
        
        {/* 文件名 */}
        <p className="text-xs text-gray-600 truncate mb-1" title={attachment.file.name}>
          {attachment.file.name}
        </p>
        
        {/* 文件信息 */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>{attachment.type}</span>
          <span>{(attachment.file.size / 1024).toFixed(1)} KB</span>
        </div>
        
        {/* 描述输入框 */}
        <input
          type="text"
          value={attachment.description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="添加描述..."
          className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}