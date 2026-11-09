/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Order, PrintTypeOption, PrintDimension, PartnerInvoice, CostChangeRequest, SupportTicket, Announcement, BluPalSettings, DeliveryMethod, MaintenanceNotificationSummary } from './types';
import { INITIAL_ORDERS, PRINT_TYPES, PRINT_DIMENSIONS, INITIAL_TICKETS, INITIAL_ANNOUNCEMENTS } from './data/mockData';
import { apiClient } from './services/apiClient';
import { Navbar } from './components/Navbar';
import { AuthView } from './components/AuthView';
import { LandingPage } from './components/LandingPage';
import { AdminSidebar, AdminTab } from './components/admin/AdminSidebar';
import { EitaaLanding, TelegramLanding } from './components/EitaaLanding';
// Heavy, logged-in-only screens are split into their own chunks so the public
// pages (landing + /eitaa + /telegram) stay small and load fast.
const AdminDashboard = React.lazy(() => import('./components/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminAnnouncements = React.lazy(() => import('./components/admin/AdminAnnouncements').then((m) => ({ default: m.AdminAnnouncements })));
const AdminBlog = React.lazy(() => import('./components/admin/AdminBlog'));
const ChatGPTConnect = React.lazy(() => import('./components/admin/ChatGPTConnect').then((m) => ({ default: m.ChatGPTConnect })));
const AdminOrders = React.lazy(() => import('./components/admin/AdminOrders').then((m) => ({ default: m.AdminOrders })));
const AdminTransactions = React.lazy(() => import('./components/admin/AdminTransactions').then((m) => ({ default: m.AdminTransactions })));
const PrintTypeManager = React.lazy(() => import('./components/admin/PrintTypeManager').then((m) => ({ default: m.PrintTypeManager })));
const AdminSizesManager = React.lazy(() => import('./components/admin/AdminSizesManager').then((m) => ({ default: m.AdminSizesManager })));
const AdminPartnerInvoices = React.lazy(() => import('./components/admin/AdminPartnerInvoices').then((m) => ({ default: m.AdminPartnerInvoices })));
const AdminCostRequests = React.lazy(() => import('./components/admin/AdminCostRequests').then((m) => ({ default: m.AdminCostRequests })));
const PromptsManager = React.lazy(() => import('./components/admin/PromptsManager').then((m) => ({ default: m.PromptsManager })));
const AdminTickets = React.lazy(() => import('./components/admin/AdminTickets').then((m) => ({ default: m.AdminTickets })));
const AdminTelegramBot = React.lazy(() => import('./components/admin/AdminTelegramBot').then((m) => ({ default: m.AdminTelegramBot })));
const AdminBluPalSettings = React.lazy(() => import('./components/admin/AdminBluPalSettings').then((m) => ({ default: m.AdminBluPalSettings })));
const AdminDatabaseSettings = React.lazy(() => import('./components/admin/AdminDatabaseSettings').then((m) => ({ default: m.AdminDatabaseSettings })));
const AdminUsers = React.lazy(() => import('./components/admin/AdminUsers').then((m) => ({ default: m.AdminUsers })));
const AdminBackup = React.lazy(() => import('./components/admin/AdminBackup').then((m) => ({ default: m.AdminBackup })));
const AdminTransport = React.lazy(() => import('./components/admin/AdminTransport').then((m) => ({ default: m.AdminTransport })));
const AdminBackupSchedule = React.lazy(() => import('./components/admin/AdminBackupSchedule').then((m) => ({ default: m.AdminBackupSchedule })));
const AdminSmsSettings = React.lazy(() => import('./components/admin/AdminSmsSettings').then((m) => ({ default: m.AdminSmsSettings })));
const AdminStorageSettings = React.lazy(() => import('./components/admin/AdminStorageSettings'));
const AdminSessions = React.lazy(() => import('./components/admin/AdminSessions').then((m) => ({ default: m.AdminSessions })));
const AdminAudit = React.lazy(() => import('./components/admin/AdminAudit').then((m) => ({ default: m.AdminAudit })));
const OrderWizard = React.lazy(() => import('./components/user/OrderWizard').then((m) => ({ default: m.OrderWizard })));
const UserOrders = React.lazy(() => import('./components/user/UserOrders').then((m) => ({ default: m.UserOrders })));
const UserTickets = React.lazy(() => import('./components/user/UserTickets').then((m) => ({ default: m.UserTickets })));
const PartnerOrders = React.lazy(() => import('./components/user/PartnerOrders').then((m) => ({ default: m.PartnerOrders })));
const PartnerPriceList = React.lazy(() => import('./components/user/PartnerPriceList').then((m) => ({ default: m.PartnerPriceList })));
const UserDashboard = React.lazy(() => import('./components/user/UserDashboard').then((m) => ({ default: m.UserDashboard })));

import { parseRoute, routeToPath } from './utils/router';
import { adminPostPage, adminPostSectionPage, type AdminPostSection } from './utils/adminPostsNavigation';
import { SESSION_IDLE_MS, IDLE_CHECK_INTERVAL_MS, HEARTBEAT_INTERVAL_MS, ACTIVITY_EVENTS } from './utils/session';
import { UserSidebar, UserTab } from './components/user/UserSidebar';
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
  Palette,
  PackageSearch,
  Wallet
} from 'lucide-react';

export default function App() {
  // Current logged in user (null by default so Login/Register screen displays on home page)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  // The public landing page is the home screen; the auth form lives on /login
  const [showAuth, setShowAuth] = useState<boolean>(() => {
    const path = (window.location.pathname || '/').toLowerCase();
    return path.startsWith('/login') || path.startsWith('/auth');
  });

  // Active view + tabs are derived from the URL so a refresh keeps the page
  const initialRoute = typeof window !== 'undefined' ? parseRoute(window.location.pathname, window.location.search) : { view: 'user' as const, tab: 'dashboard' };
  // Public messenger sign-up screens: /eitaa and /telegram
  const messengerPageFromPath = (path: string): 'eitaa' | 'telegram' | null => {
    const clean = (path || '').replace(/\/+$/, '');
    if (clean === '/eitaa') return 'eitaa';
    if (clean === '/telegram') return 'telegram';
    return null;
  };
  const [messengerPage, setMessengerPage] = useState<'eitaa' | 'telegram' | null>(() =>
    typeof window !== 'undefined' ? messengerPageFromPath(window.location.pathname) : null
  );
  const [activeView, setActiveView] = useState<'admin' | 'user'>(initialRoute.view);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceNotifications, setMaintenanceNotifications] = useState<MaintenanceNotificationSummary | null>(null);
  const [isTogglingMaintenance, setIsTogglingMaintenance] = useState(false);
  const [maintenanceError, setMaintenanceError] = useState('');
  const maintenanceStatusVersion = React.useRef(0);
  const maintenanceSaving = React.useRef(false);
  const maintenancePolling = React.useRef(false);
  const [adminTab, setAdminTab] = useState<AdminTab>(
    initialRoute.view === 'admin' ? (initialRoute.tab as AdminTab) : 'dashboard'
  );
  const [adminPageVersion, setAdminPageVersion] = useState(0);
  const adminNavigationGuard = useRef<(() => boolean) | null>(null);
  const guardedAdminPath = useRef(window.location.pathname + window.location.search);
  const onAdminNavigationGuardChange = useCallback((guard: (() => boolean) | null) => {
    adminNavigationGuard.current = guard;
    if (guard) guardedAdminPath.current = window.location.pathname + window.location.search;
  }, []);
  const selectAdminTab = useCallback((tab: AdminTab, postId?: string) => {
    if (adminNavigationGuard.current && !adminNavigationGuard.current()) return;
    const target = routeToPath('admin', tab) + (postId ? `?id=${encodeURIComponent(postId)}` : '');
    if (window.location.pathname + window.location.search !== target) window.history.pushState({}, '', target);
    setAdminTab(tab);
    setAdminPageVersion(value => value + 1);
  }, []);
  const navigateAdminPost = useCallback((section: AdminPostSection, postId?: string) => {
    const page = adminPostSectionPage(section);
    if (page) selectAdminTab(page.tab, postId);
  }, [selectAdminTab]);
  const [userTab, setUserTab] = useState<UserTab>(
    initialRoute.view === 'user' ? (initialRoute.tab as UserTab) : 'dashboard'
  );

  // Data states
  const [orders, setOrders] = useState<Order[]>([]);

  // Support Tickets State
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  // Dynamic Print Types State (Managed by Admin & Database)
  const [printTypes, setPrintTypes] = useState<PrintTypeOption[]>(PRINT_TYPES);
  const [dimensions, setDimensions] = useState<PrintDimension[]>(PRINT_DIMENSIONS);
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([]);
  const [partnerInvoices, setPartnerInvoices] = useState<PartnerInvoice[]>([]);
  const [costRequests, setCostRequests] = useState<CostChangeRequest[]>([]);

  useEffect(() => {
    const version = maintenanceStatusVersion.current;
    let active = true;
    fetch('/api/public/maintenance', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) return;
      const data = await response.json();
      if (active && version === maintenanceStatusVersion.current) setMaintenanceMode(data?.enabled === true);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const toggleMaintenance = async (enabled: boolean) => {
    if (maintenanceSaving.current) return;
    maintenanceSaving.current = true;
    maintenanceStatusVersion.current += 1;
    setIsTogglingMaintenance(true);
    setMaintenanceError('');
    try {
      const response = await fetch('/api/admin/maintenance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || 'تغییر حالت به‌روزرسانی ناموفق بود');
      setMaintenanceMode(data.enabled);
      setMaintenanceNotifications(data);
    } catch (error: any) {
      setMaintenanceError(error?.message || 'تغییر حالت به‌روزرسانی ناموفق بود');
    } finally {
      maintenanceSaving.current = false;
      setIsTogglingMaintenance(false);
    }
  };

  const refreshMaintenanceStatus = useCallback(async () => {
    if (maintenanceSaving.current || maintenancePolling.current) return;
    const version = maintenanceStatusVersion.current;
    maintenancePolling.current = true;
    try {
      const response = await fetch('/api/admin/maintenance', { cache: 'no-store' });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success && version === maintenanceStatusVersion.current) {
        maintenanceStatusVersion.current += 1;
        setMaintenanceMode(data.enabled);
        setMaintenanceNotifications(data);
      }
    } finally { maintenancePolling.current = false; }
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'admin') void refreshMaintenanceStatus().catch(() => undefined);
    return () => { maintenanceStatusVersion.current += 1; };
  }, [currentUser?.id, currentUser?.role, refreshMaintenanceStatus]);

  useEffect(() => {
    if (currentUser?.role !== 'admin' || maintenanceNotifications?.status !== 'pending') return;
    const timer = window.setInterval(() => { void refreshMaintenanceStatus().catch(() => undefined); }, 5000);
    return () => window.clearInterval(timer);
  }, [currentUser?.id, currentUser?.role, maintenanceNotifications?.status, refreshMaintenanceStatus]);

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
  const [eitaaToken, setEitaaToken] = useState<string>('');

  // BluPal Gateway Settings State
  const [blupalSettings, setBlupalSettings] = useState<BluPalSettings>({
      blupalToken: '',
      blupalBaseUrl: 'https://blupal.top',
      blupalMerchantId: '',
      blupalCardNumber: '6219 8619 4528 7193',
      blupalAccountHolder: 'آتلیه تخصصی لاله',
      blupalIban: 'IR720560086190004528719301',
      blupalEnabled: true,
      blupalAutoPollInterval: 3,
      blupalWebhookSecret: '',
      blupalCustomWebhookUrl: ''
    });

  const handleSaveBluPalSettings = (newSettings: BluPalSettings) => {
    setBlupalSettings(newSettings);
    apiClient.saveSettings(newSettings);
    showToast('تنظیمات درگاه بلوپال با موفقیت ذخیره شد.');
  };

  const handleSaveEitaaToken = (token: string) => {
    setEitaaToken(token);
    apiClient.saveSettings({ eitaaToken: token });
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
    memorial: 'پرتره یادبود باوقار و احترام، پس‌زمینه محو ملایم، روشنایی یکنواخت، کیفیت استودیویی رتوش چهره',
    wedding: 'عکس دونفره عروس و داماد شیک و رمانتیک در عمارت باغ لوکس، نورپردازی بوکه رویایی غروب آفتاب، کیفیت ۳۲کی سینمایی'
  };

  const [printTypePrompts, setPrintTypePrompts] = useState<Record<string, string>>(DEFAULT_PROMPTS);

  // Sign the user out after 10 minutes without any activity
  React.useEffect(() => {
    if (!currentUser) return;
    let lastActivity = Date.now();

    const markActivity = () => {
      lastActivity = Date.now();
    };
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, markActivity, { passive: true }));

    const idleTimer = window.setInterval(() => {
      if (Date.now() - lastActivity >= SESSION_IDLE_MS) {
        fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
        setCurrentUser(null);
        setActiveView('user');
        window.history.pushState({}, '', '/');
        showToast('به دلیل عدم فعالیت، از حساب خارج شدید.');
      }
    }, IDLE_CHECK_INTERVAL_MS);

    const heartbeat = window.setInterval(() => {
      if (Date.now() - lastActivity < HEARTBEAT_INTERVAL_MS) {
        fetch('/api/auth/heartbeat').catch(() => undefined);
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, markActivity));
      window.clearInterval(idleTimer);
      window.clearInterval(heartbeat);
    };
  }, [currentUser?.id]);

  // Keep the address bar in sync with the selected page
  React.useEffect(() => {
    if (isAuthChecking || !currentUser || messengerPage) return;
    const target = routeToPath(activeView, activeView === 'admin' ? adminTab : userTab);
    if (window.location.pathname !== target) {
      const postId = activeView === 'admin' && adminTab === 'posts_write' ? new URLSearchParams(window.location.search).get('id') : null;
      const path = target + (postId ? `?id=${encodeURIComponent(postId)}` : '');
      if (activeView === 'admin' && adminPostPage(adminTab) && parseRoute(window.location.pathname, window.location.search).tab === adminTab) {
        window.history.replaceState({}, '', path);
      } else {
        window.history.pushState({}, '', path);
      }
    }
  }, [activeView, adminTab, userTab, currentUser, isAuthChecking, messengerPage]);

  // Browser back / forward
  React.useEffect(() => {
    const onPopState = () => {
      if (adminNavigationGuard.current && !adminNavigationGuard.current()) {
        window.history.pushState({}, '', guardedAdminPath.current);
        return;
      }
      setAdminPageVersion(value => value + 1);
      setMessengerPage(messengerPageFromPath(window.location.pathname));
      const route = parseRoute(window.location.pathname, window.location.search);
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
            const route = parseRoute(window.location.pathname, window.location.search);
            if (data.user.role === 'admin') {
              setActiveView(route.view === 'user' ? 'user' : 'admin');
              if (route.view === 'admin') setAdminTab(route.tab as AdminTab);
              else setUserTab(route.tab as UserTab);
            } else {
              setActiveView('user');
              // Colleagues land on their order list by default
              setUserTab(
                data.user.category === 'colleague'
                  ? ((['partner_orders', 'partner_prices'].includes(route.tab)
                      ? route.tab
                      : 'partner_orders') as UserTab)
                  : (route.tab as UserTab)
              );
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
    if (!currentUser) return;
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
        if (Array.isArray(data.partnerInvoices)) {
          setPartnerInvoices(data.partnerInvoices);
        }
        if (Array.isArray(data.costRequests)) {
          setCostRequests(data.costRequests);
        }
        if (Array.isArray(data.deliveryMethods)) {
          setDeliveryMethods(data.deliveryMethods);
        }
        if (Array.isArray(data.dimensions) && data.dimensions.length > 0) {
          setDimensions(data.dimensions);
        } else {
          // Existing databases have no size collection yet → seed the defaults once
          setDimensions(PRINT_DIMENSIONS);
          apiClient.saveDimensions(PRINT_DIMENSIONS);
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
          if (data.settings.eitaaToken !== undefined) {
            setEitaaToken(data.settings.eitaaToken);
          }
          if (data.settings.telegramEnabled !== undefined) {
            setTelegramEnabled(data.settings.telegramEnabled);
          }
          if (
            data.settings.blupalToken !== undefined ||
            data.settings.blupalCardNumber ||
            data.settings.blupalWebhookSecret !== undefined ||
            data.settings.blupalCustomWebhookUrl !== undefined
          ) {
            const nextBluPal: BluPalSettings = {
              blupalToken: data.settings.blupalToken || '',
              blupalBaseUrl: data.settings.blupalBaseUrl || 'https://blupal.top',
              blupalMerchantId: data.settings.blupalMerchantId || '',
              blupalCardNumber: data.settings.blupalCardNumber || '6219 8619 4528 7193',
              blupalAccountHolder: data.settings.blupalAccountHolder || 'آتلیه تخصصی لاله',
              blupalIban: data.settings.blupalIban || 'IR720560086190004528719301',
              blupalEnabled: data.settings.blupalEnabled ?? true,
              blupalAutoPollInterval: data.settings.blupalAutoPollInterval || 3,
              blupalWebhookSecret: data.settings.blupalWebhookSecret || '',
              blupalCustomWebhookUrl: data.settings.blupalCustomWebhookUrl || ''
            };
            setBlupalSettings(nextBluPal);
          }
        }
      }
    }
    loadBackendData();
  }, [currentUser?.id]);

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
    // Persist the read receipt so a page refresh does not mark it unread again
    apiClient.markAnnouncementRead(announcementId).catch(() => undefined);
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
        const next = prev.map((order) => {
          if (order.id !== updatedOrder.id) return order;
          const mergedOrder = {
            ...updatedOrder,
            selectedPrintImages: order.selectedPrintImages ?? updatedOrder.selectedPrintImages
          };
          apiClient.saveOrder(mergedOrder);
          return mergedOrder;
        });
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

  // --- Print sizes (مدیریت سایز) ---
  const handleAddDimension = (newItem: PrintDimension) => {
    setDimensions((prev) => {
      const next = [...prev, newItem];
      apiClient.saveDimensions(next);
      return next;
    });
    showToast(`سایز «${newItem.title}» با موفقیت افزوده شد.`);
  };

  const handleAddDeliveryMethod = (method: DeliveryMethod) => {
    setDeliveryMethods((prev) => {
      const next = [...prev, method];
      apiClient.saveDeliveryMethods(next);
      return next;
    });
  };

  const handleUpdateDeliveryMethod = (updated: DeliveryMethod) => {
    setDeliveryMethods((prev) => {
      const next = prev.map((m) => (m.id === updated.id ? updated : m));
      apiClient.saveDeliveryMethods(next);
      return next;
    });
  };

  const handleDeleteDeliveryMethod = (id: string) => {
    setDeliveryMethods((prev) => {
      const next = prev.filter((m) => m.id !== id);
      apiClient.saveDeliveryMethods(next);
      return next;
    });
  };

  const handleUpdateDimension = (updated: PrintDimension) => {
    setDimensions((prev) => {
      const next = prev.map((d) => (d.id === updated.id ? updated : d));
      apiClient.saveDimensions(next);
      return next;
    });
    showToast(`تغییرات سایز «${updated.title}» ذخیره شد.`);
  };

  const handleDeleteDimension = (id: string) => {
    const target = dimensions.find((d) => d.id === id);
    setDimensions((prev) => {
      const next = prev.filter((d) => d.id !== id);
      apiClient.saveDimensions(next);
      return next;
    });
    // Detach the deleted size from every print type that offered it
    setPrintTypes((prev) => {
      const affected = prev.some((pt) => (pt.dimensionIds || []).includes(id));
      if (!affected) return prev;
      const next = prev.map((pt) => ({
        ...pt,
        dimensionIds: (pt.dimensionIds || []).filter((dimId) => dimId !== id)
      }));
      apiClient.savePrintTypes(next);
      return next;
    });
    if (target) showToast(`سایز «${target.title}» حذف شد.`);
  };

  // --- Partner (colleague) invoices ---
  const handleSettlePartnerInvoice = async (
    invoice: PartnerInvoice,
    status: 'paid' | 'unpaid',
    note?: string
  ) => {
    try {
      const res = await fetch(`/api/partner-invoices/${encodeURIComponent(invoice.id)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note })
      });
      const data: any = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        showToast(data?.message || 'ثبت تسویه فاکتور ناموفق بود.');
        return false;
      }
      setPartnerInvoices((prev) =>
        prev.map((item) => (item.id === invoice.id ? { ...item, ...data.invoice } : item))
      );
      showToast(
        status === 'paid'
          ? `فاکتور ${invoice.number} تسویه شد.`
          : `فاکتور ${invoice.number} به حالت تسویه‌نشده برگشت.`
      );
      return true;
    } catch {
      showToast('خطا در ارتباط با سرور هنگام ثبت تسویه.');
      return false;
    }
  };

  // --- Cost price change requests (colleague → admin review) ---
  const handleRequestCostChange = async (dimensionId: string, newCost: number) => {
    try {
      const res = await fetch('/api/cost-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dimensionId, newCost })
      });
      const data: any = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        showToast(data?.message || 'ثبت پیشنهاد قیمت ناموفق بود.');
        return false;
      }
      setCostRequests((prev) => {
        const withoutPending = prev.filter(
          (r) =>
            !(
              r.dimensionId === dimensionId &&
              r.requestedBy === data.request.requestedBy &&
              r.status === 'pending'
            )
        );
        return [data.request, ...withoutPending];
      });
      return true;
    } catch {
      showToast('خطا در ارتباط با سرور هنگام ثبت پیشنهاد قیمت.');
      return false;
    }
  };

  const handleReviewCostRequest = async (request: CostChangeRequest, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/cost-requests/${encodeURIComponent(request.id)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data: any = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        showToast(data?.message || 'بازبینی درخواست ناموفق بود.');
        return false;
      }
      setCostRequests((prev) =>
        prev.map((item) => (item.id === request.id ? { ...item, ...data.request } : item))
      );
      if (action === 'approve') {
        // Reflect the approved cost immediately in the current admin session
        setDimensions((prev) =>
          prev.map((dim) =>
            dim.id === request.dimensionId
              ? { ...dim, costPrice: Number(request.newCost) || 0 }
              : dim
          )
        );
        apiClient.saveDimensions(
          dimensions.map((dim) =>
            dim.id === request.dimensionId
              ? { ...dim, costPrice: Number(request.newCost) || 0 }
              : dim
          )
        );
      }
      showToast(data.message || (action === 'approve' ? 'قیمت تایید شد.' : 'درخواست رد شد.'));
      return true;
    } catch {
      showToast('خطا در ارتباط با سرور هنگام بازبینی.');
      return false;
    }
  };

  const handleResetDimensions = () => {
    setDimensions(PRINT_DIMENSIONS);
    apiClient.saveDimensions(PRINT_DIMENSIONS);
    showToast('سایزها به حالت پیش‌فرض بازنشانی شدند.');
  };

  // Persist Orders when updated
  const handleUpdateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    const orderToStart = orders.find((order) => order.id === orderId);

    if (newStatus === 'ai_processing' && orderToStart?.paymentStatus !== 'paid') {
      showToast('پردازش رتوش فقط پس از تأیید پرداخت امکان‌پذیر است.');
      return;
    }

    setOrders((prev) => {
      const next = prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));
      apiClient.syncOrders(next);
      return next;
    });

    if (newStatus === 'ai_processing' && orderToStart) {
      aiQueueManager.enqueue({
        order: { ...orderToStart, status: 'ai_processing', aiStatus: 'pending' },
        apiKey: avalaiApiKey,
        baseUrl: avalaiBaseUrl,
        model: avalaiModel,
        prompt: orderToStart.aiPromptUsed || printTypePrompts[orderToStart.printType] || 'پرتره باکیفیت و رتوش شده آتلیه',
        commercialPrompt: printTypePrompts['commercial'] || 'عکاسی تبلیغاتی و تجاری فاخر، نورپردازی متمرکز استودیویی روی محصول و مدل، بوکه نرم پس‌زمینه لوکس، کیفیت فوق‌العاده وضوح و رنگ عالی',
        queuedAt: Date.now()
      });
    }

    showToast('وضعیت سفارش با موفقیت تغییر یافت.');
  };

  const handleGenerateOrderImage = (order: Order, asset: 'ai' | 'commercial') => {
    if (order.paymentStatus !== 'paid') {
      showToast('تولید تصویر فقط پس از تأیید پرداخت امکان‌پذیر است.');
      return;
    }
    if (!order.uploadedImage) {
      showToast('برای تولید تصویر، عکس اصلی سفارش در دسترس نیست.');
      return;
    }
    if (!avalaiApiKey.trim()) {
      showToast('برای تولید تصویر، ابتدا کلید سرویس هوش مصنوعی را در تنظیمات وارد کنید.');
      return;
    }

    const commercialPrompt =
      printTypePrompts.commercial ||
      'عکاسی تبلیغاتی و تجاری فاخر، نورپردازی متمرکز استودیویی روی محصول و مدل، بوکه نرم پس‌زمینه لوکس، کیفیت فوق‌العاده وضوح و رنگ عالی';
    const queued = aiQueueManager.enqueue({
      order,
      apiKey: avalaiApiKey,
      baseUrl: avalaiBaseUrl,
      model: avalaiModel,
      prompt:
        asset === 'commercial'
          ? commercialPrompt
          : order.aiPromptUsed || printTypePrompts[order.printType] || 'پرتره باکیفیت و رتوش شده آتلیه',
      commercialPrompt,
      asset,
      queuedAt: Date.now()
    });

    showToast(
      queued
        ? asset === 'commercial'
          ? 'تولید عکس تبلیغاتی در صف قرار گرفت.'
          : 'تولید خروجی هوش مصنوعی در صف قرار گرفت.'
        : 'این سفارش هم‌اکنون در صف یا در حال پردازش است.'
    );
  };

  const handleUpdateOrder = (updatedOrder: Order) => {
    setOrders((prev) => {
      const next = prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
      apiClient.saveOrder(updatedOrder);
      return next;
    });
  };

  const handleDeleteOrder = (orderId: string) => {
    setOrders((prev) => prev.filter((order) => order.id !== orderId));
    showToast('سفارش با موفقیت حذف گردید.');
  };

  const handleClearAllOrders = () => {
    setOrders([]);
    apiClient.syncOrders([]);
    showToast('تمامی سفارشات سیستم با موفقیت حذف شدند.');
  };

  const handledOrderIdsRef = useRef<Set<string>>(new Set());

  // Register a paid order without starting retouch automatically.
  const handleNewOrder = (newOrder: Order) => {
    if (!handledOrderIdsRef.current.has(newOrder.id)) {
      handledOrderIdsRef.current.add(newOrder.id);

      setOrders((prev) => {
        if (prev.some((o) => o.id === newOrder.id)) {
          return prev;
        }
        const next = [newOrder, ...prev];
        apiClient.saveOrder(newOrder);
        return next;
      });
    }

    if (newOrder.paymentStatus === 'paid') {
      setUserTab(currentUser?.category === 'colleague' ? 'partner_orders' : 'orders');
    }
  };

  // A colleague only has the two partner menus — keep them on a valid tab
  React.useEffect(() => {
    if (!currentUser || currentUser.category !== 'colleague' || activeView !== 'user') return;
    if (!['partner_orders', 'partner_prices'].includes(userTab)) {
      setUserTab('partner_orders');
    }
  }, [currentUser, activeView, userTab]);

  // Handle Login
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setShowAuth(false);
    if (user.role === 'admin') {
      setActiveView('admin');
      setAdminTab('dashboard');
      window.history.pushState({}, '', routeToPath('admin', 'dashboard'));
    } else {
      setActiveView('user');
      // Colleagues only have the two partner menus — start on the order list
      const startTab: UserTab = user.category === 'colleague' ? 'partner_orders' : 'dashboard';
      setUserTab(startTab);
      window.history.pushState({}, '', routeToPath('user', startTab));
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setCurrentUser(null);
    setActiveView('user');
    setShowAuth(false);
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

  // Messenger sign-up pages (/eitaa and /telegram) — one screen, one action
  if (messengerPage) {
    const handleEnter = (user: User) => {
      setCurrentUser(user);
      setMessengerPage(null);
      setShowAuth(false);
      setActiveView('user');
      setUserTab('dashboard');
      window.history.pushState({}, '', '/user/dashboard');
    };
    return messengerPage === 'telegram' ? (
      <TelegramLanding onEnter={handleEnter} />
    ) : (
      <EitaaLanding onEnter={handleEnter} />
    );
  }

  // If not logged in -> Show Login & Register page on main page
  if (isAuthChecking) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50">
        <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    if (!showAuth) {
      return (
        <LandingPage
          onLogin={() => {
            setShowAuth(true);
            window.history.pushState({}, '', '/login');
            window.scrollTo({ top: 0 });
          }}
        />
      );
    }
    return (
      <AuthView
        onLogin={handleLogin}
        onBackToHome={() => {
          setShowAuth(false);
          window.history.pushState({}, '', '/');
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  if (maintenanceMode && activeView === 'user') {
    return <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-6"><div className="max-w-md rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-black text-slate-900">سایت در حال به‌روزرسانی است</h1><p className="mt-3 text-sm leading-7 text-slate-500">لطفاً چند دقیقه بعد دوباره تلاش کنید.</p></div></div>;
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
    <React.Suspense
      fallback={
        <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50">
          <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-sky-500 selection:text-white pt-[56px] sm:pt-[72px] lg:pt-0">
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
        onSelectAdminTab={selectAdminTab}
        totalOrdersCount={orders.length}
        activeOrdersCount={activeOrdersCount}
        printTypesCount={printTypes.length}
        openTicketsCount={openTicketsCount}
        totalTicketsCount={tickets.length}
        announcementsCount={announcements.length}
        maintenanceMode={maintenanceMode}
        maintenanceNotifications={maintenanceNotifications}
        isTogglingMaintenance={isTogglingMaintenance}
        maintenanceError={maintenanceError}
        onToggleMaintenance={toggleMaintenance}
      />

      {/* Main Layout Container with Right Sidebar */}
      <div className="flex-1 flex">
        {/* VIEW 1: ADMIN PANEL */}
        {activeView === 'admin' ? (
          <>
            {/* Admin Right Sidebar (Desktop) */}
            <AdminSidebar
              currentTab={adminTab}
              onSelectTab={selectAdminTab}
              user={currentUser}
              onLogout={handleLogout}
              totalOrdersCount={orders.length}
              activeOrdersCount={activeOrdersCount}
              printTypesCount={printTypes.length}
              openTicketsCount={openTicketsCount}
              totalTicketsCount={tickets.length}
              announcementsCount={announcements.length}
              maintenanceMode={maintenanceMode}
              maintenanceNotifications={maintenanceNotifications}
              isTogglingMaintenance={isTogglingMaintenance}
              maintenanceError={maintenanceError}
              onToggleMaintenance={toggleMaintenance}
            />

            {/* Admin Content Area */}
            <main className="flex-1 min-w-0 lg:mr-72">
              <div className="w-full max-w-[1500px] 2xl:max-w-[1680px] mx-auto p-3 sm:p-6 lg:p-8 pb-8">
              {adminTab === 'dashboard' && (
                <AdminDashboard
                  orders={orders}
                  queueInfo={queueInfo}
                  tickets={tickets}
                  onNavigateTab={(tab) => setAdminTab(tab as AdminTab)}
                />
              )}
              {adminPostPage(adminTab) && <AdminBlog key={`${adminTab}:${adminPageVersion}`} section={adminPostPage(adminTab)!.section}
                onNavigate={navigateAdminPost} onNavigationGuardChange={onAdminNavigationGuardChange} />}

              {adminTab === 'transactions' && <AdminTransactions />}

              {adminTab === 'announcements' && (
                <AdminAnnouncements
                  announcements={announcements}
                  onAddAnnouncement={handleAddAnnouncement}
                  onUpdateAnnouncement={handleUpdateAnnouncement}
                  onDeleteAnnouncement={handleDeleteAnnouncement}
                />
              )}

              {adminTab === 'transport' && (
                <AdminTransport
                  deliveryMethods={deliveryMethods}
                  onAdd={handleAddDeliveryMethod}
                  onUpdate={handleUpdateDeliveryMethod}
                  onDelete={handleDeleteDeliveryMethod}
                  showToast={showToast}
                />
              )}

              {adminTab === 'print_sizes' && (
                <AdminSizesManager
                  dimensions={dimensions}
                  printTypes={printTypes}
                  onAddDimension={handleAddDimension}
                  onUpdateDimension={handleUpdateDimension}
                  onDeleteDimension={handleDeleteDimension}
                  onResetDimensions={handleResetDimensions}
                />
              )}

              {adminTab === 'partner_invoices' && (
                <AdminPartnerInvoices
                  invoices={partnerInvoices}
                  onSettle={handleSettlePartnerInvoice}
                  showToast={showToast}
                />
              )}

              {adminTab === 'cost_requests' && (
                <AdminCostRequests
                  requests={costRequests}
                  onReview={handleReviewCostRequest}
                  showToast={showToast}
                />
              )}

              {adminTab === 'print_types' && (
                <PrintTypeManager
                  printTypes={printTypes}
                  dimensions={dimensions}
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
                  dimensions={dimensions}
                  orders={orders}
                  queueInfo={queueInfo}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onUpdateOrder={handleUpdateOrder}
                  onGenerateOrderImage={handleGenerateOrderImage}
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
                  eitaaToken={eitaaToken}
                  onSaveEitaa={handleSaveEitaaToken}
                />
              )}

              {adminTab === 'database' && <AdminDatabaseSettings showToast={showToast} />}

              {adminTab === 'users' && <AdminUsers showToast={showToast} />}

              {adminTab === 'backup' && (
                <div className="space-y-3 lg:space-y-4">
                  <AdminBackup showToast={showToast} />
                  <div className="w-full max-w-4xl mx-auto">
                    <AdminBackupSchedule showToast={showToast} />
                  </div>
                </div>
              )}

              {adminTab === 'sms' && <AdminSmsSettings showToast={showToast} />}

              {adminTab === 'storage' && <AdminStorageSettings showToast={showToast} />}

              {adminTab === 'sessions' && <AdminSessions showToast={showToast} />}

              {adminTab === 'audit' && <AdminAudit showToast={showToast} />}
              </div>
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
            <main className="flex-1 min-w-0 lg:mr-72">
              <div className="w-full max-w-[1200px] 2xl:max-w-[1320px] mx-auto p-3 sm:p-6 lg:p-8 pb-20 lg:pb-8">
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
                  dimensions={dimensions}
                  deliveryMethods={deliveryMethods}
                  user={currentUser}
                  onOrderCompleted={handleNewOrder}
                  onUserUpdate={handleUpdateUser}
                  onPhoneVerified={(updatedUser) => {
                    setCurrentUser(updatedUser);
                    showToast('شماره موبایل تأیید و در پروفایل ذخیره شد.');
                  }}
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

              {userTab === 'partner_orders' && (
                <PartnerOrders user={currentUser} orders={orders} />
              )}

              {userTab === 'partner_prices' && (
                <PartnerPriceList
                  user={currentUser}
                  dimensions={dimensions}
                  requests={costRequests}
                  onRequestChange={handleRequestCostChange}
                  showToast={showToast}
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
              </div>
            </main>
          </>
        )}
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (Visible only in user panel) */}
      {activeView === 'user' && (
        <div className="lg:hidden fixed bottom-3 inset-x-3 max-w-lg mx-auto bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 text-white rounded-2xl sm:rounded-3xl p-1.5 z-40 flex items-center justify-around shadow-xl shadow-teal-950/20 border border-teal-400/30 backdrop-blur-xl">
          {/* 1. راست: پیشخوان (برای همکاران مخفی است) */}
          {currentUser?.category !== 'colleague' && (
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
          )}

          {/* 2. سفارشات (قبلاً پیگیری) — برای همکاران مخفی است */}
          {currentUser?.category !== 'colleague' && (
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
          )}

          {/* 3. وسط: ثبت سفارش (برای همکاران مخفی است) */}
          {currentUser?.category !== 'colleague' && (
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
          )}

          {/* همکاران: سفارشات ارسال‌شده */}
          {currentUser?.category === 'colleague' && (
            <button
              onClick={() => setUserTab('partner_orders')}
              className={`flex-1 flex flex-col items-center gap-1 cursor-pointer py-2 px-1 rounded-xl transition-all ${
                userTab === 'partner_orders'
                  ? 'bg-white/25 text-white font-black shadow-xs scale-100'
                  : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <PackageSearch className="w-4 h-4" />
              <span className="text-[10px]">سفارشات</span>
            </button>
          )}

          {/* همکاران: لیست قیمت‌ها */}
          {currentUser?.category === 'colleague' && (
            <button
              onClick={() => setUserTab('partner_prices')}
              className={`flex-1 flex flex-col items-center gap-1 cursor-pointer py-2 px-1 rounded-xl transition-all ${
                userTab === 'partner_prices'
                  ? 'bg-white/25 text-white font-black shadow-xs scale-100'
                  : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span className="text-[10px]">قیمت‌ها</span>
            </button>
          )}

          {/* 4. چپ: تیکت — برای همکاران مخفی است */}
          {currentUser?.category !== 'colleague' && (
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
          )}
        </div>
      )}
    </div>
    </React.Suspense>
  );
}
