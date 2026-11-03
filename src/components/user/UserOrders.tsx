import React from 'react';
import {
  Package,
  Plus,
  CheckCircle2,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { Order, User } from '../../types';
import { formatPrice, formatOrderDateTime, deriveOrderCreatedAt } from '../../utils/formatters';

interface UserOrdersProps {
  orders: Order[];
  user: User;
  onStartNewOrder: () => void;
}

export const UserOrders: React.FC<UserOrdersProps> = ({ orders, user, onStartNewOrder }) => {
  const myOrders = orders.filter(
    (o) =>
      o.userId === user.id ||
      o.userName === user.name ||
      o.userId === 'u-sara' ||
      user.role === 'admin'
  );

  // Check if any order is currently undergoing background processing
  const hasProcessingOrder = myOrders.some((o) => o.status === 'ai_processing' || o.aiStatus === 'processing');

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Orders List */}
      {myOrders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto border border-sky-100">
            <Package className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">هنوز سفارشی ثبت نکرده‌اید!</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              می‌توانید عکس پرسنلی، تبدیل سیاه و سفید، عکس یادبود یا عروسی خود را با فرآیند هوشمند سفارش دهید.
            </p>
          </div>
          <button
            onClick={onStartNewOrder}
            className="w-full sm:w-auto bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 active:scale-95 text-white font-bold px-6 py-3 rounded-xl text-xs transition-all cursor-pointer min-h-[42px] shadow-md shadow-sky-500/20"
          >
            شروع اولین سفارش
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {myOrders.map((order) => {
            const isProcessing = order.status === 'ai_processing' || order.aiStatus === 'processing';
            const isInQueue = order.aiStatus === 'in_queue';
            const displayPhoto = order.uploadedImage;

            return (
              <div
                key={order.id}
                className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 space-y-3.5 relative overflow-hidden"
              >
                {/* Processing subtle top indicator */}
                {isProcessing && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400 animate-pulse" />
                )}
                {isInQueue && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-amber-400 animate-pulse" />
                )}

                {/* 1. Top: Date in a separate row with a divider line underneath */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-[11px] text-slate-400 font-mono">
                  <span className="text-slate-400 font-sans text-[11px]">تاریخ ثبت:</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatOrderDateTime(deriveOrderCreatedAt(order), order.date)}</span>
                  </div>
                </div>

                {/* 2. Photo Thumbnail + Title */}
                <div className="flex items-center gap-3.5 sm:gap-4">
                  <div className="relative w-14 h-18 sm:w-16 sm:h-20 rounded-xl sm:rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 shadow-xs">
                    {displayPhoto ? (
                      <img
                        src={displayPhoto}
                        alt={order.userName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Package className="w-5 h-5" />
                      </div>
                    )}

                    {isProcessing && (
                      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-1 text-center">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400 mb-1" />
                        <span className="text-[8px] font-bold">در حال پردازش</span>
                      </div>
                    )}
                    {isInQueue && (
                      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-1 text-center">
                        <span className="text-[8px] font-bold text-amber-300">در صف هوش مصنوعی</span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">
                      {order.printType === 'personnel'
                        ? 'عکس پرسنلی ۳×۴ رسمی'
                        : order.printType === 'bw_to_color'
                        ? 'تبدیل سیاه و سفید به رنگی'
                        : order.printType === 'memorial'
                        ? 'عکس مراسم یادبود و ترحیم'
                        : 'عکس نامزدی یا عروسی عمارت'}
                    </h3>
                    {Number(order.invoiceDetails?.serviceFeeAmount) > 0 && (
                      <p className="mt-1 text-[10px] text-emerald-700 font-bold">
                        هزینه خدمات: <span className="font-mono">{formatPrice(order.invoiceDetails?.serviceFeeAmount || 0)}</span>
                      </p>
                    )}
                    {isInQueue && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-bold border border-amber-200 inline-block mt-1">
                        در صف نوبت پردازش هوش مصنوعی (فاصله ۱ دقیقه بین سفارش‌ها)
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Middle: Stepper Progress Pipeline */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {/* 1. ثبت و پرداخت */}
                  <div className="flex items-center gap-1.5 p-2 rounded-xl bg-emerald-50/90 border border-emerald-200/80 text-emerald-800 font-bold">
                    <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                    <span className="truncate text-[11px]">۱. ثبت و پرداخت</span>
                  </div>

                  {/* 2. رتوش و آماده‌سازی */}
                  <div
                    className={`flex items-center gap-1.5 p-2 rounded-xl border font-bold transition-all ${
                      order.aiProcessedImage || order.status === 'printing' || order.status === 'ready_to_ship' || order.status === 'delivered'
                        ? 'bg-emerald-50/90 border-emerald-200/80 text-emerald-800'
                        : isProcessing
                        ? 'bg-sky-50 border-sky-200 text-sky-800'
                        : 'bg-slate-50/80 border-slate-200/60 text-slate-400'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] flex-shrink-0 ${
                        order.aiProcessedImage || order.status === 'printing' || order.status === 'ready_to_ship' || order.status === 'delivered'
                          ? 'bg-emerald-500 text-white'
                          : isProcessing
                          ? 'bg-sky-500 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {order.aiProcessedImage || order.status === 'printing' || order.status === 'ready_to_ship' || order.status === 'delivered' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : isProcessing ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        '۲'
                      )}
                    </div>
                    <span className="truncate text-[11px]">۲. رتوش و آماده‌سازی</span>
                  </div>

                  {/* 3. چاپ در لابراتوار */}
                  <div
                    className={`flex items-center gap-1.5 p-2 rounded-xl border font-bold transition-all ${
                      order.status === 'printing' || order.status === 'ready_to_ship' || order.status === 'delivered'
                        ? 'bg-teal-50/90 border-teal-200/80 text-teal-800'
                        : 'bg-slate-50/80 border-slate-200/60 text-slate-400'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] flex-shrink-0 ${
                        order.status === 'ready_to_ship' || order.status === 'delivered'
                          ? 'bg-emerald-500 text-white'
                          : order.status === 'printing'
                          ? 'bg-teal-500 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {order.status === 'ready_to_ship' || order.status === 'delivered' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        '۳'
                      )}
                    </div>
                    <span className="truncate text-[11px]">۳. چاپ در لابراتوار</span>
                  </div>

                  {/* 4. بسته‌بندی و تحویل */}
                  <div
                    className={`flex items-center gap-1.5 p-2 rounded-xl border font-bold transition-all ${
                      order.status === 'delivered'
                        ? 'bg-emerald-50/90 border-emerald-200/80 text-emerald-800'
                        : order.status === 'ready_to_ship'
                        ? 'bg-teal-50/90 border-teal-200/80 text-teal-800'
                        : 'bg-slate-50/80 border-slate-200/60 text-slate-400'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] flex-shrink-0 ${
                        order.status === 'delivered'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {order.status === 'delivered' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        '۴'
                      )}
                    </div>
                    <span className="truncate text-[11px]">۴. بسته‌بندی و تحویل</span>
                  </div>
                </div>

                {/* 3. Bottom Single Line: کد رهگیری در راست | مبلغ فاکتور در چپ (کوچک و یکپارچه در یک خط) */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500">
                  <span className="font-mono text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60">
                    کد رهگیری: <span className="font-bold text-sky-700">#{order.trackingCode}</span>
                  </span>

                  <div className="flex items-center gap-1 text-slate-600">
                    <span className="text-slate-400">مبلغ فاکتور:</span>
                    <span className="font-bold font-mono text-slate-900">
                      {formatPrice(order.totalPrice)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
