//src/app/tickets/new/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Bot,
  Building2,
  AlertCircle,
  Clock,
  CheckCircle,
  Upload,
  Paperclip,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Navigation from '@/components/layout/Navigation';

interface Robot {
  _id: string;
  sn: string;
  brand: string;
  model: string;
  location: string;
  status: string;
}

interface Customer {
  _id: string;
  name: string;
  type: string;
}

export default function CreateTicketPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [filteredRobots, setFilteredRobots] = useState<Robot[]>([]);
  
  const [formData, setFormData] = useState({
    robot_id: '',
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    robot_status: 'fault' as 'active' | 'maintenance' | 'fault' | 'inactive',
    attachments: [] as File[]
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 加载客户和机器人数据
  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      fetchRobots(selectedCustomer);
    } else {
      setFilteredRobots([]);
    }
  }, [selectedCustomer]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/organizations?type=end_customer');
      const data = await response.json();
      if (data.success) {
        setCustomers(data.data.organizations || []);
      }
    } catch (error) {
      console.error('获取客户列表失败:', error);
    }
  };

  const fetchRobots = async (customerId: string) => {
    try {
      const response = await fetch(`/api/robots?customer_id=${customerId}`);
      const data = await response.json();
      if (data.success) {
        setRobots(data.data.robots || []);
        setFilteredRobots(data.data.robots || []);
      }
    } catch (error) {
      console.error('获取机器人列表失败:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!selectedCustomer) {
      newErrors.customer = '请选择客户';
    }
    if (!formData.robot_id) {
      newErrors.robot_id = '请选择机器人';
    }
    if (!formData.title.trim()) {
      newErrors.title = '请填写异常主题';
    }
    if (!formData.description.trim()) {
      newErrors.description = '请填写异常描述';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('robot_id', formData.robot_id);
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('priority', formData.priority);
      formDataToSend.append('robot_status', formData.robot_status);
      
      // 添加上传的附件
      formData.attachments.forEach((file, index) => {
        formDataToSend.append(`attachments`, file);
      });
      
      const response = await fetch('/api/tickets', {
        method: 'POST',
        body: formDataToSend
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || '创建工单失败');
      }
      
      if (data.success) {
        alert('工单创建成功！');
        router.push(`/tickets/${data.data._id}`);
      } else {
        throw new Error(data.error || '创建工单失败');
      }
      
    } catch (error: any) {
      console.error('创建工单失败:', error);
      alert(`创建工单失败: ${error.message || '请重试'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (files: FileList) => {
    const newFiles = Array.from(files);
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...newFiles]
    }));
  };

  const handleRemoveFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  return (
    <>
      <Navigation />
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 头部 */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="ghost"
                icon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => router.push('/tickets')}
              >
                返回列表
              </Button>
              
              <h1 className="text-2xl font-bold text-gray-900">创建工单</h1>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900">填写说明</h3>
                  <p className="text-blue-700 text-sm mt-1">
                    请准确填写异常信息，有助于工程师快速定位和解决问题。所有带 * 的字段为必填项。
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 创建表单 */}
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
              {/* 客户选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  客户 *
                </label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.customer ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">选择客户</option>
                  {customers.map(customer => (
                    <option key={customer._id} value={customer._id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
                {errors.customer && (
                  <p className="mt-1 text-sm text-red-600">{errors.customer}</p>
                )}
              </div>

              {/* 机器人选择 */}
              {selectedCustomer && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    机器人 *
                  </label>
                  <select
                    value={formData.robot_id}
                    onChange={(e) => setFormData({...formData, robot_id: e.target.value})}
                    className={`w-full border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.robot_id ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">选择机器人</option>
                    {filteredRobots.map(robot => (
                      <option key={robot._id} value={robot._id}>
                        {robot.brand} {robot.model} - SN: {robot.sn} ({robot.location})
                      </option>
                    ))}
                  </select>
                  {errors.robot_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.robot_id}</p>
                  )}
                </div>
              )}

              {/* 异常主题 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  异常主题 *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="例如：机器人轴1运行异常"
                  className={`w-full border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                )}
              </div>

              {/* 异常描述 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  异常描述 *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="详细描述异常现象、发生频率、已尝试的操作等..."
                  rows={6}
                  className={`w-full border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                )}
              </div>

              {/* 优先级和状态 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    优先级 *
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                    <option value="urgent">紧急</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    机器人状态 *
                  </label>
                  <select
                    value={formData.robot_status}
                    onChange={(e) => setFormData({...formData, robot_status: e.target.value as any})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="fault">故障</option>
                    <option value="maintenance">维护中</option>
                    <option value="inactive">离线</option>
                    <option value="active">运行正常</option>
                  </select>
                </div>
              </div>

              {/* 附件上传 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  附件（可选）
                </label>
                
                {/* 文件列表 */}
                {formData.attachments.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {formData.attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Paperclip className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* 上传区域 */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-1">
                      点击或拖放文件到此处上传
                    </p>
                    <p className="text-xs text-gray-500">
                      支持图片、视频、PDF、Word、Excel文件
                    </p>
                  </label>
                </div>
              </div>
            </div>

            {/* 提交按钮 */}
            <div className="mt-6 flex items-center justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/tickets')}
              >
                取消
              </Button>
              <Button
                type="submit"
                variant="primary"
                icon={<Save className="w-4 h-4" />}
                loading={loading}
              >
                创建工单
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}