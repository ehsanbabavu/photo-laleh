import React, { useState } from 'react';
import {
  Receipt,
  MapPin,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { DeliveryMethod, OrderDraft, PrintDimension, PrintTypeOption, User } from '../../../types';
import { PRINT_TYPES, PRINT_DIMENSIONS, PAPER_MATERIALS } from '../../../data/mockData';
import { formatPrice } from '../../../utils/formatters';

interface StepInvoiceProps {
  draft: OrderDraft;
  onUpdateDraft: (updated: Partial<OrderDraft>) => void;
  onNext: () => void;
  onBack: () => void;
  printTypes?: PrintTypeOption[];
  dimensions?: PrintDimension[];
  deliveryMethods?: DeliveryMethod[];
  user?: User;
}

export const StepInvoice: React.FC<StepInvoiceProps> = ({
  draft,
  onUpdateDraft,
  onNext,
  onBack,
  printTypes,
  dimensions,
  deliveryMethods,
  user
}) => {
  const DEFAULT_DELIVERY: DeliveryMethod[] = [
    { id: 'peyk', title: 'پیک اکسپرس (تحویل فوری)', price: 45000, eta: 'همان روز', requiresAddress: false, isEnabled: true },
    { id: 'pishtaz', title: 'پست پیشتاز (سراسر کشور)', price: 35000, eta: '۲ تا ۴ روز کاری', requiresAddress: true, isEnabled: true }
  ];

  // Transport methods come from the admin «ترابری» panel
  const activeDeliveryMethods = (deliveryMethods && deliveryMethods.length > 0 ? deliveryMethods : DEFAULT_DELIVERY)
    .filter((method) => method.isEnabled !== false);
  const selectedMethod =
    activeDeliveryMethods.find((method) => method.id === draft.deliveryMethod) || activeDeliveryMethods[0];
  const [addressError, setAddressError] = useState('');

  // Resolve printType from the print types coming from the database
  const activePrintTypes: PrintTypeOption[] =
    printTypes && printTypes.length > 0 ? printTypes : PRINT_TYPES;

  const printType = activePrintTypes.find((t) => t.id === draft.printType) || activePrintTypes[0];
  const activeDimensions: PrintDimension[] =
    dimensions && dimensions.length > 0 ? dimensions : PRINT_DIMENSIONS;
  const dimension =
    activeDimensions.find((d) => d.id === draft.dimensionId) || activeDimensions[0];
  const material = PAPER_MATERIALS.find((m) => m.id === draft.materialId) || PAPER_MATERIALS[0];

  // Pricing calculations
  const framePrice =
    draft.hasFrame && dimension.frameEnabled
      ? Math.max(0, Number(dimension.frameCustomerPrice) || 0)
      : 0;
  const unitBase = dimension.basePrice + framePrice;
  const unitExtras = (draft.hasLamination ? 35000 : 0) + (draft.designerRetouch ? 50000 : 0);
  const subtotal = (unitBase + unitExtras) * draft.quantity;
  const shippingCost = Math.max(0, Number(selectedMethod?.price) || 0);
  const grossTotal = Math.max(0, subtotal + shippingCost);

  // Wallet credit: usable once, and consumed completely by the order that uses it
  const userWallet = typeof user?.walletBalance === 'number' ? user.walletBalance : 0;
  const isWalletCreditAvailable = userWallet > 0 && !user?.hasUsedFirstOrderGift;
  const [applyWalletCredit, setApplyWalletCredit] = useState<boolean>(isWalletCreditAvailable);
  const walletDeduction =
    applyWalletCredit && isWalletCreditAvailable ? Math.min(userWallet, grossTotal) : 0;
  const finalTotal = Math.max(0, grossTotal - walletDeduction);

  const isPostDelivery = selectedMethod?.requiresAddress === true;
  const customerInfo = draft.customerInfo || {
    fullName: user?.name || '',
    phoneNumber: user?.phone || '',
    province: 'تهران',
    city: 'تهران',
    address: '',
    postalCode: '',
    notes: ''
  };

  const handleProceed = () => {
    if (isPostDelivery) {
      if (!customerInfo.fullName?.trim() || !customerInfo.phoneNumber?.trim()) {
        setAddressError('لطفاً نام و شماره تماس تحویل‌گیرنده را وارد نمایید.');
        return;
      }
    }
    setAddressError('');

    const invDetails = {
      printTypeTitle: printType.title,
      dimensionTitle: dimension.title,
      materialTitle: material.name || '',
      quantity: draft.quantity || 1,
      unitBasePrice: unitBase,
      extrasPrice: unitExtras,
      subtotal,
      shippingCost,
      deliveryMethod: selectedMethod?.id || draft.deliveryMethod,
      discountAmount: 0,
      discountCode: '',
      walletCreditUsed: walletDeduction,
      finalTotal,
      finalTotalRial: finalTotal * 10,
      customerFullName: customerInfo.fullName || user?.name || 'مشتری آتلیه',
      customerPhone: customerInfo.phoneNumber || user?.phone || '',
      customerAddress: `${customerInfo.province || ''} ${customerInfo.city || ''} ${customerInfo.address || ''}`.trim(),
      createdAtFa: new Date().toLocaleDateString('fa-IR')
    };

    onUpdateDraft({
      customerInfo,
      deliveryMethod: selectedMethod?.id || draft.deliveryMethod,
      walletCreditUsed: walletDeduction,
      discountAmount: 0,
      discountCode: '',
      totalPrice: finalTotal,
      invoiceDetails: invDetails
    });
    onNext();
  };

  return (
    <div className="space-y-5">
      <div className={`grid grid-cols-1 ${isPostDelivery ? 'lg:grid-cols-12' : 'max-w-2xl mx-auto'} gap-5 items-start`}>
        {/* Itemized Invoice */}
        <div className={`${isPostDelivery ? 'lg:col-span-7' : 'w-full'} bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xs`}>
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-400 to-emerald-400 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900">پیش‌فاکتور الکترونیکی سفارش</h3>
            </div>
          </div>

          {/* Line items table */}
          <div className="space-y-2 text-xs">
            {/* Service + size merged into a single line with one price */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-slate-900 text-xs sm:text-sm">{printType.title}</p>
                <p className="text-slate-500 text-[10px] sm:text-[11px] mt-0.5">{printType.subtitle}</p>
                {dimension.id !== 'personnel_6x3x4' && !dimension.title.includes('۶ عدد عکس ۳×۴') && (
                  <p className="text-[10px] sm:text-[11px] font-bold text-sky-700 mt-1">
                    {dimension.title} · <span className="font-mono">{dimension.dimensionsCm}</span>
                    {framePrice > 0 && <span className="text-amber-700"> · با تخته شاسی</span>}
                  </p>
                )}
              </div>
              <span className="font-mono font-black text-slate-900 text-xs sm:text-sm flex-shrink-0">
                {formatPrice(unitBase)}
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

            {/* Delivery method (managed in the admin «ترابری» panel) */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-[11px] text-slate-700 block font-bold">روش تحویل / ارسال:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeDeliveryMethods.map((method) => {
                  const isActive = (selectedMethod?.id || '') === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => onUpdateDraft({ deliveryMethod: method.id })}
                      className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-sky-50 to-emerald-50 border-sky-400 text-slate-900 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <p className="font-bold text-[11px] sm:text-xs text-slate-900">{method.title}</p>
                      <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium">
                        {Number(method.price) > 0 ? `+${formatPrice(method.price)}` : 'رایگان'}
                        {method.eta ? ` • ${method.eta}` : ''}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Wallet credit card (one-time credit, consumed by the order) */}
          {isWalletCreditAvailable && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-300 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center font-black text-sm flex-shrink-0 shadow-xs">
                  🎁
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-emerald-900">اعتبار کیف پول</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      یک‌بار مصرف
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-0.5 leading-snug">
                    موجودی شما {formatPrice(userWallet)} است؛ با استفاده از آن، مبلغ از همین فاکتور
                    کسر و اعتبار کیف پول شما صفر می‌شود.
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0 bg-white/80 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                <input
                  type="checkbox"
                  checked={applyWalletCredit}
                  onChange={(e) => setApplyWalletCredit(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-emerald-300 cursor-pointer"
                />
                <span className="text-xs font-bold text-emerald-900 select-none">کسر از فاکتور</span>
              </label>
            </div>
          )}

          {/* Totals Summary */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-50/80 to-emerald-50/80 border border-sky-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>جمع اقلام:</span>
              <span className="font-mono font-bold text-slate-800">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>هزینه ارسال ({selectedMethod?.title || '—'}):</span>
              <span className="font-mono font-bold text-slate-800">{formatPrice(shippingCost)}</span>
            </div>

            {walletDeduction > 0 && (
              <div className="flex justify-between items-center text-emerald-800 font-bold bg-emerald-100/70 p-2 rounded-xl border border-emerald-300/80">
                <div className="flex items-center gap-1.5">
                  <span>🎁 کسر اعتبار کیف پول:</span>
                </div>
                <span className="font-mono font-black text-xs sm:text-sm text-emerald-700">
                  - {formatPrice(walletDeduction)}
                </span>
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
                  value={customerInfo.fullName}
                  onChange={(e) =>
                    onUpdateDraft({
                      customerInfo: { ...customerInfo, fullName: e.target.value }
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
                  value={customerInfo.phoneNumber}
                  onChange={(e) =>
                    onUpdateDraft({
                      customerInfo: { ...customerInfo, phoneNumber: e.target.value }
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
                    value={customerInfo.province}
                    onChange={(e) =>
                      onUpdateDraft({
                        customerInfo: { ...customerInfo, province: e.target.value }
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
                    value={customerInfo.city}
                    onChange={(e) =>
                      onUpdateDraft({
                        customerInfo: { ...customerInfo, city: e.target.value }
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
                  value={customerInfo.address}
                  onChange={(e) =>
                    onUpdateDraft({
                      customerInfo: { ...customerInfo, address: e.target.value }
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-3 pt-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 sm:flex-none sm:w-44 h-12 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-700 hover:to-sky-700 active:scale-98 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-teal-600/20 cursor-pointer flex items-center justify-center gap-2"
        >
          <ChevronRight className="w-4 h-4" />
          <span>مرحله قبل</span>
        </button>

        <button
          type="button"
          onClick={handleProceed}
          className="flex-1 sm:flex-none sm:w-44 h-12 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-700 hover:to-sky-700 active:scale-98 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-teal-600/20 cursor-pointer flex items-center justify-center gap-2"
        >
          <span>مرحله بعد</span>
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
