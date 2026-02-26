// src/app/robots/[id]/components/ExportModal.tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Filter, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ExportModalProps {
  robotId: string;
  robotSn: string;
  onClose: () => void;
  onExport: (config: any) => void;
}

export default function ExportModal({ robotId, robotSn, onClose, onExport }: ExportModalProps) {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    start_date: '',
    end_date: '',
    event_types: [] as string[],
    include_attachments: false,
    format: 'excel' as 'excel' | 'pdf'
  });

  const eventTypes = [
    { value: 'ticket_created', label: '上报异常' },
    { value: 'maintenance', label: '记录维修' },
    { value: 'document_added', label: '上传文档' },
    { value: 'comment_added', label: '添加评论' },
  ];

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onExport({
        robot_id: robotId,
        ...config
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleEventType = (type: string) => {
    setConfig(prev => ({
      ...prev,
      event_types: prev.event_types.includes(type)
        ? prev.event_types.filter(t => t !== type)
        : [...prev.event_types, type]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl max-w-lg w-full"
      >
        {/* 头部 */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">导出报告</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-600">机器人: {robotSn}</p>
        </div>

        {/* 表单内容 */}
        <div className="p-6 space-y-6">
          {/* 时间范围 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              时间范围
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">开始日期</label>
                <input
                  type="date"
                  value={config.start_date}
                  onChange={(e) => setConfig({...config, start_date: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">结束日期</label>
                <input
                  type="date"
                  value={config.end_date}
                  onChange={(e) => setConfig({...config, end_date: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* 事件类型筛选 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              事件类型
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setConfig({...config, event_types: []})}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  config.event_types.length === 0 
                    ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                全部事件
              </button>
              {eventTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => toggleEventType(type.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    config.event_types.includes(type.value)
                      ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* 其他选项 */}
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="include_attachments"
                checked={config.include_attachments}
                onChange={(e) => setConfig({...config, include_attachments: e.target.checked})}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="include_attachments" className="ml-2 text-sm text-gray-700">
                包含附件信息
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">导出格式</label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="excel"
                    checked={config.format === 'excel'}
                    onChange={(e) => setConfig({...config, format: e.target.value as 'excel' | 'pdf'})}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-sm text-gray-700">Excel (.xlsx)</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="pdf"
                    checked={config.format === 'pdf'}
                    onChange={(e) => setConfig({...config, format: e.target.value as 'excel' | 'pdf'})}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-sm text-gray-700">PDF (.pdf)</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作 */}
        <div className="border-t border-gray-200 p-6 flex items-center justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            loading={loading}
            onClick={handleSubmit}
            icon={<Download className="w-4 h-4" />}
          >
            导出报告
          </Button>
        </div>
      </motion.div>
    </div>
  );
}