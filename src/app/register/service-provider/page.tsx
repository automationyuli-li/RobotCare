// src/app/register/service-provider/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Mail, 
  Phone, 
  User, 
  Lock, 
  CheckCircle, 
  AlertCircle,
  ArrowLeft,
  Shield,
  Users,
  Cpu,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// 套餐配置
const SUBSCRIPTION_PLANS = [
  {
    id: 'free',
    name: '免费版',
    description: '适用于初创公司或个人开发者',
    price: '¥0',
    period: '永久免费',
    features: [
      { text: '最多5台机器人', icon: Cpu },
      { text: '1个客户管理', icon: Users },
      { text: '2名工程师', icon: User },
      { text: '基础技术支持', icon: Shield },
    ],
    badge: '推荐试用',
    badgeColor: 'bg-green-100 text-green-800'
  },
  {
    id: 'silver',
    name: '初级版',
    description: '适用于小型机器人公司',
    price: '¥499',
    period: '/月',
    features: [
      { text: '最多100台机器人', icon: Cpu },
      { text: '5个客户管理', icon: Users },
      { text: '10名工程师', icon: User },
      { text: '标准技术支持', icon: Shield },
      { text: '工单管理', icon: CreditCard },
    ],
    popular: true,
    badge: '最受欢迎',
    badgeColor: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'gold',
    name: '高级版',
    description: '适用于中型企业',
    price: '¥1,999',
    period: '/月',
    features: [
      { text: '最多1000台机器人', icon: Cpu },
      { text: '50个客户管理', icon: Users },
      { text: '20名工程师', icon: User },
      { text: '优先技术支持', icon: Shield },
      { text: 'API访问权限', icon: CreditCard },
      { text: '自定义报告', icon: CreditCard },
    ]
  },
  {
    id: 'premium',
    name: '企业版',
    description: '适用于大型企业',
    price: '¥9,999',
    period: '/月',
    features: [
      { text: '最多5000台机器人', icon: Cpu },
      { text: '200个客户管理', icon: Users },
      { text: '无限工程师', icon: User },
      { text: '专属技术支持', icon: Shield },
      { text: '高级API权限', icon: CreditCard },
      { text: '定制化开发', icon: CreditCard },
    ]
  }
];

