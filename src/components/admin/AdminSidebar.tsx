import React, { useState } from 'react';
import { LayoutDashboard, BotMessageSquare, Printer, Palette, Truck, LogOut, ExternalLink, ChevronLeft, User as UserIcon, LifeBuoy, Sparkles, Volume2, Send, CreditCard, Database, Users, Settings, ChevronDown, HardDrive, MessageSquare, ShieldCheck, Activity, Maximize2, Receipt, Wallet } from 'lucide-react';
import { User } from '../../types';
import { TulipIcon } from '../TulipIcon';

export type AdminTab =
  | 'dashboard'
  | 'print_types'
  | 'print_sizes'
  | 'transport'
  | 'partner_invoices'
  | 'cost_requests'
  | 'announcements'
  | 'prompts_manager'
  | 'orders'
  | 'tickets'
  | 'blupal'
  | 'chatgpt'
  | 'telegram_bot'
  | 'database'
  | 'users'
  | 'backup'
  | 'sms'
  | 'sessions'
  | 'audit';

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
      id: 'orders' as AdminTab,
      label: 'سفارشات چاپ عکس',
      icon: Printer,
      badge: activeOrdersCount > 0 ? activeOrdersCount : null,
      badgeStyle: 'normal'
    },
    {
      id: 'announcements' as AdminTab,
      label: 'مدیریت اطلاعیه‌ها',
      icon: Volume2,
      badge: null,
      badgeStyle: null
    },
    {
      id: '__print_group__' as any,
      label: '',
      icon: Printer,
      badge: null,
      badgeStyle: null
    },

    {
      id: 'tickets' as AdminTab,
      label: 'تیکت‌های پشتیبانی',
      icon: LifeBuoy,
      badge: openTicketsCount > 0 ? openTicketsCount : null,
      badgeStyle: 'pulsing_red'
    },
    {
      id: 'users' as AdminTab,
      label: 'مدیریت کاربران',
      icon: Users,
      badge: null,
      badgeStyle: null
    },
  ];

  const printItems = [
    { id: 'print_types' as AdminTab, label: 'مدیریت انواع چاپ', icon: Palette },
    { id: 'print_sizes' as AdminTab, label: 'مدیریت سایز', icon: Maximize2 },
    { id: 'transport' as AdminTab, label: 'ترابری', icon: Truck },
    { id: 'partner_invoices' as AdminTab, label: 'فاکتورهای صادر شده', icon: Receipt },
    { id: 'cost_requests' as AdminTab, label: 'بازبینی قیمت همکاران', icon: Wallet },
    { id: 'prompts_manager' as AdminTab, label: 'مدیریت پرامپت‌های چاپ', icon: Sparkles }
  ];

  const isPrintActive = printItems.some((item) => item.id === currentTab);
  // Open by default: these are the day-to-day screens (types, sizes, transport…)
  const [printOpen, setPrintOpen] = useState(true);

  const settingsItems = [
    {
      id: 'chatgpt' as AdminTab,
      label: 'اتصال به هوش مصنوعی',
      icon: BotMessageSquare
    },
    {
      id: 'database' as AdminTab,
      label: 'اتصال به دیتابیس MongoDB',
      icon: Database
    },
    {
      id: 'telegram_bot' as AdminTab,
      label: 'اتصال به ربات تلگرام',
      icon: Send
    },
    {
      id: 'blupal' as AdminTab,
      label: 'تنظیمات بلوپال',
      icon: CreditCard
    },
    {
      id: 'backup' as AdminTab,
      label: 'پشتیبان‌گیری و بازیابی',
      icon: HardDrive
    },
    {
      id: 'sms' as AdminTab,
      label: 'تنظیمات پیامک',
      icon: MessageSquare
    },
    {
      id: 'sessions' as AdminTab,
      label: 'دستگاه‌های فعال',
      icon: ShieldCheck
    },
    {
      id: 'audit' as AdminTab,
      label: 'گزارش فعالیت‌ها',
      icon: Activity
    }
  ];

  const isSettingsActive = settingsItems.some((item) => item.id === currentTab);
  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive);

  return (
    <aside className="hidden lg:flex fixed top-[56px] sm:top-[72px] lg:top-0 right-0 h-[calc(100vh-56px)] sm:h-[calc(100vh-72px)] lg:h-screen w-72 bg-white border-l border-slate-200 z-30 flex-col justify-between shadow-xs overflow-y-auto">
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
            <p className="text-[10px] text-slate-500 font-mono" dir="ltr">{user.phone}</p>
          </div>
        </div>

        {/* Navigation Links - Compact vertical spacing */}
        <nav className="px-2.5 space-y-0.5">
          {menuItems.map((item) => {
            if ((item as any).id === '__print_group__') {
              return (
                <div key="print-group" className="pt-0.5">
                  <button
                    onClick={() => setPrintOpen((v) => !v)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[38px] ${
                      isPrintActive
                        ? 'bg-gradient-to-r from-sky-50 to-emerald-50 text-sky-800 border border-sky-200 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Printer className={`w-4 h-4 flex-shrink-0 ${isPrintActive ? 'text-sky-600' : 'text-slate-500'}`} />
                      <span className="text-xs">مدیریت چاپ</span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${printOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {printOpen && (
                    <div className="mt-0.5 space-y-0.5 pr-3">
                      {printItems.map((sub) => {
                        const SubIcon = sub.icon;
                        const active = currentTab === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => onSelectTab(sub.id)}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer min-h-[32px] border-r-2 ${
                              active
                                ? 'text-sky-800 bg-sky-50 border-sky-500'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-transparent'
                            }`}
                          >
                            <SubIcon className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-sky-600' : 'text-slate-400'}`} />
                            <span className="truncate">{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

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

          {/* Settings group */}
          <div className="pt-1">
            <button
              onClick={() => setSettingsOpen((v) => !v)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[38px] ${
                isSettingsActive
                  ? 'bg-gradient-to-r from-sky-50 to-emerald-50 text-sky-800 border border-sky-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className={`w-4 h-4 flex-shrink-0 ${isSettingsActive ? 'text-sky-600' : 'text-slate-500'}`} />
                <span className="text-xs">تنظیمات</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${settingsOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {settingsOpen && (
              <div className="mt-0.5 space-y-0.5 pr-3">
                {settingsItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectTab(item.id)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer min-h-[32px] border-r-2 ${
                        isActive
                          ? 'text-sky-800 bg-sky-50 border-sky-500'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-transparent rtl:border-r-2'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
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
