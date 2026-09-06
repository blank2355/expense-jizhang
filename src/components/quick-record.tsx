'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { CATEGORIES, PAYMENT_METHODS, CURRENCIES, getCategoryLabel, getCurrencySymbol } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  UtensilsCrossed, Car, Building2, ShoppingBag, Gamepad2,
  Ticket, Briefcase, MoreHorizontal, Camera, X, Check, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

const ICON_MAP: Record<string, typeof UtensilsCrossed> = {
  UtensilsCrossed, Car, Building2, ShoppingBag, Gamepad2,
  Ticket, Briefcase, MoreHorizontal,
};

interface AIResult {
  amount: string;
  category: string;
  merchant: string;
  paymentMethod: string;
  date: string;
  time: string;
  note: string;
  confidence: number;
}

function QuickRecordInner({ quickMode, onQuickModeConsumed, ocrText }: { quickMode?: boolean; onQuickModeConsumed?: () => void; ocrText?: string }) {
  const searchParams = useSearchParams();
  const { supabase, session } = useAuth();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [recordType, setRecordType] = useState<'daily' | 'business'>('daily');
  const [tripId, setTripId] = useState<string | null>(null);
  const [merchant, setMerchant] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wechat');
  const [currency, setCurrency] = useState('CNY');
  const [note, setNote] = useState('');
  const [recordDate, setRecordDate] = useState('');
  const [recordTime, setRecordTime] = useState('');
  const [reimbursable, setReimbursable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const ocrAnalyzedRef = useRef(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [trips, setTrips] = useState<Array<{ id: string; name: string }>>([]);
  const [showDetails, setShowDetails] = useState(true);

  // Initialize date/time on client only
  useEffect(() => {
    const now = new Date();
    setRecordDate(now.toISOString().split('T')[0]);
    setRecordTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  }, []);

  // Load active trips for business type
  useEffect(() => {
    if (recordType === 'business' && supabase) {
      supabase
        .from('trips')
        .select('id, name')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) {
            setTrips(data);
            if (data.length > 0 && !tripId) {
              setTripId(data[0].id);
            }
          }
        });
    }
  }, [recordType, supabase, tripId]);

  // Check for AI session from URL (from iOS Shortcut)
  useEffect(() => {
    const sessionId = searchParams.get('session');
    if (sessionId) {
      fetchAIResult(sessionId);
    }
  }, [searchParams]);

  // Fill form fields from AI analysis result
  const fillFormFromResult = useCallback((result: Record<string, unknown>) => {
    if (result.amount && typeof result.amount === 'number') {
      setAmount(result.amount.toString());
    }
    if (result.category && typeof result.category === 'string') {
      const match = CATEGORIES.find(c => c.label === result.category);
      if (match) setCategory(match.id);
    }
    if (result.merchant && typeof result.merchant === 'string') {
      setMerchant(result.merchant);
    }
    if (result.paymentMethod && typeof result.paymentMethod === 'string') {
      const match = PAYMENT_METHODS.find(p => p.label === result.paymentMethod);
      if (match) setPaymentMethod(match.id);
    }
    if (result.note && typeof result.note === 'string') {
      setNote(result.note);
    }
    if (result.date && typeof result.date === 'string') {
      setRecordDate(result.date);
    }
    if (result.time && typeof result.time === 'string') {
      setRecordTime(result.time);
    }
  }, []);

  // Handle image upload for AI analysis
  const handleImageUpload = useCallback(async (file: File) => {
    setAiLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
        headers,
      });

      const data = await res.json();
      if (data.result) {
        applyAIResult(data.result);
      }
    } catch {
      toast.error('AI 识别失败，请手动输入');
    } finally {
      setAiLoading(false);
    }
  }, [session]);

  const fetchAIResult = async (sessionId: string) => {
    setAiLoading(true);
    try {
      const res = await fetch(`/api/analyze?session=${sessionId}`);
      const data = await res.json();
      if (data.result) {
        applyAIResult(data.result);
      }
    } catch {
      toast.error('获取识别结果失败');
    } finally {
      setAiLoading(false);
    }
  };

  const applyAIResult = (result: AIResult) => {
    setAiResult(result);
    if (result.amount) setAmount(result.amount);
    if (result.category) {
      const matched = CATEGORIES.find(c => c.label === result.category || c.id === result.category);
      if (matched) setCategory(matched.id);
    }
    if (result.merchant) setMerchant(result.merchant);
    if (result.paymentMethod) {
      const matched = PAYMENT_METHODS.find(p => p.label === result.paymentMethod || p.id === result.paymentMethod);
      if (matched) setPaymentMethod(matched.id);
    }
    if (result.date) setRecordDate(result.date);
    if (result.time) setRecordTime(result.time);
    if (result.note) setNote(result.note);
    toast.success('AI 已识别付款信�?);
  };

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('请输入金�?);
      return;
    }
    if (!supabase) {
      toast.error('系统未就�?);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('records').insert({
        amount: parseFloat(amount).toFixed(2),
        currency,
        category,
        type: recordType,
        trip_id: recordType === 'business' ? tripId : null,
        merchant: merchant || null,
        payment_method: paymentMethod || null,
        note: note || null,
        record_date: recordDate,
        record_time: recordTime || null,
        reimbursable,
      });

      if (error) throw error;

      toast.success('记账成功');
      setAmount('');
      setMerchant('');
      setNote('');
      setAiResult(null);
      const now = new Date();
      setRecordDate(now.toISOString().split('T')[0]);
      setRecordTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    } catch {
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // Quick mode: auto-open album selector when entering from shortcut
  useEffect(() => {
    if (quickMode) {
      const timer = setTimeout(() => {
        handleAlbumSelect();
        onQuickModeConsumed?.();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [quickMode, onQuickModeConsumed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-analyze OCR text from URL parameter (iOS shortcut flow)
  useEffect(() => {
    if (ocrText && !ocrAnalyzedRef.current) {
      ocrAnalyzedRef.current = true;
      analyzeOcrText(ocrText);
    }
  }, [ocrText]); // eslint-disable-line react-hooks/exhaustive-deps

  const analyzeOcrText = async (text: string) => {
    setAnalyzing(true);
    try {
      const response = await fetch('/api/analyze-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      if (data.result) {
        applyAIResult(data.result);
      } else {
        console.error('[OCR] API response:', data); toast.error(data.error || 'AI ʶ��ʧ�ܣ����ֶ�����'); console.log('[OCR] ocrText:', ocrText);
      }
    } catch {
      toast.error('网络错误，请重试');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCameraCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleImageUpload(file);
    };
    input.click();
  };

  const handleAlbumSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleImageUpload(file);
    };
    input.click();
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 pt-10 pb-28">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-[28px] font-semibold tracking-tight text-[#1D1D1F]">记一�?/h1>
          <div className="flex gap-2">
            <button
              onClick={handleAlbumSelect}
              disabled={aiLoading}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition-all active:scale-95"
              title="从相册选择截图"
            >
              <Camera className="h-5 w-5 text-[#86868B]" />
            </button>
          </div>
        </div>

        {/* AI Loading Indicator */}
        {(aiLoading || analyzing) && (
          <div className="mb-3 rounded-xl bg-white p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#1D1D1F] border-t-transparent" />
              <span className="text-sm text-[#86868B]">AI 正在分析...</span>
            </div>
          </div>
        )}

        {/* AI Result Badge */}
        {aiResult && !aiLoading && !analyzing && (
          <div className="mb-3 flex items-center justify-between rounded-xl bg-[#F0FFF4] p-2.5">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-[#34C759]" />
              <span className="text-sm text-[#34C759]">AI 已识别，请确�?/span>
            </div>
            <button onClick={() => setAiResult(null)} className="text-[#86868B]">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Amount Input - compact */}
        <div className="mb-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-semibold text-[#86868B]">{getCurrencySymbol(currency)}</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-[32px] font-bold tracking-tight text-[#1D1D1F] outline-none placeholder:text-[#C7C7CC] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
              className="ml-2 rounded-lg bg-[#F5F5F7] px-2 py-1 text-xs font-medium text-[#86868B]"
            >
              {currency}
            </button>
          </div>

          {showCurrencyPicker && (
            <div className="mt-2 flex flex-wrap gap-1.5 border-t border-[#E5E5EA] pt-2">
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => { setCurrency(c.code); setShowCurrencyPicker(false); }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    currency === c.code
                      ? 'bg-[#1D1D1F] text-white'
                      : 'bg-[#F5F5F7] text-[#86868B]'
                  }`}
                >
                  {c.symbol} {c.code}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Type Toggle: Daily / Business */}
        <div className="mb-3 flex gap-2 rounded-xl bg-white p-1.5 shadow-sm">
          <button
            onClick={() => setRecordType('daily')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              recordType === 'daily'
                ? 'bg-[#1D1D1F] text-white shadow-sm'
                : 'text-[#86868B]'
            }`}
          >
            日常
          </button>
          <button
            onClick={() => setRecordType('business')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              recordType === 'business'
                ? 'bg-[#1D1D1F] text-white shadow-sm'
                : 'text-[#86868B]'
            }`}
          >
            出差
          </button>
        </div>

        {/* Trip Selector (for business type) */}
        {recordType === 'business' && trips.length > 0 && (
          <div className="mb-3 rounded-xl bg-white p-3 shadow-sm">
            <label className="mb-1.5 block text-xs font-medium text-[#86868B]">出差项目</label>
            <select
              value={tripId ?? ''}
              onChange={(e) => setTripId(e.target.value || null)}
              className="w-full rounded-lg border border-[#E5E5EA] bg-[#F5F5F7] p-2 text-sm text-[#1D1D1F] outline-none"
            >
              {trips.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Category Grid - compact */}
        <div className="mb-3 rounded-2xl bg-white p-3 shadow-sm">
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = ICON_MAP[cat.icon] || MoreHorizontal;
              const isActive = category === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`flex flex-col items-center gap-1 rounded-xl py-2 transition-all active:scale-95 ${
                    isActive
                      ? 'bg-[#1D1D1F] text-white'
                      : 'bg-[#F5F5F7] text-[#86868B]'
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                  <span className="text-[10px] font-medium">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Details - collapsible */}
        <div className="rounded-2xl bg-white shadow-sm">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex w-full items-center justify-between p-3"
          >
            <span className="text-xs font-medium text-[#86868B]">更多详情</span>
            {showDetails ? (
              <ChevronUp className="h-4 w-4 text-[#86868B]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[#86868B]" />
            )}
          </button>

          {showDetails && (
            <div className="space-y-3 border-t border-[#E5E5EA] p-3">
              {/* Payment Method */}
              <div>
                <label className="mb-1 block text-xs font-medium text-[#86868B]">支付方式</label>
                <div className="flex flex-wrap gap-1.5">
                  {PAYMENT_METHODS.map((pm) => (
                    <button
                      key={pm.id}
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                        paymentMethod === pm.id
                          ? 'bg-[#1D1D1F] text-white'
                          : 'bg-[#F5F5F7] text-[#86868B]'
                      }`}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Merchant */}
              <div>
                <label className="mb-1 block text-xs font-medium text-[#86868B]">商家</label>
                <Input
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  placeholder="商家名称（可选）"
                  className="h-10 rounded-xl border-[#E5E5EA] bg-[#F5F5F7] text-sm placeholder:text-[#C7C7CC]"
                />
              </div>

              {/* Date & Time */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-[#86868B]">日期</label>
                  <Input
                    type="date"
                    value={recordDate}
                    onChange={(e) => setRecordDate(e.target.value)}
                    className="h-10 rounded-xl border-[#E5E5EA] bg-[#F5F5F7] text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-[#86868B]">时间</label>
                  <Input
                    type="time"
                    value={recordTime}
                    onChange={(e) => setRecordTime(e.target.value)}
                    className="h-10 rounded-xl border-[#E5E5EA] bg-[#F5F5F7] text-sm"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="mb-1 block text-xs font-medium text-[#86868B]">备注</label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="备注（可选）"
                  className="h-10 rounded-xl border-[#E5E5EA] bg-[#F5F5F7] text-sm placeholder:text-[#C7C7CC]"
                />
              </div>

              {/* Reimbursable Toggle (for business) */}
              {recordType === 'business' && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#1D1D1F]">可报销</span>
                  <button
                    onClick={() => setReimbursable(!reimbursable)}
                    className={`relative h-7 w-12 rounded-full transition-colors ${
                      reimbursable ? 'bg-[#34C759]' : 'bg-[#E5E5EA]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                        reimbursable ? 'translate-x-[22px]' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom save button */}
      <div className="fixed inset-x-0 bottom-[70px] z-40 bg-gradient-to-t from-[#F5F5F7] via-[#F5F5F7] to-transparent px-5 pb-2 pt-6">
        <Button
          onClick={handleSave}
          disabled={saving || !amount}
          className="h-12 w-full rounded-2xl bg-[#1D1D1F] text-base font-semibold text-white shadow-sm hover:bg-black active:scale-[0.98] transition-all disabled:opacity-40"
        >
          {saving ? '保存�?..' : '确认记账'}
        </Button>
      </div>
    </div>
  );
}

export function QuickRecord({ quickMode, onQuickModeConsumed, ocrText }: { quickMode?: boolean; onQuickModeConsumed?: () => void; ocrText?: string | null }) {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center"><div className="text-sm text-[#86868B]">加载�?..</div></div>}>
      <QuickRecordInner quickMode={quickMode} onQuickModeConsumed={onQuickModeConsumed} ocrText={ocrText ?? undefined} />
    </Suspense>
  );
}
