/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Order, PrintTypeOption, SupportTicket, Announcement } from './types';
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

  // Active view: 'admin' or 'user'
  const [activeView, setActiveView] = useState<'admin' | 'user'>('user');

  // Sub-tabs
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [userTab, setUserTab] = useState<UserTab>('dashboard');

  // Data states
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('studio_orders_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });

  // Support Tickets State
  const [tickets, setTickets] = useState<SupportTicket[]>(() => {
    try {
      const saved = localStorage.getItem('studio_tickets_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return INITIAL_TICKETS;
    } catch {
      return INITIAL_TICKETS;
    }
  });

  // Dynamic Print Types State (Managed by Admin & Database)
  const [printTypes, setPrintTypes] = useState<PrintTypeOption[]>(() => {
    try {
      const saved = localStorage.getItem('studio_print_types');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const updated = parsed.map((item: PrintTypeOption) =>
            item.id === 'personnel' && item.basePrice === 85000
              ? { ...item, basePrice: 600000 }
              : item
          );
          localStorage.setItem('studio_print_types', JSON.stringify(updated));
          return updated;
        }
      }
      return PRINT_TYPES;
    } catch {
      return PRINT_TYPES;
    }
  });

  // AvalAI API configuration state
  const [avalaiApiKey, setAvalaiApiKey] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('studio_avalai_api_key');
      if (saved) return saved;
      // Check legacy saved tokens
      const legacyTokens = localStorage.getItem('studio_openai_tokens');
      if (legacyTokens) {
        const parsed = JSON.parse(legacyTokens);
        if (Array.isArray(parsed) && parsed[0] && !parsed[0].includes('placeholder')) {
          return parsed[0];
        }
      }
    } catch {}
    return '';
  });

  // AvalAI Base URL state (https://api.avalai.ir/v1)
  const [avalaiBaseUrl, setAvalaiBaseUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('studio_avalai_base_url');
      return saved || 'https://api.avalai.ir/v1';
    } catch {
      return 'https://api.avalai.ir/v1';
    }
  });

  // Active Image Generation Model (gpt-image-2.5-sunburst)
  const [avalaiModel, setAvalaiModel] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('studio_avalai_model');
      return saved || 'gpt-image-2.5-sunburst';
    } catch {
      return 'gpt-image-2.5-sunburst';
    }
  });

  const [telegramToken, setTelegramToken] = useState<string>(() => {
    try {
      return localStorage.getItem('studio_telegram_token') || '';
    } catch {
      return '';
    }
  });

  const [telegramChatId, setTelegramChatId] = useState<string>(() => {
    try {
      return localStorage.getItem('studio_telegram_chat_id') || '';
    } catch {
      return '';
    }
  });

  const [telegramEnabled, setTelegramEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('studio_telegram_enabled') === 'true';
    } catch {
      return false;
    }
  });

  const handleSaveTelegramSettings = (token: string, chatId: string, isEnabled: boolean) => {
    setTelegramToken(token);
    setTelegramChatId(chatId);
    setTelegramEnabled(isEnabled);
    localStorage.setItem('studio_telegram_token', token);
    localStorage.setItem('studio_telegram_chat_id', chatId);
    localStorage.setItem('studio_telegram_enabled', String(isEnabled));
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

  const [printTypePrompts, setPrintTypePrompts] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('studio_print_type_prompts');
      return saved ? JSON.parse(saved) : DEFAULT_PROMPTS;
    } catch {
      return DEFAULT_PROMPTS;
    }
  });

  // Fetch initial database state from server
  React.useEffect(() => {
    async function loadBackendData() {
      const data = await apiClient.getAllDb();
      if (data) {
        if (Array.isArray(data.orders) && data.orders.length > 0) {
          setOrders(data.orders);
          localStorage.setItem('studio_orders_list', JSON.stringify(data.orders));
        }
        if (Array.isArray(data.tickets) && data.tickets.length > 0) {
          setTickets(data.tickets);
          localStorage.setItem('studio_tickets_list', JSON.stringify(data.tickets));
        }
        if (Array.isArray(data.printTypes) && data.printTypes.length > 0) {
          setPrintTypes(data.printTypes);
          localStorage.setItem('studio_print_types', JSON.stringify(data.printTypes));
        }
        if (data.prompts && Object.keys(data.prompts).length > 0) {
          setPrintTypePrompts(data.prompts);
          localStorage.setItem('studio_print_type_prompts', JSON.stringify(data.prompts));
        }
        if (Array.isArray(data.announcements) && data.announcements.length > 0) {
          setAnnouncements(data.announcements);
          localStorage.setItem('studio_announcements_list', JSON.stringify(data.announcements));
        }
        if (data.settings) {
          if (data.settings.avalaiApiKey) {
            setAvalaiApiKey(data.settings.avalaiApiKey);
            localStorage.setItem('studio_avalai_api_key', data.settings.avalaiApiKey);
          }
          if (data.settings.avalaiBaseUrl) {
            setAvalaiBaseUrl(data.settings.avalaiBaseUrl);
            localStorage.setItem('studio_avalai_base_url', data.settings.avalaiBaseUrl);
          }
          if (data.settings.avalaiModel) {
            setAvalaiModel(data.settings.avalaiModel);
            localStorage.setItem('studio_avalai_model', data.settings.avalaiModel);
          }
          if (data.settings.telegramToken !== undefined) {
            setTelegramToken(data.settings.telegramToken);
            localStorage.setItem('studio_telegram_token', data.settings.telegramToken);
          }
          if (data.settings.telegramChatId !== undefined) {
            setTelegramChatId(data.settings.telegramChatId);
            localStorage.setItem('studio_telegram_chat_id', data.settings.telegramChatId);
          }
          if (data.settings.telegramEnabled !== undefined) {
            setTelegramEnabled(data.settings.telegramEnabled);
            localStorage.setItem('studio_telegram_enabled', String(data.settings.telegramEnabled));
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
    localStorage.setItem('studio_avalai_api_key', trimmed);
    apiClient.saveSettings({ avalaiApiKey: trimmed });
    showToast('کلید دسترسی AvalAI با موفقیت ذخیره شد.');
  };

  const handleUpdateAvalaiBaseUrl = (newUrl: string) => {
    const sanitized = newUrl.trim().replace(/\/$/, ''); // Remove trailing slash
    setAvalaiBaseUrl(sanitized);
    localStorage.setItem('studio_avalai_base_url', sanitized);
    apiClient.saveSettings({ avalaiBaseUrl: sanitized });
    showToast('آدرس پایه API با موفقیت ذخیره شد.');
  };

  const handleUpdateAvalaiModel = (newModel: string) => {
    const trimmed = newModel.trim();
    setAvalaiModel(trimmed);
    localStorage.setItem('studio_avalai_model', trimmed);
    apiClient.saveSettings({ avalaiModel: trimmed });
    showToast('مدل تولید تصویر با موفقیت به‌روز شد.');
  };

  const handleSavePrompt = (printTypeId: string, prompt: string) => {
    setPrintTypePrompts((prev) => {
      const next = { ...prev, [printTypeId]: prompt };
      localStorage.setItem('studio_print_type_prompts', JSON.stringify(next));
      apiClient.savePrompts(next);
      return next;
    });
    showToast('پرامپت سبک چاپ با موفقیت به‌روزرسانی شد.');
  };

  const handleResetPrompts = () => {
    setPrintTypePrompts(DEFAULT_PROMPTS);
    localStorage.setItem('studio_print_type_prompts', JSON.stringify(DEFAULT_PROMPTS));
    apiClient.savePrompts(DEFAULT_PROMPTS);
    showToast('پرامپت‌ها به مقادیر پیش‌فرض بازنشانی شدند.');
  };

  // Announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    try {
      const saved = localStorage.getItem('studio_announcements_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return INITIAL_ANNOUNCEMENTS;
    } catch {
      return INITIAL_ANNOUNCEMENTS;
    }
  });

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
      localStorage.setItem('studio_announcements_list', JSON.stringify(next));
      apiClient.saveAnnouncements(next);
      return next;
    });
    showToast('اطلاعیه جدید با موفقیت منتشر شد.');
  };

  const handleUpdateAnnouncement = (updated: Announcement) => {
    setAnnouncements((prev) => {
      const next = prev.map((a) => (a.id === updated.id ? updated : a));
      localStorage.setItem('studio_announcements_list', JSON.stringify(next));
      apiClient.saveAnnouncements(next);
      return next;
    });
    showToast('اطلاعیه با موفقیت به‌روزرسانی شد.');
  };

  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncements((prev) => {
      const next = prev.filter((a) => a.id !== id);
      localStorage.setItem('studio_announcements_list', JSON.stringify(next));
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
      localStorage.setItem('studio_announcements_list', JSON.stringify(next));
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
        localStorage.setItem('studio_orders_list', JSON.stringify(next));
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
      localStorage.setItem('studio_print_types', JSON.stringify(next));
      apiClient.savePrintTypes(next);
      return next;
    });
    showToast(`نوع چاپ «${newItem.title}» با موفقیت افزوده شد.`);
  };

  const handleUpdatePrintType = (updated: PrintTypeOption) => {
    setPrintTypes((prev) => {
      const next = prev.map((p) => (p.id === updated.id ? updated : p));
      localStorage.setItem('studio_print_types', JSON.stringify(next));
      apiClient.savePrintTypes(next);
      return next;
    });
    showToast(`تغییرات نوع چاپ «${updated.title}» ذخیره شد.`);
  };

  const handleDeletePrintType = (id: string) => {
    setPrintTypes((prev) => {
      const target = prev.find((p) => p.id === id);
      const next = prev.filter((p) => p.id !== id);
      localStorage.setItem('studio_print_types', JSON.stringify(next));
      apiClient.savePrintTypes(next);
      if (target) {
        showToast(`نوع چاپ «${target.title}» حذف گردید.`);
      }
      return next;
    });
  };

  const handleResetPrintTypes = () => {
    setPrintTypes(PRINT_TYPES);
    localStorage.setItem('studio_print_types', JSON.stringify(PRINT_TYPES));
    apiClient.savePrintTypes(PRINT_TYPES);
    showToast('کارت‌های نوع چاپ به حالت اولیه بازنشانی شدند.');
  };

  // Persist Orders when updated
  const handleUpdateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders((prev) => {
      const next = prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));
      localStorage.setItem('studio_orders_list', JSON.stringify(next));
      apiClient.syncOrders(next);
      return next;
    });
    showToast('وضعیت سفارش با موفقیت تغییر یافت.');
  };

  const handleUpdateOrder = (updatedOrder: Order) => {
    setOrders((prev) => {
      const next = prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
      localStorage.setItem('studio_orders_list', JSON.stringify(next));
      apiClient.saveOrder(updatedOrder);
      return next;
    });
  };

  const handleDeleteOrder = (orderId: string) => {
    setOrders((prev) => {
      const next = prev.filter((o) => o.id !== orderId);
      localStorage.setItem('studio_orders_list', JSON.stringify(next));
      apiClient.deleteOrder(orderId);
      return next;
    });
    showToast('سفارش با موفقیت حذف گردید.');
  };

  const handleClearAllOrders = () => {
    setOrders([]);
    localStorage.setItem('studio_orders_list', JSON.stringify([]));
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
      localStorage.setItem('studio_orders_list', JSON.stringify(next));
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
    if (user.role === 'admin' || user.username === 'ehsan') {
      setActiveView('admin');
      setAdminTab('dashboard');
    } else {
      setActiveView('user');
      setUserTab('dashboard');
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setCurrentUser(null);
    setActiveView('user');
    showToast('از حساب کاربری خارج شدید.');
  };

  // Handle User Profile Update (Name, Password)
  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem('studio_current_user', JSON.stringify(updatedUser));
      const storedUsersRaw = localStorage.getItem('registered_users');
      if (storedUsersRaw) {
        const storedUsers: User[] = JSON.parse(storedUsersRaw);
        const next = storedUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u));
        localStorage.setItem('registered_users', JSON.stringify(next));
        apiClient.saveUsers(next);
      }
    } catch {
      // ignore
    }
    showToast('اطلاعات کاربری با موفقیت به‌روزرسانی شد.');
  };

  // Handle Support Tickets Update (Sync across Admin and User)
  const handleUpdateTickets = (nextTickets: SupportTicket[]) => {
    setTickets(nextTickets);
    try {
      localStorage.setItem('studio_tickets_list', JSON.stringify(nextTickets));
      apiClient.saveAnnouncements; // or sync tickets
      for (const t of nextTickets) {
        apiClient.saveTicket(t);
      }
    } catch {
      // ignore
    }
  };

  // Track which tickets have been read/seen by user to manage the blinking reply indicator
  const [readTicketTimestamps, setReadTicketTimestamps] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('studio_read_ticket_timestamps');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleTicketRead = useCallback((ticketId: string, updatedAt: string) => {
    setReadTicketTimestamps((prev) => {
      if (prev[ticketId] === updatedAt) return prev;
      const next = { ...prev, [ticketId]: updatedAt };
      try {
        localStorage.setItem('studio_read_ticket_timestamps', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // If not logged in -> Show Login & Register page on main page
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

              {adminTab === 'telegram_bot' && (
                <AdminTelegramBot
                  token={telegramToken}
                  chatId={telegramChatId}
                  isEnabled={telegramEnabled}
                  onSave={handleSaveTelegramSettings}
                  showToast={showToast}
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
