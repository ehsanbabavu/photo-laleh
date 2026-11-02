import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Frame,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  Check,
  Loader2,
  TrendingUp,
  Ruler,
  Wallet,
  BadgeDollarSign
} from 'lucide-react';
import { formatNumber, formatPrice } from '../../utils/formatters';

export interface CanvasSizeRow {
  id: string;
  title: string;
  dimensionsCm: string;
  costPrice: number;
  customerPrice: number;
  note?: string;
  createdAt?: string;
}

interface Props {
  showToast?: (message: string) => void;
}

const emptyForm = {
  title: '',
  dimensionsCm: '',
  costPrice: '',
  customerPrice: '',
  note: ''
};

const priceOf = (value: unknown) => {
  const num = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(num) ? Math.max(0, Math.round(num)) : 0;
};

export const AdminCanvasSizes: React.FC<Props> = ({ showToast }) => {
  const [rows, setRows] = useState<CanvasSizeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/canvas-sizes', { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(data?.error || 'خواندن لیست سایزها ناموفق بود.');
        return;
      }
      setRows(Array.isArray(data.items) ? data.items : []);
      setError(null);
    } catch {
      setError('ارتباط با سرور برقرار نشد.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    const count = rows.length;
    const avgProfit = count
      ? Math.round(
          rows.reduce((sum, row) => sum + (priceOf(row.customerPrice) - priceOf(row.costPrice)), 0) /
            count
        )
      : 0;
    return { count, avgProfit };
  }, [rows]);

  const openCreate = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setFormError(null);
    setModalMode('create');
  };

  const openEdit = (row: CanvasSizeRow) => {
    setForm({
      title: row.title || '',
      dimensionsCm: row.dimensionsCm || '',
      costPrice: String(priceOf(row.costPrice) || ''),
      customerPrice: String(priceOf(row.customerPrice) || ''),
      note: row.note || ''
    });
    setEditingId(row.id);
    setFormError(null);
    setModalMode('edit');
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) return setFormError('اندازه/عنوان سایز را وارد کنید.');
    if (rows.some((row) => row.id !== editingId && row.title.trim() === title)) {
      return setFormError('سایزی با همین عنوان از قبل وجود دارد.');
    }
    const costPrice = priceOf(form.costPrice);
    const customerPrice = priceOf(form.customerPrice);
    if (customerPrice <= 0) return setFormError('قیمت مشتری باید بیشتر از صفر باشد.');
    if (customerPrice < costPrice) {
      return setFormError('قیمت مشتری نباید کمتر از قیمت تمام‌شده باشد.');
    }

    const payload = {
      id: editingId || `cv_${Date.now().toString(36)}`,
      title,
      dimensionsCm: form.dimensionsCm.trim(),
      costPrice,
      customerPrice,
      note: form.note.trim()
    };

    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch('/api/canvas-sizes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setFormError(data?.error || 'ذخیره سایز ناموفق بود.');
        return;
      }
      setRows(Array.isArray(data.items) ? data.items : []);
      setModalMode(null);
      setEditingId(null);
      showToast?.(modalMode === 'create' ? 'سایز جدید ثبت شد' : 'تغییرات سایز ذخیره شد');
    } catch {
      setFormError('ارتباط با سرور برقرار نشد.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/canvas-sizes/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(data?.error || 'حذف سایز ناموفق بود.');
        return;
      }
      setRows(Array.isArray(data.items) ? data.items : rows.filter((row) => row.id !== id));
      setDeletingId(null);
      showToast?.('سایز حذف شد');
    } catch {
      setError('ارتباط با سرور برقرار نشد.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/25">
              <Frame className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                سایز تخته شاسی
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-mono">
                  {formatNumber(totals.count)} سایز
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                اندازه، قیمت تمام‌شده و قیمت مشتری تخته‌شاسی‌ها — افزودن، ویرایش و حذف
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              میانگین سود: {formatPrice(totals.avgProfit)}
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن سایز جدید</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-rose-700 font-bold leading-6">{error}</p>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 flex items-center justify-center gap-2 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-bold">در حال بارگذاری…</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl sm:rounded-3xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Frame className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-700">هنوز سایزی ثبت نشده است</p>
          <p className="text-xs text-slate-500">
            با دکمه «افزودن سایز جدید» اولین اندازه تخته‌شاسی را بسازید.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs">
            <table className="w-full text-right">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[11px] font-black text-slate-500">
                  <th className="px-4 py-3 w-12">#</th>
                  <th className="px-4 py-3">اندازه / عنوان</th>
                  <th className="px-4 py-3">ابعاد</th>
                  <th className="px-4 py-3">قیمت تمام‌شده</th>
                  <th className="px-4 py-3">قیمت مشتری</th>
                  <th className="px-4 py-3">سود</th>
                  <th className="px-4 py-3 w-28">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const cost = priceOf(row.costPrice);
                  const customer = priceOf(row.customerPrice);
                  const profit = customer - cost;
                  return (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">{index + 1}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-black text-slate-900">{row.title}</p>
                        {row.note && <p className="text-[11px] text-slate-400 mt-0.5">{row.note}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 font-mono">
                        {row.dimensionsCm || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-700">{formatPrice(cost)}</td>
                      <td className="px-4 py-3 text-xs font-bold text-emerald-700">{formatPrice(customer)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[11px] font-black px-2 py-1 rounded-lg border ${
                            profit >= 0
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {formatPrice(profit)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="w-8 h-8 rounded-lg text-slate-500 hover:text-sky-700 hover:bg-sky-50 flex items-center justify-center transition-colors cursor-pointer"
                            title="ویرایش"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(row.id)}
                            className="w-8 h-8 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            {rows.map((row) => {
              const cost = priceOf(row.costPrice);
              const customer = priceOf(row.customerPrice);
              return (
                <div key={row.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 truncate">{row.title}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {row.dimensionsCm || '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="w-8 h-8 rounded-lg text-slate-500 hover:text-sky-700 hover:bg-sky-50 flex items-center justify-center cursor-pointer"
                        title="ویرایش"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(row.id)}
                        className="w-8 h-8 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                      <p className="text-[10px] text-slate-500 font-bold">قیمت تمام‌شده</p>
                      <p className="text-xs font-black text-slate-800 mt-0.5">{formatPrice(cost)}</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">
                      <p className="text-[10px] text-emerald-700 font-bold">قیمت مشتری</p>
                      <p className="text-xs font-black text-emerald-800 mt-0.5">{formatPrice(customer)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Delete confirm */}
      {deletingId && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <p className="mt-3 text-sm font-black text-slate-900">حذف این سایز؟</p>
            <p className="mt-1 text-xs text-slate-500 leading-6">
              «{rows.find((row) => row.id === deletingId)?.title}» برای همیشه حذف می‌شود.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(deletingId)}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-70 text-white text-xs font-black cursor-pointer flex items-center justify-center gap-1.5"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / edit modal */}
      {modalMode && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Frame className="w-4 h-4 text-amber-600" />
                {modalMode === 'create' ? 'افزودن سایز تخته شاسی' : 'ویرایش سایز تخته شاسی'}
              </h2>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                aria-label="بستن"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3">
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-black text-slate-600 mb-1">
                  <Frame className="w-3.5 h-3.5 text-amber-600" />
                  اندازه / عنوان <span className="text-rose-500">*</span>
                </label>
                <input
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="مثلاً تخته شاسی ۳۰×۴۰"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-black text-slate-600 mb-1">
                  <Ruler className="w-3.5 h-3.5 text-slate-400" />
                  ابعاد (اختیاری)
                </label>
                <input
                  value={form.dimensionsCm}
                  onChange={(event) => setForm({ ...form, dimensionsCm: event.target.value })}
                  placeholder="مثلاً 30 x 40 cm"
                  dir="ltr"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-amber-500 text-left"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-black text-slate-600 mb-1">
                    <Wallet className="w-3.5 h-3.5 text-slate-400" />
                    قیمت تمام‌شده (تومان)
                  </label>
                  <input
                    value={form.costPrice}
                    onChange={(event) => setForm({ ...form, costPrice: event.target.value })}
                    inputMode="numeric"
                    dir="ltr"
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-amber-500 text-left"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-black text-slate-600 mb-1">
                    <BadgeDollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    قیمت مشتری (تومان)
                  </label>
                  <input
                    value={form.customerPrice}
                    onChange={(event) => setForm({ ...form, customerPrice: event.target.value })}
                    inputMode="numeric"
                    dir="ltr"
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-amber-500 text-left"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-600 mb-1 block">یادداشت (اختیاری)</label>
                <input
                  value={form.note}
                  onChange={(event) => setForm({ ...form, note: event.target.value })}
                  placeholder="مثلاً جنس MDF، روکش مات…"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              {formError && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-rose-700 leading-5">{formError}</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-70 text-white text-xs font-black cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {modalMode === 'create' ? 'ثبت سایز' : 'ذخیره تغییرات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
