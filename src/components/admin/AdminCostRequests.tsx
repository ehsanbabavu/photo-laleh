import React, { useMemo, useState } from 'react';
import {
  Wallet,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  UserCog,
  Ruler,
  CalendarDays,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { CostChangeRequest } from '../../types';
import { formatPrice } from '../../utils/formatters';

interface AdminCostRequestsProps {
  requests: CostChangeRequest[];
  onReview: (request: CostChangeRequest, action: 'approve' | 'reject') => Promise<boolean> | void;
  showToast?: (message: string) => void;
}

type StatusFilter = 'pending' | 'all' | 'approved' | 'rejected';

/** Admin review queue for cost-price changes proposed by colleagues. */
export const AdminCostRequests: React.FC<AdminCostRequestsProps> = ({
  requests,
  onReview,
  showToast
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const pending = requests.filter((r) => r.status === 'pending').length;
    const approved = requests.filter((r) => r.status === 'approved').length;
    const rejected = requests.filter((r) => r.status === 'rejected').length;
    return { pending, approved, rejected, all: requests.length };
  }, [requests]);

  const filtered = useMemo(() => {
    const q = query.trim();
    return [...requests]
      .filter((r) => (statusFilter === 'all' ? true : r.status === statusFilter))
      .filter((r) =>
        q
          ? r.dimensionTitle.includes(q) ||
            r.dimensionsCm.includes(q) ||
            r.requestedByName.includes(q)
          : true
      )
      .sort((a, b) => (b.requestedAtTs || 0) - (a.requestedAtTs || 0));
  }, [requests, statusFilter, query]);

  const review = async (request: CostChangeRequest, action: 'approve' | 'reject') => {
    setBusyId(request.id);
    try {
      await onReview(request, action);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/25">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black text-slate-900">
              بازبینی قیمت‌های همکاران
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
              پیشنهادهای «هزینه تمام‌شده» که همکاران ثبت کرده‌اند؛ پس از تایید، قیمت جدید در
              فاکتورهای بعدی اعمال می‌شود.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 mt-3.5">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
            <span className="text-[10px] font-bold text-amber-800 block flex items-center gap-1">
              <Clock className="w-3 h-3" />
              در انتظار تایید
            </span>
            <span className="font-mono font-black text-amber-900 text-sm">{counts.pending}</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-800 block flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              تاییدشده
            </span>
            <span className="font-mono font-black text-emerald-900 text-sm">{counts.approved}</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
            <span className="text-[10px] font-bold text-rose-800 block flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              ردشده
            </span>
            <span className="font-mono font-black text-rose-900 text-sm">{counts.rejected}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'pending' as const, label: 'در انتظار', count: counts.pending },
            { id: 'approved' as const, label: 'تاییدشده', count: counts.approved },
            { id: 'rejected' as const, label: 'ردشده', count: counts.rejected },
            { id: 'all' as const, label: 'همه', count: counts.all }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                statusFilter === tab.id
                  ? 'bg-gradient-to-r from-sky-50 to-emerald-50 text-sky-800 border-sky-300 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span className="font-mono text-[10px] px-1.5 rounded-md bg-white/70 border border-slate-200">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72 sm:mr-auto">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی محصول یا نام همکار"
            className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl sm:rounded-3xl p-10 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-700">درخواستی در این بخش نیست</p>
          <p className="text-xs text-slate-500">
            پیشنهادهای قیمت همکاران پس از ثبت، در این صفحه برای بازبینی نمایش داده می‌شوند.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-right">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[11px] font-black text-slate-600">
                  <th className="px-4 py-3">محصول / سایز</th>
                  <th className="px-4 py-3">همکار</th>
                  <th className="px-4 py-3">تاریخ</th>
                  <th className="px-4 py-3">قیمت قبلی</th>
                  <th className="px-4 py-3">قیمت جدید</th>
                  <th className="px-4 py-3">وضعیت</th>
                  <th className="px-4 py-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((request) => {
                  const diff = (Number(request.newCost) || 0) - (Number(request.oldCost) || 0);
                  return (
                    <tr key={request.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-slate-900">{request.dimensionTitle}</p>
                        <p className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                          <Ruler className="w-3 h-3" />
                          {request.dimensionsCm}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700">
                          <UserCog className="w-3.5 h-3.5 text-teal-600" />
                          {request.requestedByName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-500 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {request.requestedAt}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-600">
                        {formatPrice(request.oldCost)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono font-black text-slate-900">
                          {formatPrice(request.newCost)}
                        </span>
                        {diff !== 0 && (
                          <span
                            className={`block text-[10px] font-bold ${
                              diff > 0 ? 'text-rose-600' : 'text-emerald-700'
                            }`}
                          >
                            {diff > 0 ? '+' : ''}
                            {formatPrice(diff)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {request.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                            <Clock className="w-3 h-3" />
                            در انتظار
                          </span>
                        ) : request.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                            <CheckCircle2 className="w-3 h-3" />
                            تاییدشده
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                            <XCircle className="w-3 h-3" />
                            ردشده
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center">
                          {request.status === 'pending' ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => review(request, 'approve')}
                                disabled={busyId === request.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
                              >
                                {busyId === request.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3 h-3" />
                                )}
                                تایید
                              </button>
                              <button
                                onClick={() => review(request, 'reject')}
                                disabled={busyId === request.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 disabled:opacity-60 cursor-pointer"
                              >
                                <XCircle className="w-3 h-3" />
                                رد
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              {request.reviewedAt || '—'}
                            </span>
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
            {filtered.map((request) => {
              const diff = (Number(request.newCost) || 0) - (Number(request.oldCost) || 0);
              return (
                <div key={request.id} className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 truncate">{request.dimensionTitle}</p>
                      <p className="text-[10px] font-mono text-slate-500">{request.dimensionsCm}</p>
                    </div>
                    {request.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        در انتظار
                      </span>
                    ) : request.status === 'approved' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex-shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        تایید
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md flex-shrink-0">
                        <XCircle className="w-3 h-3" />
                        رد
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <p className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">همکار:</span>
                      <span className="font-bold text-slate-900 truncate">{request.requestedByName}</span>
                    </p>
                    <p className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">تاریخ:</span>
                      <span className="text-slate-600">{request.requestedAt}</span>
                    </p>
                    <p className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">قیمت قبلی:</span>
                      <span className="font-mono text-slate-600">{formatPrice(request.oldCost)}</span>
                    </p>
                    <p className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">قیمت جدید:</span>
                      <span className="font-mono font-black text-slate-900">{formatPrice(request.newCost)}</span>
                    </p>
                    {diff !== 0 && (
                      <p className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          تغییر:
                        </span>
                        <span className={`font-mono font-bold ${diff > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {diff > 0 ? '+' : ''}
                          {formatPrice(diff)}
                        </span>
                      </p>
                    )}
                  </div>

                  {request.status === 'pending' && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => review(request, 'approve')}
                        disabled={busyId === request.id}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
                      >
                        {busyId === request.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        تایید قیمت
                      </button>
                      <button
                        onClick={() => review(request, 'reject')}
                        disabled={busyId === request.id}
                        className="px-3 py-2 rounded-xl text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 disabled:opacity-60 cursor-pointer"
                      >
                        رد
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
