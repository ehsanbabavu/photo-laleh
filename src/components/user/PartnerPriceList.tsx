import React, { useMemo, useState } from 'react';
import {
  Wallet,
  Search,
  Save,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Ruler,
  Loader2,
  ListChecks,
  Info
} from 'lucide-react';
import { CostChangeRequest, PrintDimension, User } from '../../types';
import { formatPrice } from '../../utils/formatters';

interface PartnerPriceListProps {
  user: User;
  dimensions: PrintDimension[];
  requests: CostChangeRequest[];
  onRequestChange: (dimensionId: string, newCost: number) => Promise<boolean>;
  showToast?: (message: string) => void;
}

/** Colleagues can only propose a new cost price — the admin approves it. */
export const PartnerPriceList: React.FC<PartnerPriceListProps> = ({
  user,
  dimensions,
  requests,
  onRequestChange,
  showToast
}) => {
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);

  const myRequests = useMemo(
    () => requests.filter((request) => request.requestedBy === user.id),
    [requests, user.id]
  );

  const pendingByDimension = useMemo(() => {
    const map = new Map<string, CostChangeRequest>();
    myRequests
      .filter((request) => request.status === 'pending')
      .forEach((request) => map.set(request.dimensionId, request));
    return map;
  }, [myRequests]);

  const lastByDimension = useMemo(() => {
    const map = new Map<string, CostChangeRequest>();
    [...myRequests]
      .sort((a, b) => (b.requestedAtTs || 0) - (a.requestedAtTs || 0))
      .forEach((request) => {
        if (!map.has(request.dimensionId)) map.set(request.dimensionId, request);
      });
    return map;
  }, [myRequests]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return dimensions;
    return dimensions.filter(
      (dim) => dim.title.includes(q) || dim.dimensionsCm.includes(q)
    );
  }, [dimensions, query]);

  const startEdit = (dimension: PrintDimension) => {
    setError('');
    setSavedId(null);
    setEditingId(dimension.id);
    setDraftValue(String(Number(dimension.costPrice) || 0));
  };

  const submit = async (dimension: PrintDimension) => {
    const value = Number(draftValue);
    if (!Number.isFinite(value) || value < 0) {
      setError('مبلغ وارد‌شده معتبر نیست.');
      return;
    }
    if (Math.round(value) === (Number(dimension.costPrice) || 0)) {
      setError('مبلغ جدید با قیمت فعلی یکسان است.');
      return;
    }

    setSavingId(dimension.id);
    setError('');
    const ok = await onRequestChange(dimension.id, Math.round(value));
    setSavingId(null);

    if (ok) {
      setEditingId(null);
      setSavedId(dimension.id);
      showToast?.('پیشنهاد قیمت ثبت شد و در انتظار تایید مدیر است.');
      setTimeout(() => setSavedId(null), 4000);
    } else {
      setError('ثبت پیشنهاد قیمت انجام نشد. دوباره تلاش کنید.');
    }
  };

  const statusChip = (dimensionId: string) => {
    const pending = pendingByDimension.get(dimensionId);
    if (pending) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
          <Clock className="w-3 h-3" />
          در انتظار تایید ({formatPrice(pending.newCost)})
        </span>
      );
    }
    const last = lastByDimension.get(dimensionId);
    if (!last) return null;
    if (last.status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
          <CheckCircle2 className="w-3 h-3" />
          آخرین پیشنهاد تایید شد
        </span>
      );
    }
    if (last.status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
          <XCircle className="w-3 h-3" />
          آخرین پیشنهاد رد شد
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/25">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900">لیست قیمت‌ها</h1>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                فقط «هزینه تمام‌شده» قابل ویرایش است؛ تغییرات پس از تایید مدیر اعمال می‌شود
              </p>
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی نام یا سایز محصول"
              className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
          </div>
        </div>

        <div className="mt-3 p-3 rounded-xl bg-sky-50/70 border border-sky-200 flex items-start gap-2">
          <Info className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-sky-900 leading-relaxed">
            مبلغ پیشنهادی شما ابتدا به مدیر ارسال می‌شود و پس از تایید، در فاکتورهای جدید محاسبه
            می‌گردد. تا زمانی که درخواست در انتظار تایید است، قیمت قبلی معتبر است.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[11px] font-bold text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl sm:rounded-3xl p-10 text-center">
          <p className="text-sm font-bold text-slate-700">محصولی یافت نشد</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-right">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[11px] font-black text-slate-600">
                  <th className="px-4 py-3">محصول / سایز</th>
                  <th className="px-4 py-3">ابعاد</th>
                  <th className="px-4 py-3">هزینه تمام‌شده فعلی</th>
                  <th className="px-4 py-3">مبلغ پیشنهادی</th>
                  <th className="px-4 py-3">وضعیت</th>
                  <th className="px-4 py-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((dimension) => {
                  const isEditing = editingId === dimension.id;
                  const cost = Number(dimension.costPrice) || 0;
                  return (
                    <tr key={dimension.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-slate-900">{dimension.title}</p>
                      </td>
                      <td className="px-4 py-3 text-[11px] font-mono text-slate-600" dir="ltr">
                        {dimension.dimensionsCm}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono font-black text-slate-900">
                        {cost > 0 ? formatPrice(cost) : 'ثبت نشده'}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            value={draftValue}
                            onChange={(e) => setDraftValue(e.target.value)}
                            inputMode="numeric"
                            dir="ltr"
                            autoFocus
                            className="w-32 px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white text-xs font-mono text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{statusChip(dimension.id)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => submit(dimension)}
                                disabled={savingId === dimension.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
                              >
                                {savingId === dimension.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Save className="w-3 h-3" />
                                )}
                                ثبت
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(null);
                                  setError('');
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                              >
                                انصراف
                              </button>
                            </>
                          ) : (
                            <>
                              {savedId === dimension.id && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                                  <CheckCircle2 className="w-3 h-3" />
                                  ثبت شد
                                </span>
                              )}
                              <button
                                onClick={() => startEdit(dimension)}
                                disabled={pendingByDimension.has(dimension.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              >
                                <Wallet className="w-3 h-3" />
                                ویرایش هزینه
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filtered.map((dimension) => {
              const isEditing = editingId === dimension.id;
              const cost = Number(dimension.costPrice) || 0;
              return (
                <div key={dimension.id} className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                  <div>
                    <p className="text-xs font-black text-slate-900">{dimension.title}</p>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5 flex items-center gap-1">
                      <Ruler className="w-3 h-3" />
                      {dimension.dimensionsCm}
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] text-slate-600">هزینه تمام‌شده:</span>
                    <span className="font-mono font-black text-xs text-slate-900">
                      {cost > 0 ? formatPrice(cost) : 'ثبت نشده'}
                    </span>
                  </div>

                  {statusChip(dimension.id)}

                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        value={draftValue}
                        onChange={(e) => setDraftValue(e.target.value)}
                        inputMode="numeric"
                        dir="ltr"
                        autoFocus
                        className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white text-xs font-mono text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => submit(dimension)}
                          disabled={savingId === dimension.id}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
                        >
                          {savingId === dimension.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          ثبت پیشنهاد
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setError('');
                          }}
                          className="px-3 py-2 rounded-xl text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                        >
                          انصراف
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(dimension)}
                      disabled={pendingByDimension.has(dimension.id)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      ویرایش هزینه تمام‌شده
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* My recent requests */}
      {myRequests.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5">
          <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
            <ListChecks className="w-4 h-4 text-sky-600" />
            آخرین پیشنهادهای من
          </h3>
          <div className="space-y-1.5">
            {[...myRequests]
              .sort((a, b) => (b.requestedAtTs || 0) - (a.requestedAtTs || 0))
              .slice(0, 8)
              .map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px]"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{request.dimensionTitle}</p>
                    <p className="text-[10px] text-slate-500">{request.requestedAt}</p>
                  </div>
                  <div className="text-left flex-shrink-0">
                    <p className="font-mono text-slate-600">
                      {formatPrice(request.oldCost)} → {formatPrice(request.newCost)}
                    </p>
                    <p
                      className={`text-[10px] font-bold ${
                        request.status === 'approved'
                          ? 'text-emerald-700'
                          : request.status === 'rejected'
                          ? 'text-rose-600'
                          : 'text-amber-700'
                      }`}
                    >
                      {request.status === 'approved'
                        ? 'تایید شد'
                        : request.status === 'rejected'
                        ? 'رد شد'
                        : 'در انتظار تایید'}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
