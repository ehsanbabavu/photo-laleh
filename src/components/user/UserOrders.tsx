import React, { useEffect, useRef, useState } from 'react';
import {
  Package,
  CheckCircle2,
  RefreshCw,
  Calendar,
  Printer,
  X
} from 'lucide-react';
import { Order, User } from '../../types';
import { formatPrice, formatOrderDateTime, deriveOrderCreatedAt } from '../../utils/formatters';
import { getOrderPrintAssets } from '../../utils/orderPrintAssets';
import type { OrderPrintAsset } from '../../utils/orderPrintAssets';

interface UserOrdersProps {
  orders: Order[];
  user: User;
  onStartNewOrder: () => void;
}

export const UserOrders: React.FC<UserOrdersProps> = ({ orders, user, onStartNewOrder }) => {
  const [previewAsset, setPreviewAsset] = useState<OrderPrintAsset | null>(null);
  const previewTriggerRef = useRef<HTMLButtonElement | null>(null);
  const previewCloseButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (previewAsset) {
      previewCloseButtonRef.current?.focus();
    } else {
      previewTriggerRef.current?.focus();
    }
  }, [previewAsset]);

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
            const printAssets = getOrderPrintAssets(order);

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

                {/* 2. Order title */}
                <div className="min-w-0">
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

                {order.paymentStatus === 'paid' && (
                  <section className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="flex items-center gap-1.5 text-[11px] font-black text-slate-800">
                        <Printer className="w-3.5 h-3.5 text-emerald-700" />
                        عکس‌های ارسالی برای چاپ
                      </h4>

                    </div>

                    {printAssets.length === 0 ? (
                      <p className="text-[10px] leading-relaxed text-slate-500">
                        پس از آماده‌شدن خروجی‌ها، تصاویر سفارش در این بخش نمایش داده می‌شوند.
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {printAssets.map((asset) => (
                          <button
                            key={asset.key}
                            type="button"
                            onClick={(event) => {
                              previewTriggerRef.current = event.currentTarget;
                              setPreviewAsset(asset);
                            }}
                            aria-label={`نمایش بزرگ ${asset.label}`}
                            aria-haspopup="dialog"
                            className="min-w-0 cursor-pointer rounded-xl border border-slate-200 bg-white p-1.5 text-right transition-colors hover:border-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                          >
                            <img
                              src={asset.imageUrl}
                              alt={asset.label}
                              loading="lazy"
                              className="h-20 sm:h-28 w-full rounded-lg bg-slate-100 object-contain"
                            />
                            <span className="mt-1.5 block truncate text-[9px] sm:text-[10px] font-bold text-slate-700">
                              {asset.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* 3. Tracking code and invoice amount */}
                <div className="border-t border-slate-100 pt-2">
                  <div className="flex items-center justify-center gap-2 text-sm font-bold text-red-700 sm:text-base">
                    <span>کد رهگیری جهت تحویل:</span>
                    <span dir="ltr" className="whitespace-nowrap font-mono text-base font-bold text-red-700 sm:text-lg">
                      #{order.trackingCode}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-end text-[10px] text-slate-500 sm:text-[11px]">
                    <div className="flex items-center gap-1 text-slate-600">
                      <span className="text-slate-400">مبلغ فاکتور:</span>
                      <span className="font-bold font-mono text-slate-900">
                        {formatPrice(order.totalPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {previewAsset && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/90 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-image-preview-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) setPreviewAsset(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setPreviewAsset(null);
            }
          }}
        >
          <div className="flex max-h-[95vh] w-full max-w-5xl flex-col items-center gap-3">
            <h2 id="order-image-preview-title" className="sr-only">
              پیش‌نمایش بزرگ {previewAsset.label}
            </h2>
            <div className="flex w-full justify-start">
              <button
                ref={previewCloseButtonRef}
                type="button"
                onClick={() => setPreviewAsset(null)}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-slate-900 shadow-lg transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                خروج از پیش‌نمایش
              </button>
            </div>
            <img
              src={previewAsset.imageUrl}
              alt={previewAsset.label}
              className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
            <p className="text-sm font-bold text-white">{previewAsset.label}</p>
          </div>
        </div>
      )}
    </div>
  );
};
