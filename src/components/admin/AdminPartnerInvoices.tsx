import React, { useMemo, useState } from 'react';
import {
  Receipt,
  Search,
  CheckCircle2,
  RotateCcw,
  Wallet,
  Users,
  FileText,
  AlertCircle,
  Send,
  MessageCircle,
  Loader2,
  X,
  Building2,
  TrendingUp
} from 'lucide-react';
import { PartnerInvoice } from '../../types';
import { formatPrice } from '../../utils/formatters';

interface AdminPartnerInvoicesProps {
  invoices: PartnerInvoice[];
  onSettle: (invoice: PartnerInvoice, status: 'paid' | 'unpaid', note?: string) => Promise<boolean> | void;
  showToast?: (message: string) => void;
}

type StatusFilter = 'all' | 'unpaid' | 'paid';

export const AdminPartnerInvoices: React.FC<AdminPartnerInvoicesProps> = ({
  invoices,
  onSettle,
  showToast
}) => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [settleTarget, setSettleTarget] = useState<PartnerInvoice | null>(null);
  const [settleNote, setSettleNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const stats = useMemo(() => {
    const unpaid = invoices.filter((i) => i.status === 'unpaid');
    const paid = invoices.filter((i) => i.status === 'paid');
    const debt = unpaid.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const settled = paid.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const partners = new Set(invoices.map((i) => i.partnerId)).size;
    return { debt, settled, total: invoices.length, unpaidCount: unpaid.length, paidCount: paid.length, partners };
  }, [invoices]);

  const filtered = useMemo(() => {
    const q = query.trim();
    return invoices.filter((invoice) => {
      if (statusFilter !== 'all' && invoice.status !== statusFilter) return false;
      if (!q) return true;
      return (
        invoice.number?.includes(q) ||
        invoice.orderTrackingCode?.includes(q) ||
        invoice.partnerName?.includes(q) ||
        (invoice.partnerGuild || '').includes(q)
      );
    });
  }, [invoices, query, statusFilter]);

  const confirmSettle = async () => {
    if (!settleTarget) return;
    setIsSaving(true);
    try {
      await onSettle(settleTarget, 'paid', settleNote.trim());
      setSettleTarget(null);
      setSettleNote('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevert = async (invoice: PartnerInvoice) => {
    setIsSaving(true);
    try {
      await onSettle(invoice, 'unpaid');
      showToast?.(`فاکتور ${invoice.number} به حالت تسویه‌نشده برگشت.`);
    } finally {
      setIsSaving(false);
    }
  };

  const channelBadge = (invoice: PartnerInvoice) =>
    invoice.channel === 'eitaa' ? (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
        <MessageCircle className="w-3 h-3" />
        ایتا
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded-md">
        <Send className="w-3 h-3" />
        تلگرام
      </span>
    );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-sky-500/25">
            <Receipt className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black text-slate-900">فاکتورهای صادر شده</h1>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              بدهی استودیو به همکاران بابت سفارش‌های ارسال‌شده برای چاپ (مبنا: قیمت تمام‌شده هر سایز)
            </p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-200 rounded-2xl p-3.5 sm:p-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-rose-800">مجموع بدهی</span>
            <Wallet className="w-4 h-4 text-rose-600" />
          </div>
          <p className="font-mono font-black text-sm sm:text-lg text-rose-900">{formatPrice(stats.debt)}</p>
          <p className="text-[10px] text-rose-700 mt-1">{stats.unpaidCount} فاکتور تسویه‌نشده</p>
        </div>

        <div className="bg-gradient-to-br from-sky-50 to-white border border-sky-200 rounded-2xl p-3.5 sm:p-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-sky-800">تعداد فاکتورها</span>
            <FileText className="w-4 h-4 text-sky-600" />
          </div>
          <p className="font-mono font-black text-sm sm:text-lg text-sky-900">{stats.total}</p>
          <p className="text-[10px] text-sky-700 mt-1">کل فاکتورهای صادرشده</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-2xl p-3.5 sm:p-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800">تسویه‌شده</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="font-mono font-black text-sm sm:text-lg text-emerald-900">{formatPrice(stats.settled)}</p>
          <p className="text-[10px] text-emerald-700 mt-1">{stats.paidCount} فاکتور پرداخت‌شده</p>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl p-3.5 sm:p-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-700">همکاران درگیر</span>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <p className="font-mono font-black text-sm sm:text-lg text-slate-900">{stats.partners}</p>
          <p className="text-[10px] text-slate-500 mt-1">همکار دارای فاکتور</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'all' as const, label: 'همه', count: stats.total },
            { id: 'unpaid' as const, label: 'تسویه‌نشده', count: stats.unpaidCount },
            { id: 'paid' as const, label: 'تسویه‌شده', count: stats.paidCount }
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
            placeholder="جستجوی شماره فاکتور، همکار یا کد سفارش"
            className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl sm:rounded-3xl p-10 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Receipt className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-700">فاکتوری یافت نشد</p>
          <p className="text-xs text-slate-500">
            با ارسال یک سفارش برای چاپ به همکار، فاکتور آن به‌صورت خودکار در این صفحه صادر می‌شود.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-right">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[11px] font-black text-slate-600">
                  <th className="px-3 py-3">شماره فاکتور</th>
                  <th className="px-3 py-3">تاریخ</th>
                  <th className="px-3 py-3">همکار</th>
                  <th className="px-3 py-3">کد سفارش</th>
                  <th className="px-3 py-3">شرح</th>
                  <th className="px-3 py-3">روش ارسال</th>
                  <th className="px-3 py-3">مبلغ (تومان)</th>
                  <th className="px-3 py-3">وضعیت</th>
                  <th className="px-3 py-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors">
                    <td className="px-3 py-3 text-xs font-mono font-bold text-slate-900">{invoice.number}</td>
                    <td className="px-3 py-3 text-[11px] text-slate-500">{invoice.createdAt}</td>
                    <td className="px-3 py-3">
                      <p className="text-xs font-bold text-slate-900">{invoice.partnerName}</p>
                      {invoice.partnerGuild && (
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {invoice.partnerGuild}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[11px] font-mono text-slate-600" dir="ltr">
                      {invoice.orderTrackingCode}
                    </td>
                    <td className="px-3 py-3">
                      {(invoice.items || []).map((item, index) => (
                        <span key={index} className="block text-[10px] text-slate-600">
                          {item.title} — {item.quantity} عدد × {formatPrice(item.unitCost)}
                        </span>
                      ))}
                    </td>
                    <td className="px-3 py-3">{channelBadge(invoice)}</td>
                    <td className="px-3 py-3 text-xs font-mono font-black text-slate-900">
                      {formatPrice(invoice.amount)}
                    </td>
                    <td className="px-3 py-3">
                      {invoice.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                          <CheckCircle2 className="w-3 h-3" />
                          تسویه‌شده
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                          <AlertCircle className="w-3 h-3" />
                          تسویه‌نشده
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center">
                        {invoice.status === 'unpaid' ? (
                          <button
                            onClick={() => {
                              setSettleTarget(invoice);
                              setSettleNote('');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            تسویه فاکتور
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRevert(invoice)}
                            disabled={isSaving}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-60"
                          >
                            <RotateCcw className="w-3 h-3" />
                            بازگشت به تسویه‌نشده
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filtered.map((invoice) => (
              <div key={invoice.id} className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 font-mono">{invoice.number}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{invoice.createdAt}</p>
                  </div>
                  {invoice.status === 'paid' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      تسویه‌شده
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md flex-shrink-0">
                      <AlertCircle className="w-3 h-3" />
                      تسویه‌نشده
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-[11px]">
                  <p className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">همکار:</span>
                    <span className="font-bold text-slate-900 truncate">{invoice.partnerName}</span>
                  </p>
                  {invoice.partnerGuild && (
                    <p className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">صنف:</span>
                      <span className="text-slate-700 truncate">{invoice.partnerGuild}</span>
                    </p>
                  )}
                  <p className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">کد سفارش:</span>
                    <span className="font-mono text-slate-700" dir="ltr">{invoice.orderTrackingCode}</span>
                  </p>
                  <p className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">روش ارسال:</span>
                    {channelBadge(invoice)}
                  </p>
                  {(invoice.items || []).map((item, index) => (
                    <p key={index} className="text-[10px] text-slate-600 leading-relaxed">
                      {item.title} — {item.quantity} عدد × {formatPrice(item.unitCost)}
                    </p>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500">مبلغ فاکتور:</span>
                  <span className="font-mono font-black text-xs text-slate-900">{formatPrice(invoice.amount)}</span>
                </div>

                {invoice.status === 'unpaid' ? (
                  <button
                    onClick={() => {
                      setSettleTarget(invoice);
                      setSettleNote('');
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    تسویه فاکتور
                  </button>
                ) : (
                  <button
                    onClick={() => handleRevert(invoice)}
                    disabled={isSaving}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    بازگشت به تسویه‌نشده
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Settle modal */}
      {settleTarget && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="w-full sm:max-w-sm bg-white rounded-2xl border border-slate-200 shadow-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">تسویه فاکتور {settleTarget.number}</h3>
              <button
                onClick={() => setSettleTarget(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1">
              <p className="flex justify-between">
                <span className="text-slate-500">همکار:</span>
                <span className="font-bold text-slate-900">{settleTarget.partnerName}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-500">مبلغ:</span>
                <span className="font-mono font-black text-slate-900">{formatPrice(settleTarget.amount)}</span>
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                توضیح تسویه (اختیاری)
              </label>
              <input
                value={settleNote}
                onChange={(e) => setSettleNote(e.target.value)}
                placeholder="مثال: پرداخت کارت به کارت — پیگیری ۱۲۳۴"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={confirmSettle}
                disabled={isSaving}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                ثبت تسویه
              </button>
              <button
                onClick={() => setSettleTarget(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
