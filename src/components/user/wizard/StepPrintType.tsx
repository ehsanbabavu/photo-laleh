import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft
} from 'lucide-react';
import { OrderDraft, PrintTypeId } from '../../../types';
import { PRINT_TYPES } from '../../../data/mockData';
import { formatPrice } from '../../../utils/formatters';

interface StepPrintTypeProps {
  draft: OrderDraft;
  onUpdateDraft: (updated: Partial<OrderDraft>) => void;
  onNext: () => void;
}

export const StepPrintType: React.FC<StepPrintTypeProps> = ({ draft, onUpdateDraft, onNext }) => {
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectPrintType = (typeId: PrintTypeId) => {
    const defaultDimension = typeId === 'personnel' ? 'personnel_6x3x4' : 'size_13x18';
    onUpdateDraft({
      printType: typeId,
      dimensionId: defaultDimension
    });
  };

  return (
    <div className="space-y-5">
      {/* 4 Required Print Types Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
        {PRINT_TYPES.map((item) => {
          const isSelected = draft.printType === item.id;
          return (
            <div
              key={item.id}
              onClick={() => handleSelectPrintType(item.id)}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between active:scale-99 shadow-xs ${
                isSelected
                  ? 'bg-gradient-to-r from-sky-50/90 via-teal-50/70 to-emerald-50/90 border-sky-400 shadow-md shadow-sky-500/10'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Header: Title and selection checkmark */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    {item.title}
                  </h3>

                  <div
                    className={`w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full flex items-center justify-center border transition-colors flex-shrink-0 ${
                      isSelected
                        ? 'bg-gradient-to-r from-sky-500 to-emerald-500 border-transparent text-white'
                        : 'border-slate-300 bg-slate-50'
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 font-bold" />}
                  </div>
                </div>

                <p className="text-[11px] sm:text-xs text-sky-700 font-bold mb-2 truncate">{item.subtitle}</p>

                {/* Price directly underneath the title and subtitle */}
                <div className="p-2 rounded-xl bg-slate-50/90 border border-slate-200/80 flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-600 font-medium text-[11px] sm:text-xs">قیمت:</span>
                  <span className="font-black text-slate-900 font-mono text-xs sm:text-sm bg-gradient-to-l from-sky-700 to-emerald-700 bg-clip-text text-transparent">
                    {formatPrice(item.basePrice)}
                  </span>
                </div>

                {/* Expandable Menu for description and features */}
                <div className="pt-1 border-t border-slate-200/70">
                  <button
                    type="button"
                    onClick={(e) => toggleExpand(item.id, e)}
                    className="w-full flex items-center justify-between py-1 px-1.5 rounded-lg text-xs font-bold text-sky-700 hover:text-sky-800 hover:bg-sky-50/60 transition-all cursor-pointer"
                  >
                    <span className="text-[11px] sm:text-xs">
                      {expandedCards[item.id] ? 'بستن توضیحات و مشخصات' : 'مشاهده توضیحات و مشخصات چاپ'}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        expandedCards[item.id] ? 'rotate-180 text-emerald-600' : 'text-sky-600'
                      }`}
                    />
                  </button>

                  {expandedCards[item.id] && (
                    <div className="mt-1.5 space-y-2 bg-white/90 p-2.5 rounded-xl border border-slate-200/80 text-xs">
                      {/* Description Paragraph */}
                      <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed font-medium pb-2 border-b border-slate-100">
                        {item.description}
                      </p>

                      {/* Features List */}
                      <ul className="space-y-1 text-[11px] text-slate-600 font-medium pt-0.5">
                        {item.features.map((feat, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                            <span className="leading-relaxed">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onNext}
          className="w-full sm:w-auto bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 active:scale-98 text-white font-bold px-8 py-3.5 rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-sky-500/25 cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
        >
          <span>مرحله بعد</span>
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
