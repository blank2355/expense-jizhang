'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Convert username to internal email format for Supabase Auth
function usernameToEmail(username: string): string {
  return `${username.toLowerCase().trim()}@expense.app`;
}

export function AuthForm() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const email = usernameToEmail(username);
    const fn = isSignUp ? signUp : signIn;
    const result = await fn(email, password);

    if (result.error) {
      // Translate common Supabase errors to user-friendly Chinese
      let msg = result.error;
      if (msg.includes('User already registered')) {
        msg = '用户名已被注册';
      } else if (msg.includes('Invalid login credentials')) {
        msg = '用户名或密码错误';
      } else if (msg.includes('Password should be')) {
        msg = '密码至少需要6位';
      } else if (msg.includes('Email not confirmed')) {
        msg = '账户未验证，请稍后重试';
      }
      setError(msg);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F7] px-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[22px] bg-[#1D1D1F] shadow-lg">
            <span className="text-4xl font-bold text-white">¥</span>
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[#1D1D1F]">记账助手</h1>
          <p className="mt-1 text-sm text-[#86868B]">出差 & 日常，轻松记账</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="text"
            placeholder="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            className="h-12 rounded-xl border-[#E5E5EA] bg-white text-base placeholder:text-[#C7C7CC]"
          />
          <Input
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            className="h-12 rounded-xl border-[#E5E5EA] bg-white text-base placeholder:text-[#C7C7CC]"
          />

          {error && (
            <p className="rounded-lg bg-[#FF3B30]/10 p-3 text-center text-sm text-[#FF3B30]">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-[#1D1D1F] text-base font-semibold text-white hover:bg-black disabled:opacity-40"
          >
            {loading ? '请稍候...' : isSignUp ? '注册' : '登录'}
          </Button>
        </form>

        <button
          onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
          className="mt-5 w-full text-center text-sm text-[#86868B]"
        >
          {isSignUp ? '已有账户？登录' : '没有账户？注册'}
        </button>
      </div>
    </div>
  );
}