export default function ServiceProviderRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // 表单状态
  const [formData, setFormData] = useState({
    organizationName: '',
    contactEmail: '',
    contactPhone: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
    adminDisplayName: '',
    acceptTerms: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // 表单验证
    if (!formData.acceptTerms) {
      setError('请阅读并同意服务条款和隐私政策');
      setLoading(false);
      return;
    }

    if (formData.adminPassword !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationName: formData.organizationName,
          contactEmail: formData.contactEmail,
          contactPhone: formData.contactPhone,
          adminEmail: formData.adminEmail,
          adminPassword: formData.adminPassword,
          adminDisplayName: formData.adminDisplayName,
          subscriptionPlan: selectedPlan,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '注册失败');
      }

      setSuccess('注册成功！请查收邮件完成邮箱验证后再登录。正在跳转到登录页面...');
      
      // 3秒后跳转到登录页
      setTimeout(() => {
        router.push('/');
      }, 3000);

    } catch (err: any) {
      console.error('注册错误:', err);
      setError(err.message || '注册过程中发生错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-green-50/20">
      {/* 导航 */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回登录
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-green-400 
                            flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900">RobotCare</span>
            </div>
            <div className="w-24"></div> {/* 占位保持平衡 */}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 注册进度 */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center 
                                ${step === 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={`w-16 h-1 ${step === 1 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <p className="text-center text-gray-600 text-sm">
            步骤 1 / 3 · 填写基本信息
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* 左侧表单 */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl border border-gray-200 p-8"
            >
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  创建服务商账户
                </h1>
                <p className="text-gray-600">
                  注册成为RobotCare服务商，开始管理您的机器人和客户
                </p>
              </div>

              {/* 错误和成功提示 */}
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-red-700 font-medium">注册失败</p>
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
                      <p className="text-green-700 font-medium">注册成功</p>
                      <p className="text-green-600 text-sm mt-1">{success}</p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 组织信息 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Building2 className="w-5 h-5 mr-2 text-blue-500" />
                    组织信息
                  </h3>
                  
                  <Input
                    icon={<Building2 className="w-4 h-4" />}
                    label="公司名称"
                    name="organizationName"
                    placeholder="请输入公司全称"
                    value={formData.organizationName}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      icon={<Mail className="w-4 h-4" />}
                      label="联系邮箱"
                      type="email"
                      name="contactEmail"
                      placeholder="company@example.com"
                      value={formData.contactEmail}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />

                    <Input
                      icon={<Phone className="w-4 h-4" />}
                      label="联系电话"
                      type="tel"
                      name="contactPhone"
                      placeholder="请输入联系电话"
                      value={formData.contactPhone}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* 管理员信息 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <User className="w-5 h-5 mr-2 text-green-500" />
                    管理员信息
                  </h3>
                  
                  <Input
                    icon={<Mail className="w-4 h-4" />}
                    label="管理员邮箱"
                    type="email"
                    name="adminEmail"
                    placeholder="admin@example.com"
                    value={formData.adminEmail}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />

                  <Input
                    icon={<User className="w-4 h-4" />}
                    label="显示名称"
                    name="adminDisplayName"
                    placeholder="请输入显示名称"
                    value={formData.adminDisplayName}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      icon={<Lock className="w-4 h-4" />}
                      label="设置密码"
                      type="password"
                      name="adminPassword"
                      placeholder="至少8位字符"
                      value={formData.adminPassword}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />

                    <Input
                      icon={<Lock className="w-4 h-4" />}
                      label="确认密码"
                      type="password"
                      name="confirmPassword"
                      placeholder="请再次输入密码"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* 条款同意 */}
                <div className="pt-4 border-t border-gray-200">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="acceptTerms"
                      checked={formData.acceptTerms}
                      onChange={handleChange}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      disabled={loading}
                    />
                    <div className="text-sm">
                      <span className="text-gray-900 font-medium">
                        我已阅读并同意
                      </span>
                      {' '}
                      <a 
                        href="/terms" 
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        服务条款
                      </a>
                      {' '}和{' '}
                      <a 
                        href="/privacy" 
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        隐私政策
                      </a>
                      <p className="text-gray-500 mt-1">
                        我们将根据服务条款和隐私政策处理您的数据
                      </p>
                    </div>
                  </label>
                </div>

                <Button
                  type="submit"
                  loading={loading}
                  fullWidth
                  className="mt-6"
                >
                  {loading ? '正在注册...' : '创建服务商账户'}
                </Button>
              </form>
            </motion.div>
          </div>

          {/* 右侧套餐选择 */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="sticky top-24"
            >
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  选择服务套餐
                </h3>
                <p className="text-gray-600 text-sm mb-6">
                  选择合适的套餐开始使用，支持随时升级
                </p>

                <div className="space-y-4">
                  {SUBSCRIPTION_PLANS.map((plan) => (
                    <motion.div
                      key={plan.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all
                                ${selectedPlan === plan.id 
                                  ? 'border-blue-500 bg-blue-50/50' 
                                  : 'border-gray-200 hover:border-gray-300'
                                }`}
                      onClick={() => setSelectedPlan(plan.id)}
                    >
                      {plan.popular && (
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-blue-500 to-green-400 text-white">
                            最受欢迎
                          </span>
                        </div>
                      )}

                      {plan.badge && (
                        <div className={`absolute -top-2 right-4 px-2 py-1 text-xs font-medium rounded-full ${plan.badgeColor}`}>
                          {plan.badge}
                        </div>
                      )}

                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                          <p className="text-sm text-gray-500">{plan.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">{plan.price}</div>
                          <div className="text-sm text-gray-500">{plan.period}</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <div key={index} className="flex items-center text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            <span className="text-gray-700">{feature.text}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className={`flex items-center justify-center py-2 px-4 rounded-lg
                                      ${selectedPlan === plan.id 
                                        ? 'bg-gradient-to-r from-blue-500 to-green-400 text-white' 
                                        : 'bg-gray-100 text-gray-700'
                                      }`}>
                          {selectedPlan === plan.id ? '✓ 已选择' : '选择此套餐'}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* 套餐提示 */}
                <div className="mt-6 p-4 bg-blue-50/50 rounded-xl border border-blue-200">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-800">套餐说明</p>
                      <p className="text-blue-600 mt-1">
                        • 所有套餐均包含基础功能<br/>
                        • 超出部分按 ¥50/机器人/月 收费<br/>
                        • 支持随时升级或降级套餐<br/>
                        • 7天无理由退款保证
                      </p>
                    </div>
                  </div>
                </div>

                {/* 支持信息 */}
                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-5 h-5 text-gray-400" />
                    <div className="text-sm">
                      <p className="font-medium text-gray-700">安全保障</p>
                      <p className="text-gray-500 mt-1">
                        企业级数据加密，GDPR合规，99.9%可用性保证
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* 页脚信息 */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p className="flex items-center justify-center">
            <Shield className="w-4 h-4 mr-2" />
            注册即表示您同意我们的服务条款和隐私政策
          </p>
          <p className="mt-2 text-xs text-gray-400">
            RobotCare Vision 1.0 · 以机器人为中心的维保协作平台
          </p>
        </div>
      </div>
    </div>
  );
}