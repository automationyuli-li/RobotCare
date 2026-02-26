'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  X, Paperclip, FileText, Save, Upload, Download, Trash2, Calendar, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

// 定义附件类型
interface Attachment {
  fileId?: string;
  name: string;
  size: number;
  type: string;
  url?: string;           // 已上传的访问 URL
  localUrl?: string;      // 上传前预览用（可选）
  uploading?: boolean;    // 上传中标志
}

interface Stage {
  _id?: string;
  stage_type: string;
  content: string;
  attachments?: Attachment[];
  expected_date?: string;
}

interface StageEditorProps {
  stage: Stage;
  onSave: (data: { content: string; attachments: Attachment[]; expected_date?: string }) => void;
  onClose: () => void;
}

export default function StageEditor({ stage, onSave, onClose }: StageEditorProps) {
  const [content, setContent] = useState(stage?.content || '');
  const [attachments, setAttachments] = useState<Attachment[]>(stage?.attachments || []);
  const [expectedDate, setExpectedDate] = useState(stage?.expected_date || '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const uploadFile = async (file: File): Promise<Attachment> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/upload', { method: 'POST', body: formData });
    const result = await response.json();
    if (!result.success) throw new Error(result.error || '上传失败');
    return result.data; // 返回 { fileId, name, size, type, url }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // 先添加一个临时对象，显示上传中状态
        const tempAttachment: Attachment = {
          name: file.name,
          size: file.size,
          type: file.type,
          localUrl: URL.createObjectURL(file),
          uploading: true,
        };
        setAttachments(prev => [...prev, tempAttachment]);

        try {
          const uploaded = await uploadFile(file);
          // 替换为已上传的真实对象
          setAttachments(prev => prev.map(a => 
            a === tempAttachment ? { ...uploaded, uploading: false } : a
          ));
        } catch (error) {
          // 上传失败，移除临时对象
          setAttachments(prev => prev.filter(a => a !== tempAttachment));
          throw error;
        }
      });

      await Promise.all(uploadPromises);
    } catch (error) {
      console.error('上传失败:', error);
      alert('部分文件上传失败，请重试');
    } finally {
      setUploading(false);
      e.target.value = ''; // 重置 input
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    // 过滤掉还在上传中的附件（防止保存不完整）
    const finalAttachments = attachments.filter(a => !a.uploading);
    onSave({
      content,
      attachments: finalAttachments,
      expected_date: expectedDate || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">编辑阶段</h2>
            <p className="text-sm text-gray-500 mt-1">填写详细内容并上传相关文件</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 主体 */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          {/* 内容编辑器 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">详细内容</label>
            <textarea
              className="w-full h-48 border border-gray-300 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="请输入详细内容..."
            />
          </div>

          {/* 附件上传 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">附件</label>
              <input
                type="file"
                ref={fileInputRef}
                multiple
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />
              <Button
                variant="outline"
                size="sm"
                icon={uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                onClick={handleFileSelect}
                disabled={uploading}
              >
                {uploading ? '上传中...' : '上传文件'}
              </Button>
            </div>

            {attachments.length > 0 ? (
              <div className="space-y-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {file.name}
                          {file.uploading && <span className="ml-2 text-xs text-blue-500">上传中...</span>}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {file.url && !file.uploading && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Download className="w-4 h-4" />}
                          onClick={() => window.open(file.url, '_blank')}
                        >
                          下载
                        </Button>
                      )}
                      {!file.uploading && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 className="w-4 h-4" />}
                          onClick={() => handleRemoveAttachment(index)}
                        >
                          删除
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-xl">
                <Paperclip className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">暂无附件，点击上方按钮上传文件</p>
              </div>
            )}
          </div>

          {/* 预期完成时间 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">预期完成时间</label>
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button variant="primary" icon={<Save className="w-4 h-4" />} onClick={handleSave}>
            保存
          </Button>
        </div>
      </motion.div>
    </div>
  );
}