// src/components/auth/RegistrationSuccess.tsx
'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Mail, User, Shield } from 'lucide-react';

interface RegistrationSuccessProps {
  organizationName: string;
  adminEmail: string;
  adminName: string;
  plan: string;
  nextAction?: string;
}

export function RegistrationSuccess({
  organizationName,
  adminEmail,
  adminName,
  plan,
  nextAction = '登录'
}: RegistrationSuccessProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl border border-gray-200 p-8 text-center"
    >
      {/* 成功图标 */}
      <div className="w-20 h-20 bg-gradient-to-r from-green-100 to-green-50 rounded-full 
                    flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-green-500" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        注册成功！ 🎉
      </h2>
      
      <p className="text-gray-600 mb-8">
        您的服务商账户已创建成功，请查收确认邮件并登录系统。
      </p>

      {/* 注册信息摘要 */}
      <div className="bg-gray-50 rounded-xl p-6 mb-8">
        <h3 className="font-medium text-gray-900 mb-4">注册信息摘要</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-left">
            <p className="text-sm text-gray-500 mb-1">组织名称</p>
            <p className="font-medium text-gray-900 flex items-center">
              <User className="w-4 h-4 mr-2 text-blue-500" />
              {organizationName}
            </p>
          </div>
          
          <div className="text-left">
            <p className="text-sm text-gray-500 mb-1">管理员邮箱</p>
            <p className="font-medium text-gray-900 flex items-center">
              <Mail className="w-4 h-4 mr-2 text-green-500" />
              {adminEmail}
            </p>
          </div>
          
          <div className="text-left">
            <p className="text-sm text-gray-500 mb-1">管理员名称</p>
            <p className="font-medium text-gray-900">{adminName}</p>
          </div>
          
          <div className="text-left">
            <p className="text-sm text-gray-500 mb-1">所选套餐</p>
            <p className="font-medium text-gray-900 flex items-center">
              <Shield className="w-4 h-4 mr-2 text-purple-500" />
              {plan}
            </p>
          </div>
        </div>
      </div>

      {/* 后续步骤 */}
      <div className="mb-8">
        <h4 className="font-medium text-gray-900 mb-4">后续步骤</h4>
        <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-6">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 
                          flex items-center justify-center mr-3">
              1
            </div>
            <span className="text-gray-700">查收确认邮件</span>
          </div>
          
          <div className="hidden md:block text-gray-300">→</div>
          
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 
                          flex items-center justify-center mr-3">
              2
            </div>
            <span className="text-gray-700">验证邮箱地址</span>
          </div>
          
          <div className="hidden md:block text-gray-300">→</div>
          
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 
                          flex items-center justify-center mr-3">
              3
            </div>
            <span className="text-gray-700">登录并配置账户</span>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
        <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-green-500 
                         text-white rounded-xl font-medium hover:shadow-lg transition-shadow">
          立即{nextAction}
        </button>
        
        <button className="px-6 py-3 border-2 border-gray-300 text-gray-700 
                         rounded-xl font-medium hover:border-gray-400 transition-colors">
          查看使用指南
        </button>
      </div>
    </motion.div>
  );
}