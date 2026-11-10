import React, { useEffect } from 'react';
import {
  Maximize2,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle
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

  const selectedDimension = availableDimensions.find((dim) => dim.id === draft.dimensionId);
  const firstDimension = availableDimensions[0];
  const firstHasFrameOption = Boolean(firstDimension?.frameEnabled && Number(firstDimension?.frameCustomerPrice) > 0);
  const selectedHasFrameOption = Boolean(selectedDimension?.frameEnabled && Number(selectedDimension?.frameCustomerPrice) > 0);

  // Auto-sync dimension ID if the current selection is not offered by this print type
  useEffect(() => {
    if (!selectedDimension?.id && firstDimension?.id) {
      onUpdateDraft({ dimensionId: firstDimension.id, hasFrame: firstHasFrameOption });
    }
  }, [selectedDimension?.id, firstDimension?.id, firstHasFrameOption, onUpdateDraft]);

  // Keep the frame choice in sync with the selected size
  useEffect(() => {
    if (!selectedDimension?.id) return;
    const hasFrame = selectedHasFrameOption && draft.hasFrame !== false;
    if (draft.hasFrame !== hasFrame) onUpdateDraft({ hasFrame });
  }, [selectedDimension?.id, selectedHasFrameOption, draft.hasFrame, onUpdateDraft]);

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
            const hasFrameOption = Boolean(dim.frameEnabled && Number(dim.frameCustomerPrice) > 0);
            const withFrame = hasFrameOption && (!isSelected || draft.hasFrame !== false);
            const framePrice = withFrame ? Math.max(0, Number(dim.frameCustomerPrice) || 0) : 0;
            const customerTotal = Math.max(0, Number(dim.basePrice) || 0) + framePrice;
            return (
              <div
                key={dim.id}
                data-dimension-id={dim.id}
                onClick={() => {
                  if (!isSelected) onUpdateDraft({ dimensionId: dim.id, hasFrame: hasFrameOption });
                }}
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

                  {/* Frame choice — compact two-column switch inside the card */}
                  {isSelected && hasFrameOption && (
                    <div
                      className="mt-2 grid grid-cols-2 gap-1.5"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        aria-pressed={withFrame}
                        onClick={() => onUpdateDraft({ dimensionId: dim.id, hasFrame: true })}
                        className={`h-8 rounded-lg border text-[11px] font-black transition-all cursor-pointer ${
                          withFrame
                            ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                            : 'bg-white border-slate-300 text-slate-600 hover:border-amber-400'
                        }`}
                      >
                        با تخته شاسی
                      </button>
                      <button
                        type="button"
                        aria-pressed={!withFrame}
                        onClick={() => onUpdateDraft({ dimensionId: dim.id, hasFrame: false })}
                        className={`h-8 rounded-lg border text-[11px] font-black transition-all cursor-pointer ${
                          !withFrame
                            ? 'bg-sky-500 border-sky-500 text-white shadow-sm'
                            : 'bg-white border-slate-300 text-slate-600 hover:border-sky-400'
                        }`}
                      >
                        بدون تخته شاسی
                      </button>
                    </div>
                  )}

                  {/* Price of the current choice only: with frame OR without frame */}
                  <div className="mt-2 pt-2 border-t border-slate-200/70">
                    <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] font-bold">
                      <span className="text-slate-700">
                        قیمت <span className="text-red-600">{withFrame ? 'با تخته شاسی' : 'بدون تخته شاسی'}</span>:
                      </span>
                      <span className="font-mono font-black text-slate-900 whitespace-nowrap">
                        {formatPrice(customerTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
