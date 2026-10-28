import React, { useMemo, useState } from 'react';
import {
  Package,
  Search,
  Printer,
  CheckCircle2,
  Clock,
  Truck,
  Ruler,
  CalendarDays,
  MessageCircle,
  Send,
  Building2,
  Inbox
} from 'lucide-react';
import { Order, User } from '../../types';
import { formatPrice, getStatusBadge } from '../../utils/formatters';

interface PartnerOrdersProps {
  user: User;
  orders: Order[];
}

/** Read-only list of the print jobs that were assigned to this colleague. */
export const PartnerOrders: React.FC<PartnerOrdersProps> = ({ user, orders }) => {
  const [query, setQuery] = useState('');

  const mine = useMemo(() => {
    const assigned = orders.filter(
      (order) => order.partnerId === user.id || (order as any).partnerId === user.id
    );
    const q = query.trim();
    if (!q) return assigned;
    return assigned.filter(
      (order) =>
        order.trackingCode?.includes(q) ||
        (order.invoiceDetails?.printTypeTitle || '').includes(q) ||
        (order.invoiceDetails?.dimensionTitle || '').includes(q)
    );
  }, [orders, user.id, query]);

  const totalItems = mine.reduce((sum, order) => sum + (Number(order.quantity) || 1), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-sky-500/25">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900">لیست سفارشات</h1>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                سفارش‌های چاپی که برای شما ارسال شده است
              </p>
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی کد سفارش یا سایز"
              className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mt-3.5">
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-200">
            <span className="text-[10px] font-bold text-sky-800 block">تعداد سفارش</span>
            <span className="font-mono font-black text-sky-900 text-sm">{mine.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-800 block">مجموع قطعات</span>
            <span className="font-mono font-black text-emerald-900 text-sm">{totalItems}</span>
          </div>
        </div>
      </div>

      {mine.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl sm:rounded-3xl p-10 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Inbox className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-700">هنوز سفارشی برای شما ارسال نشده است</p>
          <p className="text-xs text-slate-500">
            به‌محض ارسال سفارش توسط مدیر، جزئیات آن در این صفحه نمایش داده می‌شود.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {mine.map((order) => {
            const status = getStatusBadge(order.status);
            return (
              <div
                key={order.id}
                className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 font-mono" dir="ltr">
                      {order.trackingCode || order.id}
                    </p>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <CalendarDays className="w-3 h-3" />
                      {order.date}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <p className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Printer className="w-3 h-3" />
                      نوع چاپ:
                    </span>
                    <span className="font-bold text-slate-900 truncate">
                      {order.invoiceDetails?.printTypeTitle || '—'}
                    </span>
                  </p>
                  <p className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Ruler className="w-3 h-3" />
                      سایز:
                    </span>
                    <span className="font-bold text-slate-900 truncate">
                      {order.invoiceDetails?.dimensionTitle || '—'}
                    </span>
                  </p>
                  <p className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">تعداد:</span>
                    <span className="font-mono font-bold text-slate-900">{order.quantity || 1} سری</span>
                  </p>
                  <p className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">جنس:</span>
                    <span className="font-bold text-slate-900 truncate">
                      {order.invoiceDetails?.materialTitle || '—'}
                    </span>
                  </p>
                  {order.customerInfo?.notes && (
                    <p className="pt-1.5 border-t border-slate-100 text-slate-600 leading-relaxed">
                      <span className="text-slate-500">توضیح: </span>
                      {order.customerInfo.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500">
                    {order.partnerChannel === 'eitaa' ? (
                      <MessageCircle className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Send className="w-3 h-3 text-sky-600" />
                    )}
                    {order.partnerChannel === 'eitaa' ? 'دریافت از ایتا' : 'دریافت از تلگرام'}
                  </span>
                  <span className="text-[10px] text-slate-400">{order.partnerSentAt || ''}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
