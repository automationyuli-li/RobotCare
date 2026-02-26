// src/components/layout/Navigation.tsx
'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  Home,
  Users,
  Bot,
  Ticket,
  FileText,
  Settings,
  LogOut,
  ChevronDown,
  User,
  Building,
  Edit,
  Bell,
  Search,
  Wrench,
  Shield,
} from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

    // 安全路径检查函数
  const isActivePath = (path: string): boolean => {
    if (!pathname) return false;
    return pathname.includes(path);
  };

  // 安全路径相等检查
  const isExactPath = (path: string): boolean => {
    if (!pathname) return false;
    return pathname === path;
  };

  // 如果正在加载或用户未登录，不显示导航
  if (loading || !user) return null;

  const isServiceProvider = user.role.includes('service');
  const isAdmin = user.role.includes('admin');
  const isEngineer = user.role.includes('engineer');

  const getDashboardLink = () => {
    //if (isServiceProvider) return '/service-provider/dashboard';
    //if (user.role.includes('end')) return '/end-customer/dashboard';
    //if (isEngineer) return '/active/engineer';
    return '/dashboard';
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include', // 这很重要，会发送cookie
    });
    // 清除前端状态
      router.push('/');
    } catch (error) {
      console.error('Logout navigation failed:', error);
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo 和左侧导航 */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-green-400 
                            flex items-center justify-center mr-3">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">RobotCare</span>
            </Link>

            {/* 主要导航链接 */}
            <div className="hidden md:ml-10 md:flex md:space-x-4">
              <Link
                href={getDashboardLink()}
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                          ${isActivePath('dashboard') 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                <Home className="w-4 h-4 mr-2" />
                仪表盘
              </Link>

              <Link
                href="/robots"
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                          ${pathname === '/robots' || isActivePath('/robots/') 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                <Bot className="w-4 h-4 mr-2" />
                机器人
              </Link>

              {/* 工单链接 - 所有人都可以访问 */}
              <Link
                href="/tickets"
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                          ${isActivePath('tickets') 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                <Wrench className="w-4 h-4 mr-2" />
                工单
              </Link>

              {/* 管理功能 - 仅管理员 */}
              {isAdmin && (
                <>
                  <Link
                    href="/organizations"
                    className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                              ${isActivePath('organizations') 
                                ? 'bg-blue-50 text-blue-700' 
                                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    {isServiceProvider ? '客户' : '服务商'}
                  </Link>

                  <Link
                    href="/team"
                    className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                              ${pathname === '/team' || pathname?.startsWith('/team/') 
                              ? 'bg-blue-50 text-blue-700' 
                              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    团队
                  </Link>

                  <Link
                    href="/knowledge-base"
                    className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                              ${isActivePath('knowledge-base') 
                                ? 'bg-blue-50 text-blue-700' 
                                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    知识库
                  </Link>
                </>
              )}

            </div>
          </div>

          {/* 右侧用户菜单 */}
          <div className="flex items-center space-x-4">
            {/* 通知 */}
            <button className="p-2 text-gray-400 hover:text-gray-500 relative transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* 用户菜单 */}
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center space-x-3 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-green-400 
                              flex items-center justify-center text-white font-semibold">
                  {user?.display_name?.charAt(0) || 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-700">{user?.display_name}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {user?.role?.replace('_', ' ')}
                  </p>
                </div>
                <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* 下拉菜单 */}
              {isMenuOpen && (
                <>
                  {/* 点击外部关闭菜单 */}
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsMenuOpen(false)}
                  />
                  
                  <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-lg py-2 bg-white ring-1 ring-black ring-opacity-5 z-20">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.display_name}</p>
                      <p className="text-xs text-gray-500 truncate mt-1">{user.email}</p>
                      <p className="text-xs text-gray-400 mt-1 capitalize">{user.role.replace('_', ' ')}</p>
                    </div>
                    
                    <div className="py-1">
                      <Link
                        href="/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <User className="w-4 h-4 mr-3 text-gray-400" />
                        个人资料
                      </Link>
                      
                      {isAdmin && (
                      <button
                        onClick={() => {
                          if (user?.org_id) {
                            router.push(`/organizations/${user.org_id}/edit`);
                            console.log('🔗 跳转到:', `/organizations/${user.org_id}/edit`);
                          } else {
                            console.error('组织ID未找到，无法导航到编辑页面');
                          }
                          setIsMenuOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center"
                      >
                        <Edit className="w-4 h-4 mr-3 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">公司信息</p>
                        </div>
                      </button>
                      )}
                      <div className="border-t border-gray-100 my-1"></div>
                      
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4 mr-3" />
                        退出登录
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 移动端菜单 */}
        <div className="md:hidden border-t border-gray-200 mt-2 pt-2">
          <div className="grid grid-cols-4 gap-1 px-1">
            <Link
              href={getDashboardLink()}
              className={`flex flex-col items-center p-2 rounded-lg transition-colors
                        ${isActivePath('dashboard') 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <Home className="w-5 h-5 mb-1" />
              <span className="text-xs">仪表盘</span>
            </Link>
            
            <Link
              href="/robots"
              className={`flex flex-col items-center p-2 rounded-lg transition-colors
                        ${isActivePath('robots') 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <Bot className="w-5 h-5 mb-1" />
              <span className="text-xs">机器人</span>
            </Link>
            
            <Link
              href="/tickets"
              className={`flex flex-col items-center p-2 rounded-lg transition-colors
                        ${isActivePath('tickets') 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <Wrench className="w-5 h-5 mb-1" />
              <span className="text-xs">工单</span>
            </Link>
            
            <Link
              href="/settings"
              className={`flex flex-col items-center p-2 rounded-lg transition-colors
                        ${isActivePath('settings') 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <Settings className="w-5 h-5 mb-1" />
              <span className="text-xs">设置</span>
            </Link>
          </div>
          
          {/* 管理功能移动端 */}
          {isAdmin && (
            <div className="grid grid-cols-3 gap-1 px-1 mt-2">
              <Link
                href="/organizations"
                className={`flex flex-col items-center p-2 rounded-lg transition-colors
                          ${isActivePath('organizations') 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <Users className="w-5 h-5 mb-1" />
                <span className="text-xs">{isServiceProvider ? '客户' : '服务商'}</span>
              </Link>
              
              <Link
                href="/team"
                className={`flex flex-col items-center p-2 rounded-lg transition-colors
                          ${isActivePath('team') 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <Users className="w-5 h-5 mb-1" />
                <span className="text-xs">团队</span>
              </Link>
              
              <Link
                href="/knowledge-base"
                className={`flex flex-col items-center p-2 rounded-lg transition-colors
                          ${isActivePath('knowledge-base') 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <FileText className="w-5 h-5 mb-1" />
                <span className="text-xs">知识库</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}