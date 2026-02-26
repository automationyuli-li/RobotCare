// src/app/organizations/[id]/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Building,
  Mail,
  Phone,
  MapPin,
  Globe,
  FileText,
  User,
  CheckCircle,
  AlertCircle,
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
  created_at: Date;
  updated_at: Date;
}

export default function OrganizationEditPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const organizationId = params?.id as string;
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    metadata: {
      industry: '',
      address: '',
      province: '',
      city: '',
      website: '',
      description: '',
    },
  });

  useEffect(() => {

    if (authLoading) return;

    // 1. 检查是否登录
    if (!user) {
      console.log('❌ 用户未登录');
      router.push('/');
      return;
    }
    // 只能编辑自己的组织
    if (user?.org_id !== organizationId) {
      router.push('/organizations');
      return;
    }
    // 3. ✅ 检查是否是管理员（只有管理员可以编辑组织信息）
    if (!user.role.includes('admin')) {
      router.push('/organizations');
      return;
    }
    fetchOrganization();
  }, [organizationId, user]);

  const fetchOrganization = async () => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}`);
      const data = await response.json();
      
      if (data.success) {
        setOrganization(data.data);
        setFormData({
          name: data.data.name,
          contact_email: data.data.contact_email,
          contact_phone: data.data.contact_phone || '',
          metadata: {
            industry: data.data.metadata?.industry || '',
            address: data.data.metadata?.address || '',
            province: data.data.metadata?.province || '',
            city: data.data.metadata?.city || '',
            website: data.data.metadata?.website || '',
            description: data.data.metadata?.description || '',
          },
        });
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
      setError('加载组织信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('metadata.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          [field]: value,
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // 验证必填字段
      if (!formData.name.trim() || !formData.contact_email.trim()) {
        throw new Error('名称和联系邮箱是必填项');
      }

      const updateData = {
        name: formData.name,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone || undefined,
        metadata: {
          ...formData.metadata,
          // 清理空值
          industry: formData.metadata.industry || undefined,
          address: formData.metadata.address || undefined,
          province: formData.metadata.province || undefined,
          city: formData.metadata.city || undefined,
          website: formData.metadata.website || undefined,
          description: formData.metadata.description || undefined,
        },
      };

      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '更新失败');
      }

      setSuccess('组织信息更新成功！');
      
      // 2秒后返回
      setTimeout(() => {
        router.push('/organizations');
      }, 2000);
      
    } catch (error: any) {
      console.error('Error updating organization:', error);
      setError(error.message || '更新失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在加载组织信息...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">组织不存在</h3>
          <p className="text-gray-600 mb-6">请求的组织数据不存在或您没有权限访问</p>
          <Button onClick={() => router.push('/organizations')}>
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  const isServiceProvider = user?.role.includes('service');
  const pageTitle = isServiceProvider ? '服务商信息编辑' : '客户信息编辑';

  // 在渲染前添加
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">验证登录状态...</p>
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
            onClick={() => router.push('/organizations')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回列表
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
              <p className="text-gray-600 mt-1">更新您的组织信息</p>
            </div>
          </div>
        </div>

        {/* 错误和成功提示 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-700 font-medium">更新失败</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-green-700 font-medium">更新成功</p>
                <p className="text-green-600 text-sm mt-1">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* 编辑表单 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 基本信息 */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Building className="w-5 h-5 mr-2 text-blue-500" />
                基本信息
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="组织名称 *"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={saving}
                  icon={<Building className="w-4 h-4" />}
                  placeholder="请输入组织全称"
                />

                <Input
                  label="联系邮箱 *"
                  type="email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  required
                  disabled={saving}
                  icon={<Mail className="w-4 h-4" />}
                  placeholder="contact@company.com"
                />

                <Input
                  label="联系电话"
                  type="tel"
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  disabled={saving}
                  icon={<Phone className="w-4 h-4" />}
                  placeholder="请输入联系电话"
                />
              </div>
            </div>

            {/* 详细信息 */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <User className="w-5 h-5 mr-2 text-green-500" />
                详细信息
              </h3>
              
              {isServiceProvider ? (
                // 服务商：行业和地址
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="行业类型"
                    name="metadata.industry"
                    value={formData.metadata.industry}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="如：机器人集成、自动化设备等"
                  />

                  <Input
                    label="详细地址"
                    name="metadata.address"
                    value={formData.metadata.address}
                    onChange={handleChange}
                    disabled={saving}
                    icon={<MapPin className="w-4 h-4" />}
                    placeholder="请输入详细地址"
                  />

                  <Input
                    label="省份"
                    name="metadata.province"
                    value={formData.metadata.province}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="如：北京、上海、广东"
                  />

                  <Input
                    label="城市"
                    name="metadata.city"
                    value={formData.metadata.city}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="如：北京市、深圳市"
                  />
                </div>
              ) : (
                // 终端客户：地址和网站
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="公司地址"
                    name="metadata.address"
                    value={formData.metadata.address}
                    onChange={handleChange}
                    disabled={saving}
                    icon={<MapPin className="w-4 h-4" />}
                    placeholder="请输入公司地址"
                  />

                  <Input
                    label="省份"
                    name="metadata.province"
                    value={formData.metadata.province}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="如：北京、上海、广东"
                  />

                  <Input
                    label="城市"
                    name="metadata.city"
                    value={formData.metadata.city}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="如：北京市、深圳市"
                  />

                  <Input
                    label="公司网站"
                    name="metadata.website"
                    value={formData.metadata.website}
                    onChange={handleChange}
                    disabled={saving}
                    icon={<Globe className="w-4 h-4" />}
                    placeholder="https://example.com"
                  />
                </div>
              )}
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                公司简介
              </label>
              <textarea
                name="metadata.description"
                value={formData.metadata.description}
                onChange={handleChange}
                disabled={saving}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="请简要介绍您的公司业务..."
              />
            </div>

            {/* 只读信息 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">系统信息</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">账户类型：</span>
                  <span className="font-medium">
                    {isServiceProvider ? '服务商' : '终端客户'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">套餐计划：</span>
                  <span className="font-medium">
                    {organization.subscription_plan || '免费版'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">账户状态：</span>
                  <span className={`font-medium ${
                    organization.status === 'active' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {organization.status === 'active' ? '活跃' : '已停用'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">注册时间：</span>
                  <span className="font-medium">
                    {new Date(organization.created_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => router.push('/organizations')}
                disabled={saving}
              >
                取消
              </Button>
              <Button
                type="submit"
                loading={saving}
                icon={<Save className="w-4 h-4" />}
              >
                {saving ? '保存中...' : '保存更改'}
              </Button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  );
}