import React, { useEffect } from 'react';
import {
  Maximize2,
  ChevronRight,
  ChevronLeft,
  Gift,
  CheckCircle2
} from 'lucide-react';
import { OrderDraft } from '../../../types';
import {
  PRINT_DIMENSIONS,
  PERSONNEL_DIMENSIONS,
  GENERAL_PRINT_DIMENSIONS
} from '../../../data/mockData';
import { formatPrice } from '../../../utils/formatters';

interface StepDimensionsProps {
  draft: OrderDraft;
  onUpdateDraft: (updated: Partial<OrderDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepDimensions: React.FC<StepDimensionsProps> = ({
  draft,
  onUpdateDraft,
  onNext,
  onBack
}) => {
  const isPersonnel = draft.printType === 'personnel';
  const availableDimensions = isPersonnel ? PERSONNEL_DIMENSIONS : GENERAL_PRINT_DIMENSIONS;

  // Auto-sync dimension ID if current selection does not match available list
  useEffect(() => {
    const exists = availableDimensions.some((d) => d.id === draft.dimensionId);
    if (!exists && availableDimensions.length > 0) {
      onUpdateDraft({ dimensionId: availableDimensions[0].id });
    }
  }, [draft.printType, draft.dimensionId, availableDimensions, onUpdateDraft]);

  const selectedDimension =
    availableDimensions.find((d) => d.id === draft.dimensionId) || availableDimensions[0];

  return (
    <div className="space-y-5">
      {/* Personnel Specific Dimensions Grid (2 cards) */}
      {isPersonnel ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {PERSONNEL_DIMENSIONS.map((dim) => {
            const isSelected = draft.dimensionId === dim.id;
            return (
              <div
                key={dim.id}
                onClick={() => onUpdateDraft({ dimensionId: dim.id })}
                className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between active:scale-99 shadow-sm ${
                  isSelected
                    ? 'bg-gradient-to-r from-sky-50 via-teal-50/60 to-emerald-50 border-sky-500 shadow-md shadow-sky-500/15 ring-2 ring-sky-400/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="text-sm sm:text-base font-black text-slate-900">
                      {dim.title}
                    </h4>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors flex-shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-gradient-to-r from-sky-500 to-emerald-500 border-transparent text-white'
                          : 'border-slate-300 bg-slate-50'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 font-bold" />}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {dim.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* General Print Dimensions Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
          {GENERAL_PRINT_DIMENSIONS.map((dim) => {
            const isSelected = draft.dimensionId === dim.id;
            return (
              <div
                key={dim.id}
                onClick={() => onUpdateDraft({ dimensionId: dim.id })}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between active:scale-99 shadow-xs ${
                  isSelected
                    ? 'bg-gradient-to-r from-sky-50/90 to-emerald-50/90 border-sky-400 shadow-md shadow-sky-500/10'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-sky-700">
                      {dim.dimensionsCm}
                    </span>
                    {dim.popular && (
                      <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                        محبوب
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-0.5">{dim.title}</h4>
                  <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed font-medium">
                    {dim.description}
                  </p>
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
          className="flex-1 sm:flex-none sm:w-44 h-12 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-700 hover:to-sky-700 active:scale-98 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-teal-600/20 cursor-pointer flex items-center justify-center gap-2"
        >
          <span>مرحله بعد</span>
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
