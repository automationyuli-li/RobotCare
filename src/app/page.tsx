// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  LogIn, 
  Sparkles, 
  Shield, 
  Bot,
  UserCog,
  Building2,
  Zap
} from 'lucide-react';
import { RobotLogo } from '@/components/animations/RobotLogo';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDemoTips, setShowDemoTips] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '登录失败');
      }

      setSuccess('登录成功！正在跳转...');
      
      // 根据用户角色自动跳转到对应dashboard
      const { user, organization } = data.data;
      
      // 添加一点延迟让用户看到成功消息
      await new Promise(resolve => setTimeout(resolve, 800));

      router.push('/dashboard');
      
      
    } catch (err: any) {
      console.error('登录错误:', err);
      setError(err.message || '登录过程中发生错误');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: string) => {
    setLoading(true);
    setError('');
    
    try {
      // 这里可以使用预设的演示账户
      const demoAccounts = {
        service_admin: { email: 'admin@robotcare.demo', password: 'demo123' },
        end_admin: { email: 'customer@robotcare.demo', password: 'demo123' },
        engineer: { email: 'engineer@robotcare.demo', password: 'demo123' }
      };
      
      const account = demoAccounts[role as keyof typeof demoAccounts];
      
      setEmail(account.email);
      setPassword(account.password);
      
      // 模拟登录流程
      setTimeout(() => {
        setSuccess(`正在以${getRoleName(role)}身份登录...`);
        setTimeout(() => {
          // 根据角色跳转
          if (role === 'service_admin') {
            router.push('/service-provider/dashboard');
          } else if (role === 'end_admin') {
            router.push('/end-customer/dashboard');
          } else {
            router.push('/active/engineer');
          }
        }, 800);
      }, 500);
      
    } catch (error) {
      setError('演示登录失败');
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'service_admin': return '服务商管理员';
      case 'end_admin': return '终端客户管理员';
      case 'engineer': return '工程师';
      default: return '用户';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-green-50/30">
      {/* 背景装饰元素 */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-blue-200/20 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-green-200/20 rounded-full blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
            delay: 5
          }}
        />
        
        {/* 浮动的小机器人 */}
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="absolute text-3xl opacity-10"
            initial={{
              x: isClient ? Math.random() * window.innerWidth : 0,
              y: isClient ? Math.random() * window.innerHeight : 0,
            }}
            animate={{
              y: [null, -50, 0],
              rotate: [0, 10, -10, 0],
            }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5
            }}
          >
            🤖
          </motion.div>
        ))}
      </div>

      {/* 主登录卡片 */}
      <div className="relative min-h-screen flex flex-col items-center justify-center p-6">
        {/* 头部品牌区 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center space-x-4 mb-6">
            <RobotLogo />
            <div className="text-left">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-500 
                           bg-clip-text text-transparent">
                RobotCare
              </h1>
              <p className="text-gray-600 text-sm mt-1 flex items-center">
                <Sparkles className="w-4 h-4 mr-1 text-amber-500" />
                让每一台机器人拥有可延续的"数字生命"
              </p>
            </div>
          </div>
        </motion.div>

        {/* 登录卡片 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl 
                        border border-white/50 overflow-hidden">
            {/* 渐变头部 */}
            <div className="bg-gradient-to-r from-blue-500/10 via-blue-400/10 to-green-500/10 
                          p-8 border-b border-gray-200/30">
              <h2 className="text-2xl font-bold text-gray-900 text-center">
                欢迎回来 <motion.span
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-block"
                >
                  👋
                </motion.span>
              </h2>
              <p className="text-gray-600 text-center mt-2 text-sm">
                基于组织的智能权限识别，自动跳转至对应工作台
              </p>
            </div>

            {/* 表单区域 */}
            <div className="p-8">
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-red-100 flex items-center 
                                    justify-center mt-0.5">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      </div>
                      <div className="flex-1">
                        <p className="text-red-700 font-medium">登录失败</p>
                        <p className="text-red-600 text-sm mt-1">{error}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center 
                                    justify-center mt-0.5">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      </div>
                      <div>
                        <p className="text-green-700 font-medium">登录成功</p>
                        <p className="text-green-600 text-sm mt-1">{success}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  icon={<Mail className="w-4 h-4" />}
                  label="邮箱地址"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  variant="filled"
                  disabled={loading}
                />

                <Input
                  icon={<Lock className="w-4 h-4" />}
                  label="密码"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  variant="filled"
                  disabled={loading}
                />

                <Button
                  type="submit"
                  loading={loading}
                  fullWidth
                  icon={<LogIn className="w-5 h-5" />}
                  className="group"
                >
                  {loading ? '登录中...' : '登录账户'}
                </Button>
              </form>

              {/* 演示登录选项 */}
              <div className="mt-8">
                <button
                  onClick={() => setShowDemoTips(!showDemoTips)}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 
                           text-gray-600 hover:border-blue-300 hover:text-blue-600 
                           transition-colors text-sm font-medium"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Zap className="w-4 h-4" />
                    <span>快速体验演示账户</span>
                  </div>
                </button>

                <AnimatePresence>
                  {showDemoTips && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 space-y-3 overflow-hidden"
                    >
                      <p className="text-sm text-gray-500 text-center">
                        点击以下角色快速体验不同视角
                      </p>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          onClick={() => handleDemoLogin('service_admin')}
                          disabled={loading}
                          className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 
                                   border border-blue-200 hover:border-blue-300 hover:shadow-md 
                                   transition-all text-center group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 
                                        flex items-center justify-center mx-auto mb-2 group-hover:scale-110 
                                        transition-transform">
                            <UserCog className="w-5 h-5 text-white" />
                          </div>
                          <p className="text-sm font-medium text-gray-900">服务商</p>
                          <p className="text-xs text-gray-500 mt-1">管理员</p>
                        </button>

                        <button
                          onClick={() => handleDemoLogin('end_admin')}
                          disabled={loading}
                          className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 
                                   border border-green-200 hover:border-green-300 hover:shadow-md 
                                   transition-all text-center group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-500 to-green-600 
                                        flex items-center justify-center mx-auto mb-2 group-hover:scale-110 
                                        transition-transform">
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                          <p className="text-sm font-medium text-gray-900">终端客户</p>
                          <p className="text-xs text-gray-500 mt-1">管理员</p>
                        </button>

                        <button
                          onClick={() => handleDemoLogin('engineer')}
                          disabled={loading}
                          className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 
                                   border border-purple-200 hover:border-purple-300 hover:shadow-md 
                                   transition-all text-center group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 
                                        flex items-center justify-center mx-auto mb-2 group-hover:scale-110 
                                        transition-transform">
                            <Bot className="w-5 h-5 text-white" />
                          </div>
                          <p className="text-sm font-medium text-gray-900">工程师</p>
                          <p className="text-xs text-gray-500 mt-1">技术支持</p>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* 底部链接区 */}
            <div className="px-8 py-6 border-t border-gray-200/50 bg-gray-50/50">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-4 text-sm">
                  <a 
                    href="/forgot-password" 
                    className="text-gray-600 hover:text-blue-500 transition-colors 
                             hover:underline decoration-2"
                  >
                    忘记密码？
                  </a>
                  <span className="text-gray-300">•</span>
                  <a 
                    href="/register/service-provider" 
                    className="text-gray-600 hover:text-green-500 transition-colors 
                             hover:underline decoration-2 font-medium"
                  >
                    注册服务商账户
                  </a>
                </div>
                
                <div className="text-xs text-gray-400 space-y-1">
                  <p className="flex items-center justify-center">
                    <Shield className="w-3 h-3 mr-1" />
                    您的数据安全是我们的首要任务
                  </p>
                  <p>由腾讯云提供企业级数据安全保障</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 页面底部信息 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 text-center text-gray-500 text-sm"
        >
          <div className="flex items-center justify-center space-x-6 mb-3">
            {['🔧', '🤖', '⚙️', '📊', '🔍', '💡'].map((emoji, i) => (
              <motion.span
                key={i}
                className="text-lg"
                animate={{ 
                  y: [0, -8, 0],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.2
                }}
              >
                {emoji}
              </motion.span>
            ))}
          </div>
          <p className="text-gray-600 font-medium">RobotCare Vision 1.0</p>
          <p className="text-gray-400 mt-1 text-xs">
            以机器人为中心的维保协作平台 • 智能化角色识别 • 数据驱动决策
          </p>
        </motion.div>
      </div>
    </div>
  );
}