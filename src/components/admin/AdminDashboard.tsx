import React from 'react';
import {
  TrendingUp,
  Package,
  BotMessageSquare,
  Network,
  Printer,
  ChevronLeft,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { Order, ApiConnection } from '../../types';
import { formatPrice, formatNumber, getStatusBadge } from '../../utils/formatters';

interface AdminDashboardProps {
  orders: Order[];
  apis: ApiConnection[];
  onNavigateTab: (tab: 'chatgpt' | 'apis' | 'orders') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ orders, apis, onNavigateTab }) => {
  const activeApisCount = apis.filter((a) => a.isEnabled).length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === 'paid' ? o.totalPrice : 0), 0);
  const pendingPrintCount = orders.filter((o) => o.status === 'printing' || o.status === 'ai_processing').length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600 rounded-2xl sm:rounded-3xl p-4 sm:p-7 relative overflow-hidden shadow-lg shadow-sky-600/15 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-sky-100 text-xs font-bold mb-1">
              <Sparkles className="w-4 h-4 flex-shrink-0 text-emerald-200" />
              <span>پنل اختصاصی مدیریت استودیو</span>
            </div>
            <h1 className="text-lg sm:text-2xl lg:text-3xl font-black text-white">
              درود احسان عزیز، وقت بخیر!
            </h1>
            <p className="text-xs sm:text-sm text-sky-100 mt-1 max-w-xl leading-relaxed">
              تمامی ۱۰ سرویس API متصل و درگاه پرداخت شاپرک فعال است. هم‌اکنون {pendingPrintCount} سفارش در مرحله پردازش هوش مصنوعی و صف چاپ قرار دارد.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 pt-2 sm:pt-0">
            <button
              onClick={() => onNavigateTab('chatgpt')}
              className="flex-1 sm:flex-none bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 border border-white/20 cursor-pointer min-h-[40px] backdrop-blur-xs"
            >
              <BotMessageSquare className="w-4 h-4 text-emerald-300 flex-shrink-0" />
              <span>تست چت‌جی‌پی‌تی</span>
            </button>
            <button
              onClick={() => onNavigateTab('orders')}
              className="flex-1 sm:flex-none bg-white hover:bg-slate-50 active:scale-95 text-slate-900 font-black px-4 py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md min-h-[40px]"
            >
              <Printer className="w-4 h-4 text-sky-600 flex-shrink-0" />
              <span>مشاهده صف چاپ</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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

        {/* ChatGPT Status */}
        <div
          onClick={() => onNavigateTab('chatgpt')}
          className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group active:scale-98 shadow-xs"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium">چت جی پی تی</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform border border-emerald-100">
              <BotMessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs sm:text-sm font-bold text-slate-900">GPT-4o</span>
          </div>
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-emerald-600 font-bold mt-1 sm:mt-2">
            <span>۲۴۰ms</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </div>

        {/* 10 APIs Status */}
        <div
          onClick={() => onNavigateTab('apis')}
          className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 hover:border-sky-400 hover:shadow-md transition-all cursor-pointer group active:scale-98 shadow-xs"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium">۱۰ API مجزا</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform border border-sky-100">
              <Network className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 font-mono">
            {activeApisCount} <span className="text-xs font-normal text-slate-500">از ۱۰</span>
          </div>
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-sky-600 font-bold mt-1 sm:mt-2">
            <span>مدیریت</span>
            <ArrowUpRight className="w-3 h-3" />
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
