// src/app/profile/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Save,
  Mail,
  User,
  Phone,
  Key,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/hooks/useAuth';

interface UserProfile {
  _id: string;
  email: string;
  display_name: string;
  real_name?: string;
  phone?: string;
  role: string;
  org_id: string;
  status: 'active' | 'inactive' | 'pending';
  metadata?: {
    avatar_color?: string;
    department?: string;
    position?: string;
  };
  created_at: Date;
  updated_at: Date;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, refreshAuth } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 表单状态
  const [formData, setFormData] = useState({
    display_name: '',
    real_name: '',
    phone: '',
    metadata: {
      department: '',
      position: '',
    },
  });

  // 密码修改状态
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 加载用户信息
  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/users/profile', {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.success) {
        setProfile(data.data);
        setFormData({
          display_name: data.data.display_name || '',
          real_name: data.data.real_name || '',
          phone: data.data.phone || '',
          metadata: {
            department: data.data.metadata?.department || '',
            position: data.data.metadata?.position || '',
          },
        });
      } else {
        setError('加载个人信息失败');
      }
    } catch (error) {
      setError('网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (!formData.display_name.trim()) {
        throw new Error('昵称不能为空');
      }

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('个人信息更新成功');
        await refreshAuth(); // 刷新用户信息
      } else {
        throw new Error(data.error || '更新失败');
      }
    } catch (error: any) {
      setError(error.message || '更新失败');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);
    setError('');
    setSuccess('');

    try {
      // 验证密码
      if (!passwordData.currentPassword) {
        throw new Error('请输入当前密码');
      }

      if (!passwordData.newPassword) {
        throw new Error('请输入新密码');
      }

      if (passwordData.newPassword.length < 8) {
        throw new Error('密码长度至少8位');
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('两次输入的新密码不一致');
      }

      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('密码修改成功');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        throw new Error(data.error || '密码修改失败');
      }
    } catch (error: any) {
      setError(error.message || '密码修改失败');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">加载个人信息...</p>
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
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </button>
          
          <h1 className="text-2xl font-bold text-gray-900">个人资料</h1>
          <p className="text-gray-600 mt-1">管理您的个人信息和账户安全</p>
        </div>

        {/* 提示消息 */}
        <AnimatePresence>
          {(error || success) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-6 p-4 rounded-xl ${
                error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
              }`}
            >
              <div className="flex items-start space-x-3">
                {error ? (
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                )}
                <p className={error ? 'text-red-600' : 'text-green-600'}>
                  {error || success}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-6">
          {/* 基本信息表单 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <User className="w-5 h-5 mr-2 text-blue-500" />
              基本信息
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 邮箱 - 只读 */}
                <Input
                  label="邮箱"
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  icon={<Mail className="w-4 h-4" />}
                />

                <Input
                  label="昵称 *"
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleChange}
                  required
                  disabled={saving}
                  icon={<User className="w-4 h-4" />}
                  placeholder="请输入昵称"
                />

                <Input
                  label="真实姓名"
                  name="real_name"
                  value={formData.real_name}
                  onChange={handleChange}
                  disabled={saving}
                  icon={<User className="w-4 h-4" />}
                  placeholder="请输入真实姓名"
                />

                <Input
                  label="联系电话"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={saving}
                  icon={<Phone className="w-4 h-4" />}
                  placeholder="请输入联系电话"
                />

                <Input
                  label="部门"
                  name="metadata.department"
                  value={formData.metadata.department}
                  onChange={handleChange}
                  disabled={saving}
                  placeholder="如：技术部、销售部"
                />

                <Input
                  label="职位"
                  name="metadata.position"
                  value={formData.metadata.position}
                  onChange={handleChange}
                  disabled={saving}
                  placeholder="如：工程师、经理"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  loading={saving}
                  icon={<Save className="w-4 h-4" />}
                >
                  {saving ? '保存中...' : '保存基本信息'}
                </Button>
              </div>
            </form>
          </motion.div>

          {/* 密码修改表单 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Key className="w-5 h-5 mr-2 text-green-500" />
              修改密码
            </h2>

            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div className="space-y-4">
                {/* 当前密码 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    当前密码 *
                  </label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      disabled={changingPassword}
                      icon={<Key className="w-4 h-4" />}
                      placeholder="请输入当前密码"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 新密码 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    新密码 *
                  </label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      disabled={changingPassword}
                      icon={<Key className="w-4 h-4" />}
                      placeholder="至少8位字符"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 确认新密码 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    确认新密码 *
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      disabled={changingPassword}
                      icon={<Key className="w-4 h-4" />}
                      placeholder="请再次输入新密码"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  loading={changingPassword}
                >
                  {changingPassword ? '修改中...' : '修改密码'}
                </Button>
              </div>
            </form>
          </motion.div>

          {/* 账户信息卡片 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-50 rounded-xl border border-gray-200 p-6"
          >
            <h3 className="font-medium text-gray-900 mb-4">账户信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">角色：</span>
                <span className="font-medium text-gray-900">
                  {profile?.role === 'service_admin' && '服务商管理员'}
                  {profile?.role === 'service_engineer' && '服务商工程师'}
                  {profile?.role === 'end_admin' && '客户管理员'}
                  {profile?.role === 'end_engineer' && '客户工程师'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">账户状态：</span>
                <span className={`font-medium ${
                  profile?.status === 'active' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {profile?.status === 'active' ? '正常' : '已停用'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">注册时间：</span>
                <span className="font-medium">
                  {profile?.created_at && new Date(profile.created_at).toLocaleDateString('zh-CN')}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}