'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { LogOut, User, Info, Shield, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface PendingUser {
  user_id: string;
  username: string;
  approved: boolean;
  is_admin: boolean;
  created_at: string;
}

export function SettingsPage() {
  const { user, signOut, isAdmin, supabase } = useAuth();
  const [origin, setOrigin] = useState('');
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (isAdmin && supabase) {
      fetchPendingUsers();
    }
  }, [isAdmin, supabase]);

  const fetchPendingUsers = async () => {
    try {
      const session = (await supabase?.auth.getSession())?.data?.session;
      if (!session) return;
      const response = await fetch('/api/admin/users', {
        headers: { 'x-session': session.access_token },
      });
      const result = await response.json();
      if (response.ok && result.users) {
        setPendingUsers(result.users);
      }
    } catch (err) {
      console.error('Failed to fetch pending users:', err);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const session = (await supabase?.auth.getSession())?.data?.session;
      if (!session) return;
      const response = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session': session.access_token },
        body: JSON.stringify({ targetUserId: userId, approved: true }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || '操作失败');
      }
      toast.success('已批准该用户');
      setPendingUsers(prev => prev.filter(u => u.user_id !== userId));
    } catch (err) {
      toast.error('操作失败，请重试');
      console.error(err);
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const session = (await supabase?.auth.getSession())?.data?.session;
      if (!session) return;
      const response = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session': session.access_token },
        body: JSON.stringify({ targetUserId: userId, approved: false }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || '操作失败');
      }
      toast.success('已拒绝该用户');
      setPendingUsers(prev => prev.filter(u => u.user_id !== userId));
    } catch (err) {
      toast.error('操作失败，请重试');
      console.error(err);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('已退出登录');
  };

  return (
    <div className="px-5 pt-14">
      <h1 className="mb-6 text-[28px] font-semibold tracking-tight text-[#1D1D1F]">设置</h1>

      {/* User Info */}
      <div className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F5F5F7]">
            <User className="h-6 w-6 text-[#86868B]" />
          </div>
          <div>
            <div className="text-base font-semibold text-[#1D1D1F]">
              {user?.email ? user.email.replace('@expense.app', '') : '未登录'}
            </div>
            <div className="mt-0.5 text-sm text-[#86868B]">
              {isAdmin ? '管理员账户' : '个人账户'}
            </div>
          </div>
        </div>
      </div>

      {/* Admin: User Management */}
      {isAdmin && (
        <div className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
          <button
            onClick={() => setShowAdmin(!showAdmin)}
            className="mb-3 flex w-full items-center gap-2"
          >
            <Shield className="h-4 w-4 text-[#FF9500]" />
            <span className="text-sm font-semibold text-[#1D1D1F]">用户管理</span>
            {pendingUsers.length > 0 && (
              <span className="ml-auto rounded-full bg-[#FF3B30] px-2 py-0.5 text-[10px] font-medium text-white">
                {pendingUsers.length}
              </span>
            )}
          </button>

          {showAdmin && (
            <div className="space-y-2">
              {pendingUsers.length === 0 ? (
                <p className="py-3 text-center text-sm text-[#86868B]">暂无待审批用户</p>
              ) : (
                pendingUsers.map((u) => (
                  <div
                    key={u.user_id}
                    className="flex items-center justify-between rounded-xl bg-[#F5F5F7] px-4 py-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-[#1D1D1F]">{u.username}</div>
                      <div className="text-xs text-[#86868B]">
                        {new Date(u.created_at).toLocaleDateString('zh-CN')}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(u.user_id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#34C759]/10 text-[#34C759] transition-colors hover:bg-[#34C759]/20"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleReject(u.user_id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF3B30]/10 text-[#FF3B30] transition-colors hover:bg-[#FF3B30]/20"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Shortcut Guide */}
      <div className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-[#86868B]" />
          <span className="text-sm font-semibold text-[#1D1D1F]">快速记账设置指南</span>
        </div>

        <div className="space-y-4 text-sm text-[#86868B]">
          <div>
            <div className="mb-1 font-medium text-[#1D1D1F]">方式一：背面轻敲 + AI 自动识别（推荐）</div>
            <ol className="list-inside list-decimal space-y-1 text-xs leading-relaxed">
              <li>打开「快捷指令」APP，点右上角 + 新建快捷指令</li>
              <li>搜索并添加动作「截取屏幕图像」</li>
              <li>搜索并添加动作「获取最新照片」，设为 1 张</li>
              <li>搜索并添加动作「从图像中提取文本」</li>
              <li>搜索并添加动作「对文本进行编码」，选择「百分比编码」</li>
              <li>搜索并添加动作「文本」，输入以下内容，等号后面插入编码后的文本变量：</li>
            </ol>
            <div className="mt-1.5 mb-2 rounded-lg bg-[#1D1D1F] p-2.5">
              <code className="text-xs break-all text-green-400">
                {`${origin}/?quick=1&ocr=`}
              </code>
            </div>
            <ol start={7} className="list-inside list-decimal space-y-1 text-xs leading-relaxed">
              <li>搜索并添加动作「打开 URL」</li>
              <li>给快捷指令起名，如「快速记账」</li>
              <li>前往 设置 → 辅助功能 → 触控 → 背面轻敲 → 选择「快速记账」</li>
            </ol>
            <div className="mt-2 rounded-lg bg-[#F5F5F7] p-2.5 text-xs leading-relaxed text-[#86868B]">
              提示：截屏后 iOS 自动提取文字编码到 URL，打开记账页时 AI 会自动分析填入，无需手动操作
            </div>
          </div>

          <div>
            <div className="mb-1 font-medium text-[#1D1D1F]">方式二：添加到主屏幕</div>
            <ol className="list-inside list-decimal space-y-1 text-xs leading-relaxed">
              <li>在 Safari 中打开本页面</li>
              <li>点击底部分享按钮（方框+上箭头）</li>
              <li>向下滚动，选择「添加到主屏幕」</li>
              <li>点击「添加」，桌面即可看到记账图标</li>
            </ol>
          </div>

          <div>
            <div className="mb-1 font-medium text-[#1D1D1F]">方式三：APP 内识别截图</div>
            <p className="text-xs leading-relaxed">
              在记账页面点击右上角相机图标，可直接拍照或从相册选择支付截图，AI 自动识别填入。
            </p>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="mb-5 rounded-2xl bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <span className="text-sm text-[#1D1D1F]">版本</span>
          <span className="text-sm text-[#86868B]">1.8.1</span>
        </div>
      </div>

      {/* Sign Out */}
      <Button
        onClick={handleSignOut}
        variant="outline"
        className="h-12 w-full rounded-2xl border-[#FF3B30] text-sm font-medium text-[#FF3B30] hover:bg-[#FF3B30]/10"
      >
        <LogOut className="mr-2 h-4 w-4" />
        退出登录
      </Button>

      <div className="h-8" />
    </div>
  );
}
