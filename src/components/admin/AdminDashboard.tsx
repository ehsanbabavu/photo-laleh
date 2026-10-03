import React from 'react';
import {
  TrendingUp,
  Package,
  BotMessageSquare,
  Printer,
  ChevronLeft,
  Sparkles,
  ArrowUpRight,
  LifeBuoy
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

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ orders, queueInfo, tickets = [], onNavigateTab }) => {
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
