import React, { useState } from 'react';
import {
  ShieldCheck,
  LogOut,
  Sparkles,
  Menu,
  X,
  LayoutDashboard,
  Palette,
  Printer,
  BotMessageSquare,
  Network,
  ChevronLeft,
  ExternalLink,
  LifeBuoy,
  Volume2,
  CreditCard,
  Database
} from 'lucide-react';
import { User, PrintTypeOption } from '../types';
import { AdminTab } from './admin/AdminSidebar';
import { TulipIcon } from './TulipIcon';

interface NavbarProps {
  user: User | null;
  activeView: 'admin' | 'user' | 'auth';
  onLogout: () => void;
  onSwitchView: (view: 'admin' | 'user') => void;
  adminTab?: AdminTab;
  onSelectAdminTab?: (tab: AdminTab) => void;
  totalOrdersCount?: number;
  activeOrdersCount?: number;
  printTypesCount?: number;
  openTicketsCount?: number;
  totalTicketsCount?: number;
  announcementsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeView,
  onLogout,
  onSwitchView,
  adminTab = 'dashboard',
  onSelectAdminTab,
  totalOrdersCount = 0,
  activeOrdersCount = 0,
  printTypesCount = 4,
  openTicketsCount = 0,
  totalTicketsCount = 0,
  announcementsCount = 0
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleAdminTabSelect = (tab: AdminTab) => {
    if (onSelectAdminTab) {
      onSelectAdminTab(tab);
    }
    setDrawerOpen(false);
  };

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
      id: 'database' as AdminTab,
      label: 'اتصال به دیتابیس MongoDB',
      icon: Database,
      badge: null,
      badgeStyle: null
    }
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-6 py-2.5 sm:py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          
          {/* Right side: Brand and Hamburger for Admin */}
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Hamburger button visible on mobile/tablet when view is admin */}
            {user && activeView === 'admin' && (
              <button
                type="button"
                onClick={toggleDrawer}
                className="lg:hidden w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center transition-all cursor-pointer border border-slate-200"
                aria-label="منوی مدیریت"
                title="منوی مدیریت"
              >
                {drawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}

            {activeView !== 'admin' && (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs flex-shrink-0 p-1 overflow-hidden">
                  <TulipIcon className="w-full h-full object-contain" />
                </div>
                <div className="min-w-0">
                  <span className="font-black text-sm sm:text-base tracking-tight truncate block">
                    <span className="text-slate-900">آتلیه دیجیتال </span>
                    <span className="text-red-600">لاله</span>
                  </span>
                  <span className="hidden sm:inline text-[11px] text-slate-500 font-medium">
                    سامانه هوشمند چاپ عکس و پردازش تصویر
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Left side: View switcher & User Name (Hidden in Admin View) */}
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {activeView === 'admin' ? (
                /* Admin View: ONLY Logout button */
                <button
                  onClick={onLogout}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                  title="خروج از پنل مدیریت"
                  aria-label="خروج"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              ) : (
                /* User View: Switcher, Profile and Logout button */
                <>
                  {/* Admin Switcher if role is admin */}
                  {(user.role === 'admin' || user.username === 'ehsan') && (
                    <div className="flex items-center gap-1 p-0.5 sm:p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                      <button
                        onClick={() => onSwitchView('admin')}
                        className="px-2 sm:px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-slate-600 hover:text-slate-900"
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

                  {/* Logout button */}
                  <button
                    onClick={onLogout}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    title="خروج از حساب"
                    aria-label="خروج"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
      </header>

      {/* Hamburger drawer Overlay & Panel (Admin Mobile Drawer) */}
      {user && activeView === 'admin' && drawerOpen && (
        <div className="fixed inset-0 z-40 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300"
            onClick={toggleDrawer}
          />

          {/* Drawer content panel */}
          <div className="relative flex flex-col w-72 max-w-xs bg-white h-full shadow-2xl z-50 text-right animate-slideInRight border-l border-slate-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs p-1 overflow-hidden flex-shrink-0">
                  <TulipIcon className="w-full h-full object-contain" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black leading-tight">
                    <span className="text-slate-900">آتلیه دیجیتال </span>
                    <span className="text-red-600">لاله</span>
                  </h4>
                  <span className="text-[10px] text-sky-600 font-bold block">منوی ادمین</span>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleDrawer}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer border border-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = adminTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleAdminTabSelect(item.id)}
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

                    {item.badge !== null && item.badge !== undefined && (
                      item.badgeStyle === 'pulsing_red' ? (
                        <span className="relative flex items-center justify-center">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-black font-mono bg-rose-600 text-white shadow-xs shadow-rose-600/50">
                            {item.badge}
                          </span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-teal-100 text-teal-800 border border-teal-200">
                          {item.badge}
                        </span>
                      )
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/50 space-y-2">
              <button
                onClick={() => {
                  onLogout();
                  setDrawerOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer min-h-[42px]"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>خروج از پنل ادمین</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
