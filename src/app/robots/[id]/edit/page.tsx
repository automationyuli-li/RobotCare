// src/app/robots/[id]/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  X,
  Bot,
  MapPin,
  Calendar,
  Settings,
  AlertCircle,
  CheckCircle,
  Shield,
  Cpu,
  Zap,
  Wifi,
  Plus,
  Trash2,
  Edit,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { RobotStatusBadge } from '@/components/robots/RobotStatusBadge';
import type { Robot } from '@/types';

// 机器人状态选项
const STATUS_OPTIONS = [
  { value: 'active', label: '运行正常', color: 'bg-green-100 text-green-700' },
  { value: 'maintenance', label: '维护中', color: 'bg-amber-100 text-amber-700' },
  { value: 'fault', label: '故障', color: 'bg-red-100 text-red-700' },
  { value: 'inactive', label: '离线', color: 'bg-gray-100 text-gray-700' },
];

// 规格参数类型
interface Specification {
  key: string;
  value: string;
}

// 外设设备类型
interface Peripheral {
  name: string;
  type: string;
  description: string;
  status: 'connected' | 'disconnected';
}

export default function EditRobotPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const robotId = params?.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [robot, setRobot] = useState<Robot | null>(null);
  
  // 表单状态
  const [formData, setFormData] = useState({
    location: '',
    status: 'active' as 'active' | 'maintenance' | 'fault' | 'inactive',
    specs: {
      installation_date: '' as string | undefined,
      warranty_end: '' as string | undefined,
      last_maintenance_date: '' as string | undefined,
      next_maintenance_date: '' as string | undefined,
    },
    specifications: [] as Specification[],
    peripherals: [] as Peripheral[],
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingSpecIndex, setEditingSpecIndex] = useState<number | null>(null);
  const [editingPeripheralIndex, setEditingPeripheralIndex] = useState<number | null>(null);
  const [newSpec, setNewSpec] = useState({ key: '', value: '' });
  const [newPeripheral, setNewPeripheral] = useState<Peripheral>({
    name: '',
    type: '',
    description: '',
    status: 'connected',
  });

  // 加载机器人数据
  useEffect(() => {
    fetchRobotDetails();
  }, [robotId]);

  const fetchRobotDetails = async () => {
    try {
      const response = await fetch(`/api/robots/${robotId}`);
      const data = await response.json();
      if (data.success) {
        setRobot(data.data);
        
        // 格式化日期数据
        const formatDate = (date: Date | string | undefined) => {
          if (!date) return '';
          const d = new Date(date);
          return d.toISOString().split('T')[0];
        };

        // 初始化表单数据
        setFormData({
          location: data.data.location || '',
          status: data.data.status || 'active',
          specs: {
            installation_date: formatDate(data.data.specs?.installation_date),
            warranty_end: formatDate(data.data.specs?.warranty_end),
            last_maintenance_date: formatDate(data.data.specs?.last_maintenance_date),
            next_maintenance_date: formatDate(data.data.specs?.next_maintenance_date),
          },
          specifications: data.data.metadata?.specifications || [],
          peripherals: data.data.metadata?.peripherals || [],
        });
      } else {
        setError(data.error || '加载机器人数据失败');
      }
    } catch (error: any) {
      console.error('Error fetching robot:', error);
      setError('加载机器人数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBasicChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    clearMessages();
  };

  const handleSpecsChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      specs: {
        ...prev.specs,
        [field]: value
      }
    }));
    clearMessages();
  };

  // 规格参数操作
  const handleAddSpec = () => {
    if (!newSpec.key || !newSpec.value) return;
    
    setFormData(prev => ({
      ...prev,
      specifications: [...prev.specifications, { ...newSpec }]
    }));
    setNewSpec({ key: '', value: '' });
    clearMessages();
  };

  const handleEditSpec = (index: number) => {
    setEditingSpecIndex(index);
    setNewSpec(formData.specifications[index]);
  };

  const handleUpdateSpec = () => {
    if (editingSpecIndex === null || !newSpec.key || !newSpec.value) return;
    
    const updatedSpecs = [...formData.specifications];
    updatedSpecs[editingSpecIndex] = { ...newSpec };
    
    setFormData(prev => ({
      ...prev,
      specifications: updatedSpecs
    }));
    
    setEditingSpecIndex(null);
    setNewSpec({ key: '', value: '' });
    clearMessages();
  };

  const handleDeleteSpec = (index: number) => {
    if (!confirm('确定要删除这个规格参数吗？')) return;
    
    const updatedSpecs = formData.specifications.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      specifications: updatedSpecs
    }));
    clearMessages();
  };

  // 外设设备操作
  const handleAddPeripheral = () => {
    if (!newPeripheral.name || !newPeripheral.type) return;
    
    setFormData(prev => ({
      ...prev,
      peripherals: [...prev.peripherals, { ...newPeripheral }]
    }));
    setNewPeripheral({
      name: '',
      type: '',
      description: '',
      status: 'connected'
    });
    clearMessages();
  };

  const handleEditPeripheral = (index: number) => {
    setEditingPeripheralIndex(index);
    setNewPeripheral(formData.peripherals[index]);
  };

  const handleUpdatePeripheral = () => {
    if (editingPeripheralIndex === null || !newPeripheral.name || !newPeripheral.type) return;
    
    const updatedPeripherals = [...formData.peripherals];
    updatedPeripherals[editingPeripheralIndex] = { ...newPeripheral };
    
    setFormData(prev => ({
      ...prev,
      peripherals: updatedPeripherals
    }));
    
    setEditingPeripheralIndex(null);
    setNewPeripheral({
      name: '',
      type: '',
      description: '',
      status: 'connected'
    });
    clearMessages();
  };

  const handleDeletePeripheral = (index: number) => {
    if (!confirm('确定要删除这个外设设备吗？')) return;
    
    const updatedPeripherals = formData.peripherals.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      peripherals: updatedPeripherals
    }));
    clearMessages();
  };

  const clearMessages = () => {
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // 准备提交数据
      const submitData = {
        location: formData.location,
        status: formData.status,
        specs: {
          ...formData.specs,
          installation_date: formData.specs.installation_date ? new Date(formData.specs.installation_date) : undefined,
          warranty_end: formData.specs.warranty_end ? new Date(formData.specs.warranty_end) : undefined,
          last_maintenance_date: formData.specs.last_maintenance_date ? new Date(formData.specs.last_maintenance_date) : undefined,
          next_maintenance_date: formData.specs.next_maintenance_date ? new Date(formData.specs.next_maintenance_date) : undefined,
        },
        metadata: {
          specifications: formData.specifications,
          peripherals: formData.peripherals,
        }
      };

      const response = await fetch(`/api/robots/${robotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || '更新失败');
      }

      setSuccess('机器人信息更新成功');
      
      // 1秒后返回机器人详情页
      setTimeout(() => {
        router.push(`/robots/${robotId}`);
      }, 1000);
      
    } catch (error: any) {
      console.error('Error updating robot:', error);
      setError(error.message || '更新失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/robots/${robotId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在加载机器人数据...</p>
        </div>
      </div>
    );
  }

  if (!robot) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">机器人不存在</h3>
          <p className="text-gray-600 mb-6">请求的机器人数据不存在或您没有访问权限</p>
          <Button onClick={() => router.push('/robots')}>
            返回机器人列表
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部 */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/robots/${robotId}`)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2 shrink-0" />
            返回详情
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                编辑机器人
              </h1>
              <p className="text-gray-600 mt-1">
                {robot.brand} {robot.model} - {robot.sn}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <RobotStatusBadge status={robot.status} />
            </div>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-red-700 font-medium">更新失败</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* 成功提示 */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-green-700 font-medium">更新成功</p>
                <p className="text-green-600 text-sm mt-1">{success}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* 基本信息卡片 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Bot className="w-5 h-5 mr-2 text-blue-500" />
                基本信息
              </h3>
              
              <div className="space-y-4">
                {/* 只读信息 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500 mb-1">序列号</label>
                    <div className="p-2 bg-gray-50 rounded-lg text-gray-700">
                      {robot.sn}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-500 mb-1">品牌型号</label>
                    <div className="p-2 bg-gray-50 rounded-lg text-gray-700">
                      {robot.brand} {robot.model}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-500 mb-1">客户</label>
                    <div className="p-2 bg-gray-50 rounded-lg text-gray-700">
                      {robot.org_name}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-500 mb-1">服务商</label>
                    <div className="p-2 bg-gray-50 rounded-lg text-gray-700">
                      {robot.provider_name}
                    </div>
                  </div>
                </div>

                {/* 可编辑字段 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  {/* 位置 */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                      安装位置
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleBasicChange('location', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="例如：装配线 #3"
                    />
                  </div>

                  {/* 机器人状态 */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <Settings className="w-4 h-4 mr-2 text-gray-400" />
                      机器人状态
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleBasicChange('status', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">运行正常</option>
                      <option value="maintenance">维护中</option>
                      <option value="fault">故障</option>
                      <option value="inactive">离线</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 技术规格卡片 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Cpu className="w-5 h-5 mr-2 text-purple-500" />
                技术规格
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 安装时间 */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    安装时间
                  </label>
                  <input
                    type="date"
                    value={formData.specs.installation_date || ''}
                    onChange={(e) => handleSpecsChange('installation_date', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 保修截止 */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-gray-400" />
                    保修截止
                  </label>
                  <input
                    type="date"
                    value={formData.specs.warranty_end || ''}
                    onChange={(e) => handleSpecsChange('warranty_end', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 最后维修时间 */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    最后维修时间
                  </label>
                  <input
                    type="date"
                    value={formData.specs.last_maintenance_date || ''}
                    onChange={(e) => handleSpecsChange('last_maintenance_date', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 下次维护时间 */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    下次维护时间
                  </label>
                  <input
                    type="date"
                    value={formData.specs.next_maintenance_date || ''}
                    onChange={(e) => handleSpecsChange('next_maintenance_date', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </motion.div>

            {/* 规格配置卡片 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-amber-500" />
                规格配置
              </h3>
              
              <div className="space-y-4">
                {/* 规格列表 */}
                <div className="space-y-3">
                  {formData.specifications.map((spec, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{spec.key}</span>
                          <span className="text-gray-700">{spec.value}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          type="button"
                          onClick={() => handleEditSpec(index)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSpec(index)}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {formData.specifications.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      暂无规格配置
                    </div>
                  )}
                </div>

                {/* 添加/编辑规格表单 */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="规格名称"
                      value={newSpec.key}
                      onChange={(e) => setNewSpec({ ...newSpec, key: e.target.value })}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="规格值"
                      value={newSpec.value}
                      onChange={(e) => setNewSpec({ ...newSpec, value: e.target.value })}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="mt-3">
                    {editingSpecIndex !== null ? (
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleUpdateSpec}
                          disabled={!newSpec.key || !newSpec.value}
                        >
                          更新规格
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingSpecIndex(null);
                            setNewSpec({ key: '', value: '' });
                          }}
                        >
                          取消
                        </Button>
                        <span className="text-sm text-gray-500">
                          正在编辑第 {editingSpecIndex + 1} 条规格
                        </span>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddSpec}
                        disabled={!newSpec.key || !newSpec.value}
                        icon={<Plus className="w-4 h-4" />}
                      >
                        添加规格
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 外设配置卡片 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Wifi className="w-5 h-5 mr-2 text-green-500" />
                外设配置
              </h3>
              
              <div className="space-y-4">
                {/* 外设列表 */}
                <div className="space-y-3">
                  {formData.peripherals.map((peripheral, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            peripheral.status === 'connected' ? 'bg-green-400' : 'bg-gray-400'
                          }`}></div>
                          <span className="font-medium text-gray-900">{peripheral.name}</span>
                          <span className="ml-2 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            {peripheral.type}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleEditPeripheral(index)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="编辑"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePeripheral(index)}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">{peripheral.description}</p>
                    </div>
                  ))}
                  
                  {formData.peripherals.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      暂无外设配置
                    </div>
                  )}
                </div>

                {/* 添加/编辑外设表单 */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="外设名称"
                      value={newPeripheral.name}
                      onChange={(e) => setNewPeripheral({ ...newPeripheral, name: e.target.value })}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="类型"
                      value={newPeripheral.type}
                      onChange={(e) => setNewPeripheral({ ...newPeripheral, type: e.target.value })}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="描述"
                      value={newPeripheral.description}
                      onChange={(e) => setNewPeripheral({ ...newPeripheral, description: e.target.value })}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={newPeripheral.status}
                      onChange={(e) => setNewPeripheral({ ...newPeripheral, status: e.target.value as 'connected' | 'disconnected' })}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="connected">已连接</option>
                      <option value="disconnected">未连接</option>
                    </select>
                  </div>
                  <div className="mt-3">
                    {editingPeripheralIndex !== null ? (
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleUpdatePeripheral}
                          disabled={!newPeripheral.name || !newPeripheral.type}
                        >
                          更新外设
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingPeripheralIndex(null);
                            setNewPeripheral({
                              name: '',
                              type: '',
                              description: '',
                              status: 'connected'
                            });
                          }}
                        >
                          取消
                        </Button>
                        <span className="text-sm text-gray-500">
                          正在编辑第 {editingPeripheralIndex + 1} 个外设
                        </span>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddPeripheral}
                        disabled={!newPeripheral.name || !newPeripheral.type}
                        icon={<Plus className="w-4 h-4" />}
                      >
                        添加外设
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* 底部操作栏 */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                所有修改操作都会被记录在时间线中
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  icon={<X className="w-4 h-4" />}
                  onClick={handleCancel}
                  disabled={saving}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  loading={saving}
                  icon={<Save className="w-4 h-4" />}
                >
                  {saving ? '保存中...' : '保存修改'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}