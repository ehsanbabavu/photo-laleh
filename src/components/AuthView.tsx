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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Register fields
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdminQuickFill = () => {
    setMode('login');
    setUsername('ehsan');
    setPassword('ehsan123');
    setLoginError('');
  };

  const handleUserQuickFill = () => {
    setMode('login');
    setUsername('sara');
    setPassword('123456');
    setLoginError('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const normalizedId = username.trim().toLowerCase().replace(/[\s-]/g, '');
    if (!normalizedId || !password) {
      setLoginError('نام کاربری و رمز عبور را وارد کنید.');
      return;
    }

    // Check admin credentials
    if (normalizedId === 'ehsan' && password === 'ehsan123') {
      const adminUser: User = {
        id: 'admin-1',
        name: 'احسان محمدی (مدیر استودیو)',
        username: 'ehsan',
        password: 'ehsan123',
        phone: '09121234567',
        role: 'admin',
        createdAt: '۱۴۰۴/۰۱/۰۱',
        walletBalance: 100000,
        hasUsedFirstOrderGift: false
      };
      onLogin(adminUser);
      return;
    }

    // Check demo user
    if (normalizedId === 'sara' && password === '123456') {
      const demoUser: User = {
        id: 'u-sara',
        name: 'سارا رضایی',
        username: 'sara',
        password: '123456',
        phone: '09123456789',
        role: 'user',
        createdAt: '۱۴۰۵/۰۱/۱۰',
        walletBalance: 100000,
        hasUsedFirstOrderGift: false
      };
      onLogin(demoUser);
      return;
    }

    // Check users stored in the database (username or phone number)
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const dbUsers: User[] = await res.json();
        const found = dbUsers.find(u => {
          const byUsername = String(u.username || '').trim().toLowerCase().replace(/[\s-]/g, '') === normalizedId;
          const byPhone = String(u.phone || '').replace(/[\s-]/g, '') === normalizedId;
          return byUsername || byPhone;
        });

        if (found && found.password) {
          if (String(found.password) !== password) {
            setLoginError('رمز عبور اشتباه است.');
            return;
          }
          onLogin(found);
          return;
        }
      }
    } catch {
      // Network/API issue: fall through to the local fallbacks below
    } finally {
      setIsSubmitting(false);
    }

    // Check stored registered users from localStorage
    try {
      const storedUsersRaw = localStorage.getItem('registered_users');
      if (storedUsersRaw) {
        const storedUsers: User[] = JSON.parse(storedUsersRaw);
        const found = storedUsers.find(u => {
          const byUsername = String(u.username || '').trim().toLowerCase().replace(/[\s-]/g, '') === normalizedId;
          const byPhone = String(u.phone || '').replace(/[\s-]/g, '') === normalizedId;
          return byUsername || byPhone;
        });
        if (found && String(found.password || '') === password) {
          onLogin(found);
          return;
        }
      }
    } catch {
      // Fallback
    }

    setLoginError('نام کاربری یا رمز عبور اشتباه است. (برای ادمین: ehsan / ehsan123)');
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regFullName.trim() || !regUsername.trim() || !regPassword.trim()) {
      setRegError('لطفاً تمام فیلدهای الزامی را تکمیل کنید.');
      return;
    }

    if (regUsername.trim().toLowerCase() === 'ehsan') {
      setRegError('این نام کاربری برای مدیریت رزرو شده است.');
      return;
    }

    const newUser: User = {
      id: 'usr-' + Date.now(),
      name: regFullName.trim(),
      username: regUsername.trim().toLowerCase(),
      password: regPassword.trim(),
      phone: regPhone.trim() || '09120000000',
      role: 'user',
      createdAt: 'امروز',
      walletBalance: 100000,
      hasUsedFirstOrderGift: false
    };

    try {
      const storedUsersRaw = localStorage.getItem('registered_users');
      const storedUsers: User[] = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
      storedUsers.push(newUser);
      localStorage.setItem('registered_users', JSON.stringify(storedUsers));
    } catch {
      // ignore
    }

    // Persist the account in the database so it can log in from any device
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
    } catch {
      // ignore
    }

    onLogin(newUser);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center px-3 sm:px-6 py-6 sm:py-12 relative overflow-x-hidden">
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
                نام کاربری یا شماره موبایل
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="مثال: ehsan یا sara"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 pr-10 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 pr-10 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
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

            {/* Quick Demo links */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-1 text-[11px] sm:text-xs text-slate-500">
              <span>ورود تستی سریع:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAdminQuickFill}
                  className="text-sky-600 font-bold hover:underline cursor-pointer"
                >
                  ادمین (ehsan)
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={handleUserQuickFill}
                  className="text-emerald-600 font-bold hover:underline cursor-pointer"
                >
                  مشتری (سارا)
                </button>
              </div>
            </div>
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 pr-10 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 text-right">
                نام کاربری دلخواه (لاتین)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="مثال: pouria99"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 pr-10 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 text-right">
                شماره تلفن همراه
              </label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="09123456789"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 pr-10 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 pr-10 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
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
