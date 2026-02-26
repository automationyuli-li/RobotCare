// src/app/register/invite/[token]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Building,
  Mail,
  Lock,
  User,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {RobotLogo} from '@/components/animations/RobotLogo';

interface InvitationData {
  valid: boolean;
  invitee_email: string;
  role: string;
  invitation_type: string;
  expires_at: string;
  inviter: {
    name: string;
    email: string;
  };
  organization: {
    name: string;
    type: string;
  };
}

export default function InviteRegisterPage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState('');
  
  // 表单状态
  const [formData, setFormData] = useState({
    organizationName: '',
    contactPhone: '',
    adminName: '',
    adminPassword: '',
    confirmPassword: '',
  });

  // 验证邀请
  useEffect(() => {
    const validateInvitation = async () => {
      try {
        const response = await fetch(`/api/invitations/validate?token=${token}`);
        const data = await response.json();
        
        if (data.success && data.data.valid) {
          setInvitation(data.data);
          // 预填邮箱
          setFormData(prev => ({
            ...prev,
            adminEmail: data.data.invitee_email,
          }));
        } else {
          setError(data.error || '邀请链接无效或已过期');
        }
      } catch (error) {
        setError('验证邀请失败');
      } finally {
        setValidating(false);
        setLoading(false);
      }
    };

    if (token) {
      validateInvitation();
    }
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 表单验证
    if (!formData.organizationName.trim()) {
      setError('请输入公司/组织名称');
      return;
    }
    
    if (!formData.adminName.trim()) {
      setError('请输入管理员姓名');
      return;
    }
    
    if (!formData.adminPassword) {
      setError('请输入密码');
      return;
    }
    
    if (formData.adminPassword.length < 8) {
      setError('密码长度至少8位');
      return;
    }
    
    if (formData.adminPassword !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // 调用终端客户注册接口
      const response = await fetch('/api/auth/register/end-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          organizationName: formData.organizationName,
          contactEmail: invitation?.invitee_email,
          contactPhone: formData.contactPhone,
          adminName: formData.adminName,
          adminPassword: formData.adminPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 注册成功，跳转到登录页
        router.push(`/register/success?email=${encodeURIComponent(invitation?.invitee_email || '')}`);
      } else {
        setError(data.error || '注册失败');
      }
    } catch (error) {
      setError('注册失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">正在验证邀请链接...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">邀请链接无效</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => router.push('/')}>
            返回首页
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8">
        {/* 返回按钮 */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回首页
        </button>

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <RobotLogo />
            <h1 className="text-3xl font-bold text-gray-900 mt-4">
              接受合作邀请
            </h1>
            <p className="text-gray-600 mt-2">
              {invitation?.organization.name} 邀请您加入 RobotCare 平台
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* 左侧：邀请信息 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl shadow-xl p-8"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                邀请详情
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Building className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">服务商</p>
                    <p className="font-medium text-gray-900">{invitation?.organization.name}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">邀请人</p>
                    <p className="font-medium text-gray-900">{invitation?.inviter.name}</p>
                    <p className="text-sm text-gray-500">{invitation?.inviter.email}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">受邀邮箱</p>
                    <p className="font-medium text-gray-900">{invitation?.invitee_email}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">受邀角色</p>
                    <p className="font-medium text-gray-900">
                      {invitation?.role === 'end_admin' ? '管理员' : '工程师'}
                    </p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    ⏰ 邀请有效期：{new Date(invitation?.expires_at || '').toLocaleDateString('zh-CN')}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* 右侧：注册表单 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl shadow-xl p-8"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                完成注册
              </h2>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label="公司/组织名称 *"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleChange}
                  icon={<Building className="w-4 h-4" />}
                  placeholder="请输入您的公司名称"
                  disabled={submitting}
                  required
                />

                <Input
                  label="联系邮箱"
                  type="email"
                  value={invitation?.invitee_email || ''}
                  disabled
                  icon={<Mail className="w-4 h-4" />}
                />

                <Input
                  label="联系电话"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  icon={<Mail className="w-4 h-4" />}
                  placeholder="请输入联系电话"
                  disabled={submitting}
                />

                <Input
                  label="管理员姓名 *"
                  name="adminName"
                  value={formData.adminName}
                  onChange={handleChange}
                  icon={<User className="w-4 h-4" />}
                  placeholder="请输入您的姓名"
                  disabled={submitting}
                  required
                />

                <Input
                  label="密码 *"
                  type="password"
                  name="adminPassword"
                  value={formData.adminPassword}
                  onChange={handleChange}
                  icon={<Lock className="w-4 h-4" />}
                  placeholder="至少8位字符"
                  disabled={submitting}
                  required
                />

                <Input
                  label="确认密码 *"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  icon={<Lock className="w-4 h-4" />}
                  placeholder="请再次输入密码"
                  disabled={submitting}
                  required
                />

                <Button
                  type="submit"
                  loading={submitting}
                  className="w-full"
                >
                  {submitting ? '注册中...' : '接受邀请并注册'}
                </Button>
              </form>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}