import React from 'react';
import {
  LayoutDashboard,
  Sparkles,
  Package,
  History,
  LifeBuoy,
  LogOut,
  Shield,
  ChevronLeft,
  User as UserIcon,
  PackageSearch,
  Wallet
} from 'lucide-react';
import { User } from '../../types';
import { formatPrice } from '../../utils/formatters';
import { TulipIcon } from '../TulipIcon';

export type UserTab =
  | 'dashboard'
  | 'wizard'
  | 'orders'
  | 'tickets'
  | 'partner_orders'
  | 'partner_prices';

interface UserSidebarProps {
  currentTab: UserTab;
  onSelectTab: (tab: UserTab) => void;
  user: User;
  onLogout: () => void;
  onSwitchToAdmin?: () => void;
  userOrdersCount: number;
  userTicketsCount?: number;
  hasUnreadReply?: boolean;
}

export const UserSidebar: React.FC<UserSidebarProps> = ({
  currentTab,
  onSelectTab,
  user,
  onLogout,
  onSwitchToAdmin,
  userOrdersCount,
  userTicketsCount = 0,
  hasUnreadReply = false
}) => {
  const menuItems = [
    {
      id: 'dashboard' as UserTab,
      label: 'پیشخوان',
      icon: LayoutDashboard,
      badge: null,
      badgeColor: ''
    },
    {
      id: 'wizard' as UserTab,
      label: 'ثبت سفارش ۵ مرحله‌ای',
      icon: Sparkles,
      badge: null,
      badgeColor: 'text-sky-700 bg-sky-100 border border-sky-200'
    },
    {
      id: 'orders' as UserTab,
      label: 'سفارشات',
      icon: Package,
      badge: userOrdersCount > 0 ? `${userOrdersCount}` : null,
      badgeColor: 'text-emerald-700 bg-emerald-100 border border-emerald-200'
    },
    {
      id: 'tickets' as UserTab,
      label: 'تیکت و پشتیبانی',
      icon: LifeBuoy,
      badge: hasUnreadReply ? 'پاسخ جدید!' : (userTicketsCount > 0 ? `${userTicketsCount}` : null),
      badgeColor: hasUnreadReply
        ? 'text-white bg-red-600 border border-red-500 animate-pulse font-black shadow-xs'
        : 'text-teal-700 bg-teal-100 border border-teal-200',
      iconColor: hasUnreadReply ? 'text-red-600 animate-pulse' : undefined
    }
  ];

  // Colleagues have a dedicated panel with exactly two menus (like the admin panel):
  // their assigned print jobs and the cost price list.
  const isColleague = user.category === 'colleague';
  const visibleMenuItems = isColleague
    ? [
        {
          id: 'partner_orders' as UserTab,
          label: 'لیست سفارشات',
          icon: PackageSearch,
          badge: userOrdersCount > 0 ? `${userOrdersCount}` : null,
          badgeColor: 'text-emerald-700 bg-emerald-100 border border-emerald-200'
        },
        {
          id: 'partner_prices' as UserTab,
          label: 'لیست قیمت‌ها',
          icon: Wallet,
          badge: null,
          badgeColor: ''
        }
      ]
    : menuItems;

  return (
    <aside className="hidden lg:flex fixed top-[56px] sm:top-[72px] lg:top-0 right-0 h-[calc(100vh-56px)] sm:h-[calc(100vh-72px)] lg:h-screen w-72 bg-white border-l border-slate-200 z-30 flex-col justify-between shadow-xs">
      <div>
        {/* Header with Tulip Logo */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs flex-shrink-0 p-1 overflow-hidden">
              <TulipIcon className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-sm font-black leading-tight">
                <span className="text-slate-900">آتلیه دیجیتال </span>
                <span className="text-red-600">لاله</span>
              </h2>
              <span className="text-[11px] text-sky-600 font-bold">پنل کاربری {user.category === 'colleague' ? 'همکار' : 'مشتری'}</span>
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
                {user.phone || ''}
              </p>
            </div>
          </div>

          {user.category !== 'colleague' && (
            <div className="mt-2.5 pt-2.5 border-t border-sky-200/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-600 font-medium">کیف پول:</span>
              <span className="font-mono text-emerald-700 font-bold">
                {formatPrice(user.walletBalance ?? 0)}
              </span>
            </div>
          )}
        </div>

        {/* Nav links */}
        <nav className="px-3 space-y-1">
          {visibleMenuItems.map((item) => {
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
                  <Icon className={`w-4 h-4 ${item.iconColor || (isActive ? 'text-sky-600' : 'text-slate-500')}`} />
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
        {user.role === 'admin' && onSwitchToAdmin && (
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
