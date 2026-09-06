'use client';

import { useAuth } from '@/components/auth-provider';
import { AuthForm } from '@/components/auth-form';
import { MainApp } from '@/components/main-app';

export default function Home() {
  const { user, loading, profileFetched } = useAuth();

  if (loading || (user && !profileFetched)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F7]">
        <div className="text-sm text-[#86868B]">加载中...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return <MainApp />;
}
