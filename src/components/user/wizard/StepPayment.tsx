import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Lock,
  RefreshCw,
  Smartphone,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { OrderDraft, PrintTypeOption, User } from '../../../types';
import { PRINT_TYPES, PRINT_DIMENSIONS, PAPER_MATERIALS } from '../../../data/mockData';
import { formatPrice } from '../../../utils/formatters';

interface StepPaymentProps {
  draft: OrderDraft;
  onUpdateDraft: (updated: Partial<OrderDraft>) => void;
  onNext: () => void;
  onBack: () => void;
  printTypes?: PrintTypeOption[];
  user?: User;
}

export const StepPayment: React.FC<StepPaymentProps> = ({
  draft,
  onUpdateDraft,
  onNext,
  onBack,
  printTypes,
  user
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'online' | 'card_to_card'>('online');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaid, setIsPaid] = useState(Boolean(draft.paymentReference));
  const [paymentRef, setPaymentRef] = useState(draft.paymentReference || '');

  // Shaparak simulator fields
  const [cardNumber, setCardNumber] = useState('6037 9975 4321 8890');
  const [cvv2, setCvv2] = useState('482');
  const [expMonth, setExpMonth] = useState('08');
  const [expYear, setExpYear] = useState('06');
  const [dynamicOtp, setDynamicOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(120);

  // Dynamically resolve printType from props, localStorage database, or fallback
  const activePrintTypes: PrintTypeOption[] = (() => {
    if (printTypes && printTypes.length > 0) return printTypes;
    try {
      const saved = localStorage.getItem('studio_print_types');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return PRINT_TYPES;
  })();

  const printType = activePrintTypes.find((t) => t.id === draft.printType) || activePrintTypes[0];
  const dimension = PRINT_DIMENSIONS.find((d) => d.id === draft.dimensionId) || PRINT_DIMENSIONS[0];
  const material = PAPER_MATERIALS.find((m) => m.id === draft.materialId) || PAPER_MATERIALS[0];

  const unitBase = printType.basePrice + dimension.basePrice;
  const unitExtras = (draft.hasLamination ? 35000 : 0) + (draft.designerRetouch ? 50000 : 0);
  const subtotal = (unitBase + unitExtras) * draft.quantity;
  const shippingCost = draft.deliveryMethod === 'peyk' ? 45000 : 35000;
  const walletCredit = draft.walletCreditUsed || 0;
  const finalTotal = Math.max(0, subtotal + shippingCost - draft.discountAmount - walletCredit);

  useEffect(() => {
    let interval: any;
    if (otpSent && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, timer]);

  const handleSendOtp = () => {
    setOtpSent(true);
    setTimer(120);
    setDynamicOtp('847192');
  };

  const handleSimulatePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const generatedRef = 'SHP-' + Math.floor(100000000 + Math.random() * 900000000);
      setIsProcessing(false);
      setIsPaid(true);
      setPaymentRef(generatedRef);
      onUpdateDraft({
        paymentMethod: selectedMethod,
        paymentReference: generatedRef
      });
    }, 1100);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-right">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold mb-1.5">
          <span>پرداخت امن صورت‌حساب</span>
        </div>
        <h2 className="text-lg sm:text-2xl font-black text-slate-900">
          پرداخت فاکتور سفارش چاپ
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-relaxed font-medium">
          پرداخت آنلاین از طریق کارت‌های عضو شبکه شتاب با اتصال امن شاپرک
        </p>
      </div>

      {!isPaid ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Payment Gateways Selection (4 cols) */}
          <div className="lg:col-span-4 space-y-3.5">
            <h3 className="text-xs font-bold text-slate-700">شیوه پرداخت:</h3>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedMethod('online')}
                className={`p-3 sm:p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex items-center justify-between active:scale-98 shadow-xs ${
                  selectedMethod === 'online'
                    ? 'bg-gradient-to-r from-sky-50 to-emerald-50 border-sky-400 text-slate-900'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">درگاه شاپرک</p>
                    <p className="text-[10px] text-slate-500">تمام کارت‌های شتاب</p>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('card_to_card')}
                className={`p-3 sm:p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex items-center justify-between active:scale-98 shadow-xs ${
                  selectedMethod === 'card_to_card'
                    ? 'bg-gradient-to-r from-sky-50 to-emerald-50 border-sky-400 text-slate-900'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">کارت به کارت</p>
                    <p className="text-[10px] text-slate-500">انتقال شتابی</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Total Due Card */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 text-xs shadow-xs">
              <span className="text-slate-500 block text-[11px] font-medium">مبلغ نهایی قابل پرداخت:</span>
              <p className="text-lg sm:text-xl font-black text-sky-700 font-mono">
                {formatPrice(finalTotal)}
              </p>

              {walletCredit > 0 && (
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center justify-between">
                  <span>🎁 کسر هدیه کیف پول:</span>
                  <span className="font-mono text-emerald-700 font-black">- {formatPrice(walletCredit)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 text-[10px] sm:text-[11px] text-slate-600 flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>دارای مجوز رسمی و نماد اعتماد پرداخت</span>
              </div>
            </div>
          </div>

          {/* Shaparak Payment Portal Simulator (8 cols) */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl sm:rounded-3xl overflow-hidden shadow-md">
            {/* Shaparak Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-3.5 sm:p-4 border-b border-slate-700 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white truncate">درگاه پرداخت الکترونیک شاپرک</h4>
                  <span className="text-[10px] text-emerald-400 font-mono">اتصال SSL 256-bit امن</span>
                </div>
              </div>

              <div className="text-left font-mono flex-shrink-0">
                <span className="text-[10px] text-slate-400 block">مبلغ:</span>
                <span className="text-xs font-bold text-white">{formatPrice(finalTotal)}</span>
              </div>
            </div>

            {/* Gateway Body */}
            <div className="p-4 sm:p-6 space-y-3.5 text-xs bg-white">
              {/* Card number */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">شماره ۱۶ رقمی کارت بانکی</label>
                <div className="relative">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-center font-mono text-xs sm:text-sm tracking-widest text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500 font-bold"
                  />
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* CVV2 and Expiry */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">کد CVV2</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={cvv2}
                    onChange={(e) => setCvv2(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-center font-mono text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">انقضا (ماه / سال)</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      maxLength={2}
                      value={expMonth}
                      onChange={(e) => setExpMonth(e.target.value)}
                      placeholder="ماه"
                      className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-center font-mono text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
                    />
                    <input
                      type="text"
                      maxLength={2}
                      value={expYear}
                      onChange={(e) => setExpYear(e.target.value)}
                      placeholder="سال"
                      className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-center font-mono text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic OTP */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-bold">رمز اینترنتی یکبار مصرف (رمز پویا)</label>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-[10px] sm:text-[11px] text-sky-600 hover:text-sky-700 font-bold cursor-pointer"
                  >
                    {otpSent ? `ارسال مجدد (${timer} ثانیه)` : 'دریافت رمز پویا'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={dynamicOtp}
                    onChange={(e) => setDynamicOtp(e.target.value)}
                    placeholder="رمز پیامک شده"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-center font-mono text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-[11px] sm:text-xs font-bold cursor-pointer flex-shrink-0 border border-slate-200"
                  >
                    دریافت
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600 active:scale-98 text-white font-black py-3.5 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>در حال تایید با شاپرک...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>پرداخت و تایید نهایی ({formatPrice(finalTotal)})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* SUCCESS RECEIPT VIEW */
        <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-xl mx-auto text-center space-y-5 shadow-lg">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900">پرداخت با موفقیت انجام شد!</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              تراکنش بانکی تایید شد و پیش‌فاکتور شما تسویه گردید.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-right">
            <div className="flex justify-between text-slate-600">
              <span>شماره مرجع بانکی (شاپرک):</span>
              <span className="font-mono font-bold text-slate-900 text-[11px] sm:text-xs">{paymentRef}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>مبلغ پرداختی:</span>
              <span className="font-mono font-bold text-emerald-700">{formatPrice(finalTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>شیوه پرداخت:</span>
              <span className="font-bold text-slate-800">درگاه مستقیم شتاب</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onNext}
            className="w-full sm:w-44 mx-auto h-12 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-700 hover:to-sky-700 active:scale-98 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-teal-600/20 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>مرحله بعد</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Back button if not yet paid */}
      {!isPaid && (
        <div className="flex justify-start pt-3">
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-44 h-12 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-700 hover:to-sky-700 active:scale-98 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-teal-600/20 cursor-pointer flex items-center justify-center gap-2"
          >
            <ChevronRight className="w-4 h-4" />
            <span>مرحله قبل</span>
          </button>
        </div>
      )}
    </div>
  );
};
