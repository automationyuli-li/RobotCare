'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

type VerifyState = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const router = useRouter();
  const params = useParams();
  const token = useMemo(() => (params?.token as string) || '', [params]);

  const [state, setState] = useState<VerifyState>('loading');
  const [message, setMessage] = useState<string>('正在验证邮箱...');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('缺少验证令牌');
      return;
    }

    const run = async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (data?.success) {
          setState('success');
          setMessage(data?.message || '邮箱验证成功，账户已激活');
          return;
        }
        setState('error');
        setMessage(data?.error || data?.message || '验证失败');
      } catch (e) {
        setState('error');
        setMessage('网络错误，请稍后重试');
      }
    };

    run();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-6">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 max-w-md w-full">
        <h1 className="text-xl font-semibold text-gray-900">邮箱验证</h1>
        <p className="mt-3 text-gray-600">{message}</p>

        <div className="mt-6 flex gap-3">
          <Button
            variant="primary"
            onClick={() => router.push('/')}
            disabled={state === 'loading'}
          >
            返回登录
          </Button>
          {state === 'error' && (
            <Button variant="outline" onClick={() => location.reload()}>
              重试
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

