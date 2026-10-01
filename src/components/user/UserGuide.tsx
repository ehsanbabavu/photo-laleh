import React from 'react';
import { BookOpen, CheckCircle2, Layers, Sparkles } from 'lucide-react';
import { PRINT_TYPES, PAPER_MATERIALS } from '../../data/mockData';
import { formatPrice } from '../../utils/formatters';

export const UserGuide: React.FC = () => {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600 rounded-2xl sm:rounded-3xl p-4 sm:p-7 text-white shadow-lg shadow-sky-600/15">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 border border-white/20 text-white flex items-center justify-center flex-shrink-0 backdrop-blur-xs">
            <BookOpen className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl lg:text-2xl font-black text-white">راهنمای چاپ و متریال استودیو</h1>
            <p className="text-xs sm:text-sm text-sky-100 mt-0.5 leading-relaxed font-medium">
              آشنایی با خدمات تخصصی و تفاوت شاسی MDF با کاغذهای عکاسی
            </p>
          </div>
        </div>
      </div>

      {/* 4 Print Services */}
      <div className="space-y-3.5">
        <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600 flex-shrink-0" />
          <span>خدمات ۴ گانه آتلیه دیجیتال لاله</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {PRINT_TYPES.map((type) => (
            <div key={type.id} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-xs hover:border-sky-300 hover:shadow-md transition-all">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">{type.title}</h3>
                <span className="text-[11px] sm:text-xs font-mono text-sky-700 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200 font-bold flex-shrink-0">
                  از {formatPrice(type.basePrice)}
                </span>
              </div>
              <p className="text-xs text-sky-700 font-bold">{type.subtitle}</p>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">{type.description}</p>
              <ul className="space-y-1 text-[11px] sm:text-xs text-slate-600 pt-2 border-t border-slate-100 font-medium">
                {type.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Materials Comparison */}
      <div className="space-y-3.5">
        <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
          <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0" />
          <span>متریال و بسترهای چاپ</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {PAPER_MATERIALS.map((mat) => (
            <div key={mat.id} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:border-emerald-300 hover:shadow-md transition-all">
              <div>
                <span className="text-[10px] text-emerald-700 font-bold mb-1 block">{mat.badge}</span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-1.5">{mat.name}</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-3 font-medium">{mat.description}</p>
              </div>
              <div className="pt-2.5 border-t border-slate-100 flex justify-between text-xs font-bold">
                <span className="text-slate-500 text-[11px]">مشخصه فنی:</span>
                <span className="font-mono text-slate-700 text-[11px]">{mat.spec}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
