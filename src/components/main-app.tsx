'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { QuickRecord } from '@/components/quick-record';
import { StatsPage } from '@/components/stats-page';
import { TripPage } from '@/components/trip-page';
import { SettingsPage } from '@/components/settings-page';
import { Receipt, BarChart3, Plane, Settings, Clock } from 'lucide-react';

type Tab = 'record' | 'stats' | 'trip' | 'settings';

const TABS: { id: Tab; label: string; icon: typeof Receipt }[] = [
  { id: 'record', label: '记账', icon: Receipt },
  { id: 'stats', label: '统计', icon: BarChart3 },
  { id: 'trip', label: '出差', icon: Plane },
  { id: 'settings', label: '设置', icon: Settings },
];

export function MainApp() {
  const { approved, profileFetched } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('record');
  const [quickMode, setQuickMode] = useState(false);
  const [ocrText, setOcrText] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('quick') === '1') {
      setQuickMode(true);
      setActiveTab('record');
      
      const ocrParam = params.get('ocr');
      if (ocrParam) {
        try {
          setOcrText(decodeURIComponent(ocrParam));
        } catch {
          setOcrText(ocrParam);
        }
      }
      
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Show pending approval screen (only after profile is fetched to avoid flash)
  const { signOut } = useAuth();

  if (profileFetched && !approved) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F7] px-8">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF9500]/10">
            <Clock className="h-7 w-7 text-[#FF9500]" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-[#1D1D1F]">等待审批</h2>
          <p className="mb-6 text-sm text-[#86868B]">
            您的账号正在等待管理员审批，审批通过后即可正常使用。
          </p>
          <button
            onClick={signOut}
            className="w-full rounded-xl bg-[#1D1D1F] py-3 text-sm font-medium text-white active:scale-[0.98]"
          >
            退出登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F7]">
      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'record' && (
          <QuickRecord
            quickMode={quickMode}
            ocrText={ocrText}
            onQuickModeConsumed={() => {
              setQuickMode(false);
              setOcrText(null);
            }}
          />
        )}
        {activeTab === 'stats' && <StatsPage />}
        {activeTab === 'trip' && <TripPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </div>

      {/* Bottom Tab Bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E5E5EA] bg-white/80 backdrop-blur-xl">
        <div className="flex items-center justify-around pb-[env(safe-area-inset-bottom)]">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-0.5 px-4 py-2 transition-colors ${
                  isActive ? 'text-[#1D1D1F]' : 'text-[#C7C7CC]'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.5} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
