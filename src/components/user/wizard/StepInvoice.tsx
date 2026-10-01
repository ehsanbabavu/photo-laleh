import React, { useState } from 'react';
import {
  Receipt,
  MapPin,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { OrderDraft } from '../../../types';
import { PRINT_TYPES, PRINT_DIMENSIONS, PAPER_MATERIALS } from '../../../data/mockData';
import { formatPrice } from '../../../utils/formatters';

interface StepInvoiceProps {
  draft: OrderDraft;
  onUpdateDraft: (updated: Partial<OrderDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepInvoice: React.FC<StepInvoiceProps> = ({
  draft,
  onUpdateDraft,
  onNext,
  onBack
}) => {
  const [voucherInput, setVoucherInput] = useState('');
  const [voucherMessage, setVoucherMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(
    draft.discountAmount > 0 ? { text: 'کد تخفیف با موفقیت اعمال شده است.', type: 'success' } : null
  );
  const [addressError, setAddressError] = useState('');

  const printType = PRINT_TYPES.find((t) => t.id === draft.printType) || PRINT_TYPES[0];
  const dimension = PRINT_DIMENSIONS.find((d) => d.id === draft.dimensionId) || PRINT_DIMENSIONS[0];
  const material = PAPER_MATERIALS.find((m) => m.id === draft.materialId) || PAPER_MATERIALS[0];

  // Pricing calculations
  const unitBase = printType.basePrice + dimension.basePrice;
  const unitExtras = (draft.hasLamination ? 35000 : 0) + (draft.designerRetouch ? 50000 : 0);
  const subtotal = (unitBase + unitExtras) * draft.quantity;
  const shippingCost = draft.deliveryMethod === 'peyk' ? 45000 : 35000;
  const finalTotal = Math.max(0, subtotal + shippingCost - draft.discountAmount);

  const handleApplyVoucher = () => {
    const code = voucherInput.trim().toUpperCase();
    if (code === 'EHSAN' || code === 'EHSAN20' || code === 'STUDIO') {
      const discount = Math.round(subtotal * 0.2);
      onUpdateDraft({
        discountCode: code,
        discountAmount: discount
      });
      setVoucherMessage({ text: `کد تخفیف ${code} اعمال شد! ۲۰٪ تخفیف کسر گردید.`, type: 'success' });
    } else if (code === 'WELCOME') {
      onUpdateDraft({
        discountCode: code,
        discountAmount: 40000
      });
      setVoucherMessage({ text: 'کد تخفیف خوش‌آمدگویی اعمال شد (۴۰,۰۰۰ تومان کسر شد).', type: 'success' });
    } else {
      setVoucherMessage({ text: 'کد نامعتبر است. (تست: EHSAN یا WELCOME)', type: 'error' });
    }
  };

  const handleProceed = () => {
    if (draft.deliveryMethod === 'pishtaz') {
      if (!draft.customerInfo.fullName.trim() || !draft.customerInfo.phoneNumber.trim()) {
        setAddressError('لطفاً نام و شماره تماس تحویل‌گیرنده را وارد نمایید.');
        return;
      }
    }
    setAddressError('');
    onNext();
  };

  const isPostDelivery = draft.deliveryMethod === 'pishtaz';

  return (
    <div className="space-y-5">
      <div className={`grid grid-cols-1 ${isPostDelivery ? 'lg:grid-cols-12' : 'max-w-2xl mx-auto'} gap-5 items-start`}>
        {/* Itemized Invoice */}
        <div className={`${isPostDelivery ? 'lg:col-span-7' : 'w-full'} bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xs`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-400 to-emerald-400 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900">پیش‌فاکتور الکترونیکی سفارش</h3>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date().toLocaleDateString('fa-IR')}
                </span>
              </div>
            </div>

            <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              محاسبه آنی
            </span>
          </div>

          {/* Line items table */}
          <div className="space-y-2 text-xs">
            {/* Service & Type */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-slate-900 text-xs sm:text-sm">{printType.title}</p>
                <p className="text-slate-500 text-[10px] sm:text-[11px] mt-0.5">{printType.subtitle}</p>
              </div>
              <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm flex-shrink-0">
                {formatPrice(printType.basePrice)}
              </span>
            </div>

            {/* Dimension item */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-slate-900 text-xs">{dimension.title}</p>
                <p className="text-slate-500 text-[10px] font-mono mt-0.5">{dimension.dimensionsCm}</p>
              </div>
              <span className="font-mono font-bold text-sky-700 text-xs flex-shrink-0">
                {dimension.basePrice === 0 ? 'رایگان' : `+ ${formatPrice(dimension.basePrice)}`}
              </span>
            </div>

            {/* Optional additions */}
            {draft.hasLamination && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-slate-700 text-xs">
                <span>روکش لمینت مات</span>
                <span className="font-mono font-bold">+ {formatPrice(35000)}</span>
              </div>
            )}

            {draft.designerRetouch && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-slate-700 text-xs">
                <span>روتوش دستی طراح ارشد</span>
                <span className="font-mono font-bold">+ {formatPrice(50000)}</span>
              </div>
            )}

            {/* Quantity multiplier */}
            {draft.quantity > 1 && (
              <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-between text-sky-900 text-xs">
                <span className="font-bold">ضریب تیراژ ({draft.quantity} قطعه)</span>
                <span className="font-mono font-bold">× {draft.quantity}</span>
              </div>
            )}

            {/* Shipping selection */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-[11px] text-slate-700 block font-bold">روش تحویل / ارسال:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateDraft({ deliveryMethod: 'peyk' })}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                    draft.deliveryMethod === 'peyk'
                      ? 'bg-gradient-to-r from-sky-50 to-emerald-50 border-sky-400 text-slate-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <p className="font-bold text-[11px] sm:text-xs text-slate-900">پیک اکسپرس (تحویل فوری)</p>
                  <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium">+۴۵,۰۰۰ تومان</p>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateDraft({ deliveryMethod: 'pishtaz' })}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                    draft.deliveryMethod === 'pishtaz'
                      ? 'bg-gradient-to-r from-sky-50 to-emerald-50 border-sky-400 text-slate-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <p className="font-bold text-[11px] sm:text-xs text-slate-900">پست پیشتاز (سراسر کشور)</p>
                  <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium">+۳۵,۰۰۰ تومان</p>
                </button>
              </div>
            </div>
          </div>

          {/* Discount Voucher Input */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200">
            <label className="block text-xs font-bold text-slate-700">کد تخفیف استودیو دارید؟</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="مثال: EHSAN یا WELCOME"
                value={voucherInput}
                onChange={(e) => setVoucherInput(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 uppercase font-mono placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={handleApplyVoucher}
                className="bg-slate-800 hover:bg-slate-900 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0"
              >
                اعمال
              </button>
            </div>
            {voucherMessage && (
              <p
                className={`text-[11px] font-bold ${
                  voucherMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {voucherMessage.text}
              </p>
            )}
          </div>

          {/* Totals Summary */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-50/80 to-emerald-50/80 border border-sky-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>جمع اقلام:</span>
              <span className="font-mono font-bold text-slate-800">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>هزینه ارسال:</span>
              <span className="font-mono font-bold text-slate-800">{formatPrice(shippingCost)}</span>
            </div>
            {draft.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>تخفیف ویژه:</span>
                <span className="font-mono">- {formatPrice(draft.discountAmount)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-sky-200/80 flex justify-between items-center text-xs sm:text-sm font-black text-slate-900">
              <span>مبلغ کل قابل پرداخت:</span>
              <span className="bg-gradient-to-l from-sky-700 to-emerald-700 bg-clip-text text-transparent font-mono text-sm sm:text-base font-black">
                {formatPrice(finalTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Recipient Information Form (Shown only when Post is selected) */}
        {isPostDelivery && (
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-3.5 shadow-xs animate-fadeIn">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200">
              <MapPin className="w-5 h-5 text-sky-600 flex-shrink-0" />
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">اطلاعات گیرنده برای پست</h3>
                <p className="text-[10px] text-slate-500">جهت ارسال مطمئن مرسوله پستی</p>
              </div>
            </div>

            {addressError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
                {addressError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">نام تحویل‌گیرنده *</label>
                <input
                  type="text"
                  placeholder="مثال: سارا رضایی"
                  value={draft.customerInfo.fullName}
                  onChange={(e) =>
                    onUpdateDraft({
                      customerInfo: { ...draft.customerInfo, fullName: e.target.value }
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">شماره تلفن همراه *</label>
                <input
                  type="tel"
                  placeholder="09123456789"
                  value={draft.customerInfo.phoneNumber}
                  onChange={(e) =>
                    onUpdateDraft({
                      customerInfo: { ...draft.customerInfo, phoneNumber: e.target.value }
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">استان</label>
                  <input
                    type="text"
                    placeholder="تهران"
                    value={draft.customerInfo.province}
                    onChange={(e) =>
                      onUpdateDraft({
                        customerInfo: { ...draft.customerInfo, province: e.target.value }
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">شهر</label>
                  <input
                    type="text"
                    placeholder="تهران"
                    value={draft.customerInfo.city}
                    onChange={(e) =>
                      onUpdateDraft({
                        customerInfo: { ...draft.customerInfo, city: e.target.value }
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">آدرس پستی کامل</label>
                <textarea
                  rows={2}
                  placeholder="خیابان، کوچه، پلاک، واحد..."
                  value={draft.customerInfo.address}
                  onChange={(e) =>
                    onUpdateDraft({
                      customerInfo: { ...draft.customerInfo, address: e.target.value }
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons (Side by Side on mobile and desktop) */}
      <div className="flex items-center justify-between gap-2.5 sm:gap-4 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 sm:flex-none bg-white hover:bg-slate-100 active:scale-98 text-slate-700 font-bold px-4 sm:px-6 py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm transition-colors cursor-pointer text-center min-h-[44px] border border-slate-200 flex items-center justify-center gap-1.5 shadow-xs"
        >
          <ChevronRight className="w-4 h-4" />
          <span>مرحله قبل</span>
        </button>

        <button
          type="button"
          onClick={handleProceed}
          className="flex-1 sm:flex-none bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 active:scale-98 text-white font-bold px-5 sm:px-8 py-3.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-sky-500/25 cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 min-h-[44px]"
        >
          <span>مرحله بعد</span>
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
