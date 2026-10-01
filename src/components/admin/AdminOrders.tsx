import React, { useState } from 'react';
import {
  Printer,
  Search,
  MapPin,
  Phone,
  Eye,
  X
} from 'lucide-react';
import { Order } from '../../types';
import { formatPrice, getStatusBadge } from '../../utils/formatters';

interface AdminOrdersProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, newStatus: Order['status']) => void;
}

export const AdminOrders: React.FC<AdminOrdersProps> = ({ orders, onUpdateOrderStatus }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.trackingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerInfo?.phoneNumber?.includes(searchQuery);

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && order.status === statusFilter;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600 rounded-2xl sm:rounded-3xl p-4 sm:p-7 text-white shadow-lg shadow-sky-600/15">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 border border-white/20 text-white flex items-center justify-center flex-shrink-0 backdrop-blur-xs">
              <Printer className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl lg:text-2xl font-black text-white">مدیریت سفارشات چاپ و آتلیه</h1>
              <p className="text-xs sm:text-sm text-sky-100 mt-0.5 leading-relaxed">
                بررسی فایل‌های ارسالی کاربران و تایید خروجی لابراتوار
              </p>
            </div>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-white/15 border border-white/20 text-white text-xs font-mono self-start sm:self-auto backdrop-blur-xs font-bold">
            کل سفارشات: {orders.length}
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="جستجو با نام مشتری، کد پیگیری یا شماره تماس..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 pr-9 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl overflow-x-auto no-scrollbar text-xs">
          {[
            { id: 'all', label: 'همه' },
            { id: 'ai_processing', label: 'پردازش AI' },
            { id: 'printing', label: 'در حال چاپ' },
            { id: 'ready_to_ship', label: 'آماده ارسال' },
            { id: 'delivered', label: 'تحویل شده' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer font-bold ${
                statusFilter === tab.id
                  ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-xs">
            <p className="text-slate-500 text-xs sm:text-sm">سفارشی با این فیلتر یافت نشد.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const badge = getStatusBadge(order.status);
            return (
              <div
                key={order.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 hover:border-sky-300 hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs"
              >
                {/* Left/Main Info */}
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  <div
                    onClick={() => setSelectedOrder(order)}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 cursor-pointer group relative"
                  >
                    {order.uploadedImage ? (
                      <img
                        src={order.uploadedImage}
                        alt="عکس چاپ"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Printer className="w-6 h-6" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{order.userName}</h3>
                      <span className="text-[10px] sm:text-xs font-mono text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                        #{order.trackingCode}
                      </span>
                    </div>

                    <p className="text-[11px] sm:text-xs text-slate-600">
                      چاپ:{' '}
                      <span className="font-bold text-slate-900">
                        {order.printType === 'personnel'
                          ? 'پرسنلی ۳×۴'
                          : order.printType === 'bw_to_color'
                          ? 'تبدیل سیاه سفید به رنگی'
                          : order.printType === 'memorial'
                          ? 'مراسم ختم'
                          : 'عروسی/نامزدی'}
                      </span>
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px] text-slate-500 pt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{order.customerInfo?.city}</span>
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span className="font-mono">{order.customerInfo?.phoneNumber}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Actions & Status Control */}
                <div className="flex items-center justify-between lg:justify-end gap-3 border-t lg:border-t-0 pt-2.5 lg:pt-0 border-slate-100">
                  <div className="text-right">
                    <div className="text-xs sm:text-sm font-bold text-slate-900">
                      {formatPrice(order.totalPrice)}
                    </div>
                    <span className="text-[10px] text-emerald-600 font-bold">
                      پرداخت شده
                    </span>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <select
                      value={order.status}
                      onChange={(e) => onUpdateOrderStatus(order.id, e.target.value as Order['status'])}
                      className="bg-slate-50 border border-slate-200 text-[11px] sm:text-xs text-slate-800 rounded-xl px-2.5 py-2 focus:outline-none focus:border-sky-500 cursor-pointer min-h-[38px] font-bold"
                    >
                      <option value="pending_review">در انتظار بررسی</option>
                      <option value="ai_processing">پردازش AI</option>
                      <option value="printing">در حال چاپ</option>
                      <option value="ready_to_ship">آماده ارسال</option>
                      <option value="delivered">تحویل داده شده</option>
                    </select>

                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center border border-slate-200"
                      title="مشاهده جزئیات کامل"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold text-slate-900 truncate">سفارش #{selectedOrder.trackingCode}</span>
                <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-lg border font-bold ${getStatusBadge(selectedOrder.status).color}`}>
                  {getStatusBadge(selectedOrder.status).label}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <span className="text-slate-700 block font-bold">تصویر سفارش:</span>
                <div className="w-full aspect-[4/3] rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative">
                  {selectedOrder.uploadedImage && (
                    <img
                      src={selectedOrder.uploadedImage}
                      alt="فایل اصلی"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="text-sky-700 font-bold block mb-1">اطلاعات فنی</span>
                  <div className="flex justify-between text-slate-700">
                    <span className="text-slate-500">نوع چاپ:</span>
                    <span className="font-bold">
                      {selectedOrder.printType === 'personnel'
                        ? 'پرسنلی'
                        : selectedOrder.printType === 'bw_to_color'
                        ? 'تبدیل رنگی'
                        : selectedOrder.printType === 'memorial'
                        ? 'مراسم ختم'
                        : 'عروسی'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span className="text-slate-500">مجموع:</span>
                    <span className="font-bold text-slate-900">{formatPrice(selectedOrder.totalPrice)}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="text-emerald-700 font-bold block mb-1">مشخصات گیرنده</span>
                  <div className="flex justify-between text-slate-700">
                    <span className="text-slate-500">نام:</span>
                    <span className="font-bold">{selectedOrder.customerInfo?.fullName || selectedOrder.userName}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span className="text-slate-500">تلفن:</span>
                    <span className="font-mono">{selectedOrder.customerInfo?.phoneNumber}</span>
                  </div>
                  <div className="text-slate-700 pt-1 border-t border-slate-200">
                    <span className="text-slate-500 block mb-0.5">آدرس:</span>
                    <p className="leading-relaxed text-[11px]">{selectedOrder.customerInfo?.address || 'تحویل در استودیو'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer min-h-[40px] border border-slate-200"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
