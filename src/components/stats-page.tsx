'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { CATEGORIES, PAYMENT_METHODS, CURRENCIES, getCategoryLabel, getCurrencySymbol, getPaymentMethodLabel } from '@/lib/constants';
import { ChevronLeft, ChevronRight, TrendingUp, Download, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface RecordItem {
  id: string;
  amount: string;
  currency: string;
  category: string;
  type: string;
  merchant: string | null;
  note: string | null;
  record_date: string;
  record_time: string | null;
  reimbursable: boolean;
  payment_method?: string | null;
}

interface CategoryStat {
  category: string;
  total: number;
  count: number;
}

export function StatsPage() {
  const { supabase } = useAuth();
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Edit modal state
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    category: '',
    merchant: '',
    paymentMethod: '',
    note: '',
    recordDate: '',
    recordTime: '',
    reimbursable: false,
    type: 'daily' as 'daily' | 'business',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  const year = currentDate?.getFullYear() ?? 2026;
  const month = currentDate?.getMonth() ?? 0;

  const fetchRecords = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);

    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = month === 11
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 2).padStart(2, '0')}-01`;

    const { data, error } = await supabase
      .from('records')
      .select('id, amount, currency, category, type, merchant, note, record_date, record_time, reimbursable, payment_method')
      .gte('record_date', startDate)
      .lt('record_date', endDate)
      .order('record_date', { ascending: false })
      .order('record_time', { ascending: false });

    if (error) {
      console.error('Fetch records error:', error);
    } else {
      setRecords((data as RecordItem[]) || []);
    }
    setLoading(false);
  }, [supabase, year, month]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const totalAmount = records.reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);

  const categoryStats: CategoryStat[] = Object.entries(
    records.reduce<Record<string, { total: number; count: number }>>((acc, r) => {
      const cat = r.category;
      if (!acc[cat]) acc[cat] = { total: 0, count: 0 };
      acc[cat].total += parseFloat(r.amount || '0');
      acc[cat].count += 1;
      return acc;
    }, {})
  )
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.total - a.total);

  const filteredRecords = selectedCategory
    ? records.filter(r => r.category === selectedCategory)
    : records;

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => {
    const now = new Date();
    if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth())) {
      setCurrentDate(new Date(year, month + 1, 1));
    }
  };
  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth();

  const monthLabel = `${year}年${month + 1}月`;

  // Open edit modal
  const openEditModal = (record: RecordItem) => {
    setEditingRecord(record);
    setEditForm({
      amount: record.amount,
      category: record.category,
      merchant: record.merchant || '',
      paymentMethod: record.payment_method || 'wechat',
      note: record.note || '',
      recordDate: record.record_date,
      recordTime: record.record_time || '',
      reimbursable: record.reimbursable,
      type: (record.type as 'daily' | 'business') || 'daily',
    });
    setShowDeleteConfirm(false);
  };

  // Close edit modal
  const closeEditModal = () => {
    setEditingRecord(null);
    setShowDeleteConfirm(false);
  };

  // Save edited record
  const handleSave = async () => {
    if (!supabase || !editingRecord) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('records')
        .update({
          amount: editForm.amount,
          category: editForm.category,
          merchant: editForm.merchant || null,
          payment_method: editForm.paymentMethod,
          note: editForm.note || null,
          record_date: editForm.recordDate,
          record_time: editForm.recordTime || null,
          reimbursable: editForm.reimbursable,
          type: editForm.type,
        })
        .eq('id', editingRecord.id);

      if (error) {
        toast.error('保存失败');
      } else {
        toast.success('保存成功');
        closeEditModal();
        fetchRecords();
      }
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // Delete record
  const handleDelete = async () => {
    if (!supabase || !editingRecord) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('records')
        .delete()
        .eq('id', editingRecord.id);

      if (error) {
        toast.error('删除失败');
      } else {
        toast.success('已删除');
        closeEditModal();
        fetchRecords();
      }
    } catch {
      toast.error('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  // Export CSV
  const exportCSV = () => {
    const BOM = '\uFEFF';
    const header = '日期,时间,分类,金额,币种,商家,支付方式,备注,类型,是否可报销';
    const rows = records.map(r =>
      [
        r.record_date,
        r.record_time || '',
        getCategoryLabel(r.category),
        parseFloat(r.amount).toFixed(2),
        r.currency,
        r.merchant || '',
        r.payment_method ? getPaymentMethodLabel(r.payment_method) : '',
        (r.note || '').replace(/,/g, '，'),
        r.type === 'business' ? '出差' : '日常',
        r.reimbursable ? '是' : '否',
      ].join(',')
    );
    const csv = BOM + header + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `记账记录_${year}年${month + 1}月.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('导出成功');
  };

  return (
    <div className="px-5 pt-14">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[28px] font-semibold tracking-tight text-[#1D1D1F]">统计</h1>
        {records.length > 0 && (
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#1D1D1F] shadow-sm transition-colors active:bg-[#F5F5F7]"
          >
            <Download className="h-3.5 w-3.5" />
            导出
          </button>
        )}
      </div>

      {/* Month Navigation */}
      <div className="mb-5 flex items-center justify-between">
        <button onClick={prevMonth} className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
          <ChevronLeft className="h-5 w-5 text-[#1D1D1F]" />
        </button>
        <span className="text-base font-semibold text-[#1D1D1F]">{monthLabel}</span>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className={`flex h-9 w-9 items-center justify-center rounded-full shadow-sm ${
            isCurrentMonth ? 'bg-[#F5F5F7] text-[#C7C7CC]' : 'bg-white text-[#1D1D1F]'
          }`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Total Card */}
      <div className="mb-5 rounded-2xl bg-[#1D1D1F] p-5 text-white">
        <div className="flex items-center gap-2 text-white/60">
          <TrendingUp className="h-4 w-4" />
          <span className="text-xs font-medium">本月支出</span>
        </div>
        <div className="mt-2 font-bold tracking-tight" style={{ fontSize: '36px' }}>
          ¥{totalAmount.toFixed(2)}
        </div>
        <div className="mt-1 text-xs text-white/50">
          共 {records.length} 笔记录
        </div>
      </div>

      {/* Category Stats */}
      <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium text-[#86868B]">分类概览</span>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-xs text-[#86868B] underline"
            >
              查看全部
            </button>
          )}
        </div>

        <div className="space-y-3">
          {categoryStats.map((stat) => {
            const percentage = totalAmount > 0 ? (stat.total / totalAmount) * 100 : 0;
            const isSelected = selectedCategory === stat.category;

            return (
              <button
                key={stat.category}
                onClick={() => setSelectedCategory(isSelected ? null : stat.category)}
                className={`w-full rounded-xl p-3 text-left transition-all ${
                  isSelected ? 'bg-[#F5F5F7] ring-1 ring-[#1D1D1F]' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#1D1D1F]">
                      {getCategoryLabel(stat.category)}
                    </span>
                    <span className="text-xs text-[#86868B]">{stat.count}笔</span>
                  </div>
                  <span className="text-sm font-semibold text-[#1D1D1F]">
                    ¥{stat.total.toFixed(2)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F5F5F7]">
                  <div
                    className="h-full rounded-full bg-[#1D1D1F] transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {categoryStats.length === 0 && !loading && (
          <p className="py-8 text-center text-sm text-[#86868B]">暂无记录</p>
        )}
      </div>

      {/* Records List */}
      <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm">
        <span className="mb-3 block text-xs font-medium text-[#86868B]">
          {selectedCategory ? `${getCategoryLabel(selectedCategory)} 明细` : '近期记录'}
        </span>
        <div className="divide-y divide-[#F5F5F7]">
          {filteredRecords.slice(0, 50).map((record) => (
            <button
              key={record.id}
              onClick={() => openEditModal(record)}
              className="flex w-full items-center justify-between py-3 text-left transition-colors active:bg-[#F5F5F7]"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[#1D1D1F]">
                  {record.merchant || getCategoryLabel(record.category)}
                </div>
                <div className="mt-0.5 text-xs text-[#86868B]">
                  {record.record_date}
                  {record.record_time && ` ${record.record_time}`}
                  {record.type === 'business' && ' · 出差'}
                  {record.reimbursable && ' · 可报销'}
                  {record.payment_method && ` · ${getPaymentMethodLabel(record.payment_method)}`}
                </div>
              </div>
              <div className="ml-3 flex-shrink-0 text-right">
                <div className="text-sm font-semibold text-[#1D1D1F]">
                  {getCurrencySymbol(record.currency)}{parseFloat(record.amount).toFixed(2)}
                </div>
                <div className="mt-0.5 text-xs text-[#86868B]">
                  {getCategoryLabel(record.category)}
                </div>
              </div>
            </button>
          ))}
        </div>
        {filteredRecords.length === 0 && !loading && (
          <p className="py-8 text-center text-sm text-[#86868B]">暂无记录</p>
        )}
      </div>

      <div className="h-4" />

      {/* Edit Modal - Bottom Sheet */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 transition-opacity"
            onClick={closeEditModal}
          />
          {/* Sheet */}
          <div className="relative z-10 w-full max-w-[480px] rounded-t-2xl bg-white px-5 pb-8 pt-4 shadow-xl" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            {/* Handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#E5E5EA]" />

            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#1D1D1F]">编辑记录</h2>
              <button onClick={closeEditModal} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5F5F7]">
                <X className="h-4 w-4 text-[#86868B]" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Amount */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#86868B]">金额</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  className="w-full rounded-xl border border-[#E5E5EA] px-3 py-2.5 text-base font-semibold text-[#1D1D1F] outline-none focus:border-[#1D1D1F] focus:ring-1 focus:ring-[#1D1D1F]"
                />
              </div>

              {/* Category */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#86868B]">分类</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setEditForm({ ...editForm, category: cat.id })}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        editForm.category === cat.id
                          ? 'bg-[#1D1D1F] text-white'
                          : 'bg-[#F5F5F7] text-[#86868B]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Merchant */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#86868B]">商家</label>
                <input
                  type="text"
                  value={editForm.merchant}
                  onChange={(e) => setEditForm({ ...editForm, merchant: e.target.value })}
                  placeholder="商家名称"
                  className="w-full rounded-xl border border-[#E5E5EA] px-3 py-2.5 text-sm text-[#1D1D1F] outline-none placeholder:text-[#C7C7CC] focus:border-[#1D1D1F] focus:ring-1 focus:ring-[#1D1D1F]"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#86868B]">支付方式</label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_METHODS.map((pm) => (
                    <button
                      key={pm.id}
                      onClick={() => setEditForm({ ...editForm, paymentMethod: pm.id })}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        editForm.paymentMethod === pm.id
                          ? 'bg-[#1D1D1F] text-white'
                          : 'bg-[#F5F5F7] text-[#86868B]'
                      }`}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Time */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-medium text-[#86868B]">日期</label>
                  <input
                    type="date"
                    value={editForm.recordDate}
                    onChange={(e) => setEditForm({ ...editForm, recordDate: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E5EA] px-3 py-2.5 text-sm text-[#1D1D1F] outline-none focus:border-[#1D1D1F] focus:ring-1 focus:ring-[#1D1D1F]"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-medium text-[#86868B]">时间</label>
                  <input
                    type="time"
                    value={editForm.recordTime}
                    onChange={(e) => setEditForm({ ...editForm, recordTime: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E5EA] px-3 py-2.5 text-sm text-[#1D1D1F] outline-none focus:border-[#1D1D1F] focus:ring-1 focus:ring-[#1D1D1F]"
                  />
                </div>
              </div>

              {/* Type & Reimbursable */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-medium text-[#86868B]">类型</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditForm({ ...editForm, type: 'daily' })}
                      className={`flex-1 rounded-xl py-2 text-xs font-medium transition-colors ${
                        editForm.type === 'daily'
                          ? 'bg-[#1D1D1F] text-white'
                          : 'bg-[#F5F5F7] text-[#86868B]'
                      }`}
                    >
                      日常
                    </button>
                    <button
                      onClick={() => setEditForm({ ...editForm, type: 'business' })}
                      className={`flex-1 rounded-xl py-2 text-xs font-medium transition-colors ${
                        editForm.type === 'business'
                          ? 'bg-[#1D1D1F] text-white'
                          : 'bg-[#F5F5F7] text-[#86868B]'
                      }`}
                    >
                      出差
                    </button>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-medium text-[#86868B]">可报销</label>
                  <button
                    onClick={() => setEditForm({ ...editForm, reimbursable: !editForm.reimbursable })}
                    className={`w-full rounded-xl py-2 text-xs font-medium transition-colors ${
                      editForm.reimbursable
                        ? 'bg-[#34C759] text-white'
                        : 'bg-[#F5F5F7] text-[#86868B]'
                    }`}
                  >
                    {editForm.reimbursable ? '是' : '否'}
                  </button>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#86868B]">备注</label>
                <input
                  type="text"
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  placeholder="备注信息"
                  className="w-full rounded-xl border border-[#E5E5EA] px-3 py-2.5 text-sm text-[#1D1D1F] outline-none placeholder:text-[#C7C7CC] focus:border-[#1D1D1F] focus:ring-1 focus:ring-[#1D1D1F]"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-3">
              {/* Delete Confirm */}
              {showDeleteConfirm ? (
                <div className="rounded-xl border border-[#FF3B30] bg-[#FF3B30]/5 p-4">
                  <p className="mb-3 text-sm font-medium text-[#FF3B30]">确定要删除这条记录吗？删除后无法恢复。</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 rounded-xl bg-[#F5F5F7] py-2.5 text-sm font-medium text-[#86868B]"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 rounded-xl bg-[#FF3B30] py-2.5 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {deleting ? '删除中...' : '确认删除'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#FF3B30]/20 py-2.5 text-sm font-medium text-[#FF3B30] transition-colors active:bg-[#FF3B30]/5"
                >
                  <Trash2 className="h-4 w-4" />
                  删除记录
                </button>
              )}

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-xl bg-[#1D1D1F] py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50 active:bg-[#333]"
              >
                {saving ? '保存中...' : '保存修改'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
