// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';

interface User {
  _id: string;
  email: string;
  role: string;
  org_id: string;
  display_name: string;
  organization?: {
    _id: string;
    name: string;
    type: string;
    status: string;
  };
}

interface AuthResult {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isServiceProvider: boolean;
  isEndCustomer: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

export function useAuth(): AuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setError('认证检查失败');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
      setError(null);
      
      // 重定向到登录页
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  const refreshAuth = async () => {
    await checkAuth();
  };

  const isServiceProvider = user?.role?.includes('service') || false;
  const isEndCustomer = user?.role?.includes('end') || false;
  const isAdmin = user?.role?.includes('admin') || false;

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isServiceProvider,
    isEndCustomer,
    isAdmin,
    logout,
    refreshAuth,
  };
}