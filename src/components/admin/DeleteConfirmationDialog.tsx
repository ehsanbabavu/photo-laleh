import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { DeletionChannel } from '../../types';
import { apiClient } from '../../services/apiClient';
import { toAsciiDigits } from '../../utils/phone';

const channelLabels: Record<DeletionChannel, string> = { sms: 'پیامک', telegram: 'تلگرام', eitaa: 'ایتا' };

interface DeleteConfirmationDialogProps {
  kind: 'order' | 'transaction';
  recordId: string;
  children: React.ReactNode;
  onClose: () => void;
  onConfirmed: () => void | Promise<void>;
}

export const DeleteConfirmationDialog = ({ kind, recordId, children, onClose, onConfirmed }: DeleteConfirmationDialogProps) => {
  const [channel, setChannel] = useState<DeletionChannel>('sms');
  const [destination, setDestination] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestVersion = useRef(0);
  const label = kind === 'order' ? 'سفارش' : 'تراکنش';
  const idPrefix = `${kind}-delete`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.open) dialog.showModal();
    return () => {
      requestVersion.current += 1;
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    if (destination && !isSending) inputRef.current?.focus();
  }, [destination, isSending]);

  const close = () => {
    if (isConfirming) return;
    requestVersion.current += 1;
    onClose();
  };

  const changeChannel = (next: DeletionChannel) => {
    requestVersion.current += 1;
    setChannel(next);
    setDestination('');
    setCode('');
    setError('');
  };

  const sendCode = async () => {
    if (isSending || isConfirming) return;
    const version = ++requestVersion.current;
    setIsSending(true);
    setDestination('');
    setCode('');
    setError('');
    try {
      const delivery = kind === 'order'
        ? await apiClient.requestOrderDeletionCode(recordId, channel)
        : await apiClient.requestTransactionDeletionCode(recordId, channel);
      if (requestVersion.current === version) setDestination(delivery.destination);
    } catch (err: any) {
      if (requestVersion.current === version) setError(err?.message || 'ارسال کد تأیید ناموفق بود');
    } finally {
      if (requestVersion.current === version) setIsSending(false);
    }
  };

  const confirm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSending || isConfirming || !destination || code.length !== 6) return;
    const version = requestVersion.current;
    setIsConfirming(true);
    setError('');
    try {
      if (kind === 'order') await apiClient.confirmOrderDeletion(recordId, code, channel);
      else await apiClient.confirmTransactionDeletion(recordId, code, channel);
      await onConfirmed();
      onClose();
    } catch (err: any) {
      if (requestVersion.current === version) setError(err?.message || `حذف ${label} ناموفق بود`);
    } finally {
      if (requestVersion.current === version) setIsConfirming(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${idPrefix}-title`}
      aria-describedby={`${idPrefix}-description`}
      onCancel={(event) => { event.preventDefault(); close(); }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border-0 bg-white p-6 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm"
      dir="rtl"
    >
      <form onSubmit={(event) => { void confirm(event); }}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 id={`${idPrefix}-title`} className="text-base font-black text-slate-900">تأیید حذف {label}</h3>
            <p id={`${idPrefix}-description`} className="mt-1 text-xs leading-6 text-slate-500">
              {isSending ? `در حال ارسال کد تأیید از طریق ${channelLabels[channel]}…` : destination ? <>کد تأیید از طریق {channelLabels[channel]} به <bdi dir="ltr">{destination}</bdi> ارسال شد. کد تا ۲ دقیقه معتبر است.</> : 'روش دریافت کد را انتخاب کنید و دکمه ارسال کد را بزنید.'}
            </p>
          </div>
          <button type="button" onClick={close} disabled={isConfirming} aria-label={`بستن پنجره حذف ${label}`} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5" aria-hidden="true" /></button>
        </div>
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-700">{children}</div>
        <label htmlFor={`${idPrefix}-channel`} className="mb-2 block text-xs font-bold text-slate-700">روش دریافت کد</label>
        <select
          id={`${idPrefix}-channel`}
          value={channel}
          onChange={(event) => changeChannel(event.target.value as DeletionChannel)}
          disabled={isSending || isConfirming}
          className="mb-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs focus:border-sky-500 focus:outline-none disabled:opacity-50"
        >
          <option value="sms">پیامک به موبایل مدیر</option>
          <option value="telegram">تلگرام مدیر</option>
          <option value="eitaa">ایتای مدیر</option>
        </select>
        {channel !== 'sms' && <p className="mb-3 text-xs leading-6 text-slate-500">شناسه مدیر را در بخش کاربران و توکن ربات را در تنظیمات پیام‌رسان ثبت کنید.{channel === 'telegram' && ' مدیر باید ابتدا ربات تلگرام را شروع کرده باشد.'}</p>}
        <button type="button" disabled={isSending || isConfirming} onClick={() => { void sendCode(); }} className="mb-3 w-full rounded-xl bg-sky-600 py-3 text-xs font-bold text-white disabled:opacity-50">
          {isSending ? 'در حال ارسال…' : destination ? 'ارسال مجدد کد' : 'ارسال کد تأیید'}
        </button>
        <label htmlFor={`${idPrefix}-code`} className="sr-only">کد تأیید</label>
        <input
          id={`${idPrefix}-code`}
          ref={inputRef}
          value={code}
          onChange={(event) => setCode(toAsciiDigits(event.target.value).replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          disabled={isSending || isConfirming || !destination}
          placeholder="کد تأیید ۶ رقمی"
          dir="ltr"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-lg tracking-[0.4em] focus:border-sky-500 focus:outline-none disabled:bg-slate-50"
        />
        {error && <p role="alert" className="mt-2 text-xs font-bold text-rose-600">{error}</p>}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={close} disabled={isConfirming} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 disabled:opacity-50">انصراف</button>
          <button type="submit" disabled={isConfirming || isSending || !destination || code.length !== 6} className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white disabled:opacity-50">{isConfirming ? 'در حال بررسی…' : 'تأیید و حذف'}</button>
        </div>
      </form>
    </dialog>
  );
};
