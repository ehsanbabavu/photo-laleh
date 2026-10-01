import React, { useState } from 'react';
import { Lock, User as UserIcon, Phone, ArrowLeft, ShieldCheck } from 'lucide-react';
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

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    // Check admin credentials
    if (username.trim().toLowerCase() === 'ehsan' && password === 'ehsan123') {
      const adminUser: User = {
        id: 'admin-1',
        name: 'احسان محمدی (مدیر استودیو)',
        username: 'ehsan',
        role: 'admin',
        createdAt: '۱۴۰۴/۰۱/۰۱'
      };
      onLogin(adminUser);
      return;
    }

    // Check demo user
    if (username.trim().toLowerCase() === 'sara' && password === '123456') {
      const demoUser: User = {
        id: 'u-sara',
        name: 'سارا رضایی',
        username: 'sara',
        phone: '09123456789',
        role: 'user',
        createdAt: '۱۴۰۵/۰۱/۱۰'
      };
      onLogin(demoUser);
      return;
    }

    // Check stored registered users from localStorage
    try {
      const storedUsersRaw = localStorage.getItem('registered_users');
      if (storedUsersRaw) {
        const storedUsers: User[] = JSON.parse(storedUsersRaw);
        const found = storedUsers.find(
          u => u.username.toLowerCase() === username.trim().toLowerCase()
        );
        if (found) {
          onLogin(found);
          return;
        }
      }
    } catch {
      // Fallback
    }

    setLoginError('نام کاربری یا رمز عبور اشتباه است. (برای ادمین: ehsan / ehsan123)');
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
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
      phone: regPhone.trim() || '09120000000',
      role: 'user',
      createdAt: 'امروز'
    };

    try {
      const storedUsersRaw = localStorage.getItem('registered_users');
      const storedUsers: User[] = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
      storedUsers.push(newUser);
      localStorage.setItem('registered_users', JSON.stringify(storedUsers));
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
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-sky-400 to-emerald-400 text-white mb-3 sm:mb-4 shadow-lg shadow-sky-500/20">
          <TulipIcon className="w-6 h-6 sm:w-7 sm:h-7" />
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-l from-sky-700 via-teal-700 to-emerald-700 bg-clip-text text-transparent leading-tight">
          آتلیه دیجیتال لاله
        </h1>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white/95 border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-7 backdrop-blur-xl shadow-xl shadow-slate-200/60 z-10">
        {/* Admin Credentials Info Bar */}
        <div className="mb-5 p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-sky-50 to-emerald-50 border border-sky-200 text-slate-800 text-xs">
          <div className="flex items-center gap-2 font-bold mb-1 text-sky-700">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>اطلاعات ورود ادمین سیستم:</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2 pt-2 border-t border-sky-200/80">
            <div className="text-[11px] sm:text-xs text-slate-700">
              کاربری: <span className="font-mono font-bold text-sky-900 bg-sky-100/80 px-1.5 py-0.5 rounded">ehsan</span> | رمز: <span className="font-mono font-bold text-sky-900 bg-sky-100/80 px-1.5 py-0.5 rounded">ehsan123</span>
            </div>
            <button
              type="button"
              onClick={handleAdminQuickFill}
              className="text-[11px] bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 active:scale-95 text-white font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer text-center shadow-xs"
            >
              ورود سریع ادمین
            </button>
          </div>
        </div>

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
              className="w-full mt-3 bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 active:scale-98 text-white font-bold py-3.5 px-4 rounded-xl text-xs sm:text-sm transition-all duration-200 shadow-md shadow-sky-500/25 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
            >
              <span>ورود به سامانه</span>
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
