import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Smartphone,
  ChevronRight,
  Copy,
  Check,
  Zap,
  Clock
} from 'lucide-react';
import { OrderDraft, PrintTypeOption, User, BluPalSettings, BluPalInvoice } from '../../../types';
import { PRINT_TYPES, PRINT_DIMENSIONS } from '../../../data/mockData';
import { formatPrice, formatRialDirect } from '../../../utils/formatters';
import { apiClient } from '../../../services/apiClient';

interface StepPaymentProps {
  draft: OrderDraft;
  onUpdateDraft: (updated: Partial<OrderDraft>) => void;
  onNext: () => void;
  onBack: () => void;
  printTypes?: PrintTypeOption[];
  user?: User;
  blupalSettings?: BluPalSettings;
}

export const StepPayment: React.FC<StepPaymentProps> = ({
  draft,
  onUpdateDraft,
  onNext,
  onBack,
  printTypes,
  user,
  blupalSettings
}) => {
  const [invoice, setInvoice] = useState<BluPalInvoice | null>(null);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [isPolling, setIsPolling] = useState(true);
  const [isPaid, setIsPaid] = useState(Boolean(draft.paymentReference));
  const [paymentRef, setPaymentRef] = useState(draft.paymentReference || '');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState(15 * 60);
  const [autoRedirecting, setAutoRedirecting] = useState(false);

  // Resolve printType from props
  const activePrintTypes: PrintTypeOption[] =
    printTypes && printTypes.length > 0 ? printTypes : PRINT_TYPES;

  const printType = activePrintTypes.find((t) => t.id === draft.printType) || activePrintTypes[0];
  const dimension = PRINT_DIMENSIONS.find((d) => d.id === draft.dimensionId) || PRINT_DIMENSIONS[0];

  const unitBase = printType.basePrice + dimension.basePrice;
  const unitExtras = (draft.hasLamination ? 35000 : 0) + (draft.designerRetouch ? 50000 : 0);
  const subtotal = (unitBase + unitExtras) * draft.quantity;
  const shippingCost = draft.deliveryMethod === 'peyk' ? 45000 : 35000;
  const walletCredit = draft.walletCreditUsed || draft.invoiceDetails?.walletCreditUsed || 0;
  const computedTotal = Math.max(0, subtotal + shippingCost - (draft.discountAmount || 0) - walletCredit);

  // Base final total from Step 4
  const baseTotal = draft.invoiceDetails?.finalTotal ?? draft.totalPrice ?? computedTotal;

  // Exact payable amount returned by BluPal API (with unique tracking digit)
  const payableAmount = invoice?.finalAmount || invoice?.amount || baseTotal;
  const payableAmountRial = invoice?.amountRial || (payableAmount * 10);

  // Copy helper
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Helper to format card number into 4-digit chunks
  const formatCardNumber = (cardStr: string) => {
    const clean = (cardStr || '').replace(/\D/g, '');
    if (!clean) return '6219 8619 4528 7193';
    return clean.match(/.{1,4}/g)?.join(' ') || clean;
  };

  // 1. Create Invoice on mount or when total changes
  useEffect(() => {
    let isMounted = true;

    async function initInvoice() {
      if (isPaid) return;

      const invDetails = draft.invoiceDetails;
      const totalAmountToPay = invDetails ? invDetails.finalTotal : baseTotal;

      if (totalAmountToPay === 0) {
        handlePaymentSuccess('GIFT-FREE-' + Math.floor(10000000 + Math.random() * 90000000));
        return;
      }

      setIsCreatingInvoice(true);

      try {
        const itemDesc = invDetails
          ? `سفارش چاپ ${invDetails.printTypeTitle} (${invDetails.dimensionTitle}) - ${invDetails.quantity} عدد - ${invDetails.customerFullName}`
          : `سفارش چاپ عکس ${printType?.title || 'آتلیه'}`;

        const res = await apiClient.createBluPalInvoice({
          amount: totalAmountToPay,
          orderId: draft.id || ('ORD-' + Date.now()),
          customerName: invDetails?.customerFullName || draft.customerInfo?.fullName || user?.name || 'مشتری آتلیه',
          customerPhone: invDetails?.customerPhone || draft.customerInfo?.phoneNumber || user?.phone || '',
          description: itemDesc,
          invoiceDetails: invDetails
        });

        if (isMounted) {
          if (res && res.success && res.invoice) {
            setInvoice(res.invoice);
          } else {
            setInvoice({
              invoiceId: 'BLU-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000),
              amount: totalAmountToPay,
              finalAmount: totalAmountToPay,
              amountRial: totalAmountToPay * 10,
              customerName: invDetails?.customerFullName || draft.customerInfo?.fullName || user?.name || 'مشتری آتلیه',
              customerPhone: invDetails?.customerPhone || draft.customerInfo?.phoneNumber || user?.phone || '',
              description: itemDesc,
              status: 'pending',
              cardNumber: blupalSettings?.blupalCardNumber || '6219 8619 4528 7193',
              accountHolder: blupalSettings?.blupalAccountHolder || 'آتلیه تخصصی لاله',
              createdAt: new Date().toLocaleDateString('fa-IR'),
              expiresAt: Date.now() + 15 * 60 * 1000,
              invoiceDetails: invDetails
            });
          }
          setIsCreatingInvoice(false);
        }
      } catch (err) {
        if (isMounted) {
          setIsCreatingInvoice(false);
        }
      }
    }

    initInvoice();

    return () => {
      isMounted = false;
    };
  }, [baseTotal, isPaid]);

  // 2. Countdown timer
  useEffect(() => {
    if (isPaid || countdownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCountdownSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaid, countdownSeconds]);

  // 3. Background polling
  const hasTriggeredNextRef = useRef(false);

  const handlePaymentSuccess = (referenceId: string) => {
    if (hasTriggeredNextRef.current) return;
    hasTriggeredNextRef.current = true;

    setIsPaid(true);
    setPaymentRef(referenceId);
    setAutoRedirecting(true);

    onUpdateDraft({
      paymentMethod: 'card_to_card',
      paymentReference: referenceId
    });

    setTimeout(() => {
      onNext();
    }, 1800);
  };

  useEffect(() => {
    if (!invoice || isPaid || !isPolling) return;

    const pollIntervalSec = blupalSettings?.blupalAutoPollInterval || 3;
    const interval = setInterval(async () => {
      try {
        const targetId = invoice.invoiceId || (invoice as any).localInvoiceId;
        const res = await apiClient.checkBluPalInvoiceStatus(targetId);
        if (res && res.success) {
          if (res.status === 'paid' || res.invoice?.status === 'paid') {
            const refCode = res.invoice?.referenceCode || res.referenceCode || ('BLU-REF-' + Math.floor(10000000 + Math.random() * 90000000));
            handlePaymentSuccess(refCode);
          }
        }
      } catch (err) {
        // Polling retry
      }
    }, pollIntervalSec * 1000);

    return () => clearInterval(interval);
  }, [invoice, isPaid, isPolling, blupalSettings]);

  // 4. Sandbox Test Pay button
  const handleSimulateSandboxPayment = async () => {
    setIsCreatingInvoice(true);
    if (invoice?.invoiceId) {
      const res = await apiClient.simulateBluPalPayment(invoice.invoiceId);
      setIsCreatingInvoice(false);
      if (res && res.success) {
        handlePaymentSuccess(res.referenceCode || ('BLU-REF-' + Math.floor(100000000 + Math.random() * 900000000)));
        return;
      }
    }
    setIsCreatingInvoice(false);
    handlePaymentSuccess('BLU-REF-' + Math.floor(100000000 + Math.random() * 900000000));
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const rawCard = invoice?.cardNumber || blupalSettings?.blupalCardNumber || '6219 8619 4528 7193';
  const formattedCardNumber = formatCardNumber(rawCard);
  const currentAccountHolder = invoice?.accountHolder || blupalSettings?.blupalAccountHolder || 'آتلیه تخصصی لاله';
  const displayInvoiceId = invoice?.invoiceId || draft.id || 'BLU-PENDING';

  return (
    <div className="space-y-4 max-w-2xl mx-auto px-1 sm:px-0">
      {!isPaid ? (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {/* Header Bar with Countdown */}
          <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-300 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-bold">انتقال کارت به کارت</span>
            </div>

            {/* Countdown Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/30 border border-white/15 text-xs font-mono font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
              <span className="text-slate-200 text-[10px] font-sans">مهلت واریز:</span>
              <span className="text-amber-300">{formatCountdown(countdownSeconds)}</span>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-6 space-y-3.5">
            {isCreatingInvoice ? (
              <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                <p className="text-xs font-bold text-slate-700">در حال دریافت اطلاعات کارت مقصد...</p>
              </div>
            ) : (
              <>
                {/* Card Details Container */}
                <div className="p-3.5 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3.5 text-xs">
                  {/* 1. Centered Card Number Box */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 text-center">
                    <span className="text-[11px] font-bold text-slate-500 block">شماره کارت مقصد (بانک/بلوبانک):</span>
                    <div className="font-mono font-black text-slate-900 text-base sm:text-xl tracking-widest text-center dir-ltr py-1">
                      {formattedCardNumber}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(rawCard.replace(/\s/g, ''), 'card')}
                      className="mx-auto px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                      title="کپی شماره کارت"
                    >
                      {copiedField === 'card' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-emerald-700" />}
                      <span>{copiedField === 'card' ? 'کپی شد' : 'کپی شماره کارت'}</span>
                    </button>
                  </div>

                  {/* 2. Centered Exact Amount Box (Displayed in Rials) */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 text-center">
                    <span className="text-[11px] font-bold text-slate-500 block">مبلغ دقیق واریز (ریال):</span>
                    <div className="font-mono font-black text-emerald-700 text-base sm:text-xl text-center py-1">
                      {formatRialDirect(payableAmountRial)}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(String(payableAmountRial), 'amount')}
                      className="mx-auto px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                      title="کپی مبلغ واریزی (ریال)"
                    >
                      {copiedField === 'amount' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-emerald-700" />}
                      <span>{copiedField === 'amount' ? 'کپی شد' : 'کپی مبلغ به ریال'}</span>
                    </button>
                  </div>

                  {/* 3. Invoice ID Box (Placed Below Amount Box, No Copy Button) */}
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500">شناسه رسمی فاکتور:</span>
                    <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm dir-ltr">
                      {displayInvoiceId}
                    </span>
                  </div>

                  {/* 4. Account Holder Box */}
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500">صاحب حساب:</span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      {currentAccountHolder}
                    </span>
                  </div>
                </div>

                {/* Live Polling Status Indicator */}
                <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-2.5">
                  <div className="relative flex items-center justify-center flex-shrink-0">
                    <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full animate-ping absolute" />
                    <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full relative" />
                  </div>
                  <span className="leading-relaxed text-[11px] sm:text-xs">
                    استعلام واریز به صورت آنلاین و خودکار انجام می‌شود؛ پس از واریز، نیازی به آپلود فیش نیست.
                  </span>
                </div>

                {/* Sandbox Quick Test Button */}
                {(blupalSettings?.blupalSandboxMode ?? true) && (
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-50 via-emerald-50 to-sky-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-800">
                        حالت آزمایشی (Sandbox Test Mode)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleSimulateSandboxPayment}
                      className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>تست واریز موفق</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        /* SUCCESS CELEBRATION */
        <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-emerald-500 to-teal-700 text-white text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 text-white flex items-center justify-center mx-auto backdrop-blur-md border border-white/30 animate-bounce">
            <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <h3 className="text-lg sm:text-2xl font-black">پرداخت کارت به کارت تایید شد! 🎉</h3>
          <p className="text-xs sm:text-sm text-emerald-100 max-w-md mx-auto">
            واریز شما تایید گردید. کد پیگیری پرداخت:
          </p>
          <div className="inline-block px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 font-mono font-black text-sm tracking-wider dir-ltr">
            {paymentRef || draft.paymentReference || 'BLU-CONFIRMED'}
          </div>
          <p className="text-xs text-emerald-200">در حال انتقال خودکار به مرحله نهایی ثبت سفارش...</p>
        </div>
      )}

      {/* Navigation Button */}
      {!isPaid && (
        <div className="flex items-center justify-start gap-3 pt-3">
          <button
            type="button"
            onClick={onBack}
            disabled={autoRedirecting}
            className="w-full sm:w-44 h-12 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-700 hover:to-sky-700 active:scale-98 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-teal-600/20 cursor-pointer flex items-center justify-center gap-2"
          >
            <ChevronRight className="w-4 h-4" />
            <span>بازگشت به پیش‌فاکتور</span>
          </button>
        </div>
      )}
    </div>
  );
};
