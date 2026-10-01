import React from 'react';
import {
  ShieldCheck,
  LogOut,
  Sparkles,
  User as UserIcon
} from 'lucide-react';
import { User } from '../types';
import { TulipIcon } from './TulipIcon';

interface NavbarProps {
  user: User | null;
  activeView: 'admin' | 'user' | 'auth';
  onLogout: () => void;
  onSwitchView: (view: 'admin' | 'user') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeView,
  onLogout,
  onSwitchView
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-3 sm:px-6 py-2.5 sm:py-3 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Right side: Brand with Tulip Logo (No hamburger menu button) */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-sky-400 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-sky-400/20 flex-shrink-0">
            <TulipIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="font-black text-sm sm:text-base bg-gradient-to-l from-sky-600 to-emerald-600 bg-clip-text text-transparent tracking-tight truncate block">
              آتلیه دیجیتال لاله
            </span>
            <span className="hidden sm:inline text-[11px] text-slate-500 font-medium">
              سامانه هوشمند چاپ عکس و پردازش تصویر
            </span>
          </div>
        </div>

        {/* Left side: View switcher & User Name (No user avatar image) */}
        {user ? (
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Admin Switcher if role is admin */}
            {(user.role === 'admin' || user.username === 'ehsan') && (
              <div className="flex items-center gap-1 p-0.5 sm:p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                <button
                  onClick={() => onSwitchView('admin')}
                  className={`px-2 sm:px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs ${
                    activeView === 'admin'
                      ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>ادمین</span>
                </button>
                <button
                  onClick={() => onSwitchView('user')}
                  className={`px-2 sm:px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs ${
                    activeView === 'user'
                      ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-200" />
                  <span className="hidden xs:inline">منوی</span>
                  <span>کاربر</span>
                </button>
              </div>
            )}

            {/* User Profile Info (No photo/avatar) */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800">
              <UserIcon className="w-3.5 h-3.5 text-sky-600" />
              <span className="truncate max-w-[120px]">{user.name}</span>
            </div>

            {/* Logout button */}
            <button
              onClick={onLogout}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="خروج از حساب"
              aria-label="خروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
};
