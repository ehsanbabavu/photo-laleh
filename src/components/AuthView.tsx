import React, { useState } from 'react';
import { Lock, User as UserIcon, Phone, ArrowLeft } from 'lucide-react';
import { User } from '../types';
import { TulipIcon } from './TulipIcon';

interface AuthViewProps {
  onLogin: (user: User) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Login fields
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Register fields
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Persian/Arabic digits are converted to Latin so users can type either form.
  const normalizeDigits = (value: string) =>
    value
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .replace(/[\s-()]/g, '');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const enteredPhone = normalizeDigits(phone);
    if (!enteredPhone || !password) {
      setLoginError('شماره موبایل و رمز عبور را وارد کنید.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: enteredPhone, password })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data.user) {
        onLogin(data.user as User);
        return;
      }
      if (data?.error) {
        setLoginError(data.error);
        return;
      }
    } catch {
      // network error -> generic message below
    } finally {
      setIsSubmitting(false);
    }

    setLoginError('شماره موبایل یا رمز عبور اشتباه است.');
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    const enteredPhone = normalizeDigits(regPhone);
    if (!regFullName.trim() || !enteredPhone || !regPassword.trim()) {
      setRegError('لطفاً نام، شماره موبایل و رمز عبور را تکمیل کنید.');
      return;
    }
    if (!/^09\d{9}$/.test(enteredPhone)) {
      setRegError('شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.');
      return;
    }

    setIsSubmitting(true);
    try {
      // A mobile number can only be registered once.
      let existing: User[] = [];
      try {
        const res = await fetch('/api/users');
        if (res.ok) existing = await res.json();
      } catch {
        // ignore
      }

      if (existing.some(u => normalizeDigits(String(u.phone || '')) === enteredPhone)) {
        setRegError('این شماره موبایل قبلاً ثبت‌نام شده است.');
        return;
      }

      const newUser: User = {
        id: 'usr-' + Date.now(),
        name: regFullName.trim(),
        phone: enteredPhone,
        password: regPassword.trim(),
        role: 'user',
        createdAt: 'امروز',
        walletBalance: 100000,
        hasUsedFirstOrderGift: false
      };

      // Persist the account in the database so it can log in from any device
      let created: User = newUser;
      try {
        const createRes = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUser)
        });
        if (!createRes.ok) {
          setRegError('ثبت‌نام ناموفق بود.');
          return;
        }
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: enteredPhone, password: newUser.password })
        });
        const loginData = await loginRes.json().catch(() => null);
        if (loginData?.user) created = loginData.user as User;
      } catch {
        setRegError('ثبت‌نام ناموفق بود.');
        return;
      }

      onLogin(created);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col justify-center items-center px-3 sm:px-6 py-6 sm:py-12 relative overflow-x-hidden">
      {/* Light blue and green ambient glowing orbs */}
      <div className="absolute top-1/4 -right-20 w-80 h-80 sm:w-96 sm:h-96 bg-sky-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-80 h-80 sm:w-96 sm:h-96 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header with Tulip Logo */}
      <div className="text-center mb-6 sm:mb-8 max-w-md w-full z-10 px-2">
        <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white border border-slate-200/90 shadow-xl shadow-slate-200/80 mb-3 sm:mb-4 p-2 overflow-hidden">
          <TulipIcon className="w-full h-full object-contain" />
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight">
          <span className="text-slate-900">آتلیه دیجیتال </span>
          <span className="text-red-600">لاله</span>
        </h1>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white/95 border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-7 backdrop-blur-xl shadow-xl shadow-slate-200/60 z-10">
        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-5 border border-slate-200">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            ورود به حساب
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            ثبت‌نام کاربر جدید
          </button>
        </div>

        {mode === 'login' ? (
          /* LOGIN FORM */
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            {loginError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs text-right font-medium">
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 text-right">
                شماره موبایل
              </label>
              <div className="relative">
                <input
                  type="tel"
                  inputMode="numeric"
                  required
                  placeholder="09123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-10 py-3 text-center placeholder:text-center text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 text-right">
                رمز عبور
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-10 py-3 text-center placeholder:text-center text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-3 bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 active:scale-98 text-white font-bold py-3.5 px-4 rounded-xl text-xs sm:text-sm transition-all duration-200 shadow-md shadow-sky-500/25 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
            >
              <span>{isSubmitting ? 'در حال بررسی...' : 'ورود به سامانه'}</span>
              <ArrowLeft className="w-4 h-4" />
            </button>

          </form>
        ) : (
          /* REGISTER FORM */
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            {/* 100,000 Tomans Welcome Gift Banner */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-200/80 flex items-center gap-2.5 text-right">
              <span className="text-xl">🎁</span>
              <div>
                <p className="text-xs font-black text-amber-900">
                  ۱۰۰,۰۰۰ تومان اعتبار هدیه کیف پول
                </p>
                <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                  با ثبت‌نام شما، این اعتبار به‌صورت خودکار در فاکتور اولین سفارش کسر می‌شود.
                </p>
              </div>
            </div>

            {regError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs text-right font-medium">
                {regError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 text-right">
                نام و نام خانوادگی
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="مثال: پوریا کریمی"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-10 py-3 text-center placeholder:text-center text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 text-right">
                شماره موبایل
              </label>
              <div className="relative">
                <input
                  type="tel"
                  inputMode="numeric"
                  required
                  placeholder="09123456789"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-10 py-3 text-center placeholder:text-center text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 text-right">
                رمز عبور
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="حداقل ۶ نویسه"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-10 py-3 text-center placeholder:text-center text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-3 bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 active:scale-98 text-white font-bold py-3.5 px-4 rounded-xl text-xs sm:text-sm transition-all duration-200 shadow-md shadow-sky-500/25 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
            >
              <span>ثبت‌نام و ورود مستقیم به پنل کاربری</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
