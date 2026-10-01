import React, { useState } from 'react';
import { Sparkles, Save, RotateCcw, CheckCircle2, HelpCircle } from 'lucide-react';
import { PrintTypeOption } from '../../types';

interface PromptsManagerProps {
  printTypes: PrintTypeOption[];
  prompts: Record<string, string>;
  onSavePrompt: (printTypeId: string, prompt: string) => void;
  onResetPrompts: () => void;
}

export const PromptsManager: React.FC<PromptsManagerProps> = ({
  printTypes,
  prompts,
  onSavePrompt,
  onResetPrompts
}) => {
  const [localPrompts, setLocalPrompts] = useState<Record<string, string>>({ ...prompts });
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);

  const handlePromptChange = (typeId: string, value: string) => {
    setLocalPrompts((prev) => ({ ...prev, [typeId]: value }));
  };

  const handleSave = (typeId: string) => {
    const value = localPrompts[typeId] || '';
    onSavePrompt(typeId, value);
    setSavedSuccessId(typeId);
    setTimeout(() => setSavedSuccessId(null), 2500);
  };

  const handleReset = () => {
    if (confirm('آیا از بازنشانی پرامپت‌ها به حالت اولیه اطمینان دارید؟')) {
      onResetPrompts();
      // Wait a frame to sync
      setTimeout(() => {
        setLocalPrompts({ ...prompts });
      }, 50);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-400 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-sky-500/20 flex-shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-black text-slate-900 leading-tight">
                مدیریت پرامپت‌های هوش مصنوعی (تولید تصویر)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                تعریف پرامپت پیش‌فرض و مهندسی پرامپت (Prompt Engineering) برای هر سبک از خدمات چاپ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>بازنشانی پرامپت‌های پیش‌فرض</span>
          </button>
        </div>

        {/* Quick Help Card */}
        <div className="mt-4 p-3 rounded-xl bg-sky-50 border border-sky-100 flex items-start gap-2.5 text-xs text-sky-800 leading-relaxed">
          <HelpCircle className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">راهنما: </span>
            <span>
              زمانی که کاربر در مرحله دوم سفارش دکمه <strong>«تولید تصویر با هوش مصنوعی»</strong> را می‌زند، پرامپت پایه تعریف‌شده در زیر با درخواست کاربر ترکیب شده و به DALL-E ارسال می‌شود تا خروجی دقیقاً مطابق سبک چاپ (پرسنلی، عروسی و غیره) باشد.
            </span>
          </div>
        </div>
      </div>

      {/* Prompts list */}
      <div className="space-y-4">
        {printTypes.map((type) => {
          const isSaved = savedSuccessId === type.id;
          const currentVal = localPrompts[type.id] !== undefined ? localPrompts[type.id] : (prompts[type.id] || '');

          return (
            <div
              key={type.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 hover:border-sky-300 transition-colors"
            >
              {/* Card Title & Info */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-100 text-sky-700 text-[10px] sm:text-xs font-black">
                    {type.title}
                  </span>
                  <span className="text-slate-500 text-[11px] font-medium hidden sm:inline">
                    {type.subtitle}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">ID: {type.id}</span>
                </div>
              </div>

              {/* Textarea */}
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold text-xs mb-1">
                  پرامپت اصلی مهندسی شده برای DALL-E 3:
                </label>
                <textarea
                  rows={3}
                  value={currentVal}
                  onChange={(e) => handlePromptChange(type.id, e.target.value)}
                  placeholder="مثال: پرتره آتلیه عروس شیک با کت و شلوار و لباس عروس سفید مجلل..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-800 leading-relaxed focus:bg-white focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <p className="text-[11px] text-slate-400 leading-normal">
                  توصیه می‌شود جزئیات نورپردازی (Studio Lighting) و کیفیت (Ultra HD) را در پرامپت بنویسید.
                </p>

                <button
                  type="button"
                  onClick={() => handleSave(type.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    isSaved
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white'
                  }`}
                >
                  {isSaved ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>ذخیره شد</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>ذخیره پرامپت</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
