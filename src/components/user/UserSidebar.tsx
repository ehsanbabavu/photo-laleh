import React from 'react';
import {
  Sparkles,
  History,
  HelpCircle,
  LogOut,
  Shield,
  ChevronLeft,
  User as UserIcon
} from 'lucide-react';
import { User } from '../../types';
import { TulipIcon } from '../TulipIcon';

export type UserTab = 'wizard' | 'orders' | 'help';

interface UserSidebarProps {
  currentTab: UserTab;
  onSelectTab: (tab: UserTab) => void;
  user: User;
  onLogout: () => void;
  onSwitchToAdmin?: () => void;
  userOrdersCount: number;
}

export const UserSidebar: React.FC<UserSidebarProps> = ({
  currentTab,
  onSelectTab,
  user,
  onLogout,
  onSwitchToAdmin,
  userOrdersCount
}) => {
  const menuItems = [
    {
      id: 'wizard' as UserTab,
      label: 'ثبت سفارش ۵ مرحله‌ای',
      icon: Sparkles,
      badge: 'جدید',
      badgeColor: 'text-sky-700 bg-sky-100 border border-sky-200'
    },
    {
      id: 'orders' as UserTab,
      label: 'سفارشات و پیگیری چاپ',
      icon: History,
      badge: userOrdersCount > 0 ? `${userOrdersCount}` : null,
      badgeColor: 'text-emerald-700 bg-emerald-100 border border-emerald-200'
    },
    {
      id: 'help' as UserTab,
      label: 'راهنمای انواع چاپ و ابعاد',
      icon: HelpCircle,
      badge: null
    }
  ];

  return (
    <aside className="hidden lg:flex fixed top-0 right-0 h-full w-72 bg-white border-l border-slate-200 z-30 flex-col justify-between shadow-xs">
      <div>
        {/* Header with Tulip Logo */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-400 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-sky-500/20 flex-shrink-0">
              <TulipIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">آتلیه دیجیتال لاله</h2>
              <span className="text-[11px] text-sky-600 font-bold">پنل کاربری مشتری</span>
            </div>
          </div>
        </div>

        {/* User Profile Card (Without photo) */}
        <div className="p-3.5 mx-4 my-3 rounded-2xl bg-gradient-to-r from-sky-50/70 to-emerald-50/70 border border-sky-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-sky-600 shadow-xs border border-sky-200 flex-shrink-0">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
              <p className="text-[11px] text-slate-500 font-mono truncate">
                {user.phone || `@${user.username}`}
              </p>
            </div>
          </div>

          <div className="mt-2.5 pt-2.5 border-t border-sky-200/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-600 font-medium">کیف پول:</span>
            <span className="font-mono text-emerald-700 font-bold">۰ تومان</span>
          </div>
        </div>

        {/* Nav links */}
        <nav className="px-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[44px] ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-50 to-emerald-50 text-sky-800 border border-sky-200 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md font-bold font-mono ${
                      item.badgeColor || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-slate-200 space-y-2">
        {(user.role === 'admin' || user.username === 'ehsan') && onSwitchToAdmin && (
          <button
            onClick={onSwitchToAdmin}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors cursor-pointer min-h-[42px]"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" />
              <span>ورود به پنل مدیریت ادمین</span>
            </div>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer min-h-[42px]"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>خروج از حساب</span>
        </button>
      </div>
    </aside>
  );
};
