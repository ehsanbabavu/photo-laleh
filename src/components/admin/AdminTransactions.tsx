import React, { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, CheckCircle2, CreditCard, Loader2, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { BluPalTransaction } from '../../types';
import { formatNumber, formatOrderDateTime, formatPrice, formatRialDirect } from '../../utils/formatters';
import { toAsciiDigits } from '../../utils/phone';

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
  const [deletePhone, setDeletePhone] = useState('');
  const [deleteCode, setDeleteCode] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const deleteCodeInputRef = useRef<HTMLInputElement>(null);
  const codeRequestVersion = useRef(0);
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

  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (deleteTarget && !dialog?.open) dialog?.showModal();
    else if (!deleteTarget && dialog?.open) dialog.close();
  }, [deleteTarget]);

  useEffect(() => {
    if (deleteTarget && deletePhone && !isSendingCode) deleteCodeInputRef.current?.focus();
  }, [deleteTarget, deletePhone, isSendingCode]);

  const closeDeleteDialog = () => {
    if (isDeleting) return;
    codeRequestVersion.current += 1;
    setDeleteTarget(null);
    setDeletePhone('');
    setDeleteCode('');
    setDeleteError('');
    setIsSendingCode(false);
  };

  const sendDeleteCode = async (transaction: BluPalTransaction) => {
    const version = ++codeRequestVersion.current;
    setIsSendingCode(true);
    setDeleteError('');
    setDeletePhone('');
    setDeleteCode('');
    try {
      const result = await apiClient.requestTransactionDeletionCode(transaction.id);
      if (codeRequestVersion.current === version) setDeletePhone(result.phone);
    } catch (error: any) {
      if (codeRequestVersion.current === version) setDeleteError(error?.message || 'ارسال کد تأیید ناموفق بود');
    } finally {
      if (codeRequestVersion.current === version) setIsSendingCode(false);
    }
  };

  const requestDeleteTransaction = (transaction: BluPalTransaction) => {
    setDeleteSuccess(false);
    setDeleteTarget(transaction);
    void sendDeleteCode(transaction);
  };

  const confirmDeleteTransaction = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!deleteTarget || !deletePhone || isSendingCode || isDeleting || deleteCode.length !== 6) return;
    const target = deleteTarget;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await apiClient.confirmTransactionDeletion(target.id, deleteCode);
      await mutate((items) => items?.filter((transaction) => transaction.id !== target.id), { revalidate: false });
      setDeleteTarget(null);
      setDeleteCode('');
      setDeletePhone('');
      setDeleteSuccess(true);
      void mutate().catch(() => undefined);
    } catch (error: any) {
      setDeleteError(error?.message || 'حذف تراکنش ناموفق بود');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 min-h-[200px]" aria-labelledby="transactions-title">
      <dialog
        ref={deleteDialogRef}
        aria-labelledby="transaction-delete-title"
        aria-describedby="transaction-delete-description"
        onCancel={(event) => { event.preventDefault(); closeDeleteDialog(); }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border-0 bg-white p-6 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm"
        dir="rtl"
      >
        {deleteTarget && (
          <form onSubmit={(event) => { void confirmDeleteTransaction(event); }}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 id="transaction-delete-title" className="text-base font-black text-slate-900">تأیید حذف تراکنش</h3>
                <p id="transaction-delete-description" className="mt-1 text-xs leading-6 text-slate-500">
                  {isSendingCode ? 'در حال ارسال کد تأیید به شماره ادمین…' : deletePhone ? <>کد تأیید به شماره ادمین <bdi dir="ltr">{deletePhone}</bdi> ارسال شد. کد تا ۲ دقیقه معتبر است.</> : 'برای حذف تراکنش، کد تأیید پیامکی لازم است.'}
                </p>
              </div>
              <button type="button" onClick={closeDeleteDialog} disabled={isDeleting} aria-label="بستن پنجره حذف تراکنش" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5" aria-hidden="true" /></button>
            </div>
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-700">
              <p>فاکتور: <bdi dir="ltr" className="font-mono font-bold">{deleteTarget.invoiceId}</bdi></p>
              <p>{deleteTarget.customerName || '—'} · {formatPrice(deleteTarget.amountRial / 10)}</p>
            </div>
            <button type="button" disabled={isSendingCode || isDeleting} onClick={() => { void sendDeleteCode(deleteTarget); }} className="mb-3 w-full rounded-xl bg-sky-600 py-3 text-xs font-bold text-white disabled:opacity-50">
              {isSendingCode ? 'در حال ارسال…' : deletePhone ? 'ارسال مجدد پیامک' : 'ارسال پیامک کد تأیید'}
            </button>
            <label htmlFor="transaction-delete-code" className="sr-only">کد تأیید پیامکی</label>
            <input
              id="transaction-delete-code"
              ref={deleteCodeInputRef}
              autoFocus
              value={deleteCode}
              onChange={(event) => setDeleteCode(toAsciiDigits(event.target.value).replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              disabled={isSendingCode || isDeleting || !deletePhone}
              placeholder="کد ۶ رقمی پیامک"
              dir="ltr"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-lg tracking-[0.4em] focus:border-sky-500 focus:outline-none disabled:bg-slate-50"
            />
            {deleteError && <p role="alert" className="mt-2 text-xs font-bold text-rose-600">{deleteError}</p>}
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={closeDeleteDialog} disabled={isDeleting} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 disabled:opacity-50">انصراف</button>
              <button type="submit" disabled={isDeleting || isSendingCode || !deletePhone || deleteCode.length !== 6} className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white disabled:opacity-50">{isDeleting ? 'در حال بررسی…' : 'تأیید و حذف'}</button>
            </div>
          </form>
        )}
      </dialog>
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
                {['عملیات', 'مشتری', 'مبلغ پرداخت', 'فاکتور / سفارش', 'کد پیگیری', 'پرداخت‌کننده', 'زمان پرداخت', 'وضعیت'].map((heading) => (
                  <th key={heading} scope="col" className="px-3 py-3 font-bold whitespace-nowrap">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-slate-50/70">
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => requestDeleteTransaction(transaction)}
                      disabled={Boolean(deleteTarget)}
                      title="حذف تراکنش"
                      aria-label={`حذف تراکنش ${transaction.invoiceId}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50 whitespace-nowrap"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      حذف
                    </button>
                  </td>
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
