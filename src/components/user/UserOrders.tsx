import React from 'react';
import {
  Package,
  Plus
} from 'lucide-react';
import { Order, User } from '../../types';
import { formatPrice, getStatusBadge } from '../../utils/formatters';

interface UserOrdersProps {
  orders: Order[];
  user: User;
  onStartNewOrder: () => void;
}

export const UserOrders: React.FC<UserOrdersProps> = ({ orders, user, onStartNewOrder }) => {
  const myOrders = orders.filter((o) => o.userId === user.id || o.userName === user.name);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600 rounded-2xl sm:rounded-3xl p-4 sm:p-7 text-white shadow-lg shadow-sky-600/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base sm:text-xl lg:text-2xl font-black text-white">سفارشات و پیگیری چاپ من</h1>
          <p className="text-xs sm:text-sm text-sky-100 mt-0.5 leading-relaxed font-medium">
            مشاهده وضعیت زنده سفارشات، فرآیند روتوش و پیگیری مرسوله
          </p>
        </div>

        <button
          onClick={onStartNewOrder}
          className="w-full sm:w-auto bg-white hover:bg-slate-50 active:scale-95 text-slate-900 font-bold px-4 py-2.5 rounded-xl sm:rounded-2xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md min-h-[42px]"
        >
          <Plus className="w-4 h-4 text-sky-600" />
          <span>ثبت سفارش جدید (۵ مرحله‌ای)</span>
        </button>
      </div>

      {/* Orders List */}
      {myOrders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto border border-sky-100">
            <Package className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">هنوز سفارشی ثبت نکرده‌اید!</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              می‌توانید عکس پرسنلی، تبدیل سیاه و سفید، عکس یادبود یا عروسی خود را با فرآیند ۵ مرحله‌ای سفارش دهید.
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
        <div className="space-y-3 sm:space-y-4">
          {myOrders.map((order) => {
            const badge = getStatusBadge(order.status);
            return (
              <div
                key={order.id}
                className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 hover:border-sky-300 hover:shadow-md transition-all space-y-3.5 shadow-xs"
              >
                {/* Top Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                      {order.uploadedImage && (
                        <img
                          src={order.uploadedImage}
                          alt="عکس سفارش"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-[10px] sm:text-xs font-mono text-sky-700 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200 font-bold">
                          #{order.trackingCode}
                        </span>
                        <span className="text-[10px] sm:text-xs text-slate-500 font-mono">{order.date}</span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 mt-1 truncate">
                        {order.printType === 'personnel'
                          ? 'عکس پرسنلی ۳×۴'
                          : order.printType === 'bw_to_color'
                          ? 'تبدیل سیاه سفید به رنگی'
                          : order.printType === 'memorial'
                          ? 'عکس مراسم ختم'
                          : 'عکس نامزدی یا عروسی'}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                        تیراژ: {order.quantity} نسخه · پرداخت شده اینترنتی
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <span className="text-xs sm:text-sm font-black text-slate-900">
                      {formatPrice(order.totalPrice)}
                    </span>
                    <span className={`text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-md border font-bold ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>

                {/* Progress Pipeline */}
                <div className="pt-2.5 border-t border-slate-100">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-center text-[10px] text-slate-500">
                    <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl truncate ${order.status !== 'pending_review' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold' : 'bg-slate-50 text-slate-400'}`}>
                      ۱. ثبت فاکتور
                    </div>
                    <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl truncate ${order.status === 'ai_processing' || order.status === 'printing' || order.status === 'ready_to_ship' || order.status === 'delivered' ? 'bg-sky-50 text-sky-700 border border-sky-200 font-bold' : 'bg-slate-50 text-slate-400'}`}>
                      ۲. پردازش AI
                    </div>
                    <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl truncate ${order.status === 'printing' || order.status === 'ready_to_ship' || order.status === 'delivered' ? 'bg-teal-50 text-teal-700 border border-teal-200 font-bold' : 'bg-slate-50 text-slate-400'}`}>
                      ۳. چاپ لابراتوار
                    </div>
                    <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl truncate ${order.status === 'ready_to_ship' || order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold' : 'bg-slate-50 text-slate-400'}`}>
                      ۴. ارسال به آدرس
                    </div>
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
