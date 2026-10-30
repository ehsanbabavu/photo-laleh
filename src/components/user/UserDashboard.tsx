import React, { useState } from 'react';
import {
  User as UserIcon,
  Package,
  Phone,
  Calendar,
  Lock,
  Edit3,
  Eye,
  EyeOff,
  Check,
  Sparkles,
  ChevronDown,
  Volume2,
  X
} from 'lucide-react';
import { Order, User, SupportTicket, PrintTypeOption, Announcement } from '../../types';
import { formatNumber } from '../../utils/formatters';
import { SERVICE_IMAGE_BLOB } from '../../data/heroSlides';
import { ChatGptConnectorCard } from './ChatGptConnectorCard';

interface UserDashboardProps {
  user: User;
  orders: Order[];
  tickets?: SupportTicket[];
  printTypes?: PrintTypeOption[];
  announcements?: Announcement[];
  onMarkAnnouncementAsRead?: (announcementId: string) => void;
  onUpdateUser?: (updated: User) => void;
  onStartNewOrder: () => void;
  onGoToOrders: () => void;
  onGoToTickets: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  orders,
  tickets = [],
  printTypes = [],
  announcements = [],
  onMarkAnnouncementAsRead,
  onUpdateUser,
  onStartNewOrder,
  onGoToOrders,
  onGoToTickets
}) => {
  // Collapsible state for User Information Card
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Selected announcement for reading details
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isAnnouncementsExpanded, setIsAnnouncementsExpanded] = useState(false);

  // Edit mode state for Full Name & Password
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.name || '');
  const [editPassword, setEditPassword] = useState(user.password || '123456');
  const [showPassword, setShowPassword] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editError, setEditError] = useState('');

  // Active announcements
  const activeAnnouncements = announcements.filter((a) => a.isActive !== false);

  const isAnnouncementRead = (ann: Announcement) => {
    return Array.isArray(ann.readBy) && ann.readBy.includes(user.id);
  };

  const handleOpenAnnouncement = (ann: Announcement) => {
    setSelectedAnnouncement(ann);
    if (!isAnnouncementRead(ann)) {
      onMarkAnnouncementAsRead?.(ann.id);
    }
  };

  // Filter orders related to this user
  const userOrders = orders.filter(
    (o) =>
      o.userId === user.id ||
      o.userName === user.name ||
      o.userId === 'u-sara' ||
      user.role === 'admin'
  );

  // Latest order is the first in list (or most recently updated)
  const latestOrder: Order | undefined = userOrders[0];

  // User tickets
  const myTickets = tickets.filter(
    (t) => t.userId === user.id || t.userName === user.name || user.role === 'admin'
  );

  const activeOrdersCount = userOrders.filter(
    (o) => o.status === 'pending_review' || o.status === 'ai_processing' || o.status === 'printing'
  ).length;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      setEditError('لطفاً نام و نام خانوادگی را وارد کنید.');
      return;
    }
    if (!editPassword.trim()) {
      setEditError('لطفاً رمز عبور را وارد کنید.');
      return;
    }
    setEditError('');

    const updated: User = {
      ...user,
      name: editName.trim(),
      password: editPassword.trim()
    };

    onUpdateUser?.(updated);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName(user.name || '');
    setEditPassword(user.password || '123456');
    setEditError('');
  };

  const getPrintTypeTitle = (type: string) => {
    switch (type) {
      case 'personnel':
        return 'عکس پرسنلی ۳×۴ رسمی';
      case 'bw_to_color':
        return 'تبدیل سیاه و سفید به رنگی';
      case 'memorial':
        return 'عکس مراسم یادبود و ترحیم';
      case 'wedding':
        return 'عکس نامزدی یا عروسی عمارت';
      default:
        return 'سفارش اختصاصی چاپ لاله';
    }
  };

  const userInfoCard = (
    <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow">
      {/* Header / Accordion Trigger */}
      <div
        onClick={() => setIsProfileOpen(!isProfileOpen)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div>
          <h2 className="text-sm font-black text-slate-900">
            اطلاعات حساب کاربری
          </h2>
          {!isProfileOpen && (
            <p className="text-[11px] text-slate-400 mt-0.5">
              {user.name} • {user.phone || 'شماره ثبت‌شده'}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsProfileOpen(true);
              setEditName(user.name || '');
              setEditPassword(user.password || '123456');
              setEditError('');
              setIsEditing(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 font-bold text-xs transition-colors cursor-pointer border border-slate-200 shadow-2xs"
            title="ویرایش مشخصات"
          >
            <Edit3 className="w-3.5 h-3.5 text-sky-600" />
            <span>ویرایش</span>
          </button>

          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isProfileOpen ? 'rotate-180 text-sky-600' : ''
              }`}
            />
          </div>
        </div>
      </div>

      {/* Collapsible Content */}
      {isProfileOpen && (
        <div className="pt-3.5 border-t border-slate-100 mt-3.5 animate-fadeIn">
          {/* Success notification */}
          {saveSuccess && (
            <div className="mb-3.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>اطلاعات نام و رمز عبور با موفقیت به‌روزرسانی شد.</span>
            </div>
          )}

          {/* Error notification */}
          {editError && (
            <div className="mb-3.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold animate-fadeIn">
              {editError}
            </div>
          )}

          {/* View Mode or Edit Mode */}
          {!isEditing ? (
            /* VIEW MODE: ONLY 4 FIELDS */
            <div className="space-y-2.5 text-xs">
              {/* 1. نام و نام خانوادگی */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-500">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>نام و نام خانوادگی:</span>
                </div>
                <span className="font-black text-slate-900 sm:text-sm">
                  {user.name}
                </span>
              </div>

              {/* 2. رمز عبور */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-500">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>رمز عبور:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-800 tracking-wider">
                    {showPassword ? (user.password || '123456') : '••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title={showPassword ? 'مخفی‌سازی رمز' : 'نمایش رمز'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* 3. شماره موبایل */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-500">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>شماره موبایل:</span>
                </div>
                <span className="font-bold text-slate-800 font-mono dir-ltr text-right">
                  {user.phone || '۰۹۱۲۳۴۵۶۷۸۹'}
                </span>
              </div>

              {/* 4. تاریخ عضویت */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-500">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>تاریخ عضویت:</span>
                </div>
                <span className="font-bold text-slate-700 font-mono">
                  {user.createdAt || '۱۴۰۳/۰۷/۱۰'}
                </span>
              </div>
            </div>
          ) : (
            /* EDIT MODE */
            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              {/* Edit Full Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">
                  نام و نام خانوادگی:
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs sm:text-sm font-bold p-2.5 rounded-xl border border-sky-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 bg-white text-slate-900 outline-none transition-all"
                  placeholder="نام و نام خانوادگی"
                  required
                />
              </div>

              {/* Edit Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">
                  رمز عبور:
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full text-xs sm:text-sm font-mono font-bold p-2.5 rounded-xl border border-sky-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 bg-white text-slate-900 outline-none pl-9 transition-all"
                    placeholder="رمز عبور جدید"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title={showPassword ? 'مخفی‌سازی رمز' : 'نمایش رمز'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Read-only Mobile */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500">شماره موبایل:</span>
                <span className="font-bold font-mono text-slate-700">
                  {user.phone || '۰۹۱۲۳۴۵۶۷۸۹'}
                </span>
              </div>

              {/* Read-only Member Since */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500">تاریخ عضویت:</span>
                <span className="font-bold font-mono text-slate-700">
                  {user.createdAt || '۱۴۰۳/۰۷/۱۰'}
                </span>
              </div>

              {/* Edit Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>ذخیره تغییرات</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );

  const unreadAnnouncementsCount = activeAnnouncements.filter((ann) => !isAnnouncementRead(ann)).length;
  const displayedAnnouncements = isAnnouncementsExpanded
    ? activeAnnouncements
    : activeAnnouncements.slice(0, 3);

  const announcementsCardNode = activeAnnouncements.length > 0 ? (
    <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h3 className="text-sm sm:text-base font-black text-slate-900">
            اطلاعیه‌ها
          </h3>
          <span className="min-w-[22px] h-[22px] px-1.5 rounded-lg bg-sky-500 text-white text-[11px] font-mono font-black flex items-center justify-center shadow-xs">
            {unreadAnnouncementsCount.toLocaleString('fa-IR')}
          </span>
        </div>

        {activeAnnouncements.length > 3 && (
          <button
            type="button"
            onClick={() => setIsAnnouncementsExpanded(!isAnnouncementsExpanded)}
            className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-xl transition-colors cursor-pointer border border-sky-200/60"
          >
            <span>{isAnnouncementsExpanded ? 'کمتر' : 'بیشتر'}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isAnnouncementsExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {displayedAnnouncements.map((ann) => {
          const isRead = isAnnouncementRead(ann);
          return (
            <div
              key={ann.id}
              onClick={() => handleOpenAnnouncement(ann)}
              className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl transition-all cursor-pointer shadow-xs hover:shadow-md active:scale-[0.99] text-white select-none flex items-center justify-between gap-3 ${
                isRead
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700'
                  : 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-700 hover:to-red-700'
              }`}
            >
              <span className="text-xs sm:text-sm font-black leading-snug truncate flex-1 min-w-0">
                {ann.title}
              </span>
              <span className="text-[11px] sm:text-xs font-mono font-bold text-white/90 flex-shrink-0 whitespace-nowrap bg-black/15 px-2.5 py-0.5 rounded-lg backdrop-blur-xs">
                {ann.createdAt}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-5 sm:space-y-6 animate-fadeIn pb-10">
      {/* 1. Mobile-only: User Account Information Card above Stats */}
      <div className="block lg:hidden">
        {userInfoCard}
      </div>

      {/* 2. Quick Overview Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div
          onClick={onGoToOrders}
          className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 cursor-pointer hover:shadow-md transition-all shadow-xs"
        >
          <span className="text-[11px] text-slate-500 font-medium block">کل سفارشات شما</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {userOrders.length.toLocaleString('fa-IR')}
            </span>
            <span className="text-[10px] text-slate-400">سفارش</span>
          </div>
        </div>

        <div
          onClick={onGoToOrders}
          className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 cursor-pointer hover:shadow-md transition-all shadow-xs"
        >
          <span className="text-[11px] text-slate-500 font-medium block">سفارشات در جریان</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">
              {activeOrdersCount.toLocaleString('fa-IR')}
            </span>
            <span className="text-[10px] text-slate-400">در حال انجام</span>
          </div>
        </div>

        <div
          onClick={onGoToTickets}
          className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 cursor-pointer hover:shadow-md transition-all shadow-xs"
        >
          <span className="text-[11px] text-slate-500 font-medium block">تیکت‌های فعال</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-sky-600 font-mono">
              {myTickets.length.toLocaleString('fa-IR')}
            </span>
            <span className="text-[10px] text-slate-400">پشتیبانی</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium block">اعتبار کیف پول</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-amber-600 font-mono">
              {formatNumber(user.walletBalance ?? 0)}
            </span>
            <span className="text-[10px] text-slate-400">تومان</span>
          </div>
        </div>
      </div>

      {/* 3. Mobile-only: Announcements Card above Orders */}
      <div className="block lg:hidden">
        {announcementsCardNode}
      </div>

      {/* ChatGPT connector — downloadable setup file */}
      <ChatGptConnectorCard />

      {/* Main Grid: User Info Card (Desktop) + Latest Order Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-start">
        {/* 2. CARD: USER INFORMATION (Desktop Only) */}
        <div className="hidden lg:flex flex-col">
          {userInfoCard}
        </div>

        {/* 3. CARD: LATEST ORDER (کارت بازطراحی‌شده و جمع‌وجور آخرین سفارش) */}
        <div className="flex flex-col">
          <div
            onClick={latestOrder ? onGoToOrders : undefined}
            className={`bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs transition-all ${
              latestOrder ? 'cursor-pointer hover:shadow-md hover:border-slate-300' : ''
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
              <span className="text-xs font-black text-slate-800">آخرین سفارش شما</span>
              {latestOrder && (
                <span className="text-[11px] font-bold text-sky-600 hover:text-sky-700">
                  مشاهده همه ←
                </span>
              )}
            </div>

            {latestOrder ? (
              <div className="space-y-3">
                {/* 1. بخش بالا: عکس و عنوان سفارش */}
                <div className="flex items-center gap-3 sm:gap-3.5">
                  {/* عکس (Photo) - کوچیک و شیک */}
                  <div className="relative w-16 h-20 sm:w-20 sm:h-24 rounded-xl sm:rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 shadow-xs">
                    {latestOrder.aiProcessedImage || latestOrder.uploadedImage ? (
                      <img
                        src={latestOrder.aiProcessedImage || latestOrder.uploadedImage || ''}
                        alt={getPrintTypeTitle(latestOrder.printType)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100">
                        <Package className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  {/* اسم سفارش */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold block">
                      عنوان سفارش:
                    </span>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-snug line-clamp-2">
                      {getPrintTypeTitle(latestOrder.printType)}
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 block pt-0.5">
                      کد پیگیری: {latestOrder.trackingCode}
                    </span>
                  </div>
                </div>

                {/* 2. خط جداکننده زیر عکس و انتقال مرحله به پایین سمت چپ */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">
                    مرحله سفارش:
                  </span>

                  {/* مرحله (پایین سمت چپ) */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {latestOrder.status === 'ready_to_ship' || latestOrder.status === 'delivered' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>تحویل</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                        <span>چاپ</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Empty state */
              <div className="text-center py-5 px-3 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto border border-sky-100">
                  <Package className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-500 font-medium">هنوز سفارشی ثبت نکرده‌اید</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Desktop-only: Announcements List Card (کارت اطلاعیه‌ها در دسکتاپ) */}
      <div className="hidden lg:block">
        {announcementsCardNode}
      </div>

      {/* 5. Quick Services Showcase (خدمات تخصصی آتلیه دیجیتال لاله) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm sm:text-base font-black text-slate-900">
            خدمات تخصصی آتلیه دیجیتال لاله
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {printTypes
            .filter((item) => item.isEnabled !== false)
            .map((item) => {
              const getServiceBgImage = (it: any) => {
                if (it.cardBgImage) {
                  return it.cardBgImage;
                }
                switch (it.id) {
                  case 'personnel': return SERVICE_IMAGE_BLOB.personnel;
                  case 'commercial': return SERVICE_IMAGE_BLOB.commercial;
                  case 'bw_to_color': return SERVICE_IMAGE_BLOB.bw_to_color;
                  case 'memorial': return SERVICE_IMAGE_BLOB.memorial;
                  case 'wedding': return SERVICE_IMAGE_BLOB.wedding;
                  default: return null;
                }
              };
              const bgImg = getServiceBgImage(item);

              return (
                <div
                  key={item.id}
                  className="relative overflow-hidden p-4 pl-24 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300/80 transition-all cursor-default group min-h-[110px] flex flex-col justify-between"
                >
                  {/* Clean, Full Opacity Portrait Background on Left Side */}
                  {bgImg && (
                    <div className="absolute left-0 top-0 bottom-0 w-24 pointer-events-none select-none z-0">
                      <img
                        src={bgImg}
                        alt=""
                        className="w-full h-full object-cover object-center opacity-100"
                      />
                    </div>
                  )}

                  <div className="relative z-10">
                    <h4 className="text-xs font-black text-sky-600 group-hover:text-sky-700 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed line-clamp-3">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                {selectedAnnouncement.title}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 mr-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs leading-relaxed text-slate-700">
              <p className="whitespace-pre-line text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                {selectedAnnouncement.content}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
                <span>تاریخ: {selectedAnnouncement.createdAt}</span>
                <span className="text-emerald-600 font-bold">خوانده شد ✓</span>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
