import React, { useEffect, useState } from 'react';
import {
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  RefreshCw,
  Link2,
  ShieldCheck
} from 'lucide-react';

interface BackupSchedule {
  enabled: boolean;
  intervalHours: number;
  chatId: string;
  cronToken: string;
  lastSentAt: string | null;
  lastAttemptAt: string | null;
  lastStatus: 'ok' | 'error' | null;
  lastError: string | null;
  lastSizeBytes: number | null;
}

interface AdminBackupScheduleProps {
  showToast: (msg: string) => void;
}

const INTERVAL_OPTIONS = [
  { value: 1, label: 'هر ۱ ساعت' },
  { value: 2, label: 'هر ۲ ساعت' },
  { value: 4, label: 'هر ۴ ساعت' },
  { value: 6, label: 'هر ۶ ساعت' },
  { value: 8, label: 'هر ۸ ساعت' },
  { value: 12, label: 'هر ۱۲ ساعت' },
  { value: 24, label: 'هر ۲۴ ساعت (روزانه)' }
];

const formatFaDate = (iso: string | null) => {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '—';
  return new Date(t).toLocaleString('fa-IR', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const AdminBackupSchedule: React.FC<AdminBackupScheduleProps> = ({ showToast }) => {
  const [schedule, setSchedule] = useState<BackupSchedule | null>(null);
  const [intervalHours, setIntervalHours] = useState(4);
  const [chatId, setChatId] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const cronBase = typeof window !== 'undefined' ? `${window.location.origin}/api/cron/backup` : '';
  const cronUrl = schedule?.cronToken ? `${cronBase}?token=${schedule.cronToken}` : '';

  const load = async () => {
    try {
      const res = await fetch('/api/backup/schedule');
      const data = await res.json().catch(() => null);
      if (data?.success && data.schedule) {
        setSchedule(data.schedule);
        setEnabled(data.schedule.enabled);
        setIntervalHours(data.schedule.intervalHours);
        setChatId(data.schedule.chatId);
      }
    } catch {
      setResult({ success: false, message: 'دریافت تنظیمات زمان‌بندی ناموفق بود.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (patch?: Record<string, unknown>) => {
    setIsSaving(true);
    setResult(null);
    try {
      const res = await fetch('/api/backup/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          intervalHours,
          chatId: chatId.trim(),
          ...(patch || {})
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        setResult({ success: false, message: data?.error || 'ذخیره تنظیمات ناموفق بود.' });
        return null;
      }
      setSchedule(data.schedule);
      setEnabled(data.schedule.enabled);
      setIntervalHours(data.schedule.intervalHours);
      setChatId(data.schedule.chatId);
      showToast('تنظیمات پشتیبان خودکار ذخیره شد.');
      return data.schedule as BackupSchedule;
    } catch {
      setResult({ success: false, message: 'ذخیره تنظیمات ناموفق بود.' });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const sendNow = async () => {
    setIsSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/backup/telegram', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        setResult({ success: false, message: data?.error || 'ارسال پشتیبان ناموفق بود.' });
        return;
      }
      setResult({ success: true, message: 'پشتیبان به تلگرام ارسال شد.' });
      showToast('پشتیبان به تلگرام ارسال شد.');
      await load();
    } catch {
      setResult({ success: false, message: 'ارسال پشتیبان ناموفق بود.' });
    } finally {
      setIsSending(false);
    }
  };

  const copy = async (value: string, label: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} کپی شد.`);
    } catch {
      showToast('کپی ناموفق بود.');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center flex-shrink-0">
          <Send className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-black text-slate-900">پشتیبان‌گیری خودکار به تلگرام</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            یک نسخه کامل از دیتابیس به‌صورت فایل JSON در بازه انتخابی به تلگرام ارسال می‌شود.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ms-auto">
          <input
            type="checkbox"
            checked={enabled}
            disabled={isLoading}
            onChange={(e) => setEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
            <span>بازه ارسال</span>
          </label>
          <select
            value={intervalHours}
            onChange={(e) => setIntervalHours(Number(e.target.value))}
            disabled={isLoading}
            className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
          >
            {INTERVAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
            <span>شناسه چت مقصد</span>
          </label>
          <input
            type="text"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            disabled={isLoading}
            placeholder="مثلاً 123456789"
            dir="ltr"
            className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-mono"
          />
        </div>
      </div>

      <p className="text-[10px] text-slate-500 leading-relaxed">
        اگر خالی بماند از «شناسه چت» تنظیمات ربات تلگرام استفاده می‌شود. توکن ربات هم از همان بخش
        خوانده می‌شود.
      </p>

      {/* Cron endpoint for cron-job.org */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Link2 className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
          <span className="text-[11px] font-bold text-slate-800">
            آدرس زمان‌بند (cron-job.org)
          </span>
          <button
            type="button"
            onClick={() => copy(cronUrl, 'آدرس زمان‌بند')}
            disabled={!cronUrl}
            className="ms-auto inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1 hover:bg-indigo-100 disabled:opacity-50 cursor-pointer"
          >
            <Copy className="w-3 h-3" />
            <span>کپی</span>
          </button>
        </div>
        <code
          dir="ltr"
          className="block text-[10px] text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1.5 break-all font-mono max-h-16 overflow-auto"
        >
          {cronUrl || '—'}
        </code>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          این آدرس را در cron-job.org با بازه ۱ ساعت تنظیم کنید؛ خود سامانه فقط زمانی که بازه بالا
          سر رسیده باشد فایل پشتیبان را می‌فرستد.
        </p>
        <button
          type="button"
          onClick={() => save({ rotateToken: true })}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isSaving ? 'animate-spin' : ''}`} />
          <span>ساخت مجدد توکن زمان‌بند</span>
        </button>
      </div>

      {/* Status */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-600">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          آخرین ارسال: <b className="text-slate-800">{formatFaDate(schedule?.lastSentAt || null)}</b>
        </span>
        {schedule?.lastStatus === 'ok' && (
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            موفق
          </span>
        )}
        {schedule?.lastStatus === 'error' && (
          <span className="inline-flex items-center gap-1 text-rose-700">
            <AlertCircle className="w-3.5 h-3.5" />
            {schedule?.lastError || 'خطا در آخرین ارسال'}
          </span>
        )}
        {schedule?.lastSizeBytes ? (
          <span className="text-slate-500">{Math.round(schedule.lastSizeBytes / 1024)} KB</span>
        ) : null}
      </div>

      {result && (
        <div
          className={`flex items-center gap-2 p-2.5 rounded-xl border ${
            result.success ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <p className={`text-[11px] ${result.success ? 'text-emerald-700' : 'text-rose-700'}`}>
            {result.message}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-auto">
        <button
          type="button"
          onClick={sendNow}
          disabled={isSending || isLoading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 disabled:opacity-60 text-xs font-bold cursor-pointer transition-colors"
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span>ارسال همین حالا</span>
        </button>
        <button
          type="button"
          onClick={() => save()}
          disabled={isSaving || isLoading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer transition-colors"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>ذخیره تنظیمات</span>
        </button>
      </div>
    </div>
  );
};
