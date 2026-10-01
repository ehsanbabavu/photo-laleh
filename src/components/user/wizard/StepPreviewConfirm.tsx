import React, { useState } from 'react';
import {
  Printer,
  CheckCircle2,
  ShieldCheck,
  FileCheck,
  ChevronRight
} from 'lucide-react';
import { OrderDraft } from '../../../types';
import { PRINT_TYPES, PRINT_DIMENSIONS, PAPER_MATERIALS } from '../../../data/mockData';

interface StepPreviewConfirmProps {
  draft: OrderDraft;
  onConfirmOrder: () => void;
  onBack: () => void;
}

export const StepPreviewConfirm: React.FC<StepPreviewConfirmProps> = ({
  draft,
  onConfirmOrder,
  onBack
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const printType = PRINT_TYPES.find((t) => t.id === draft.printType) || PRINT_TYPES[0];
  const dimension = PRINT_DIMENSIONS.find((d) => d.id === draft.dimensionId) || PRINT_DIMENSIONS[0];
  const material = PAPER_MATERIALS.find((m) => m.id === draft.materialId) || PAPER_MATERIALS[0];

  const handleFinalConfirm = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onConfirmOrder();
    }, 1100);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-right">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold mb-1.5">
          <span>پیش‌نمایش نهایی و تایید چاپ</span>
        </div>
        <h2 className="text-lg sm:text-2xl font-black text-slate-900">
          پیش‌نمایش نهایی و تایید چاپ در استودیو
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-relaxed font-medium">
          ماکت خروجی چاپ روی متریال انتخابی را مشاهده و تایید نمایید تا فایل به ماشین چاپ ارسال شود.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-7 items-center">
        {/* Realistic Mockup Rendering (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          {/* Wall / Studio Room Backdrop */}
          <div className="w-full bg-gradient-to-b from-slate-100 via-slate-150 to-slate-200 border border-slate-300 rounded-2xl sm:rounded-3xl p-4 sm:p-8 flex flex-col items-center justify-center relative overflow-hidden shadow-lg">
            {/* Ambient spotlight */}
            <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-sky-300/20 to-transparent pointer-events-none" />

            {/* Print Mockup on Chassis / Frame */}
            <div
              className={`relative transition-all duration-300 max-w-[260px] sm:max-w-xs w-full aspect-[3/4] rounded-lg overflow-hidden ${
                draft.materialId.includes('chassis')
                  ? 'border-4 border-slate-800 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)]'
                  : draft.materialId.includes('canvas')
                  ? 'border-6 sm:border-8 border-amber-900/80 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)]'
                  : 'border border-slate-400 shadow-md'
              }`}
            >
              {draft.uploadedImage ? (
                <div className="w-full h-full relative overflow-hidden bg-slate-200">
                  <img
                    src={draft.uploadedImage}
                    alt="ماکت نهایی چاپ"
                    className={`w-full h-full object-cover ${
                      draft.printType === 'bw_to_color' && !draft.aiEffects.colorized
                        ? 'grayscale'
                        : ''
                    } ${
                      draft.aiEffects.weddingFilter === 'warm'
                        ? 'sepia-[0.25] saturate-125'
                        : draft.aiEffects.weddingFilter === 'soft_glow'
                        ? 'brightness-110 contrast-95'
                        : ''
                    }`}
                    style={{
                      backgroundColor:
                        draft.aiEffects.bgMode === 'white'
                          ? '#ffffff'
                          : draft.aiEffects.bgMode === 'blue'
                          ? '#1e3a8a'
                          : undefined
                    }}
                  />

                  {/* Memorial Ribbon if active */}
                  {draft.printType === 'memorial' && draft.aiEffects.memorialRibbon && (
                    <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none overflow-hidden">
                      <div className="absolute transform rotate-45 bg-slate-900 border-y border-amber-400 text-white text-[8px] font-bold py-1 right-[-40px] top-[18px] w-[140px] text-center shadow-lg">
                        یادبود جاودان
                      </div>
                    </div>
                  )}

                  {/* Seal watermark */}
                  <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-md border border-slate-200 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] text-slate-800 font-mono flex items-center gap-1 shadow-xs">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>لابراتوار ۳۰۰ DPI</span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Mockup Base Specs */}
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-600 font-bold">
              <span className="font-mono text-sky-700">{dimension.dimensionsCm}</span>
              <span>·</span>
              <span className="truncate max-w-[180px]">{material.name}</span>
            </div>
          </div>
        </div>

        {/* Technical Print Summary & Confirmation (5 cols) */}
        <div className="lg:col-span-5 space-y-3.5">
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">مشخصات نهایی چاپ</h3>
              </div>
              <span className="text-[10px] sm:text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                آماده صف چاپ
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-700">
                <span className="text-slate-500">عنوان خدمت:</span>
                <span className="font-bold text-slate-900">{printType.title}</span>
              </div>

              <div className="flex justify-between text-slate-700">
                <span className="text-slate-500">قطع فیزیکی:</span>
                <span className="font-mono text-sky-700 font-bold">{dimension.title} ({dimension.dimensionsCm})</span>
              </div>

              <div className="flex justify-between text-slate-700">
                <span className="text-slate-500">متریال:</span>
                <span className="truncate max-w-[160px] font-medium">{material.name}</span>
              </div>

              <div className="flex justify-between text-slate-700">
                <span className="text-slate-500">تیراژ:</span>
                <span className="font-mono font-bold">{draft.quantity} قطعه</span>
              </div>

              <div className="flex justify-between text-slate-700">
                <span className="text-slate-500">وضوح دستگاه:</span>
                <span className="font-mono text-emerald-700 font-bold">300 DPI Ultra Chrome HD</span>
              </div>

              <div className="flex justify-between text-slate-700">
                <span className="text-slate-500">گیرنده:</span>
                <span className="font-bold">{draft.customerInfo.fullName || 'مشتری استودیو'}</span>
              </div>

              <div className="flex justify-between text-slate-700">
                <span className="text-slate-500">تراکنش:</span>
                <span className="font-mono text-slate-700 text-[11px] truncate max-w-[140px] font-bold">{draft.paymentReference || 'پرداخت شده'}</span>
              </div>
            </div>

            {/* Quality checklist */}
            <div className="pt-2.5 border-t border-slate-200 space-y-1.5 text-[11px] text-slate-600 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>بررسی تعادل رنگ و رزولوشن انجام شد</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                <span>بسته‌بندی ضربه‌گیر ۵ لایه ضد رطوبت</span>
              </div>
            </div>

            {/* Confirm & Back Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={onBack}
                className="bg-white hover:bg-slate-100 active:scale-98 text-slate-700 font-bold px-5 py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm transition-colors cursor-pointer text-center min-h-[44px] border border-slate-200 flex items-center justify-center gap-1.5"
              >
                <ChevronRight className="w-4 h-4" />
                <span>مرحله قبل</span>
              </button>

              <button
                type="button"
                onClick={handleFinalConfirm}
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600 active:scale-98 text-white font-black py-3.5 px-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-emerald-500/25 cursor-pointer flex items-center justify-center gap-2 min-h-[46px]"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>ارسال به صف چاپ لابراتوار...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-5 h-5 flex-shrink-0" />
                    <span>تایید نهایی و ارسال به صف چاپ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
