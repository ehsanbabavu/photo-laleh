/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Order, PrintTypeOption, SupportTicket, Announcement, BluPalSettings } from './types';
import { INITIAL_ORDERS, PRINT_TYPES, INITIAL_TICKETS, INITIAL_ANNOUNCEMENTS } from './data/mockData';
import { apiClient } from './services/apiClient';
import { Navbar } from './components/Navbar';
import { AuthView } from './components/AuthView';
import { AdminSidebar, AdminTab } from './components/admin/AdminSidebar';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminAnnouncements } from './components/admin/AdminAnnouncements';
import { ChatGPTConnect } from './components/admin/ChatGPTConnect';
import { AdminOrders } from './components/admin/AdminOrders';
import { PrintTypeManager } from './components/admin/PrintTypeManager';
import { PromptsManager } from './components/admin/PromptsManager';
import { AdminTickets } from './components/admin/AdminTickets';
import { AdminTelegramBot } from './components/admin/AdminTelegramBot';
import { AdminBluPalSettings } from './components/admin/AdminBluPalSettings';
import { AdminDatabaseSettings } from './components/admin/AdminDatabaseSettings';
import { AdminUsers } from './components/admin/AdminUsers';
import { AdminBackup } from './components/admin/AdminBackup';
import { parseRoute, routeToPath } from './utils/router';
import { UserSidebar, UserTab } from './components/user/UserSidebar';
import { OrderWizard } from './components/user/OrderWizard';
import { UserOrders } from './components/user/UserOrders';
import { UserTickets } from './components/user/UserTickets';
import { UserDashboard } from './components/user/UserDashboard';
import { aiQueueManager, QueueStateInfo } from './utils/aiQueueManager';
import {
  CheckCircle2,
  Sparkles,
  Package,
  History,
  LifeBuoy,
  LayoutDashboard,
  BotMessageSquare,
  Printer,
  Palette
} from 'lucide-react';

