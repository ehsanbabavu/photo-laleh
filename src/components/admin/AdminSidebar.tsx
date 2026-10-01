import React from 'react';
import {
  LayoutDashboard,
  BotMessageSquare,
  Network,
  Printer,
  Palette,
  LogOut,
  ExternalLink,
  ChevronLeft,
  User as UserIcon
} from 'lucide-react';
import { User } from '../../types';
import { TulipIcon } from '../TulipIcon';

export type AdminTab = 'dashboard' | 'chatgpt' | 'apis' | 'orders' | 'print_types' | 'prompts_manager';

interface AdminSidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  user: User;
  onLogout: () => void;
  onSwitchToUserView: () => void;
  activeApisCount: number;
  totalOrdersCount: number;
  printTypesCount?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  user,
  onLogout,
  onSwitchToUserView,
  activeApisCount,
  totalOrdersCount,
  printTypesCount = 4
}) => {
  const menuItems = [
    {
      id: 'dashboard' as AdminTab,
      label: 'پیشخوان مدیریت',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'print_types' as AdminTab,
      label: 'مدیریت انواع چاپ',
      icon: Palette,
      badge: `${printTypesCount} خدمت`,
      badgeColor: 'text-indigo-700 bg-indigo-50 border border-indigo-200'
    },
    {
      id: 'orders' as AdminTab,
      label: 'سفارشات چاپ عکس',
      icon: Printer,
      badge: `${totalOrdersCount}`,
      badgeColor: 'text-teal-700 bg-teal-100 border border-teal-200'
    },
    {
      id: 'chatgpt' as AdminTab,
      label: 'اتصال به چت جی پی تی',
      icon: BotMessageSquare,
      badge: 'GPT-4o',
      badgeColor: 'text-emerald-700 bg-emerald-100 border border-emerald-200'
    },
    {
      id: 'apis' as AdminTab,
      label: 'اتصال به ۱۰ API مجزا',
      icon: Network,
      badge: `${activeApisCount}/10`,
      badgeColor: 'text-sky-700 bg-sky-100 border border-sky-200'
    }
  ];

  return (
    <aside className="hidden lg:flex fixed top-0 right-0 h-full w-72 bg-white border-l border-slate-200 z-30 flex-col justify-between shadow-xs">
      <div>
        {/* Top Header with Tulip Logo */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-400 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-sky-500/20 flex-shrink-0">
              <TulipIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 leading-tight">آتلیه دیجیتال لاله</h2>
              <span className="text-[11px] text-sky-600 font-bold">پنل مدیریت ادمین</span>
            </div>
          </div>
        </div>

        {/* Admin User Info Card (Without photo) */}
        <div className="p-3.5 mx-4 my-3 rounded-2xl bg-gradient-to-r from-sky-50/70 to-emerald-50/70 border border-sky-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-sky-600 shadow-xs border border-sky-200 flex-shrink-0">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
            <p className="text-[11px] text-slate-500 font-mono">@{user.username}</p>
          </div>
        </div>

        {/* Navigation Links */}
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
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold ${
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
        {/* Switch to user view */}
        <button
          onClick={onSwitchToUserView}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer min-h-[42px]"
        >
          <div className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5 text-sky-500" />
            <span>مشاهده سامانه مشتری</span>
          </div>
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer min-h-[42px]"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>خروج از پنل ادمین</span>
        </button>
      </div>
    </aside>
  );
};
