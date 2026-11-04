import React, { useState, useRef } from 'react';
import {
  Palette,
  Upload,
  Maximize2,
  Receipt,
  CreditCard,
  CheckCircle2,
  History
} from 'lucide-react';
import { OrderDraft, Order, User, PrintTypeOption, PrintDimension, BluPalSettings, DeliveryMethod } from '../../types';
import { StepPrintType } from './wizard/StepPrintType';
import { PhoneVerificationGate } from './PhoneVerificationGate';
import { isValidIranianPhone } from '../../utils/phone';
import { StepUploadPhoto } from './wizard/StepUploadPhoto';
import { StepDimensions } from './wizard/StepDimensions';
import { StepInvoice } from './wizard/StepInvoice';
import { StepPayment } from './wizard/StepPayment';
import { PRINT_TYPES, PRINT_DIMENSIONS } from '../../data/mockData';
import {
  clearOrderDraft,
  loadOrderDraft,
  saveOrderDraft,
  SavedOrderDraft
} from '../../utils/orderDraftStorage';

interface OrderWizardProps {
  user: User;
  onOrderCompleted: (newOrder: Order) => void;
  onUserUpdate?: (updatedUser: User) => void;
  onPhoneVerified: (updatedUser: User) => void;
  printTypes?: PrintTypeOption[];
  dimensions?: PrintDimension[];
  deliveryMethods?: DeliveryMethod[];
  avalaiApiKey?: string;
  printTypePrompts?: Record<string, string>;
  avalaiBaseUrl?: string;
  avalaiModel?: string;
  blupalSettings?: BluPalSettings;
}

const getDefaultDimensionId = (typeId: PrintTypeOption['id']) =>
  typeId === 'personnel' ? 'personnel_6x3x4' : 'size_13x18';

