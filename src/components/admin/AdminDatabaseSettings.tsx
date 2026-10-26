import React, { useEffect, useState } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  Trash2,
  Link2,
  ShieldCheck,
  Loader2,
  Copy
} from 'lucide-react';

interface DbStatus {
  configured: boolean;
  connected: boolean;
  source: 'admin' | 'env' | 'none';
  dbName: string;
  maskedUri: string;
  error?: string;
  counts?: Record<string, number>;
}

interface AdminDatabaseSettingsProps {
  showToast: (msg: string) => void;
}

const COLLECTION_LABELS: Record<string, string> = {
  users: 'کاربران',
  orders: 'سفارش‌ها',
  tickets: 'تیکت‌ها',
  printTypes: 'انواع چاپ',
  announcements: 'اطلاعیه‌ها',
  invoices: 'فاکتورهای بلوپال',
  webhookLogs: 'لاگ وبهوک',
  settings: 'تنظیمات',
  prompts: 'پرامپت‌ها',
  meta: 'متادیتا'
};

export const AdminDatabaseSettings: React.FC<AdminDatabaseSettingsProps> = ({ showToast }) => {
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [uri, setUri] = useState('');
  const [dbName, setDbName] = useState('laleh_studio');
  const [setupKey, setSetupKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showUri, setShowUri] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSuccess, setLastSuccess] = useState<string | null>(null);

  const requestHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (setupKey.trim()) headers['x-setup-key'] = setupKey.trim();
    return headers;
  };

  const loadStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch('/api/db/status');
      const data = await res.json();
      if (data && data.success !== false) {
        setStatus(data as DbStatus);
        if (data.dbName) setDbName(data.dbName);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleTest = async () => {
    setLastError(null);
    setLastSuccess(null);
    if (!uri.trim()) {
      setLastError('آدرس اتصال دیتابیس را وارد کنید.');
      return;
    }
    setIsTesting(true);
    try {
      const res = await fetch('/api/db/test', {
        method: 'POST',
        headers: requestHeaders(),
        body: JSON.stringify({ uri: uri.trim(), dbName: dbName.trim() })
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        setLastError(data?.error || 'اتصال برقرار نشد.');
      } else {
        setLastSuccess(data.message || 'اتصال با موفقیت برقرار شد.');
        showToast('اتصال به دیتابیس موفق بود.');
      }
    } catch (err: any) {
      setLastError(err?.message || 'خطا در تست اتصال.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setLastError(null);
    setLastSuccess(null);
    if (!uri.trim()) {
      setLastError('آدرس اتصال دیتابیس را وارد کنید.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/db/config', {
        method: 'POST',
        headers: requestHeaders(),
        body: JSON.stringify({ uri: uri.trim(), dbName: dbName.trim() })
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        setLastError(data?.error || 'ذخیره تنظیمات ناموفق بود.');
      } else {
        setLastSuccess('دیتابیس متصل شد و تمام داده‌ها از این پس در MongoDB ذخیره می‌شوند.');
        setStatus(data.status || null);
        showToast('اتصال دیتابیس ذخیره شد.');
      }
    } catch (err: any) {
      setLastError(err?.message || 'خطا در ذخیره تنظیمات.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('آدرس ذخیره‌شده حذف شود؟ در این حالت فقط متغیر محیطی MONGODB_URI استفاده می‌شود.')) {
      return;
    }
    setLastError(null);
    setLastSuccess(null);
    try {
      const res = await fetch('/api/db/config', { method: 'DELETE' });
      const data = await res.json();
      setStatus(data.status || null);
      setLastSuccess('آدرس ذخیره‌شده حذف شد.');
      showToast('تنظیمات دیتابیس حذف شد.');
    } catch (err: any) {
      setLastError(err?.message || 'خطا در حذف تنظیمات.');
    }
  };

  const statusColor = status?.connected
    ? 'border-emerald-200 bg-emerald-50/60'
    : status?.configured
      ? 'border-amber-200 bg-amber-50/60'
      : 'border-slate-200 bg-slate-50';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center flex-shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm sm:text-base font-black text-slate-900">اتصال به دیتابیس MongoDB</h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-5">
              تمام داده‌های پروژه (کاربران، سفارش‌ها، تیکت‌ها، انواع چاپ، اطلاعیه‌ها، پرامپت‌ها، تنظیمات و
              فاکتورهای بلوپال) در MongoDB ذخیره می‌شوند. آدرس اتصال را از MongoDB Atlas یا سرور خودتان بگیرید.
            </p>
          </div>
          <button
            onClick={loadStatus}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            {isLoadingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            بروزرسانی وضعیت
          </button>
        </div>
      </div>

      {/* Status */}
      <div className={`rounded-2xl border p-4 sm:p-5 ${statusColor}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            {status?.connected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className={`w-5 h-5 ${status?.configured ? 'text-amber-600' : 'text-slate-400'}`} />
            )}
            <span className="text-xs sm:text-sm font-black text-slate-900">
              {status?.connected
                ? 'اتصال برقرار است'
                : status?.configured
                  ? 'تنظیم شده اما اتصال برقرار نشد'
                  : 'دیتابیس هنوز تنظیم نشده'}
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600">
            منبع: {status?.source === 'admin' ? 'تنظیمات پنل' : status?.source === 'env' ? 'متغیر محیطی MONGODB_URI' : '—'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3">
            <p className="text-[10px] text-slate-500 font-bold mb-1">نام دیتابیس</p>
            <p className="text-xs font-mono font-bold text-slate-800 break-all">{status?.dbName || '—'}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3">
            <p className="text-[10px] text-slate-500 font-bold mb-1">آدرس اتصال</p>
            <p className="text-xs font-mono font-bold text-slate-800 break-all" dir="ltr">
              {status?.maskedUri || '—'}
            </p>
          </div>
        </div>

        {status?.error && (
          <p className="mt-3 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5 leading-5" dir="auto">
            {status.error}
          </p>
        )}

        {status?.counts && (
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(status.counts).map(([key, value]) => (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-700"
              >
                <span className="text-slate-500">{COLLECTION_LABELS[key] || key}</span>
                <span className="font-mono text-emerald-700">{value}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-black text-slate-800 mb-2">
            <Link2 className="w-3.5 h-3.5 text-sky-600" />
            آدرس اتصال دیتابیس (Connection URL)
          </label>
          <div className="relative">
            <input
              type={showUri ? 'text' : 'password'}
              value={uri}
              onChange={(e) => setUri(e.target.value)}
              placeholder="mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority"
              dir="ltr"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
            />
            <button
              type="button"
              onClick={() => setShowUri((v) => !v)}
              className="absolute inset-y-0 left-2 my-auto h-7 px-2 rounded-lg text-[10px] font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer"
            >
              {showUri ? 'پنهان' : 'نمایش'}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5 leading-5">
            نمونه: <span dir="ltr" className="font-mono">mongodb+srv://user:pass@cluster0.abcd.mongodb.net</span>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-black text-slate-800 mb-2 block">نام دیتابیس (Database Name)</label>
            <input
              type="text"
              value={dbName}
              onChange={(e) => setDbName(e.target.value)}
              placeholder="laleh_studio"
              dir="ltr"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-black text-slate-800 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              کلید تنظیمات (اختیاری)
            </label>
            <input
              type="password"
              value={setupKey}
              onChange={(e) => setSetupKey(e.target.value)}
              placeholder="ADMIN_SETUP_KEY"
              dir="ltr"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
            <p className="text-[10px] text-slate-500 mt-1.5">فقط اگر متغیر ADMIN_SETUP_KEY روی سرور تعریف شده باشد.</p>
          </div>
        </div>

        {lastError && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-rose-700 leading-5 break-all">{lastError}</p>
          </div>
        )}
        {lastSuccess && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-700 leading-5">{lastSuccess}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={handleTest}
            disabled={isTesting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 disabled:opacity-60 transition-colors cursor-pointer"
          >
            {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            تست اتصال
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 shadow-sm transition-colors cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            ذخیره و اتصال
          </button>
          <button
            onClick={handleClear}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            حذف تنظیمات
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
        <p className="text-xs font-black text-amber-900">نکته‌های مهم</p>
        <ul className="text-[11px] text-amber-800 leading-6 space-y-1 list-disc pr-4">
          <li>
            برای MongoDB Atlas، از منوی <span className="font-mono" dir="ltr">Network Access</span> آی‌پی سرور
            (یا <span className="font-mono" dir="ltr">0.0.0.0/0</span>) را مجاز کنید، وگرنه اتصال برقرار نمی‌شود.
          </li>
          <li>
            روی Vercel بهتر است علاوه بر این صفحه، متغیر محیطی{' '}
            <span className="font-mono" dir="ltr">MONGODB_URI</span> را هم در{' '}
            <span className="font-mono" dir="ltr">Settings → Environment Variables</span> تعریف کنید؛ چون
            فایل‌سیستم سرورلس موقتی است و آدرس ذخیره‌شده در پنل ممکن است بین اجراها از دست برود.
          </li>
          <li>اگر دیتابیس خالی باشد، داده‌های اولیه (کاربران، انواع چاپ و اطلاعیه‌ها) یک‌بار به‌صورت خودکار درج می‌شوند.</li>
          <li>آدرس اتصال شامل پسورد است؛ آن را در اختیار دیگران قرار ندهید.</li>
        </ul>
      </div>
    </div>
  );
};
