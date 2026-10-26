import React from 'react';
import {
  LayoutDashboard,
  BotMessageSquare,
  Printer,
  Palette,
  LogOut,
  ExternalLink,
  ChevronLeft,
  User as UserIcon,
  LifeBuoy,
  Sparkles,
  Volume2,
  Send,
  CreditCard,
  Database
} from 'lucide-react';
import { User } from '../../types';
import { TulipIcon } from '../TulipIcon';

export type AdminTab =
  | 'dashboard'
  | 'print_types'
  | 'announcements'
  | 'prompts_manager'
  | 'orders'
  | 'tickets'
  | 'blupal'
  | 'chatgpt'
  | 'telegram_bot'
  | 'database';

interface AdminSidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  user: User;
  onLogout: () => void;
  onSwitchToUserView?: () => void;
  totalOrdersCount?: number;
  activeOrdersCount?: number;
  printTypesCount?: number;
  openTicketsCount?: number;
  totalTicketsCount?: number;
  announcementsCount?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  user,
  onLogout,
  onSwitchToUserView,
  totalOrdersCount = 0,
  activeOrdersCount = 0,
  printTypesCount = 4,
  openTicketsCount = 0,
  totalTicketsCount = 0,
  announcementsCount = 0
}) => {
  const menuItems = [
    {
      id: 'dashboard' as AdminTab,
      label: 'پیشخوان مدیریت',
      icon: LayoutDashboard,
      badge: null,
      badgeStyle: null
    },
    {
      id: 'announcements' as AdminTab,
      label: 'مدیریت اطلاعیه‌ها',
      icon: Volume2,
      badge: null,
      badgeStyle: null
    },
    {
      id: 'print_types' as AdminTab,
      label: 'مدیریت انواع چاپ',
      icon: Palette,
      badge: null,
      badgeStyle: null
    },
    {
      id: 'prompts_manager' as AdminTab,
      label: 'مدیریت پرامپت‌های چاپ',
      icon: Sparkles,
      badge: null,
      badgeStyle: null
    },
    {
      id: 'orders' as AdminTab,
      label: 'سفارشات چاپ عکس',
      icon: Printer,
      badge: activeOrdersCount > 0 ? activeOrdersCount : null,
      badgeStyle: 'normal'
    },
    {
      id: 'tickets' as AdminTab,
      label: 'تیکت‌های پشتیبانی',
      icon: LifeBuoy,
      badge: openTicketsCount > 0 ? openTicketsCount : null,
      badgeStyle: 'pulsing_red'
    },
    {
      id: 'blupal' as AdminTab,
      label: 'تنظیمات بلوپال',
      icon: CreditCard,
      badge: null,
      badgeStyle: null
    },
    {
      id: 'chatgpt' as AdminTab,
      label: 'اتصال به هوش مصنوعی',
      icon: BotMessageSquare,
      badge: null,
      badgeStyle: null
    },
    {
      id: 'telegram_bot' as AdminTab,
      label: 'اتصال به ربات تلگرام',
      icon: Send,
      badge: null,
      badgeStyle: null
    },
    {
      id: 'database' as AdminTab,
      label: 'اتصال به دیتابیس MongoDB',
      icon: Database,
      badge: null,
      badgeStyle: null
    }
  ];

  return (
    <aside className="hidden lg:flex fixed top-[56px] sm:top-[72px] right-0 h-[calc(100vh-56px)] sm:h-[calc(100vh-72px)] w-72 bg-white border-l border-slate-200 z-30 flex-col justify-between shadow-xs overflow-y-auto">
      <div>
        {/* Top Header with Tulip Logo */}
        <div className="p-3.5 px-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs flex-shrink-0 p-1 overflow-hidden">
              <TulipIcon className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black leading-tight">
                <span className="text-slate-900">آتلیه دیجیتال </span>
                <span className="text-red-600">لاله</span>
              </h2>
              <span className="text-[10px] text-sky-600 font-bold">پنل مدیریت ادمین</span>
            </div>
          </div>
        </div>

        {/* Admin User Info Card (Compact) */}
        <div className="p-2.5 mx-3 my-2 rounded-xl bg-gradient-to-r from-sky-50/70 to-emerald-50/70 border border-sky-100 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-sky-600 shadow-xs border border-sky-200 flex-shrink-0">
            <UserIcon className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 truncate leading-tight">{user.name}</p>
            <p className="text-[10px] text-slate-500 font-mono">@{user.username}</p>
          </div>
        </div>

        {/* Navigation Links - Compact vertical spacing */}
        <nav className="px-2.5 space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[38px] ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-50 to-emerald-50 text-sky-800 border border-sky-200 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-sky-600' : 'text-slate-500'}`} />
                  <span className="text-xs">{item.label}</span>
                </div>

                {item.badge !== null && item.badge !== undefined && (
                  item.badgeStyle === 'pulsing_red' ? (
                    <span className="relative flex items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[10px] font-black font-mono bg-rose-600 text-white shadow-xs shadow-rose-600/50">
                        {item.badge}
                      </span>
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono bg-teal-100 text-teal-800 border border-teal-200">
                      {item.badge}
                    </span>
                  )
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-slate-200 space-y-1">
        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer min-h-[36px]"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>خروج از پنل ادمین</span>
        </button>
      </div>
    </aside>
  );
};
