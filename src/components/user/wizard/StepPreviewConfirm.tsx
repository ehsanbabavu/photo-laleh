import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  ArrowLeft,
  Cpu,
  ShieldCheck
} from 'lucide-react';
import { OrderDraft } from '../../../types';

interface StepPreviewConfirmProps {
  draft: OrderDraft;
  onConfirmOrder: () => void;
  onBack?: () => void;
  avalaiApiKey?: string;
  printTypePrompts?: Record<string, string>;
  avalaiBaseUrl?: string;
  avalaiModel?: string;
}

export const StepPreviewConfirm: React.FC<StepPreviewConfirmProps> = ({
  onConfirmOrder
}) => {
  const [countdown, setCountdown] = useState(2);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const hasTriggeredRef = useRef(false);

  // Single-execution safe trigger
  const handleSafeConfirm = useCallback(() => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;
    setIsRedirecting(true);
    onConfirmOrder();
  }, [onConfirmOrder]);

  // Visual countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // One-time automatic redirect timeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      handleSafeConfirm();
    }, 2000);

    return () => clearTimeout(timeout);
  }, [handleSafeConfirm]);

  return (
    <div className="py-6 sm:py-10 max-w-xl mx-auto text-center animate-fade-in">
      {/* Success Confirmation Card ONLY */}
      <div className="bg-white border border-emerald-200 rounded-3xl p-6 sm:p-10 shadow-xl shadow-emerald-500/10 space-y-6 relative overflow-hidden">
        {/* Decorative Top Accent Bar */}
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />

        {/* Animated Success Badge Icon */}
        <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24">
          <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-35" />
          <div className="relative w-full h-full rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>
        </div>

        {/* Success Headings */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>پرداخت موفق و تایید نهایی</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            سفارش شما با موفقیت ثبت شد!
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto font-medium">
            عکس آپلود شده به همراه پرامپت اختصاصی مستقیماً به هوش مصنوعی تحویل داده شد و کلیه مراحل پردازش و آماده‌سازی در بک‌اند در حال انجام است.
          </p>
        </div>

        {/* Background Processing Note */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-right space-y-2 text-slate-600">
          <div className="flex items-center gap-2 text-sky-700 font-bold">
            <Cpu className="w-4 h-4 text-sky-600 animate-spin" />
            <span>عملیات خودکار در پس‌زمینه (بک‌اند):</span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-slate-600 pr-2">
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>ارسال مستقیم تصویر و پرامپت به موتور هوش مصنوعی</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>رتوش و بازسازی چهره با مدل اختصاصی</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>قرارگیری خودکار تصویر نهایی در کارت پیگیری سفارش شما</span>
            </li>
          </ul>
        </div>

        {/* Countdown & Direct Redirect Button */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleSafeConfirm}
            disabled={isRedirecting}
            className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600 active:scale-98 text-white font-black py-3.5 px-6 rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-emerald-500/25 cursor-pointer flex items-center justify-center gap-2 min-h-[46px] disabled:opacity-75"
          >
            <span>{isRedirecting ? 'در حال انتقال به بخش سفارشات...' : 'انتقال مستقیم به صفحه سفارشات'}</span>
            <ArrowLeft className="w-4 h-4" />
          </button>

          <p className="text-[11px] text-slate-400 font-mono">
            {countdown > 0 ? `انتقال خودکار در ${countdown} ثانیه دیگر...` : 'در حال انتقال...'}
          </p>
        </div>
      </div>
    </div>
  );
};
