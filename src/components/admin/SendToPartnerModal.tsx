import React, { useMemo, useState } from 'react';
import {
  X,
  Search,
  UserCog,
  Send,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Building2,
  Printer
} from 'lucide-react';
import { Order, PartnerChannel, User } from '../../types';
import { formatPrice } from '../../utils/formatters';

interface SendToPartnerModalProps {
  order: Order;
  partners: User[];
  dimensionTitle?: string;
  quantity: number;
  onClose: () => void;
  onSent: (order: Order, message: string) => void;
}

/**
 * Two-step flow: pick exactly one colleague → pick the channel (Eitaa/Telegram).
 * The backend sends the print files + production details and issues the
 * internal partner invoice (cost price based).
 */
export const SendToPartnerModal: React.FC<SendToPartnerModalProps> = ({
  order,
  partners,
  dimensionTitle,
  quantity,
  onClose,
  onSent
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [channel, setChannel] = useState<PartnerChannel | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim();
    return partners.filter((p) => {
      if (!q) return true;
      return (
        (p.name || '').includes(q) ||
        (p.guildName || '').includes(q) ||
        String(p.telegramId || '').includes(q) ||
        String(p.eitaaId || '').includes(q)
      );
    });
  }, [partners, query]);

  const selected = partners.find((p) => p.id === selectedId) || null;
  const hasTelegram = Boolean(String(selected?.telegramId || '').trim());
  const hasEitaa = Boolean(String(selected?.eitaaId || '').trim());

  const handleSend = async () => {
    if (!selected || !channel) return;
    setIsSending(true);
    setError('');
    setWarnings([]);

    try {
      const res = await fetch('/api/print/send-to-partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          partnerId: selected.id,
          channel
        })
      });
      const data: any = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setError(data?.message || `ارسال انجام نشد (کد ${res.status}).`);
        setWarnings(Array.isArray(data?.warnings) ? data.warnings : []);
        return;
      }

      onSent(data.order as Order, data.message || 'سفارش برای همکار ارسال شد.');
    } catch (err: any) {
      setError(err?.message || 'خطا در ارتباط با سرور.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-500 text-white flex items-center justify-center flex-shrink-0">
              <Printer className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                ارسال برای چاپ {order.trackingCode ? `— ${order.trackingCode}` : ''}
              </h3>
              <p className="text-[10px] text-slate-500">
                مرحله {step} از ۲ — {step === 1 ? 'انتخاب همکار' : 'انتخاب روش ارسال'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="px-4 pt-3 flex items-center gap-2 flex-shrink-0">
          {[1, 2].map((n) => (
            <div key={n} className="flex-1 flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center flex-shrink-0 ${
                  step >= n ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {step > n ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
              </span>
              <span className={`text-[10px] font-bold ${step >= n ? 'text-slate-800' : 'text-slate-400'}`}>
                {n === 1 ? 'همکار' : 'ایتا / تلگرام'}
              </span>
              {n === 1 && <span className="flex-1 h-px bg-slate-200" />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[11px] text-red-700 font-bold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p>{error}</p>
                {warnings.map((warning, index) => (
                  <p key={index} className="text-[10px] font-medium opacity-90">
                    • {warning}
                  </p>
                ))}
              </div>
            </div>
          )}

          {step === 1 ? (
            <>
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="جستجوی نام همکار، صنف یا شناسه..."
                  className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              </div>

              {partners.length === 0 ? (
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                  هیچ همکاری ثبت نشده است. ابتدا از «مدیریت کاربران» یک کاربر با دسته «همکار» بسازید و
                  شناسه تلگرام/ایتای او را وارد کنید.
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">همکاری با این مشخصات یافت نشد.</div>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
                  {filtered.map((partner) => {
                    const active = selectedId === partner.id;
                    return (
                      <button
                        key={partner.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(partner.id);
                          setChannel(null);
                        }}
                        className={`w-full text-right p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                          active
                            ? 'bg-gradient-to-r from-sky-50 to-emerald-50 border-sky-400 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center ${
                            active ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-300'
                          }`}
                        >
                          {active && <CheckCircle2 className="w-3 h-3" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <UserCog className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                            <span className="text-xs font-black text-slate-900 truncate">{partner.name}</span>
                          </span>
                          {partner.guildName && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                              <Building2 className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{partner.guildName}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-2 mt-1 text-[10px] font-mono">
                            <span className={partner.telegramId ? 'text-sky-700' : 'text-slate-300'}>
                              TG: {partner.telegramId || '—'}
                            </span>
                            <span className={partner.eitaaId ? 'text-emerald-700' : 'text-slate-300'}>
                              Eitaa: {partner.eitaaId || '—'}
                            </span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Order summary (production details only) */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">همکار:</span>
                  <span className="font-bold text-slate-900">{selected?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">سایز:</span>
                  <span className="font-bold text-slate-900">{dimensionTitle || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">تعداد:</span>
                  <span className="font-bold font-mono text-slate-900">{quantity} سری</span>
                </div>
                <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200 leading-relaxed">
                  عکس‌های سفارش به‌صورت فایل + مشخصات چاپ (سایز و تعداد) برای همکار ارسال می‌شود؛
                  اطلاعات مشتری و مبلغ فاکتور ارسال نمی‌شود.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!hasTelegram}
                  onClick={() => setChannel('telegram')}
                  className={`p-3 rounded-xl border-2 text-right transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    channel === 'telegram'
                      ? 'border-sky-500 bg-sky-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                    <Send className="w-4 h-4 text-sky-600" />
                    ارسال به تلگرام
                  </span>
                  <span className="block text-[10px] font-mono text-slate-500 mt-1 truncate" dir="ltr">
                    {selected?.telegramId || 'شناسه ثبت نشده'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={!hasEitaa}
                  onClick={() => setChannel('eitaa')}
                  className={`p-3 rounded-xl border-2 text-right transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    channel === 'eitaa'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    ارسال به ایتا
                  </span>
                  <span className="block text-[10px] font-mono text-slate-500 mt-1 truncate" dir="ltr">
                    {selected?.eitaaId || 'شناسه ثبت نشده'}
                  </span>
                </button>
              </div>

              {!hasTelegram && !hasEitaa && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-bold">
                  برای این همکار هیچ شناسه تلگرام یا ایتایی ثبت نشده است. ابتدا از مدیریت کاربران شناسه
                  را وارد کنید.
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 flex items-center gap-2 flex-shrink-0">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={!selected}
                onClick={() => setStep(2)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                مرحله بعد
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isSending}
                className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer disabled:opacity-60"
              >
                <ChevronRight className="w-4 h-4" />
                بازگشت
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={!channel || isSending}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : channel === 'eitaa' ? (
                  <MessageCircle className="w-4 h-4" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {isSending ? 'در حال ارسال...' : 'ارسال و صدور فاکتور'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
