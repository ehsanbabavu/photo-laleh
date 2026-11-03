import React, { useEffect } from 'react';
import {
  Maximize2,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Frame as FrameIcon
} from 'lucide-react';
import { OrderDraft, PrintDimension, PrintTypeOption } from '../../../types';
import { formatPrice } from '../../../utils/formatters';
import {
  PRINT_TYPES,
  PRINT_DIMENSIONS,
  PERSONNEL_DIMENSIONS,
  GENERAL_PRINT_DIMENSIONS
} from '../../../data/mockData';

interface StepDimensionsProps {
  draft: OrderDraft;
  onUpdateDraft: (updated: Partial<OrderDraft>) => void;
  onNext: () => void;
  onBack: () => void;
  /** Sizes managed by the admin in «مدیریت سایز» */
  dimensions?: PrintDimension[];
  /** Print types carry the list of sizes they offer */
  printTypes?: PrintTypeOption[];
}

export const StepDimensions: React.FC<StepDimensionsProps> = ({
  draft,
  onUpdateDraft,
  onNext,
  onBack,
  dimensions,
  printTypes
}) => {
  const allDimensions = dimensions && dimensions.length > 0 ? dimensions : PRINT_DIMENSIONS;
  const activePrintTypes = printTypes && printTypes.length > 0 ? printTypes : PRINT_TYPES;

  const printType = activePrintTypes.find((t) => t.id === draft.printType) || activePrintTypes[0];

  // Legacy databases have no `dimensionIds` on the print type → keep the old behaviour
  const isManaged = Array.isArray(printType?.dimensionIds);
  const legacyDimensions = draft.printType === 'personnel' ? PERSONNEL_DIMENSIONS : GENERAL_PRINT_DIMENSIONS;

  const availableDimensions: PrintDimension[] = isManaged
    ? (printType?.dimensionIds || [])
        .map((id) => allDimensions.find((d) => d.id === id))
        .filter((d): d is PrintDimension => Boolean(d))
    : legacyDimensions.filter((legacy) => allDimensions.some((d) => d.id === legacy.id));

  // Auto-sync dimension ID if the current selection is not offered by this print type
  useEffect(() => {
    const exists = availableDimensions.some((d) => d.id === draft.dimensionId);
    if (!exists && availableDimensions.length > 0) {
      onUpdateDraft({ dimensionId: availableDimensions[0].id });
    }
  }, [draft.printType, draft.dimensionId, availableDimensions.length]);

  // Keep the frame choice in sync with the selected size
  useEffect(() => {
    const selected = availableDimensions.find((d) => d.id === draft.dimensionId);
    const hasFrameOption = Boolean(selected?.frameEnabled && Number(selected?.frameCustomerPrice) > 0);
    if (!hasFrameOption) {
      if (draft.hasFrame) onUpdateDraft({ hasFrame: false });
      return;
    }
    // A size that offers a frame starts with «با قاب» selected (the customer can turn it off)
    if (typeof draft.hasFrame !== 'boolean') onUpdateDraft({ hasFrame: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.dimensionId, availableDimensions.length]);

  const hasNoSizes = availableDimensions.length === 0;

  return (
    <div className="space-y-5">
      {/* Header hint */}
      <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
          <Maximize2 className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-xs sm:text-sm font-black text-slate-900">
            ابعاد چاپ را انتخاب کنید
          </h3>
          <p className="text-[11px] text-slate-500">
            {printType?.title} — {availableDimensions.length} سایز قابل انتخاب
          </p>
        </div>
      </div>

      {hasNoSizes ? (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs sm:text-sm font-bold text-amber-900">
              برای «{printType?.title}» هنوز سایزی تعریف نشده است.
            </p>
            <p className="text-[11px] sm:text-xs text-amber-800 mt-1 leading-relaxed">
              لطفاً این نوع چاپ را تغییر دهید یا بعداً دوباره تلاش کنید.
            </p>
          </div>
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 gap-2.5 sm:gap-3 ${
            availableDimensions.length <= 2
              ? 'sm:grid-cols-2 max-w-3xl'
              : 'sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {availableDimensions.map((dim) => {
            const isSelected = draft.dimensionId === dim.id;
            return (
              <div
                key={dim.id}
                onClick={() => onUpdateDraft({ dimensionId: dim.id })}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between active:scale-99 shadow-xs ${
                  isSelected
                    ? 'bg-gradient-to-r from-sky-50/90 to-emerald-50/90 border-sky-400 shadow-md shadow-sky-500/10 ring-2 ring-sky-400/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold text-sky-700">
                      {dim.dimensionsCm}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {dim.popular && (
                        <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                          محبوب
                        </span>
                      )}
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                          isSelected
                            ? 'bg-gradient-to-r from-sky-500 to-emerald-500 border-transparent text-white'
                            : 'border-slate-300 bg-slate-50'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 font-bold" />}
                      </div>
                    </div>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-0.5">{dim.title}</h4>
                  <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed font-medium">
                    {dim.description}
                  </p>

                  {/* Price breakdown: customer price without the frame + cost price with the frame */}
                  <div className="mt-2 pt-2 border-t border-slate-200/70 space-y-1">
                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold">
                      <span className="text-slate-600">قیمت مشتری (بدون قاب):</span>
                      <span className="font-mono text-slate-900">{formatPrice(dim.basePrice)}</span>
                    </div>
                    {dim.frameEnabled && Number(dim.frameCustomerPrice) > 0 && (
                      <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold">
                        <span className="text-amber-700">قیمت مشتری (با قاب):</span>
                        <span className="font-mono text-amber-800">
                          {formatPrice(Number(dim.basePrice) + Number(dim.frameCustomerPrice))}
                        </span>
                      </div>
                    )}
                    {Number(dim.costPrice) > 0 && (
                      <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold">
                        <span className="text-rose-700">قیمت تمام‌شده (با قاب):</span>
                        <span className="font-mono text-rose-800">
                          {formatPrice(Number(dim.costPrice) + Number(dim.frameCostPrice || 0))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Frame (قاب) choice for the selected size */}
      {(() => {
        const selected = availableDimensions.find((d) => d.id === draft.dimensionId);
        if (!selected || !selected.frameEnabled || Number(selected.frameCustomerPrice) <= 0) return null;
        const framePrice = Number(selected.frameCustomerPrice) || 0;
        const withoutFrame = draft.hasFrame === false;
        return (
          <div className="p-3.5 rounded-2xl bg-white border border-amber-200 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                <FrameIcon className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs sm:text-sm font-black text-slate-900">قاب می‌خواهید؟</p>
                <p className="text-[10px] sm:text-[11px] text-slate-500">
                  برای «{selected.title}» می‌توانید با قاب یا بدون قاب سفارش دهید
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onUpdateDraft({ hasFrame: true })}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer active:scale-99 ${
                  !withoutFrame
                    ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300/40'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-900">با قاب</span>
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center border flex-shrink-0 ${
                      !withoutFrame ? 'bg-amber-500 border-transparent text-white' : 'border-slate-300 bg-slate-50'
                    }`}
                  >
                    {!withoutFrame && <CheckCircle2 className="w-3 h-3" />}
                  </span>
                </span>
                <span className="mt-1 block font-mono text-[11px] font-bold text-amber-800">
                  + {formatPrice(framePrice)}
                </span>
                <span className="mt-0.5 block font-mono text-[10px] font-black text-slate-700">
                  جمع: {formatPrice(Number(selected.basePrice) + framePrice)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateDraft({ hasFrame: false })}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer active:scale-99 ${
                  withoutFrame
                    ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-300/40'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-900">بدون قاب</span>
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center border flex-shrink-0 ${
                      withoutFrame ? 'bg-sky-500 border-transparent text-white' : 'border-slate-300 bg-slate-50'
                    }`}
                  >
                    {withoutFrame && <CheckCircle2 className="w-3 h-3" />}
                  </span>
                </span>
                <span className="mt-1 block font-mono text-[11px] font-bold text-slate-600">
                  فقط چاپ
                </span>
                <span className="mt-0.5 block font-mono text-[10px] font-black text-slate-700">
                  جمع: {formatPrice(Number(selected.basePrice))}
                </span>
              </button>
            </div>
          </div>
        );
      })()}

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
          onClick={onNext}
          disabled={hasNoSizes}
          className="flex-1 sm:flex-none sm:w-44 h-12 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-700 hover:to-sky-700 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-teal-600/20 cursor-pointer flex items-center justify-center gap-2"
        >
          <span>مرحله بعد</span>
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