export const OrderWizard: React.FC<OrderWizardProps> = ({
  user,
  onOrderCompleted,
  onUserUpdate,
  onPhoneVerified,
  printTypes = PRINT_TYPES,
  dimensions,
  deliveryMethods,
  avalaiApiKey = '',
  printTypePrompts = {},
  avalaiBaseUrl = 'https://api.avalai.ir/v1',
  avalaiModel = 'gpt-image-2.5-sunburst',
  blupalSettings
}) => {
  // Restore an unfinished order (wizard state is also saved on every change) so an
  // accidental navigation away does not throw away the steps already completed.
  const restoredRef = useRef<SavedOrderDraft | null | undefined>(undefined);
  if (restoredRef.current === undefined) {
    restoredRef.current = loadOrderDraft(user.id);
  }
  const restored = restoredRef.current;
  const hasRestoredDraftRef = useRef(Boolean(restored?.draft));
  const hasUserSelectedPrintTypeRef = useRef(false);

  const isSubmittingRef = useRef(false);

  // Payment is the final wizard step; older drafts may still contain step 6.
  const resumedStep = Math.min(5, Math.max(1, restored?.step ?? 1));

  const [currentStep, setCurrentStep] = useState<number>(resumedStep);
  const [isOrderSubmitted, setIsOrderSubmitted] = useState(false);
  const [resumeNotice, setResumeNotice] = useState<null | {
    step: number;
    imagesDropped: boolean;
  }>(restored ? { step: resumedStep, imagesDropped: Boolean(restored.imagesDropped) } : null);

  // Print types come from the database; fall back to a direct fetch when the
  // parent has not loaded them yet so toggles (e.g. multi photo) are respected.
  const [resolvedPrintTypes, setResolvedPrintTypes] = useState<PrintTypeOption[]>(
    printTypes && printTypes.length > 0 ? printTypes : []
  );
  React.useEffect(() => {
    if (printTypes && printTypes.length > 0) {
      setResolvedPrintTypes(printTypes);
      return;
    }
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/print-types');
        if (!res.ok) return;
        const data = await res.json();
        if (active && Array.isArray(data) && data.length > 0) setResolvedPrintTypes(data);
      } catch {
        // keep the fallback
      }
    })();
    return () => {
      active = false;
    };
  }, [printTypes]);

  const activePrintTypes = (resolvedPrintTypes.length > 0 ? resolvedPrintTypes : PRINT_TYPES)
    .filter((type) => type.isEnabled !== false);
  const firstAvailablePrintType = activePrintTypes[0] ?? PRINT_TYPES[0];
  const defaultDimensionId = getDefaultDimensionId(firstAvailablePrintType.id);

  // Initial order draft state (no photo by default, merged with any restored draft)
  const initialDraft: OrderDraft = {
    printType: firstAvailablePrintType.id,
    uploadedImage: '',
    originalImageName: '',
    aiEffects: {
      colorized: false,
      bgMode: 'original',
      memorialRibbon: false,
      weddingFilter: 'natural',
      autoEnhance: true
    },
    dimensionId: defaultDimensionId,
    materialId: 'silk_paper',
    quantity: 1,
    hasLamination: false,
    designerRetouch: false,
    deliveryMethod: 'peyk',
    customerInfo: {
      fullName: user.name || '',
      phoneNumber: user.phone || '',
      province: 'تهران',
      city: 'تهران',
      address: '',
      postalCode: '',
      notes: ''
    },
    discountAmount: 0,
    paymentMethod: 'online'
  };

  const [draft, setDraft] = useState<OrderDraft>(() => {
    const restoredDraft = restored?.draft;
    return {
      ...initialDraft,
      ...(restoredDraft || {}),
      id: restoredDraft?.id || `draft-${crypto.randomUUID()}`,
      aiEffects: { ...initialDraft.aiEffects, ...(restoredDraft?.aiEffects || {}) },
      customerInfo: { ...initialDraft.customerInfo, ...(restoredDraft?.customerInfo || {}) }
    };
  });

  React.useEffect(() => {
    if (hasRestoredDraftRef.current || hasUserSelectedPrintTypeRef.current) return;
    const firstAvailableType = (resolvedPrintTypes.length > 0 ? resolvedPrintTypes : PRINT_TYPES)
      .find((type) => type.isEnabled !== false);
    if (!firstAvailableType) return;

    setDraft((current) => {
      if (
        hasRestoredDraftRef.current ||
        hasUserSelectedPrintTypeRef.current ||
        current.printType === firstAvailableType.id
      ) {
        return current;
      }

      return {
        ...current,
        printType: firstAvailableType.id,
        dimensionId: getDefaultDimensionId(firstAvailableType.id)
      };
    });
  }, [resolvedPrintTypes, draft.printType]);

  // Keep the unfinished order on the device as the user advances
  const latestStateRef = useRef({ step: currentStep, draft });
  latestStateRef.current = { step: currentStep, draft };

  React.useEffect(() => {
    if (isSubmittingRef.current) return;
    const timer = setTimeout(() => {
      saveOrderDraft(user.id, currentStep, draft);
    }, 400);
    return () => clearTimeout(timer);
  }, [currentStep, draft, user.id]);

  // The wizard unmounts when the user switches tabs, so flush the last state on exit
  React.useEffect(() => {
    return () => {
      if (isSubmittingRef.current) return;
      const { step, draft: latestDraft } = latestStateRef.current;
      saveOrderDraft(user.id, step, latestDraft);
    };
  }, [user.id]);

  const handleUpdateDraft = (updated: Partial<OrderDraft>) => {
    if ('printType' in updated) hasUserSelectedPrintTypeRef.current = true;
    setDraft((prev) => {
      const next: OrderDraft = { ...prev, ...updated };
      // Any price-affecting change invalidates the previously issued (unpaid) invoice
      const priceFields = [
        'printType',
        'dimensionId',
        'materialId',
        'quantity',
        'hasLamination',
        'designerRetouch',
        'deliveryMethod',
        'discountAmount',
        'discountCode',
        'walletCreditUsed',
        'invoiceDetails'
      ];
      if (!prev.paymentReference && priceFields.some((field) => field in updated)) {
        next.paymentInvoice = null;
        next.paymentInvoiceId = undefined;
      }
      return next;
    });
  };

  const handleStartNewOrder = () => {
    hasRestoredDraftRef.current = false;
    hasUserSelectedPrintTypeRef.current = false;
    clearOrderDraft(user.id);
    setResumeNotice(null);
    setDraft({ ...initialDraft, id: `draft-${crypto.randomUUID()}` });
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const steps = [
    { number: 1, title: 'نوع چاپ', icon: Palette, short: 'نوع' },
    { number: 2, title: 'آپلود عکس', icon: Upload, short: 'آپلود' },
    { number: 3, title: 'ابعاد چاپ', icon: Maximize2, short: 'ابعاد' },
    { number: 4, title: 'نمایش فاکتور', icon: Receipt, short: 'فاکتور' },
    { number: 5, title: 'پرداخت فاکتور', icon: CreditCard, short: 'پرداخت' }
  ];

  const handleFinalOrder = (paidDraft: OrderDraft = draft) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsOrderSubmitted(true);

    const activeTypes = resolvedPrintTypes.length > 0 ? resolvedPrintTypes : PRINT_TYPES;
    const printTypeObj = activeTypes.find((t) => t.id === paidDraft.printType) || activeTypes[0];
    const activeDimensions =
      dimensions && dimensions.length > 0 ? dimensions : PRINT_DIMENSIONS;
    const dimensionObj =
      activeDimensions.find((d) => d.id === paidDraft.dimensionId) ||
      activeDimensions.find((d) => (printTypeObj.dimensionIds || []).includes(d.id)) ||
      activeDimensions[0];

    const framePrice =
      paidDraft.hasFrame && dimensionObj.frameEnabled
        ? Math.max(0, Number(dimensionObj.frameCustomerPrice) || 0)
        : 0;
    const unitBase = dimensionObj.basePrice + framePrice;
    const unitExtras = (paidDraft.hasLamination ? 35000 : 0) + (paidDraft.designerRetouch ? 50000 : 0);
    const subtotal = (unitBase + unitExtras) * paidDraft.quantity;
    const serviceFeeAmount =
      printTypeObj.serviceFeeEnabled === true ? Math.max(0, Number(printTypeObj.serviceFee) || 0) : 0;
    const activeMethods = (deliveryMethods && deliveryMethods.length > 0 ? deliveryMethods : [])
      .filter((method) => method.isEnabled !== false);
    const shippingMethod =
      activeMethods.find((method) => method.id === paidDraft.deliveryMethod) || activeMethods[0] || null;
    const shipping = Math.max(0, Number(shippingMethod?.price) || 0);
    const grossTotal = Math.max(0, subtotal + serviceFeeAmount + shipping);
    // Wallet credit used by this order; the whole balance is consumed and zeroed
    const walletCredit = Math.max(0, Math.min(Number(paidDraft.walletCreditUsed) || 0, grossTotal));
    const total = Math.max(0, grossTotal - walletCredit);

    // Amount actually issued/paid through BluPal, if any (exact, includes tracking digits)
    const paidRial = paidDraft.paymentAmountRial || Math.round(total * 10);
    const paidToman = paidDraft.paymentAmountToman || Math.round(paidRial / 10);

    const promptToUse =
      printTypePrompts[paidDraft.printType] ||
      'یک پرتره باکیفیت و رتوش شده آتلیه؛ پرتره رسمی کیفیت عالی';

    const newOrder: Order = {
      ...paidDraft,
      id: 'ord-' + Date.now(),
      trackingCode: 'Laleh-' + Math.floor(10000 + Math.random() * 90000),
      userId: user.id,
      userName: paidDraft.customerInfo.fullName || user.name,
      date: new Date().toLocaleDateString('fa-IR'),
      createdAt: new Date().toISOString(),
      status: 'pending_review',
      aiStatus: 'pending',
      selectedPrintImages: [],
      aiPromptUsed: promptToUse,
      // Order total follows the issued invoice amount, not a second local re-calculation
      totalPrice: paidToman,
      paymentAmountToman: paidToman,
      paymentAmountRial: paidRial,
      walletCreditUsed: walletCredit,
      paymentStatus: paidDraft.paymentReference ? 'paid' : 'pending'
    };

    // The credit is spent: zero the balance locally (the server persists it too)
    if (walletCredit > 0 && user) {
      onUserUpdate?.({
        ...user,
        walletBalance: 0,
        hasUsedFirstOrderGift: true
      });
    }

    clearOrderDraft(user.id);
    setResumeNotice(null);
    onOrderCompleted(newOrder);
  };

  const handlePhoneVerified = (updatedUser: User) => {
    setDraft((current) => ({
      ...current,
      customerInfo: {
        ...current.customerInfo,
        phoneNumber: updatedUser.phone || ''
      }
    }));
    onPhoneVerified(updatedUser);
  };

  if (user.role !== 'admin' && user.category !== 'colleague' && !isValidIranianPhone(user.phone)) {
    return <PhoneVerificationGate initialPhone={user.phone} onVerified={handlePhoneVerified} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Resume banner: the unfinished order was restored from this device */}
      {resumeNotice && (
        <div className="bg-gradient-to-r from-sky-50 via-emerald-50 to-sky-50 border border-sky-300 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <History className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900">
                سفارش ناتمام شما بازیابی شد — از مرحله «{steps.find((s) => s.number === resumeNotice.step)?.title}» ادامه دهید.
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                {resumeNotice.imagesDropped
                  ? 'بازیابی انجام شد، اما عکس قبلی به دلیل حجم زیاد ذخیره نشده بود؛ لطفاً در مرحله آپلود، عکس را دوباره انتخاب کنید.'
                  : 'همه اطلاعات و مراحل قبلی شما حفظ شده است.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setResumeNotice(null)}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
            >
              ادامه سفارش
            </button>
            <button
              type="button"
              onClick={handleStartNewOrder}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all cursor-pointer"
            >
              شروع سفارش جدید
            </button>
          </div>
        </div>
      )}

      {/* Step Stepper Progress Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-xs">
        {/* Stepper circles */}
        <div className="flex items-center justify-between relative gap-1 sm:gap-2">
          {steps.map((s) => {
            const isCompleted = currentStep > s.number;
            const isCurrent = currentStep === s.number;
            const canGoBack = s.number < currentStep && !isOrderSubmitted;

            return (
              <div
                key={s.number}
                className="flex flex-col items-center relative z-10 flex-1 text-center"
              >
                {/* Step circle */}
                <button
                  type="button"
                  onClick={() => {
                    if (canGoBack) setCurrentStep(s.number);
                  }}
                  disabled={!canGoBack}
                  className={`w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all ${
                    canGoBack ? 'cursor-pointer' : 'cursor-default'
                  } ${
                    isCurrent
                      ? 'bg-gradient-to-tr from-sky-500 to-emerald-500 text-white font-black shadow-md shadow-sky-500/25 scale-105'
                      : isCompleted
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                      : 'bg-slate-50 border border-slate-200 text-slate-400'
                  }`}
                  title={s.title}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                  ) : (
                    <span className="font-mono text-xs sm:text-sm font-bold">{s.number}</span>
                  )}
                </button>

                {/* Step label */}
                <span
                  className={`text-[10px] sm:text-xs mt-1.5 font-bold truncate max-w-full px-0.5 ${
                    isCurrent
                      ? 'text-sky-700'
                      : isCompleted
                      ? 'text-emerald-700'
                      : 'text-slate-400'
                  }`}
                >
                  <span className="hidden sm:inline">{s.title}</span>
                  <span className="sm:hidden">{s.short}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Render Current Step Component */}
      <div>
        {currentStep === 1 && (
          <StepPrintType
            draft={draft}
            onUpdateDraft={handleUpdateDraft}
            onNext={() => setCurrentStep(2)}
            printTypes={resolvedPrintTypes.length > 0 ? resolvedPrintTypes : PRINT_TYPES}
          />
        )}

        {currentStep === 2 && (
          <StepUploadPhoto
            draft={draft}
            onUpdateDraft={handleUpdateDraft}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
            printTypes={resolvedPrintTypes.length > 0 ? resolvedPrintTypes : PRINT_TYPES}
          />
        )}

        {currentStep === 3 && (
          <StepDimensions
            draft={draft}
            onUpdateDraft={handleUpdateDraft}
            onNext={() => setCurrentStep(4)}
            onBack={() => setCurrentStep(2)}
            dimensions={dimensions}
            printTypes={resolvedPrintTypes.length > 0 ? resolvedPrintTypes : PRINT_TYPES}
          />
        )}

        {currentStep === 4 && (
          <StepInvoice
            draft={draft}
            onUpdateDraft={handleUpdateDraft}
            onNext={() => setCurrentStep(5)}
            onBack={() => setCurrentStep(3)}
            printTypes={resolvedPrintTypes.length > 0 ? resolvedPrintTypes : PRINT_TYPES}
            dimensions={dimensions}
            deliveryMethods={deliveryMethods}
            user={user}
          />
        )}

        {currentStep === 5 && (
          <StepPayment
            draft={draft}
            onUpdateDraft={handleUpdateDraft}
            onOrderPaid={handleFinalOrder}
            onBack={() => setCurrentStep(4)}
            printTypes={resolvedPrintTypes.length > 0 ? resolvedPrintTypes : PRINT_TYPES}
            dimensions={dimensions}
            user={user}
            blupalSettings={blupalSettings}
          />
        )}

      </div>
    </div>
  );
};
