'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, MapPin, Calendar, ChevronRight, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { getCategoryLabel, getCurrencySymbol } from '@/lib/constants';

interface Trip {
  id: string;
  name: string;
  destination: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
  created_at: string;
}

interface TripRecord {
  id: string;
  amount: string;
  currency: string;
  category: string;
  merchant: string | null;
  note: string | null;
  record_date: string;
  reimbursable: boolean;
}

export function TripPage() {
  const { supabase } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tripRecords, setTripRecords] = useState<TripRecord[]>([]);
  const [editingTrip, setEditingTrip] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [editTripName, setEditTripName] = useState('');
  const [editTripDestination, setEditTripDestination] = useState('');

  // Initialize date on client only
  useEffect(() => {
    setNewStartDate(new Date().toISOString().split('T')[0]);
  }, []);

  const fetchTrips = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTrips(data as Trip[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const fetchTripRecords = useCallback(async (tripId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('records')
      .select('id, amount, currency, category, merchant, note, record_date, reimbursable')
      .eq('trip_id', tripId)
      .order('record_date', { ascending: false });

    if (!error && data) {
      setTripRecords(data as TripRecord[]);
    }
  }, [supabase]);

  useEffect(() => {
    if (selectedTrip) {
      fetchTripRecords(selectedTrip.id);
    }
  }, [selectedTrip, fetchTripRecords]);

  const createTrip = async () => {
    if (!supabase) return;
    if (!newName.trim()) {
      toast.error('请输入出差名称');
      return;
    }
    const { error } = await supabase.from('trips').insert({
      name: newName.trim(),
      destination: newDestination.trim() || null,
      start_date: newStartDate,
      status: 'active',
    });

    if (error) {
      toast.error('创建失败');
    } else {
      toast.success('出差项目已创建');
      setNewName('');
      setNewDestination('');
      setShowCreate(false);
      fetchTrips();
    }
  };

  const completeTrip = async (tripId: string) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('trips')
      .update({ status: 'completed', end_date: new Date().toISOString().split('T')[0] })
      .eq('id', tripId);

    if (!error) {
      toast.success('已标记为完成');
      fetchTrips();
      if (selectedTrip?.id === tripId) {
        setSelectedTrip(null);
      }
    }
  };

  const deleteTrip = async (tripId: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('trips').delete().eq('id', tripId);
    if (!error) {
      toast.success('已删除');
      fetchTrips();
      if (selectedTrip?.id === tripId) {
        setSelectedTrip(null);
      }
    }
  };

  const startEditTrip = (trip: Trip) => {
    setEditingTrip(trip.id);
    setEditName(trip.name);
    setEditDestination(trip.destination || '');
  };

  const cancelEditTrip = () => {
    setEditingTrip(null);
    setEditName('');
    setEditDestination('');
  };

  const saveTripEdit = async (tripId: string) => {
    if (!supabase || !editName.trim()) {
      toast.error(editName.trim() ? '' : '名称不能为空');
      if (!editName.trim()) toast.error('名称不能为空');
      return;
    }
    const { error } = await supabase
      .from('trips')
      .update({ name: editName.trim(), destination: editDestination.trim() || null })
      .eq('id', tripId);
    if (!error) {
      toast.success('已保存');
      setEditingTrip(null);
      fetchTrips();
      if (selectedTrip?.id === tripId) {
        setSelectedTrip(null);
        setTimeout(() => fetchTripRecords(tripId), 100);
      }
    } else {
      toast.error('保存失败');
    }
  };

  const startEditTripDetail = () => {
    setIsEditingTrip(true);
    setEditTripName(selectedTrip?.name || '');
    setEditTripDestination(selectedTrip?.destination || '');
  };

  const cancelEditTripDetail = () => {
    setIsEditingTrip(false);
  };

  const saveTripDetail = async () => {
    if (!supabase || !editTripName.trim() || !selectedTrip) {
      if (!editTripName.trim()) toast.error('名称不能为空');
      return;
    }
    const { error } = await supabase
      .from('trips')
      .update({ name: editTripName.trim(), destination: editTripDestination.trim() || null })
      .eq('id', selectedTrip.id);
    if (!error) {
      toast.success('已保存');
      setIsEditingTrip(false);
      setSelectedTrip({ ...selectedTrip, name: editTripName.trim(), destination: editTripDestination.trim() || null });
      fetchTrips();
    } else {
      toast.error('保存失败');
    }
  };

  const totalAmount = tripRecords.reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);
  const reimbursableAmount = tripRecords.filter(r => r.reimbursable).reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);

  // Trip Detail View
  if (selectedTrip) {
    return (
      <div className="px-5 pt-14">
        <button
          onClick={() => setSelectedTrip(null)}
          className="mb-4 flex items-center gap-1 text-sm text-[#86868B]"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
          返回出差列表
        </button>

        <h1 className="mb-2 text-[24px] font-semibold tracking-tight text-[#1D1D1F]">
          {selectedTrip.name}
        </h1>
        {selectedTrip.destination && (
          <div className="mb-1 flex items-center gap-1 text-sm text-[#86868B]">
            <MapPin className="h-3.5 w-3.5" />
            {selectedTrip.destination}
          </div>
        )}
        <div className="mb-5 flex items-center gap-1 text-sm text-[#86868B]">
          <Calendar className="h-3.5 w-3.5" />
          {selectedTrip.start_date}
          {selectedTrip.end_date && ` → ${selectedTrip.end_date}`}
        </div>

        {/* Summary */}
        <div className="mb-5 flex gap-3">
          <div className="flex-1 rounded-xl bg-white p-4 shadow-sm">
            <div className="text-xs text-[#86868B]">总支出</div>
            <div className="mt-1 text-xl font-bold text-[#1D1D1F]">¥{totalAmount.toFixed(2)}</div>
            <div className="mt-0.5 text-xs text-[#86868B]">{tripRecords.length} 笔</div>
          </div>
          <div className="flex-1 rounded-xl bg-white p-4 shadow-sm">
            <div className="text-xs text-[#86868B]">可报销</div>
            <div className="mt-1 text-xl font-bold text-[#34C759]">¥{reimbursableAmount.toFixed(2)}</div>
          </div>
        </div>

        {/* Records */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <span className="mb-3 block text-xs font-medium text-[#86868B]">花费明细</span>
          <div className="divide-y divide-[#F5F5F7]">
            {tripRecords.map((record) => (
              <div key={record.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium text-[#1D1D1F]">
                    {record.merchant || getCategoryLabel(record.category)}
                  </div>
                  <div className="mt-0.5 text-xs text-[#86868B]">
                    {record.record_date} · {getCategoryLabel(record.category)}
                    {record.reimbursable && ' · 可报销'}
                  </div>
                </div>
                <div className="text-sm font-semibold text-[#1D1D1F]">
                  {getCurrencySymbol(record.currency)}{parseFloat(record.amount).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          {tripRecords.length === 0 && (
            <p className="py-8 text-center text-sm text-[#86868B]">暂无记录</p>
          )}
        </div>

        <div className="mt-4 flex gap-3">
          <Button
            onClick={() => completeTrip(selectedTrip.id)}
            variant="outline"
            className="flex-1 rounded-xl border-[#E5E5EA] text-sm"
          >
            标记完成
          </Button>
          <Button
            onClick={() => deleteTrip(selectedTrip.id)}
            variant="outline"
            className="rounded-xl border-[#FF3B30] text-sm text-[#FF3B30] hover:bg-[#FF3B30]/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-8" />
      </div>
    );
  }

  // Trip List View
  return (
    <div className="px-5 pt-14">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[28px] font-semibold tracking-tight text-[#1D1D1F]">出差</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1D1D1F] text-white shadow-sm transition-all active:scale-95"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Create Trip Form */}
      {showCreate && (
        <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#86868B]">出差名称</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="如：东京出差"
                className="h-11 rounded-xl border-[#E5E5EA] bg-[#F5F5F7] text-sm placeholder:text-[#C7C7CC]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#86868B]">目的地</label>
              <Input
                value={newDestination}
                onChange={(e) => setNewDestination(e.target.value)}
                placeholder="如：日本东京"
                className="h-11 rounded-xl border-[#E5E5EA] bg-[#F5F5F7] text-sm placeholder:text-[#C7C7CC]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#86868B]">开始日期</label>
              <Input
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                className="h-11 rounded-xl border-[#E5E5EA] bg-[#F5F5F7] text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowCreate(false)}
              variant="outline"
              className="flex-1 rounded-xl border-[#E5E5EA]"
            >
              取消
            </Button>
            <Button
              onClick={createTrip}
              className="flex-1 rounded-xl bg-[#1D1D1F] text-white hover:bg-black"
            >
              创建
            </Button>
          </div>
        </div>
      )}

      {/* Trip List */}
      <div className="space-y-3">
        {trips.map((trip) => (
          <button
            key={trip.id}
            onClick={() => setSelectedTrip(trip)}
            className="w-full rounded-2xl bg-white p-4 text-left shadow-sm transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-semibold text-[#1D1D1F]">{trip.name}</div>
                {trip.destination && (
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-[#86868B]">
                    <MapPin className="h-3 w-3" />
                    {trip.destination}
                  </div>
                )}
                <div className="mt-0.5 text-xs text-[#86868B]">
                  {trip.start_date}
                  {trip.status === 'completed' && ' · 已完成'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                  trip.status === 'active'
                    ? 'bg-[#34C759]/10 text-[#34C759]'
                    : 'bg-[#F5F5F7] text-[#86868B]'
                }`}>
                  {trip.status === 'active' ? '进行中' : '已完成'}
                </span>
                <ChevronRight className="h-4 w-4 text-[#C7C7CC]" />
              </div>
            </div>
          </button>
        ))}

        {trips.length === 0 && !loading && (
          <div className="py-16 text-center">
            <PlaneIcon className="mx-auto mb-3 h-12 w-12 text-[#C7C7CC]" />
            <p className="text-sm text-[#86868B]">暂无出差项目</p>
            <p className="mt-1 text-xs text-[#C7C7CC]">点击右上角 + 创建</p>
          </div>
        )}
      </div>

      <div className="h-8" />
    </div>
  );
}

function PlaneIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
    </svg>
  );
}
