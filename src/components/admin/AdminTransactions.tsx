import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, CheckCircle2, CreditCard, Loader2, RefreshCw, Search, Trash2 } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { BluPalTransaction } from '../../types';
import { formatNumber, formatOrderDateTime, formatPrice, formatRialDirect } from '../../utils/formatters';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';

const PAGE_SIZE = 10;
const normalizeSearch = (value: string) => value
  .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  .replace(/ي/g, 'ی')
  .replace(/ك/g, 'ک')
  .toLowerCase()
  .trim();

const formatDate = (value: string) => formatOrderDateTime(value, value || '—');

export const AdminTransactions = () => {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<BluPalTransaction | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const { data, error, isLoading, isValidating, mutate } = useSWR<BluPalTransaction[]>(
    '/api/blupal/transactions',
    () => apiClient.getBluPalTransactions(),
    { refreshInterval: 30000 }
  );
  const transactions = data || [];
  const totalAmountRial = transactions.reduce((sum, transaction) => sum + transaction.amountRial, 0);
  const filtered = useMemo(() => {
    const search = normalizeSearch(query);
    return (data || []).filter((transaction) => !search || [
      transaction.customerName,
      transaction.customerPhone,
      transaction.invoiceId,
      transaction.orderId,
      transaction.orderTrackingCode,
      transaction.referenceCode,
      transaction.payerName,
      transaction.payerCard,
      transaction.payerBankName
    ].some((value) => normalizeSearch(value).includes(search)));
  }, [data, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleTransactions = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const requestDeleteTransaction = (transaction: BluPalTransaction) => {
    setDeleteSuccess(false);
    setDeleteTarget(transaction);
  };

  const onTransactionDeleted = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    await mutate((items) => items?.filter((transaction) => transaction.id !== targetId), { revalidate: false });
    setDeleteSuccess(true);
    void mutate().catch(() => undefined);
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 min-h-[200px]" aria-labelledby="transactions-title">
      {deleteTarget && (
        <DeleteConfirmationDialog
          key={deleteTarget.id}
          kind="transaction"
          recordId={deleteTarget.id}
          onClose={() => setDeleteTarget(null)}
          onConfirmed={onTransactionDeleted}
        >
          <p>فاکتور: <bdi dir="ltr" className="font-mono font-bold">{deleteTarget.invoiceId}</bdi></p>
          <p>{deleteTarget.customerName || '—'} · {formatPrice(deleteTarget.amountRial / 10)}</p>
        </DeleteConfirmationDialog>
      )}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-sky-600 flex-shrink-0" aria-hidden="true" />
            <h2 id="transactions-title" className="text-sm font-black text-slate-900">تراکنش‌ها</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1.5">پرداخت‌های موفق تأییدشده در درگاه بلوپال</p>
        </div>
        <button
          type="button"
          onClick={() => { void mutate().catch(() => undefined); }}
          disabled={isValidating}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 disabled:opacity-50 cursor-pointer flex-shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} aria-hidden="true" />
          به‌روزرسانی
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-bold text-emerald-800">تراکنش‌های موفق بلوپال</p>
          <p className="text-lg font-black text-emerald-900 mt-1">{data ? formatNumber(transactions.length) : '—'}</p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
          <p className="text-xs font-bold text-sky-800">مجموع مبالغ پرداخت‌شده</p>
          <p className="text-lg font-black text-sky-900 mt-1">{data ? formatPrice(totalAmountRial / 10) : '—'}</p>
        </div>
      </div>

      <div className="relative">
        <label htmlFor="transactions-search" className="sr-only">جستجوی تراکنش‌ها</label>
        <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" aria-hidden="true" />
        <input
          id="transactions-search"
          type="search"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setPage(1); }}
          placeholder="نام، موبایل، شناسه فاکتور یا کد پیگیری"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2.5 text-xs focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
        />
      </div>

      {deleteSuccess && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">تراکنش با موفقیت حذف شد.</p>}

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          دریافت تراکنش‌ها ناموفق بود. برای تلاش مجدد، به‌روزرسانی را بزنید.
        </div>
      )}

      {isLoading ? (
        <div role="status" className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
          در حال دریافت تراکنش‌ها…
        </div>
      ) : data && filtered.length === 0 ? (
        <p role="status" className="text-xs text-slate-500 py-8 text-center">
          {query.trim() ? 'تراکنشی مطابق جستجوی شما یافت نشد.' : 'هنوز تراکنش موفقی از بلوپال ثبت نشده است.'}
        </p>
      ) : data && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[960px] text-right text-xs">
            <caption className="sr-only">فهرست تراکنش‌های موفق بلوپال</caption>
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {['مشتری', 'مبلغ پرداخت', 'فاکتور / سفارش', 'کد پیگیری', 'پرداخت‌کننده', 'زمان پرداخت', 'وضعیت', 'عملیات'].map((heading) => (
                  <th key={heading} scope="col" className="px-3 py-3 font-bold whitespace-nowrap">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-slate-50/70">
                  <td className="px-3 py-3">
                    <p className="font-bold text-slate-900">{transaction.customerName || '—'}</p>
                    <p className="text-slate-500 mt-1"><bdi dir="ltr">{transaction.customerPhone || '—'}</bdi></p>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <p className="font-bold text-slate-900">{formatPrice(transaction.amountRial / 10)}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{formatRialDirect(transaction.amountRial)}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-mono text-slate-800"><bdi dir="ltr">{transaction.invoiceId}</bdi></p>
                    <p className="text-[10px] text-slate-500 mt-1">سفارش: <bdi dir="ltr">{transaction.orderTrackingCode || transaction.orderId || '—'}</bdi></p>
                  </td>
                  <td className="px-3 py-3 font-mono text-slate-700"><bdi dir="ltr">{transaction.referenceCode || '—'}</bdi></td>
                  <td className="px-3 py-3">
                    <p className="text-slate-800">{transaction.payerName || '—'}</p>
                    {transaction.payerCard && <p className="text-[10px] text-slate-500 mt-1"><bdi dir="ltr">{transaction.payerCard}</bdi></p>}
                    {transaction.payerBankName && <p className="text-[10px] text-slate-500 mt-1">{transaction.payerBankName}</p>}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <p className="text-slate-700">{formatDate(transaction.paidAt)}</p>
                    {transaction.createdAt && <p className="text-[10px] text-slate-500 mt-1">صدور: {formatDate(transaction.createdAt)}</p>}
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 font-bold whitespace-nowrap">
                      <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                      موفق
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => requestDeleteTransaction(transaction)}
                      disabled={Boolean(deleteTarget)}
                      title="حذف"
                      aria-label={`حذف تراکنش ${transaction.invoiceId}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > PAGE_SIZE && (
        <nav aria-label="صفحه‌بندی تراکنش‌ها" className="flex items-center justify-between gap-2 text-xs">
          <p className="text-slate-500">صفحه {formatNumber(currentPage)} از {formatNumber(pageCount)} · {formatNumber(filtered.length)} تراکنش</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer">قبلی</button>
            <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage === pageCount} className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer">بعدی</button>
          </div>
        </nav>
      )}
    </section>
  );
};
