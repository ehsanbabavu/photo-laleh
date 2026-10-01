/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, ApiConnection, Order } from './types';
import { INITIAL_APIS, INITIAL_ORDERS } from './data/mockData';
import { Navbar } from './components/Navbar';
import { AuthView } from './components/AuthView';
import { AdminSidebar, AdminTab } from './components/admin/AdminSidebar';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ChatGPTConnect } from './components/admin/ChatGPTConnect';
import { ApiManager } from './components/admin/ApiManager';
import { AdminOrders } from './components/admin/AdminOrders';
import { UserSidebar, UserTab } from './components/user/UserSidebar';
import { OrderWizard } from './components/user/OrderWizard';
import { UserOrders } from './components/user/UserOrders';
import { UserGuide } from './components/user/UserGuide';
import {
  CheckCircle2,
  Sparkles,
  History,
  HelpCircle,
  LayoutDashboard,
  BotMessageSquare,
  Network,
  Printer
} from 'lucide-react';

export default function App() {
  // Current logged in user (null by default so Login/Register screen displays on home page)
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Active view: 'admin' or 'user'
  const [activeView, setActiveView] = useState<'admin' | 'user'>('user');

  // Sub-tabs
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [userTab, setUserTab] = useState<UserTab>('wizard');

  // Data states
  const [apis, setApis] = useState<ApiConnection[]>(() => {
    try {
      const saved = localStorage.getItem('studio_apis_config');
      return saved ? JSON.parse(saved) : INITIAL_APIS;
    } catch {
      return INITIAL_APIS;
    }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('studio_orders_list');
      return saved ? JSON.parse(saved) : INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Persist APIs when updated
  const handleUpdateApi = (updated: ApiConnection) => {
    setApis((prev) => {
      const next = prev.map((a) => (a.id === updated.id ? updated : a));
      localStorage.setItem('studio_apis_config', JSON.stringify(next));
      return next;
    });
    showToast(`تنظیمات سرویس ${updated.name} به‌روزرسانی شد.`);
  };

  // Persist Orders when updated
  const handleUpdateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders((prev) => {
      const next = prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));
      localStorage.setItem('studio_orders_list', JSON.stringify(next));
      return next;
    });
    showToast('وضعیت سفارش با موفقیت تغییر یافت.');
  };

  // When a user completes the 5-step order wizard
  const handleNewOrder = (newOrder: Order) => {
    setOrders((prev) => {
      const next = [newOrder, ...prev];
      localStorage.setItem('studio_orders_list', JSON.stringify(next));
      return next;
    });
    setUserTab('orders');
    showToast(`سفارش شماره ${newOrder.trackingCode} با موفقیت در صف چاپ قرار گرفت!`);
  };

  // Handle Login
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'admin' || user.username === 'ehsan') {
      setActiveView('admin');
      setAdminTab('dashboard');
      showToast(`خوش آمدید احسان عزیز! پنل مدیریت ادمین آماده است.`);
    } else {
      setActiveView('user');
      setUserTab('wizard');
      showToast(`خوش آمدید ${user.name}! منوی ۵ مرحله‌ای ثبت سفارش آماده است.`);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setCurrentUser(null);
    setActiveView('user');
    showToast('از حساب کاربری خارج شدید.');
  };

  // If not logged in -> Show Login & Register page on main page
  if (!currentUser) {
    return <AuthView onLogin={handleLogin} />;
  }

  // Find ChatGPT API config (id: 1)
  const chatGptApi = apis.find((a) => a.id === 1) || apis[0];
  const activeApisCount = apis.filter((a) => a.isEnabled).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:right-6 z-50 bg-white border border-emerald-300 text-slate-900 px-4 py-3 rounded-2xl shadow-xl shadow-emerald-500/10 flex items-center gap-2.5 animate-fade-in backdrop-blur-xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="text-xs font-bold leading-relaxed">{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        user={currentUser}
        activeView={activeView}
        onLogout={handleLogout}
        onSwitchView={(v) => setActiveView(v)}
      />

      {/* Main Layout Container with Right Sidebar */}
      <div className="flex-1 flex">
        {/* VIEW 1: ADMIN PANEL */}
        {activeView === 'admin' ? (
          <>
            {/* Right Sidebar for Admin (Desktop) */}
            <AdminSidebar
              currentTab={adminTab}
              onSelectTab={(tab) => setAdminTab(tab)}
              user={currentUser}
              onLogout={handleLogout}
              onSwitchToUserView={() => setActiveView('user')}
              activeApisCount={activeApisCount}
              totalOrdersCount={orders.length}
            />

            {/* Admin Content Area */}
            <main className="flex-1 lg:pr-72 p-3 sm:p-6 lg:p-8 max-w-7xl w-full pb-20 lg:pb-8">
              {adminTab === 'dashboard' && (
                <AdminDashboard
                  orders={orders}
                  apis={apis}
                  onNavigateTab={(tab) => setAdminTab(tab)}
                />
              )}

              {adminTab === 'chatgpt' && (
                <ChatGPTConnect
                  chatGptApi={chatGptApi}
                  onUpdateApi={handleUpdateApi}
                />
              )}

              {adminTab === 'apis' && (
                <ApiManager
                  apis={apis}
                  onUpdateApi={handleUpdateApi}
                />
              )}

              {adminTab === 'orders' && (
                <AdminOrders
                  orders={orders}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                />
              )}
            </main>
          </>
        ) : (
          /* VIEW 2: USER PANEL */
          <>
            {/* Right Sidebar for User (Desktop) */}
            <UserSidebar
              currentTab={userTab}
              onSelectTab={(tab) => setUserTab(tab)}
              user={currentUser}
              onLogout={handleLogout}
              onSwitchToAdmin={
                currentUser.role === 'admin' || currentUser.username === 'ehsan'
                  ? () => setActiveView('admin')
                  : undefined
              }
              userOrdersCount={orders.filter((o) => o.userId === currentUser.id).length}
            />

            {/* User Content Area */}
            <main className="flex-1 lg:pr-72 p-3 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto pb-20 lg:pb-8">
              {userTab === 'wizard' && (
                <OrderWizard
                  user={currentUser}
                  onOrderCompleted={handleNewOrder}
                />
              )}

              {userTab === 'orders' && (
                <UserOrders
                  orders={orders}
                  user={currentUser}
                  onStartNewOrder={() => setUserTab('wizard')}
                />
              )}

              {userTab === 'help' && <UserGuide />}
            </main>
          </>
        )}
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (No Hamburger / Menu icon) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 z-40 px-3 py-2 flex items-center justify-around shadow-xl">
        {activeView === 'user' ? (
          <>
            <button
              onClick={() => setUserTab('wizard')}
              className={`flex-1 flex flex-col items-center gap-1 cursor-pointer py-1 px-2 rounded-xl transition-all ${
                userTab === 'wizard' ? 'text-sky-700 font-bold scale-105' : 'text-slate-500'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-[10px]">ثبت سفارش</span>
            </button>

            <button
              onClick={() => setUserTab('orders')}
              className={`flex-1 flex flex-col items-center gap-1 cursor-pointer py-1 px-2 rounded-xl transition-all ${
                userTab === 'orders' ? 'text-emerald-700 font-bold scale-105' : 'text-slate-500'
              }`}
            >
              <History className="w-4 h-4" />
              <span className="text-[10px]">پیگیری</span>
            </button>

            <button
              onClick={() => setUserTab('help')}
              className={`flex-1 flex flex-col items-center gap-1 cursor-pointer py-1 px-2 rounded-xl transition-all ${
                userTab === 'help' ? 'text-teal-700 font-bold scale-105' : 'text-slate-500'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span className="text-[10px]">راهنما</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setAdminTab('dashboard')}
              className={`flex-1 flex flex-col items-center gap-1 cursor-pointer py-1 px-1.5 rounded-xl transition-all ${
                adminTab === 'dashboard' ? 'text-sky-700 font-bold scale-105' : 'text-slate-500'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-[10px]">پیشخوان</span>
            </button>

            <button
              onClick={() => setAdminTab('chatgpt')}
              className={`flex-1 flex flex-col items-center gap-1 cursor-pointer py-1 px-1.5 rounded-xl transition-all ${
                adminTab === 'chatgpt' ? 'text-emerald-700 font-bold scale-105' : 'text-slate-500'
              }`}
            >
              <BotMessageSquare className="w-4 h-4" />
              <span className="text-[10px]">ChatGPT</span>
            </button>

            <button
              onClick={() => setAdminTab('apis')}
              className={`flex-1 flex flex-col items-center gap-1 cursor-pointer py-1 px-1.5 rounded-xl transition-all ${
                adminTab === 'apis' ? 'text-teal-700 font-bold scale-105' : 'text-slate-500'
              }`}
            >
              <Network className="w-4 h-4" />
              <span className="text-[10px]">۱۰ API</span>
            </button>

            <button
              onClick={() => setAdminTab('orders')}
              className={`flex-1 flex flex-col items-center gap-1 cursor-pointer py-1 px-1.5 rounded-xl transition-all ${
                adminTab === 'orders' ? 'text-sky-700 font-bold scale-105' : 'text-slate-500'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span className="text-[10px]">سفارشات</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
