import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Package,
  BotMessageSquare,
  Printer,
  ChevronLeft,
  Sparkles,
  ArrowUpRight,
  LifeBuoy,
  HardDrive,
  Loader2
} from 'lucide-react';
import { Order, SupportTicket } from '../../types';
import { AdminTab } from './AdminSidebar';
import { formatPrice, formatNumber, getStatusBadge } from '../../utils/formatters';
import { QueueStateInfo } from '../../utils/aiQueueManager';
import { RefreshCw, Clock, CheckCircle2 } from 'lucide-react';

interface AdminDashboardProps {
  orders: Order[];
  queueInfo?: QueueStateInfo;
  tickets?: SupportTicket[];
  onNavigateTab: (tab: AdminTab) => void;
}

interface StorageUsage {
  usedBytes: number;
  remainingBytes: number;
  limitBytes: number;
  count: number;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return '۰';
  const units = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  // Show 1024 MB as 1 GB for readability
  if (unit < units.length - 1 && value >= 1023.5) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toLocaleString('fa-IR', { maximumFractionDigits: 1 })} ${units[unit]}`;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ orders, queueInfo, tickets = [], onNavigateTab }) => {
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [storageLoading, setStorageLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/storage/usage');
        const data = await res.json();
        if (active && data?.success) {
          setStorage({
            usedBytes: Number(data.usedBytes) || 0,
            remainingBytes: Number(data.remainingBytes) || 0,
            limitBytes: Number(data.limitBytes) || 0,
            count: Number(data.count) || 0
          });
        }
      } catch {
        // ignore
      } finally {
        if (active) setStorageLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const usedPercent = storage && storage.limitBytes > 0
    ? Math.min((storage.usedBytes / storage.limitBytes) * 100, 100)
    : 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dash = (usedPercent / 100) * circumference;

  const totalRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === 'paid' ? o.totalPrice : 0), 0);
  const pendingPrintCount = orders.filter((o) => o.status === 'printing' || o.status === 'ai_processing').length;
  const openTicketsCount = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Live AI Queue Monitoring Widget */}
      {queueInfo && (
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                queueInfo.isProcessing
                  ? 'bg-sky-50 text-sky-600 border border-sky-200'
                  : queueInfo.cooldownRemainingSeconds > 0
                  ? 'bg-amber-50 text-amber-600 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              }`}>
                {queueInfo.isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : queueInfo.cooldownRemainingSeconds > 0 ? (
                  <Clock className="w-4 h-4 animate-pulse" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900">
                  وضعیت صف پردازش هوش مصنوعی (Queue Monitor)
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  مدیریت خودکار و ترتیبی سفارشات هوش مصنوعی
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {queueInfo.isProcessing ? (
                <span className="px-3 py-1.5 rounded-xl bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>در حال پردازش سفارش #{queueInfo.currentOrderTrackingCode}</span>
                </span>
              ) : queueInfo.cooldownRemainingSeconds > 0 ? (
                <span className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs animate-pulse">
                  <span>⏳ فاصله امن: {queueInfo.cooldownRemainingSeconds} ثانیه دیگر</span>
                </span>
              ) : (
                <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                  🟢 آماده دریافت سفارش
                </span>
              )}

              <button
                onClick={() => onNavigateTab('orders')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                مشاهده سفارشات
              </button>
            </div>
          </div>

          {/* Queue Details / Cooldown Progress */}
          {queueInfo.cooldownRemainingSeconds > 0 && (
            <div className="mt-3.5 space-y-1.5 bg-amber-50/70 border border-amber-200/60 rounded-xl p-3">
              <div className="flex justify-between text-xs text-amber-900 font-bold">
                <span>شمارش معکوس تا آغاز پردازش سفارش بعدی در صف (فاصله محافظتی ۱ دقیقه):</span>
                <span>{queueInfo.cooldownRemainingSeconds} ثانیه</span>
              </div>
              <div className="w-full h-2 bg-amber-200/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-1000"
                  style={{ width: `${((60 - queueInfo.cooldownRemainingSeconds) / 60) * 100}%` }}
                />
              </div>
            </div>
          )}

          {queueInfo.queueList.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500 font-bold">سفارش‌های در نوبت:</span>
              {queueInfo.queueList.map((item, idx) => (
                <div
                  key={item.orderId}
                  className="bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 text-slate-700 font-medium flex items-center gap-1.5"
                >
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black flex items-center justify-center font-mono">
                    {idx + 1}
                  </span>
                  <span className="font-bold">{item.userName}</span>
                  <span className="font-mono text-sky-600 text-[11px]">#{item.trackingCode}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-xs text-slate-400">
              هیچ سفارشی در صف انتظار قرار ندارد.
            </div>
          )}
        </div>
      )}

      {/* 2 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Orders */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 hover:border-sky-300 hover:shadow-md transition-all shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium">کل سفارشات</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {formatNumber(orders.length)}
          </div>
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-emerald-600 font-bold mt-1 sm:mt-2">
            <TrendingUp className="w-3 h-3" />
            <span>+۱۲٪ این هفته</span>
          </div>
        </div>

        {/* Studio Revenue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 hover:border-emerald-300 hover:shadow-md transition-all shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium">درآمد پرداخت شده</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm sm:text-lg lg:text-xl font-black text-slate-900 truncate">
            {formatPrice(totalRevenue)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 sm:mt-2 font-medium">
            تسویه شاپرک
          </div>
        </div>

        {/* Blob storage usage */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 hover:border-violet-300 hover:shadow-md transition-all shadow-xs sm:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium">فضای آپلود عکس‌ها</span>
            <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>

          {storageLoading ? (
            <div className="flex items-center justify-center py-6 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : !storage ? (
            <p className="text-[11px] text-slate-400 py-4">در دسترس نیست</p>
          ) : (
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
                  <circle cx="50" cy="50" r={radius} fill="none" stroke="#ede9fe" strokeWidth="10" />
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke={usedPercent > 85 ? '#e11d48' : usedPercent > 60 ? '#f59e0b' : '#7c3aed'}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${circumference}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm font-black text-slate-900 font-mono">
                    {usedPercent.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪
                  </span>
                </div>
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">استفاده‌شده</span>
                  <span className="font-bold text-slate-900 font-mono">{formatBytes(storage.usedBytes)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">باقی‌مانده</span>
                  <span className="font-bold text-emerald-600 font-mono">{formatBytes(storage.remainingBytes)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">کل فضا</span>
                  <span className="font-bold text-slate-700 font-mono">{formatBytes(storage.limitBytes)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">تعداد فایل</span>
                  <span className="font-bold text-slate-700 font-mono">{storage.count.toLocaleString('fa-IR')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900">سفارشات جدید در صف چاپ</h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">سفارشات نیازمند تایید کیفی یا چاپ فیزیکی</p>
          </div>
          <button
            onClick={() => onNavigateTab('orders')}
            className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1 font-bold cursor-pointer"
          >
            <span>مشاهده همه</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2.5 sm:space-y-3">
          {orders.slice(0, 4).map((order) => {
            const badge = getStatusBadge(order.status);
            return (
              <div
                key={order.id}
                className="p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-white hover:border-slate-300 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-200 overflow-hidden flex-shrink-0 border border-slate-300">
                    {order.uploadedImage ? (
                      <img
                        src={order.uploadedImage}
                        alt="چاپ"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Printer className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">{order.userName}</span>
                      <span className="text-[10px] sm:text-[11px] font-mono text-slate-500">#{order.trackingCode}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5 flex flex-wrap items-center gap-1.5 sm:gap-2 font-medium">
                      <span>{order.printType === 'personnel' ? 'پرسنلی' : order.printType === 'bw_to_color' ? 'رنگی‌سازی' : order.printType === 'memorial' ? 'مراسم ختم' : 'عروسی/نامزدی'}</span>
                      <span className="text-slate-400">·</span>
                      <span className="font-mono">{order.customerInfo?.city || 'تهران'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                  <div className="text-right">
                    <span className="block text-xs sm:text-sm font-bold text-slate-900">
                      {formatPrice(order.totalPrice)}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">پرداخت شده</span>
                  </div>

                  <span
                    className={`text-[10px] sm:text-[11px] px-2.5 py-1 rounded-lg border font-bold ${badge.color}`}
                  >
                    {badge.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
