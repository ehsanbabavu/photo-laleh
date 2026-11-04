import React, { useState } from 'react';
import { LoaderCircle, ShieldCheck, Smartphone } from 'lucide-react';
import type { User } from '../../types';
import { isValidIranianPhone, normalizeIranianPhone, toAsciiDigits } from '../../utils/phone';

interface PhoneVerificationGateProps {
  initialPhone?: string;
  onVerified: (user: User) => void;
}

export const PhoneVerificationGate: React.FC<PhoneVerificationGateProps> = ({
  initialPhone = '',
  onVerified
}) => {
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState<'send' | 'verify' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const normalizedPhone = normalizeIranianPhone(phone);
  const normalizedCode = toAsciiDigits(code).replace(/\D/g, '').slice(0, 6);

  const requestCode = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (busy) return;

    if (!isValidIranianPhone(normalizedPhone)) {
      setError('شماره موبایل معتبر وارد کنید.');
      setNotice('');
      return;
    }

    setBusy('send');
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/auth/phone/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone })
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setError(data?.error || 'ارسال کد تأیید ناموفق بود. دوباره تلاش کنید.');
        return;
      }

      setPhone(normalizedPhone);
      setCode('');
      setCodeSent(true);
      setNotice(`کد تأیید به شماره ${normalizedPhone} ارسال شد.`);
    } catch {
      setError('ارتباط با سرور برقرار نشد. دوباره تلاش کنید.');
    } finally {
      setBusy(null);
    }
  };

  const verifyCode = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (busy) return;

    if (!isValidIranianPhone(normalizedPhone)) {
      setError('شماره موبایل معتبر وارد کنید.');
      return;
    }
    if (!/^\d{6}$/.test(normalizedCode)) {
      setError('کد تأیید ۶ رقمی را وارد کنید.');
      return;
    }

    setBusy('verify');
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/auth/phone/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone, code: normalizedCode })
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success || !data?.user) {
        setError(data?.error || 'تأیید شماره موبایل ناموفق بود. دوباره تلاش کنید.');
        return;
      }

      onVerified(data.user as User);
    } catch {
      setError('ارتباط با سرور برقرار نشد. دوباره تلاش کنید.');
    } finally {
      setBusy(null);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (codeSent) {
      void verifyCode(event);
      return;
    }
    void requestCode(event);
  };

  const isBusy = busy !== null;

  return (
    <section className="mx-auto max-w-2xl" aria-labelledby="phone-verification-title">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-5 sm:p-8">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-100 bg-white text-sky-600 shadow-sm">
              <Smartphone className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-xs font-bold text-emerald-700">تکمیل اطلاعات تماس</p>
              <h1 id="phone-verification-title" className="text-lg font-black leading-8 text-slate-900 sm:text-xl">
                برای ثبت سفارش، شماره موبایل را تأیید کنید
              </h1>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">
                برای پیگیری سفارش به شماره همراه شما نیاز داریم. کد تأیید از طریق پیامک ارسال می‌شود.
              </p>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-8">
          {!codeSent ? (
            <div className="space-y-2">
              <label htmlFor="order-verification-phone" className="block text-sm font-bold text-slate-800">
                شماره موبایل
              </label>
              <input
                id="order-verification-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                value={phone}
                onChange={(event) => {
                  setPhone(event.currentTarget.value);
                  setError('');
                  setNotice('');
                }}
                placeholder="09123456789"
                maxLength={16}
                disabled={isBusy}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'phone-verification-error' : undefined}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-base font-semibold tracking-wide text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-50"
              />
              <p className="text-xs leading-5 text-slate-500">شماره را با صفر و به‌صورت ۱۱ رقمی وارد کنید.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-semibold text-slate-600">کد ارسال‌شده به این شماره را وارد کنید</p>
                    <p dir="ltr" className="mt-1 text-left font-mono text-sm font-bold tracking-wider text-slate-900">
                      {normalizedPhone}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    setCodeSent(false);
                    setCode('');
                    setError('');
                    setNotice('');
                  }}
                  className="self-start rounded-xl px-2 py-1 text-xs font-bold text-sky-700 transition hover:bg-white/80 disabled:opacity-50 sm:self-auto"
                >
                  تغییر شماره
                </button>
              </div>

              <div className="space-y-2">
                <label htmlFor="order-verification-code" className="block text-sm font-bold text-slate-800">
                  کد تأیید پیامک‌شده
                </label>
                <input
                  id="order-verification-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  dir="ltr"
                  value={code}
                  onChange={(event) => {
                    setCode(toAsciiDigits(event.currentTarget.value).replace(/\D/g, '').slice(0, 6));
                    setError('');
                  }}
                  placeholder="••••••"
                  maxLength={6}
                  disabled={isBusy}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'phone-verification-error' : undefined}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center font-mono text-xl font-bold tracking-[0.45em] text-slate-900 outline-none transition placeholder:tracking-[0.35em] placeholder:text-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-50"
                />
                <p className="text-xs leading-5 text-slate-500">کد تأیید تا دو دقیقه اعتبار دارد.</p>
              </div>
            </>
          )}

          {error && (
            <p id="phone-verification-error" role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-sm leading-6 text-rose-700">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2.5 text-sm leading-6 text-emerald-700">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={isBusy || (codeSent && normalizedCode.length !== 6)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-emerald-600 px-4 py-3.5 text-sm font-black text-white shadow-sm transition hover:from-sky-700 hover:to-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBusy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {busy === 'send' ? 'در حال ارسال کد…' : busy === 'verify' ? 'در حال بررسی کد…' : codeSent ? 'تأیید شماره و ادامه سفارش' : 'ارسال کد تأیید'}
          </button>

          {codeSent && (
            <button
              type="button"
              onClick={() => void requestCode()}
              disabled={isBusy}
              className="w-full rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ارسال دوباره کد
            </button>
          )}
        </form>
      </div>
    </section>
  );
};
