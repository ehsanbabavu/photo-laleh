import React, { useState } from 'react';
import {
  Palette,
  Upload,
  Maximize2,
  Receipt,
  CreditCard,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { OrderDraft, Order, User } from '../../types';
import { StepPrintType } from './wizard/StepPrintType';
import { StepUploadPhoto } from './wizard/StepUploadPhoto';
import { StepDimensions } from './wizard/StepDimensions';
import { StepInvoice } from './wizard/StepInvoice';
import { StepPayment } from './wizard/StepPayment';
import { StepPreviewConfirm } from './wizard/StepPreviewConfirm';
import { PRINT_TYPES, PRINT_DIMENSIONS, PAPER_MATERIALS } from '../../data/mockData';

interface OrderWizardProps {
  user: User;
  onOrderCompleted: (newOrder: Order) => void;
}

export const OrderWizard: React.FC<OrderWizardProps> = ({ user, onOrderCompleted }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Initial order draft state (no photo by default)
  const [draft, setDraft] = useState<OrderDraft>({
    printType: 'personnel',
    uploadedImage: '',
    originalImageName: '',
    aiEffects: {
      colorized: false,
      bgMode: 'original',
      memorialRibbon: false,
      weddingFilter: 'natural',
      autoEnhance: true
    },
    dimensionId: 'personnel_6x3x4',
    materialId: 'silk_paper',
    quantity: 1,
    hasLamination: false,
    designerRetouch: false,
    deliveryMethod: 'peyk',
    customerInfo: {
      fullName: user.name || '',
      phoneNumber: user.phone || '09123456789',
      province: 'تهران',
      city: 'تهران',
      address: '',
      postalCode: '',
      notes: ''
    },
    discountAmount: 0,
    paymentMethod: 'online'
  });

  const handleUpdateDraft = (updated: Partial<OrderDraft>) => {
    setDraft((prev) => ({ ...prev, ...updated }));
  };

  const steps = [
    { number: 1, title: 'نوع چاپ', icon: Palette, short: 'نوع' },
    { number: 2, title: 'آپلود عکس', icon: Upload, short: 'آپلود' },
    { number: 3, title: 'ابعاد چاپ', icon: Maximize2, short: 'ابعاد' },
    { number: 4, title: 'نمایش فاکتور', icon: Receipt, short: 'فاکتور' },
    { number: 5, title: 'پرداخت فاکتور', icon: CreditCard, short: 'پرداخت' },
    { number: 6, title: 'پیش‌نمایش و تایید', icon: Eye, short: 'تایید' }
  ];

  const handleFinalOrder = () => {
    const printTypeObj = PRINT_TYPES.find((t) => t.id === draft.printType) || PRINT_TYPES[0];
    const dimensionObj = PRINT_DIMENSIONS.find((d) => d.id === draft.dimensionId) || PRINT_DIMENSIONS[0];
    const materialObj = PAPER_MATERIALS.find((m) => m.id === draft.materialId) || PAPER_MATERIALS[0];

    const unitBase = printTypeObj.basePrice + dimensionObj.basePrice;
    const unitExtras = (draft.hasLamination ? 35000 : 0) + (draft.designerRetouch ? 50000 : 0);
    const subtotal = (unitBase + unitExtras) * draft.quantity;
    const shipping = draft.deliveryMethod === 'peyk' ? 45000 : 35000;
    const total = Math.max(0, subtotal + shipping - draft.discountAmount);

    const newOrder: Order = {
      ...draft,
      id: 'ord-' + Date.now(),
      trackingCode: 'NG-' + Math.floor(10000 + Math.random() * 90000),
      userId: user.id,
      userName: draft.customerInfo.fullName || user.name,
      date: new Date().toLocaleDateString('fa-IR'),
      status: 'printing',
      totalPrice: total,
      paymentStatus: 'paid'
    };

    onOrderCompleted(newOrder);
  };

  const currentStepObj = steps.find((s) => s.number === currentStep) || steps[0];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Step Stepper Progress Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-xs">
        {/* Mobile current step indicator */}
        <div className="flex sm:hidden items-center justify-between mb-3 pb-2.5 border-b border-slate-100 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-gradient-to-r from-sky-500 to-emerald-500 text-white font-bold font-mono text-[11px] flex items-center justify-center shadow-xs">
              {currentStep}
            </span>
            <span className="font-bold text-slate-900">مرحله {currentStep} از {steps.length}: {currentStepObj.title}</span>
          </div>
          <span className="text-[11px] text-sky-700 font-mono font-bold">
            {Math.round((currentStep / steps.length) * 100)}٪
          </span>
        </div>

        {/* Stepper circles */}
        <div className="flex items-center justify-between relative gap-1 sm:gap-2">
          {steps.map((s) => {
            const isCompleted = currentStep > s.number;
            const isCurrent = currentStep === s.number;

            return (
              <div
                key={s.number}
                className="flex flex-col items-center relative z-10 flex-1 text-center"
              >
                {/* Step circle */}
                <button
                  type="button"
                  onClick={() => {
                    if (s.number < currentStep) setCurrentStep(s.number);
                  }}
                  className={`w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
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
          />
        )}

        {currentStep === 2 && (
          <StepUploadPhoto
            draft={draft}
            onUpdateDraft={handleUpdateDraft}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <StepDimensions
            draft={draft}
            onUpdateDraft={handleUpdateDraft}
            onNext={() => setCurrentStep(4)}
            onBack={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 4 && (
          <StepInvoice
            draft={draft}
            onUpdateDraft={handleUpdateDraft}
            onNext={() => setCurrentStep(5)}
            onBack={() => setCurrentStep(3)}
          />
        )}

        {currentStep === 5 && (
          <StepPayment
            draft={draft}
            onUpdateDraft={handleUpdateDraft}
            onNext={() => setCurrentStep(6)}
            onBack={() => setCurrentStep(4)}
          />
        )}

        {currentStep === 6 && (
          <StepPreviewConfirm
            draft={draft}
            onConfirmOrder={handleFinalOrder}
            onBack={() => setCurrentStep(5)}
          />
        )}
      </div>
    </div>
  );
};