export default function App() {
  // Current logged in user (null by default so Login/Register screen displays on home page)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Active view + tabs are derived from the URL so a refresh keeps the page
  const initialRoute = typeof window !== 'undefined' ? parseRoute(window.location.pathname) : { view: 'user' as const, tab: 'dashboard' };
  const [activeView, setActiveView] = useState<'admin' | 'user'>(initialRoute.view);
  const [adminTab, setAdminTab] = useState<AdminTab>(
    initialRoute.view === 'admin' ? (initialRoute.tab as AdminTab) : 'dashboard'
  );
  const [userTab, setUserTab] = useState<UserTab>(
    initialRoute.view === 'user' ? (initialRoute.tab as UserTab) : 'dashboard'
  );

  // Data states
  const [orders, setOrders] = useState<Order[]>([]);

  // Support Tickets State
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  // Dynamic Print Types State (Managed by Admin & Database)
  const [printTypes, setPrintTypes] = useState<PrintTypeOption[]>(PRINT_TYPES);

  // AvalAI API configuration state
  const [avalaiApiKey, setAvalaiApiKey] = useState<string>('');

  // AvalAI Base URL state (https://api.avalai.ir/v1)
  const [avalaiBaseUrl, setAvalaiBaseUrl] = useState<string>('https://api.avalai.ir/v1');

  // Active Image Generation Model (gpt-image-2.5-sunburst)
  const [avalaiModel, setAvalaiModel] = useState<string>('gpt-image-2.5-sunburst');

  // AI Master On/Off Toggle state
  const [aiEnabled, setAiEnabled] = useState<boolean>(true);

  const handleUpdateAiEnabled = (enabled: boolean) => {
    setAiEnabled(enabled);
    apiClient.saveSettings({ aiEnabled: enabled });
    showToast(enabled ? 'موتور هوش مصنوعی روشن گردید.' : 'موتور هوش مصنوعی خاموش گردید.');
  };

  const [telegramToken, setTelegramToken] = useState<string>('');

  const [telegramChatId, setTelegramChatId] = useState<string>('');

  const [telegramEnabled, setTelegramEnabled] = useState<boolean>(false);

  // BluPal Gateway Settings State
  const [blupalSettings, setBlupalSettings] = useState<BluPalSettings>({
      blupalToken: '',
      blupalBaseUrl: 'https://blupal.top',
      blupalMerchantId: '',
      blupalCardNumber: '6219 8619 4528 7193',
      blupalAccountHolder: 'آتلیه تخصصی لاله',
      blupalIban: 'IR720560086190004528719301',
      blupalEnabled: true,
      blupalSandboxMode: true,
      blupalAutoPollInterval: 3
    });

  const handleSaveBluPalSettings = (newSettings: BluPalSettings) => {
    setBlupalSettings(newSettings);
    apiClient.saveSettings(newSettings);
    showToast('تنظیمات درگاه بلوپال با موفقیت ذخیره شد.');
  };

  const handleSaveTelegramSettings = (token: string, chatId: string, isEnabled: boolean) => {
    setTelegramToken(token);
    setTelegramChatId(chatId);
    setTelegramEnabled(isEnabled);
    apiClient.saveSettings({
      telegramToken: token,
      telegramChatId: chatId,
      telegramEnabled: isEnabled
    });
  };

  // Default prompts for image generation per print type mode
  const DEFAULT_PROMPTS: Record<string, string> = {
    personnel: 'پرتره پرسنلی رسمی و اداری، زمینه سفید یکدست، عکس ۳در۴ گذرنامه، نورپردازی آتلیه‌ای پرتره، کیفیت فوق‌العاده بالا، بدون عینک، نگاه روبرو',
    commercial: 'عکاسی تبلیغاتی و تجاری فاخر، نورپردازی متمرکز استودیویی روی محصول و مدل، بوکه نرم پس‌زمینه لوکس، کیفیت فوق‌العاده وضوح و رنگ عالی',
    bw_to_color: 'پرتره عکاسی رنگی زنده و بازیابی شده، عکس پرتره خانوادگی قدیمی رنگ‌آمیزی شده با وضوح بالا و حذف نویز و لکه',
    memorial: 'پرتره یادبود باوقار و احترام، پس‌زمینه محو ملایم، روشنایی یکنواخت، کیفیت استودیویی رتوش چهره',
    wedding: 'عکس دونفره عروس و داماد شیک و رمانتیک در عمارت باغ لوکس، نورپردازی بوکه رویایی غروب آفتاب، کیفیت ۳۲کی سینمایی'
  };

  const [printTypePrompts, setPrintTypePrompts] = useState<Record<string, string>>(DEFAULT_PROMPTS);

  // Keep the address bar in sync with the selected page
  React.useEffect(() => {
    if (isAuthChecking || !currentUser) return;
    const target = routeToPath(activeView, activeView === 'admin' ? adminTab : userTab);
    if (window.location.pathname !== target) {
      window.history.pushState({}, '', target);
    }
  }, [activeView, adminTab, userTab, currentUser, isAuthChecking]);

  // Browser back / forward
  React.useEffect(() => {
    const onPopState = () => {
      const route = parseRoute(window.location.pathname);
      if (route.view === 'admin') {
        setAdminTab(route.tab as AdminTab);
        setActiveView('admin');
      } else {
        setUserTab(route.tab as UserTab);
        setActiveView('user');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Restore the session from the server on page load
  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (active && data?.user) {
            setCurrentUser(data.user as User);
            const route = parseRoute(window.location.pathname);
            if (data.user.role === 'admin') {
              setActiveView(route.view === 'user' ? 'user' : 'admin');
              if (route.view === 'admin') setAdminTab(route.tab as AdminTab);
              else setUserTab(route.tab as UserTab);
            } else {
              setActiveView('user');
              setUserTab(route.tab as UserTab);
            }
          }
        }
      } catch {
        // ignore
      } finally {
        if (active) setIsAuthChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Fetch initial database state from server
  React.useEffect(() => {
    async function loadBackendData() {
      const data = await apiClient.getAllDb();
      if (data) {
        if (Array.isArray(data.orders)) {
          setOrders(data.orders);
        }
        if (Array.isArray(data.tickets)) {
          setTickets(data.tickets);
        }
        if (Array.isArray(data.printTypes)) {
          setPrintTypes(data.printTypes);
        }
        if (data.prompts && Object.keys(data.prompts).length > 0) {
          setPrintTypePrompts(data.prompts);
        }
        if (Array.isArray(data.announcements)) {
          setAnnouncements(data.announcements);
        }
        if (data.settings) {
          if (data.settings.avalaiApiKey) {
            setAvalaiApiKey(data.settings.avalaiApiKey);
          }
          if (data.settings.avalaiBaseUrl) {
            setAvalaiBaseUrl(data.settings.avalaiBaseUrl);
          }
          if (data.settings.avalaiModel) {
            setAvalaiModel(data.settings.avalaiModel);
          }
          if (data.settings.telegramToken !== undefined) {
            setTelegramToken(data.settings.telegramToken);
          }
          if (data.settings.telegramChatId !== undefined) {
            setTelegramChatId(data.settings.telegramChatId);
          }
          if (data.settings.telegramEnabled !== undefined) {
            setTelegramEnabled(data.settings.telegramEnabled);
          }
          if (data.settings.blupalToken !== undefined || data.settings.blupalCardNumber) {
            const nextBluPal: BluPalSettings = {
              blupalToken: data.settings.blupalToken || '',
              blupalBaseUrl: data.settings.blupalBaseUrl || 'https://blupal.top',
              blupalMerchantId: data.settings.blupalMerchantId || '',
              blupalCardNumber: data.settings.blupalCardNumber || '6219 8619 4528 7193',
              blupalAccountHolder: data.settings.blupalAccountHolder || 'آتلیه تخصصی لاله',
              blupalIban: data.settings.blupalIban || 'IR720560086190004528719301',
              blupalEnabled: data.settings.blupalEnabled ?? true,
              blupalSandboxMode: data.settings.blupalSandboxMode ?? true,
              blupalAutoPollInterval: data.settings.blupalAutoPollInterval || 3
            };
            setBlupalSettings(nextBluPal);
          }
        }
      }
    }
    loadBackendData();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const backendOrders = await apiClient.getOrders();
        if (Array.isArray(backendOrders) && backendOrders.length > 0) {
          setOrders((prev) => {
            const isDifferent = backendOrders.some((bo) => {
              const po = prev.find((p) => p.id === bo.id);
              return !po || po.status !== bo.status;
            });
            return isDifferent ? backendOrders : prev;
          });
        }
      } catch (e) {}
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateAvalaiApiKey = (newKey: string) => {
    const trimmed = newKey.trim();
    setAvalaiApiKey(trimmed);
    apiClient.saveSettings({ avalaiApiKey: trimmed });
    showToast('کلید دسترسی AvalAI با موفقیت ذخیره شد.');
  };

  const handleUpdateAvalaiBaseUrl = (newUrl: string) => {
    const sanitized = newUrl.trim().replace(/\/$/, ''); // Remove trailing slash
    setAvalaiBaseUrl(sanitized);
    apiClient.saveSettings({ avalaiBaseUrl: sanitized });
    showToast('آدرس پایه API با موفقیت ذخیره شد.');
  };

  const handleUpdateAvalaiModel = (newModel: string) => {
    const trimmed = newModel.trim();
    setAvalaiModel(trimmed);
    apiClient.saveSettings({ avalaiModel: trimmed });
    showToast('مدل تولید تصویر با موفقیت به‌روز شد.');
  };

  const handleSavePrompt = (printTypeId: string, prompt: string) => {
    setPrintTypePrompts((prev) => {
      const next = { ...prev, [printTypeId]: prompt };
      apiClient.savePrompts(next);
      return next;
    });
    showToast('پرامپت سبک چاپ با موفقیت به‌روزرسانی شد.');
  };

  const handleResetPrompts = () => {
    setPrintTypePrompts(DEFAULT_PROMPTS);
    apiClient.savePrompts(DEFAULT_PROMPTS);
    showToast('پرامپت‌ها به مقادیر پیش‌فرض بازنشانی شدند.');
  };

  // Announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const handleAddAnnouncement = (newAnnData: Omit<Announcement, 'id' | 'createdAt' | 'readBy'>) => {
    const newAnn: Announcement = {
      ...newAnnData,
      id: `ann-${Date.now()}`,
      createdAt: new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date()),
      readBy: []
    };
    setAnnouncements((prev) => {
      const next = [newAnn, ...prev];
      apiClient.saveAnnouncements(next);
      return next;
    });
    showToast('اطلاعیه جدید با موفقیت منتشر شد.');
  };

  const handleUpdateAnnouncement = (updated: Announcement) => {
    setAnnouncements((prev) => {
      const next = prev.map((a) => (a.id === updated.id ? updated : a));
      apiClient.saveAnnouncements(next);
      return next;
    });
    showToast('اطلاعیه با موفقیت به‌روزرسانی شد.');
  };

  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncements((prev) => {
      const next = prev.filter((a) => a.id !== id);
      apiClient.saveAnnouncements(next);
      return next;
    });
    showToast('اطلاعیه با موفقیت حذف گردید.');
  };

  const handleMarkAnnouncementAsRead = (announcementId: string) => {
    if (!currentUser) return;
    setAnnouncements((prev) => {
      const next = prev.map((a) => {
        if (a.id === announcementId) {
          const currentReadBy = Array.isArray(a.readBy) ? a.readBy : [];
          if (!currentReadBy.includes(currentUser.id)) {
            return {
              ...a,
              readBy: [...currentReadBy, currentUser.id]
            };
          }
        }
        return a;
      });
      return next;
    });
  };

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // AI Queue State with 1-Minute Sequential Rate-Limit Protection
  const [queueInfo, setQueueInfo] = useState<QueueStateInfo>(() => aiQueueManager.getQueueInfo());

  // Subscribe to AI Queue Manager updates on mount
  React.useEffect(() => {
    const unsubOrder = aiQueueManager.onOrderUpdate((updatedOrder, toastMsg) => {
      setOrders((prev) => {
        const next = prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
        apiClient.saveOrder(updatedOrder);
        return next;
      });
      if (toastMsg) {
        showToast(toastMsg);
      }
    });

    const unsubQueue = aiQueueManager.onQueueStateChange((info) => {
      setQueueInfo(info);
    });

    return () => {
      unsubOrder();
      unsubQueue();
    };
  }, []);

  // Persist Print Types when added, edited, deleted, reset
  const handleAddPrintType = (newItem: PrintTypeOption) => {
    setPrintTypes((prev) => {
      const next = [...prev, newItem];
      apiClient.savePrintTypes(next);
      return next;
    });
    showToast(`نوع چاپ «${newItem.title}» با موفقیت افزوده شد.`);
  };

  const handleUpdatePrintType = (updated: PrintTypeOption) => {
    setPrintTypes((prev) => {
      const next = prev.map((p) => (p.id === updated.id ? updated : p));
      apiClient.savePrintTypes(next);
      return next;
    });
    showToast(`تغییرات نوع چاپ «${updated.title}» ذخیره شد.`);
  };

  const handleDeletePrintType = (id: string) => {
    setPrintTypes((prev) => {
      const target = prev.find((p) => p.id === id);
      const next = prev.filter((p) => p.id !== id);
      apiClient.savePrintTypes(next);
      if (target) {
        showToast(`نوع چاپ «${target.title}» حذف گردید.`);
      }
      return next;
    });
  };

  const handleResetPrintTypes = () => {
    setPrintTypes(PRINT_TYPES);
    apiClient.savePrintTypes(PRINT_TYPES);
    showToast('کارت‌های نوع چاپ به حالت اولیه بازنشانی شدند.');
  };

  // Persist Orders when updated
  const handleUpdateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders((prev) => {
      const next = prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));
      apiClient.syncOrders(next);
      return next;
    });
    showToast('وضعیت سفارش با موفقیت تغییر یافت.');
  };

  const handleUpdateOrder = (updatedOrder: Order) => {
    setOrders((prev) => {
      const next = prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
      apiClient.saveOrder(updatedOrder);
      return next;
    });
  };

  const handleDeleteOrder = (orderId: string) => {
    setOrders((prev) => {
      const next = prev.filter((o) => o.id !== orderId);
      apiClient.deleteOrder(orderId);
      return next;
    });
    showToast('سفارش با موفقیت حذف گردید.');
  };

  const handleClearAllOrders = () => {
    setOrders([]);
    apiClient.syncOrders([]);
    showToast('تمامی سفارشات سیستم با موفقیت حذف شدند.');
  };

  const processingOrderIdsRef = useRef<Set<string>>(new Set());

  // When a user completes the order wizard
  const handleNewOrder = (newOrder: Order) => {
    // Prevent duplicate processing of the same order
    if (processingOrderIdsRef.current.has(newOrder.id)) {
      return;
    }
    processingOrderIdsRef.current.add(newOrder.id);

    setOrders((prev) => {
      // Ensure this order id is not already in the state
      if (prev.some((o) => o.id === newOrder.id)) {
        return prev;
      }
      const next = [newOrder, ...prev];
      apiClient.saveOrder(newOrder);
      return next;
    });
    setUserTab('orders');

    // Enqueue order in AI Sequential Queue with 1-Minute Rate-Limit Protection
    aiQueueManager.enqueue({
      order: newOrder,
      apiKey: avalaiApiKey,
      baseUrl: avalaiBaseUrl,
      model: avalaiModel,
      prompt: newOrder.aiPromptUsed || printTypePrompts[newOrder.printType] || 'پرتره باکیفیت و رتوش شده آتلیه',
      commercialPrompt: printTypePrompts['commercial'] || 'عکاسی تبلیغاتی و تجاری فاخر، نورپردازی متمرکز استودیویی روی محصول و مدل، بوکه نرم پس‌زمینه لوکس، کیفیت فوق‌العاده وضوح و رنگ عالی',
      queuedAt: Date.now()
    });
  };

  // Handle Login
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      setActiveView('admin');
      setAdminTab('dashboard');
      window.history.pushState({}, '', routeToPath('admin', 'dashboard'));
    } else {
      setActiveView('user');
      setUserTab('dashboard');
      window.history.pushState({}, '', routeToPath('user', 'dashboard'));
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setCurrentUser(null);
    setActiveView('user');
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    window.history.pushState({}, '', '/');
    showToast('از حساب کاربری خارج شدید.');
  };

  // Handle User Profile Update (Name, Password)
  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    apiClient.updateUser(updatedUser.id, updatedUser).catch(() => undefined);
    showToast('اطلاعات کاربری با موفقیت به‌روزرسانی شد.');
  };

  // Handle Support Tickets Update (Sync across Admin and User)
  const handleUpdateTickets = (nextTickets: SupportTicket[]) => {
    const removedIds = tickets.filter((t) => !nextTickets.some((n) => n.id === t.id)).map((t) => t.id);
    setTickets(nextTickets);
    nextTickets.forEach((t) => {
      apiClient.saveTicket(t).catch(() => undefined);
    });
    removedIds.forEach((id) => {
      apiClient.deleteTicket(id).catch(() => undefined);
    });
  };

  // Track which tickets have been read/seen by user to manage the blinking reply indicator
  const [readTicketTimestamps, setReadTicketTimestamps] = useState<Record<string, string>>({});

  const handleTicketRead = useCallback((ticketId: string, updatedAt: string) => {
    setReadTicketTimestamps((prev) => {
      if (prev[ticketId] === updatedAt) return prev;
      return { ...prev, [ticketId]: updatedAt };
    });
  }, []);

  // If not logged in -> Show Login & Register page on main page
  if (isAuthChecking) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50">
        <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return <AuthView onLogin={handleLogin} />;
  }

  const openTicketsCount = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;
  const activeOrdersCount = orders.filter((o) => o.status !== 'delivered').length;

  // Check if any support ticket of current user has received an answer/reply that hasn't been viewed
  const myUserTickets = tickets.filter(
    (t) => t.userId === currentUser.id || t.userName === currentUser.name
  );

  const hasUnreadTicketReply = myUserTickets.some((t) => {
    const lastMsg = t.messages[t.messages.length - 1];
    const isAnswered = t.status === 'answered' || (lastMsg && lastMsg.sender === 'support');
    if (!isAnswered) return false;
    const lastRead = readTicketTimestamps[t.id];
    // If user hasn't opened this ticket since its last update
    return !lastRead || t.updatedAt > lastRead;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-sky-500 selection:text-white pt-[56px] sm:pt-[72px]">
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
        adminTab={adminTab}
        onSelectAdminTab={(tab) => setAdminTab(tab)}
        totalOrdersCount={orders.length}
        activeOrdersCount={activeOrdersCount}
        printTypesCount={printTypes.length}
        openTicketsCount={openTicketsCount}
        totalTicketsCount={tickets.length}
        announcementsCount={announcements.length}
      />

      {/* Main Layout Container with Right Sidebar */}
      <div className="flex-1 flex">
        {/* VIEW 1: ADMIN PANEL */}
        {activeView === 'admin' ? (
          <>
            {/* Admin Right Sidebar (Desktop) */}
            <AdminSidebar
              currentTab={adminTab}
              onSelectTab={(tab) => setAdminTab(tab as AdminTab)}
              user={currentUser}
              onLogout={handleLogout}
              totalOrdersCount={orders.length}
              activeOrdersCount={activeOrdersCount}
              printTypesCount={printTypes.length}
              openTicketsCount={openTicketsCount}
              totalTicketsCount={tickets.length}
              announcementsCount={announcements.length}
            />

            {/* Admin Content Area */}
            <main className="flex-1 lg:pr-72 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-8">
              {adminTab === 'dashboard' && (
                <AdminDashboard
                  orders={orders}
                  queueInfo={queueInfo}
                  tickets={tickets}
                  onNavigateTab={(tab) => setAdminTab(tab as AdminTab)}
                />
              )}

              {adminTab === 'announcements' && (
                <AdminAnnouncements
                  announcements={announcements}
                  onAddAnnouncement={handleAddAnnouncement}
                  onUpdateAnnouncement={handleUpdateAnnouncement}
                  onDeleteAnnouncement={handleDeleteAnnouncement}
                />
              )}

              {adminTab === 'print_types' && (
                <PrintTypeManager
                  printTypes={printTypes}
                  onAddPrintType={handleAddPrintType}
                  onUpdatePrintType={handleUpdatePrintType}
                  onDeletePrintType={handleDeletePrintType}
                  onResetPrintTypes={handleResetPrintTypes}
                />
              )}

              {adminTab === 'chatgpt' && (
                <ChatGPTConnect
                  apiKey={avalaiApiKey}
                  onUpdateApiKey={handleUpdateAvalaiApiKey}
                  baseUrl={avalaiBaseUrl}
                  onUpdateBaseUrl={handleUpdateAvalaiBaseUrl}
                  model={avalaiModel}
                  onUpdateModel={handleUpdateAvalaiModel}
                  aiEnabled={aiEnabled}
                  onUpdateAiEnabled={handleUpdateAiEnabled}
                />
              )}

              {adminTab === 'prompts_manager' && (
                <PromptsManager
                  printTypes={printTypes}
                  prompts={printTypePrompts}
                  onSavePrompt={handleSavePrompt}
                  onResetPrompts={handleResetPrompts}
                />
              )}

              {adminTab === 'orders' && (
                <AdminOrders
                  orders={orders}
                  queueInfo={queueInfo}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onUpdateOrder={handleUpdateOrder}
                  onDeleteOrder={handleDeleteOrder}
                  onClearAllOrders={handleClearAllOrders}
                  telegramToken={telegramToken}
                  telegramChatId={telegramChatId}
                />
              )}

              {adminTab === 'tickets' && (
                <AdminTickets
                  tickets={tickets}
                  onUpdateTickets={handleUpdateTickets}
                  orders={orders}
                />
              )}

              {adminTab === 'blupal' && (
                <AdminBluPalSettings
                  settings={blupalSettings}
                  onSaveSettings={handleSaveBluPalSettings}
                />
              )}

              {adminTab === 'telegram_bot' && (
                <AdminTelegramBot
                  token={telegramToken}
                  chatId={telegramChatId}
                  isEnabled={telegramEnabled}
                  onSave={handleSaveTelegramSettings}
                  showToast={showToast}
                />
              )}

              {adminTab === 'database' && <AdminDatabaseSettings showToast={showToast} />}

              {adminTab === 'users' && <AdminUsers showToast={showToast} />}

              {adminTab === 'backup' && <AdminBackup showToast={showToast} />}
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
                currentUser.role === 'admin'
                  ? () => setActiveView('admin')
                  : undefined
              }
              userOrdersCount={orders.filter((o) => o.userId === currentUser.id).length}
              userTicketsCount={tickets.filter((t) => t.userId === currentUser.id || t.userName === currentUser.name).length}
              hasUnreadReply={hasUnreadTicketReply}
            />

            {/* User Content Area */}
            <main className="flex-1 lg:pr-72 p-3 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto pb-20 lg:pb-8">
              {userTab === 'dashboard' && (
                <UserDashboard
                  user={currentUser}
                  orders={orders}
                  tickets={tickets}
                  printTypes={printTypes}
                  announcements={announcements}
                  onMarkAnnouncementAsRead={handleMarkAnnouncementAsRead}
                  onUpdateUser={handleUpdateUser}
                  onStartNewOrder={() => setUserTab('wizard')}
                  onGoToOrders={() => setUserTab('orders')}
                  onGoToTickets={() => setUserTab('tickets')}
                />
              )}

              {userTab === 'wizard' && (
                <OrderWizard
                  user={currentUser}
                  onOrderCompleted={handleNewOrder}
                  onUserUpdate={handleUpdateUser}
                  printTypes={printTypes}
                  avalaiApiKey={avalaiApiKey}
                  printTypePrompts={printTypePrompts}
                  avalaiBaseUrl={avalaiBaseUrl}
                  avalaiModel={avalaiModel}
                  blupalSettings={blupalSettings}
                />
              )}

              {userTab === 'orders' && (
                <UserOrders
                  orders={orders}
                  user={currentUser}
                  onStartNewOrder={() => setUserTab('wizard')}
                />
              )}

              {userTab === 'tickets' && (
                <UserTickets
                  user={currentUser}
                  tickets={tickets}
                  onUpdateTickets={handleUpdateTickets}
                  onTicketRead={handleTicketRead}
                  orders={orders}
                />
              )}
            </main>
          </>
        )}
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (Visible only in user panel) */}
      {activeView === 'user' && (
        <div className="lg:hidden fixed bottom-3 inset-x-3 max-w-lg mx-auto bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 text-white rounded-2xl sm:rounded-3xl p-1.5 z-40 flex items-center justify-around shadow-xl shadow-teal-950/20 border border-teal-400/30 backdrop-blur-xl">
          {/* 1. راست: پیشخوان */}
          <button
            onClick={() => setUserTab('dashboard')}
            className={`flex-1 flex flex-col items-center gap-1 cursor-pointer py-2 px-1 rounded-xl transition-all ${
              userTab === 'dashboard'
                ? 'bg-white/25 text-white font-black shadow-xs scale-100'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-[10px]">پیشخوان</span>
          </button>

          {/* 2. سفارشات (قبلاً پیگیری) */}
          <button
            onClick={() => setUserTab('orders')}
            className={`flex-1 flex flex-col items-center gap-1 cursor-pointer py-2 px-1 rounded-xl transition-all ${
              userTab === 'orders'
                ? 'bg-white/25 text-white font-black shadow-xs scale-100'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Package className="w-4 h-4" />
            <span className="text-[10px]">سفارشات</span>
          </button>

          {/* 3. وسط: ثبت سفارش */}
          <button
            onClick={() => setUserTab('wizard')}
            className={`flex-1 flex flex-col items-center gap-1 cursor-pointer py-2 px-1 rounded-xl transition-all ${
              userTab === 'wizard'
                ? 'bg-white/25 text-white font-black shadow-xs scale-100'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px]">ثبت سفارش</span>
          </button>

          {/* 4. چپ: تیکت */}
          <button
            onClick={() => setUserTab('tickets')}
            className={`flex-1 flex flex-col items-center gap-1 cursor-pointer py-2 px-1 rounded-xl transition-all relative ${
              userTab === 'tickets'
                ? 'bg-white/25 text-white font-black shadow-xs scale-100'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <LifeBuoy
                className={`w-4 h-4 transition-all ${
                  hasUnreadTicketReply
                    ? 'text-red-400 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,1)] stroke-[2.75]'
                    : ''
                }`}
              />
              {hasUnreadTicketReply && (
                <span className="absolute -top-1.5 -right-2 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-80"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-white"></span>
                </span>
              )}
            </div>
            <span
              className={`text-[10px] ${
                hasUnreadTicketReply
                  ? 'text-red-200 font-black animate-pulse'
                  : ''
              }`}
            >
              تیکت
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
