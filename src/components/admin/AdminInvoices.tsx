import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, Loader2, Receipt, RefreshCw, Search } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import type { IssuedInvoice, IssuedInvoiceStatus } from '../../types';
import { formatNumber, formatOrderDateTime, formatPrice, formatRialDirect } from '../../utils/formatters';
import { toAsciiDigits } from '../../utils/phone';

const PAGE_SIZE = 10;
const STATUS: Record<IssuedInvoiceStatus, { label: string; className: string }> = {
  pending: { label: 'در انتظار پرداخت', className: 'border-amber-200 bg-amber-50 text-amber-800' },
  paid: { label: 'پرداخت‌شده', className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  expired: { label: 'منقضی‌شده', className: 'border-slate-200 bg-slate-100 text-slate-600' },
  failed: { label: 'ناموفق', className: 'border-rose-200 bg-rose-50 text-rose-700' },
  canceled: { label: 'لغوشده', className: 'border-rose-200 bg-rose-50 text-rose-700' },
  unknown: { label: 'نامشخص', className: 'border-slate-200 bg-slate-50 text-slate-600' }
};
const normalizeSearch = (value: string) => toAsciiDigits(value).replace(/ي/g, 'ی').replace(/ك/g, 'ک').toLowerCase().trim();
const formatDate = (value: string) => formatOrderDateTime(value, value || '—');

const StatusBadge = ({ status }: { status: IssuedInvoiceStatus }) => {
  const display = STATUS[status] || STATUS.unknown;
  return <span className={`inline-flex rounded-lg border px-2 py-1 text-[11px] font-bold whitespace-nowrap ${display.className}`}>{display.label}</span>;
};

const InvoiceAmount = ({ amountRial }: { amountRial: number | null }) => amountRial === null ? <span>—</span> : (
  <div className="whitespace-nowrap">
    <p className="font-bold text-slate-900">{formatPrice(amountRial / 10)}</p>
    <p className="text-[10px] text-slate-500 mt-1">{formatRialDirect(amountRial)}</p>
  </div>
);

export const AdminInvoices = () => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<IssuedInvoiceStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const { data, error, isLoading, isValidating, mutate } = useSWR<IssuedInvoice[]>(
    '/api/admin/invoices', () => apiClient.getIssuedInvoices(), { refreshInterval: 30000 }
  );
  const filtered = useMemo(() => {
    const search = normalizeSearch(query);
    return (data || []).filter(invoice => (statusFilter === 'all' || invoice.status === statusFilter) && (
      !search || [invoice.customerName, invoice.customerPhone, invoice.invoiceId, invoice.userId,
        invoice.orderId, invoice.orderTrackingCode, invoice.referenceCode].some(value => normalizeSearch(value).includes(search))
    ));
  }, [data, query, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleInvoices = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const counts = (data || []).reduce((totals, invoice) => {
    totals.all += 1;
    if (invoice.status === 'paid' || invoice.status === 'pending') totals[invoice.status] += 1;
    return totals;
  }, { all: 0, paid: 0, pending: 0 });

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 min-h-[200px]" aria-labelledby="invoices-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="invoices-title" className="flex items-center gap-2 text-sm font-black text-slate-900">
            <Receipt className="w-4 h-4 text-sky-600" aria-hidden="true" />فاکتورها
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 leading-6">همهٔ فاکتورهای صادرشدهٔ کاربران، همراه با وضعیت پرداخت</p>
        </div>
        <button type="button" onClick={() => { void mutate().catch(() => undefined); }} disabled={isValidating}
          className="inline-flex min-h-11 items-center gap-1.5 px-3 rounded-xl text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 disabled:opacity-50 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
          <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} aria-hidden="true" />به‌روزرسانی
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {([{ key: 'all', label: 'همهٔ فاکتورها' }, { key: 'paid', label: 'پرداخت‌شده' }, { key: 'pending', label: 'در انتظار پرداخت' }] as const).map(item => (
          <div key={item.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-600">{item.label}</p>
            <p className="text-lg font-black text-slate-900 mt-1">{data ? formatNumber(counts[item.key]) : '—'}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <label htmlFor="invoices-search" className="sr-only">جستجوی فاکتورها</label>
          <Search className="absolute right-3 top-3.5 w-4 h-4 text-slate-400" aria-hidden="true" />
          <input id="invoices-search" type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }}
            placeholder="نام، موبایل، شناسه فاکتور یا کد سفارش"
            className="w-full min-h-11 bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 text-xs focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20" />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="invoices-status" className="text-xs font-bold text-slate-600">وضعیت</label>
          <select id="invoices-status" value={statusFilter} onChange={event => { setStatusFilter(event.target.value as IssuedInvoiceStatus | 'all'); setPage(1); }}
            className="flex-1 min-h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20">
            <option value="all">همهٔ وضعیت‌ها</option>
            {Object.entries(STATUS).map(([value, display]) => <option key={value} value={value}>{display.label}</option>)}
          </select>
        </div>
      </div>

      {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
        <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />دریافت فاکتورها ناموفق بود. برای تلاش مجدد، به‌روزرسانی را بزنید.
      </div>}

      {isLoading ? <div role="status" className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />در حال دریافت فاکتورها…
      </div> : data && filtered.length === 0 ? <p role="status" className="text-xs text-slate-500 py-8 text-center">
        {query.trim() || statusFilter !== 'all' ? 'فاکتوری مطابق جستجو و وضعیت انتخابی یافت نشد.' : 'هنوز فاکتوری توسط کاربران صادر نشده است.'}
      </p> : data ? <>
        <div className="sm:hidden space-y-3">
          {visibleInvoices.map(invoice => <article key={invoice.id} className="rounded-xl border border-slate-200 p-3 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold text-slate-900">فاکتور: <bdi dir="ltr" className="font-mono break-all">{invoice.invoiceId || '—'}</bdi></p>
              <StatusBadge status={invoice.status} />
            </div>
            <div><p className="font-bold text-slate-900">{invoice.customerName || 'نام ثبت نشده'}</p>
              <p className="mt-1 text-slate-500"><bdi dir="ltr">{invoice.customerPhone || '—'}</bdi></p></div>
            <dl className="grid grid-cols-2 gap-3">
              <div><dt className="text-slate-500 mb-1">مبلغ فاکتور</dt><dd><InvoiceAmount amountRial={invoice.amountRial} /></dd></div>
              <div><dt className="text-slate-500 mb-1">سفارش</dt><dd className="break-all"><bdi dir="ltr">{invoice.orderTrackingCode || invoice.orderId || '—'}</bdi></dd></div>
              <div><dt className="text-slate-500 mb-1">زمان صدور</dt><dd>{formatDate(invoice.createdAt)}</dd></div>
              <div><dt className="text-slate-500 mb-1">مهلت پرداخت</dt><dd>{formatDate(invoice.expiresAt)}</dd></div>
              <div><dt className="text-slate-500 mb-1">زمان پرداخت</dt><dd>{formatDate(invoice.paidAt)}</dd></div>
              <div><dt className="text-slate-500 mb-1">کد پیگیری پرداخت</dt><dd className="break-all"><bdi dir="ltr">{invoice.referenceCode || '—'}</bdi></dd></div>
            </dl>
          </article>)}
        </div>
        <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[900px] text-right text-xs">
            <caption className="sr-only">فهرست همهٔ فاکتورهای صادرشدهٔ کاربران</caption>
            <thead className="bg-slate-50 text-slate-600"><tr>
              {['کاربر', 'فاکتور / سفارش', 'مبلغ فاکتور', 'وضعیت', 'صدور / مهلت پرداخت', 'پرداخت / کد پیگیری'].map(heading => (
                <th key={heading} scope="col" className="px-3 py-3 font-bold whitespace-nowrap">{heading}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">{visibleInvoices.map(invoice => <tr key={invoice.id} className="hover:bg-slate-50/70">
              <td className="px-3 py-3"><p className="font-bold text-slate-900">{invoice.customerName || 'نام ثبت نشده'}</p>
                <p className="text-slate-500 mt-1"><bdi dir="ltr">{invoice.customerPhone || '—'}</bdi></p></td>
              <td className="px-3 py-3"><p className="font-mono"><bdi dir="ltr">{invoice.invoiceId || '—'}</bdi></p>
                <p className="text-[10px] text-slate-500 mt-1">سفارش: <bdi dir="ltr">{invoice.orderTrackingCode || invoice.orderId || '—'}</bdi></p></td>
              <td className="px-3 py-3"><InvoiceAmount amountRial={invoice.amountRial} /></td>
              <td className="px-3 py-3"><StatusBadge status={invoice.status} /></td>
              <td className="px-3 py-3 whitespace-nowrap"><p>{formatDate(invoice.createdAt)}</p>
                <p className="text-[10px] text-slate-500 mt-1">مهلت: {formatDate(invoice.expiresAt)}</p></td>
              <td className="px-3 py-3"><p className="whitespace-nowrap">{formatDate(invoice.paidAt)}</p>
                <p className="text-[10px] text-slate-500 mt-1"><bdi dir="ltr">{invoice.referenceCode || '—'}</bdi></p></td>
            </tr>)}</tbody>
          </table>
        </div>
      </> : null}

      {filtered.length > PAGE_SIZE && <nav aria-label="صفحه‌بندی فاکتورها" className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="text-slate-500">صفحه {formatNumber(currentPage)} از {formatNumber(pageCount)} · {formatNumber(filtered.length)} فاکتور</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1}
            className="min-h-11 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-500">قبلی</button>
          <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage === pageCount}
            className="min-h-11 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-500">بعدی</button>
        </div>
      </nav>}
    </section>
  );
};
