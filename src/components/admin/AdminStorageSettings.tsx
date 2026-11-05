import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  Check,
  Cloud,
  Database,
  HardDrive,
  Info,
  Loader2,
  RefreshCw,
  Save
} from 'lucide-react';

type StorageMode = 'local' | 'blob';

export const AdminStorageSettings: React.FC<{ showToast: (message: string) => void }> = ({ showToast }) => {
  const [mode, setMode] = useState<StorageMode>('local');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState<StorageMode | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('دریافت تنظیمات ناموفق بود.');
      const data = await response.json();
      if (data?.storageMode === 'blob' || data?.storageMode === 'local') {
        setMode(data.storageMode);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const migrate = async (target: StorageMode) => {
    const label = target === 'blob' ? 'ابری' : 'داخلی';
    if (
      !window.confirm(
        `تمام فایل‌های مقصد فرمت می‌شود و فایل‌ها با همان نام و پوشه به ذخیره‌سازی ${label} منتقل می‌شوند. ادامه می‌دهید؟`
      )
    ) {
      return;
    }

    setMigrating(target);
    try {
      const response = await fetch('/api/storage/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, confirm: 'FORMAT_AND_COPY' })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'مهاجرت ناموفق بود');
      setMode(target);
      showToast(`مهاجرت انجام شد؛ ${data.copied || 0} فایل منتقل شد.`);
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'مهاجرت ذخیره‌سازی ناموفق بود.');
    } finally {
      setMigrating(null);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storageMode: mode })
      });
      if (!response.ok) throw new Error();
      showToast('تنظیمات ذخیره‌سازی ذخیره شد.');
    } catch {
      showToast('ذخیره تنظیمات ذخیره‌سازی ناموفق بود.');
    } finally {
      setSaving(false);
    }
  };

  const actionsDisabled = loading || loadError || saving || Boolean(migrating);
  const activeModeLabel = mode === 'blob' ? 'ذخیره‌سازی ابری' : 'ذخیره‌سازی داخلی';

  return (
    <div className="mx-auto w-full max-w-4xl" dir="rtl">
      <section
        className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70"
        aria-labelledby="storage-settings-title"
      >
        <header className="border-b border-slate-200 bg-gradient-to-l from-slate-50 via-white to-sky-50/70 px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-200 bg-sky-100 text-sky-700 shadow-sm shadow-sky-100">
                <Database className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h1 id="storage-settings-title" className="text-base font-black text-slate-900 sm:text-lg">
                  تنظیمات ذخیره‌سازی
                </h1>
                <p className="mt-1 max-w-xl text-[11px] leading-5 text-slate-500 sm:text-xs">
                  محل نگهداری عکس‌ها و فایل‌های سامانه را انتخاب کنید و در صورت نیاز، فایل‌های موجود را بین سرویس‌ها انتقال دهید.
                </p>
              </div>
            </div>

            <div
              className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black sm:text-[11px] ${
                loadError
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
              aria-live="polite"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : loadError ? (
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-300" />
              )}
              {loading
                ? 'در حال دریافت تنظیمات'
                : loadError
                  ? 'دریافت تنظیمات ناموفق بود'
                  : `حالت انتخاب‌شده: ${activeModeLabel}`}
            </div>
          </div>
        </header>

        <div className="space-y-6 p-4 sm:p-6 lg:p-7">
          {loadError && (
            <div
              className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
              role="alert"
            >
              <div className="flex items-start gap-2.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                <p className="text-[10px] leading-5 text-rose-800 sm:text-[11px]">
                  تنظیمات فعلی دریافت نشد. برای جلوگیری از بازنویسی ناخواسته، عملیات ذخیره‌سازی تا بارگذاری مجدد غیرفعال است.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadSettings()}
                className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-[10px] font-black text-rose-700 transition-colors hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                تلاش دوباره
              </button>
            </div>
          )}

          <fieldset disabled={actionsDisabled}>
            <legend className="mb-3 text-xs font-black text-slate-800 sm:text-sm">محل ذخیره فایل‌های جدید</legend>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setMode('local')}
                aria-pressed={mode === 'local'}
                className={`group relative min-h-44 rounded-2xl border p-4 text-right transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 sm:p-5 ${
                  mode === 'local'
                    ? 'border-sky-400 bg-sky-50/80 shadow-sm shadow-sky-100'
                    : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md hover:shadow-slate-200/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-200 bg-white text-sky-700 shadow-sm">
                    <HardDrive className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
                      mode === 'local'
                        ? 'border-sky-600 bg-sky-600 text-white'
                        : 'border-slate-300 bg-white text-transparent'
                    }`}
                    aria-hidden="true"
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                </div>
                <h2 className="mt-4 text-sm font-black text-slate-900">ذخیره‌سازی داخلی</h2>
                <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
                  فایل‌ها داخل پوشهٔ پروژه و روی فضای دیسک سرور ذخیره می‌شوند؛ مناسب سرورهایی با دیسک پایدار.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">کنترل مستقیم</span>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">دسترسی محلی</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('blob')}
                aria-pressed={mode === 'blob'}
                className={`group relative min-h-44 rounded-2xl border p-4 text-right transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 sm:p-5 ${
                  mode === 'blob'
                    ? 'border-violet-400 bg-violet-50/80 shadow-sm shadow-violet-100'
                    : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md hover:shadow-slate-200/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-200 bg-white text-violet-700 shadow-sm">
                    <Cloud className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
                      mode === 'blob'
                        ? 'border-violet-600 bg-violet-600 text-white'
                        : 'border-slate-300 bg-white text-transparent'
                    }`}
                    aria-hidden="true"
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                </div>
                <h2 className="mt-4 text-sm font-black text-slate-900">ذخیره‌سازی ابری</h2>
                <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
                  فایل‌ها در Vercel Blob نگهداری و از طریق CDN ارائه می‌شوند؛ مناسب استقرارهای ابری و مقیاس‌پذیر.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-lg bg-violet-100/80 px-2 py-1 text-[9px] font-bold text-violet-700">CDN سراسری</span>
                  <span className="rounded-lg bg-violet-100/80 px-2 py-1 text-[9px] font-bold text-violet-700">مناسب Vercel</span>
                </div>
              </button>
            </div>
          </fieldset>

          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/80 px-3.5 py-3 text-[10px] leading-5 text-amber-900 sm:text-[11px]">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
            <p>
              تغییر این گزینه فقط برای آپلودهای جدید اعمال می‌شود. برای جابه‌جایی فایل‌های قبلی، از بخش «انتقال فایل‌های موجود» استفاده کنید.
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div>
              <p className="text-xs font-black text-slate-800">ذخیره انتخاب فعلی</p>
              <p className="mt-1 text-[10px] text-slate-500 sm:text-[11px]">گزینهٔ انتخاب‌شده: {activeModeLabel}</p>
            </div>
            <button
              type="button"
              disabled={actionsDisabled}
              onClick={() => void save()}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-black text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
              {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
            </button>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-xs font-black text-slate-800 sm:text-sm">انتقال فایل‌های موجود</h2>
                <p className="mt-1 text-[10px] leading-5 text-slate-500 sm:text-[11px]">
                  مقصد پیش از انتقال پاک‌سازی می‌شود و سپس همهٔ فایل‌ها با ساختار فعلی پوشه‌ها کپی خواهند شد.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={actionsDisabled}
                onClick={() => void migrate('local')}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[11px] font-black text-slate-700 transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {migrating === 'local' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <HardDrive className="h-4 w-4" aria-hidden="true" />}
                {migrating === 'local' ? 'در حال انتقال به داخلی...' : 'انتقال کامل به داخلی'}
              </button>
              <button
                type="button"
                disabled={actionsDisabled}
                onClick={() => void migrate('blob')}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-2.5 text-[11px] font-black text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {migrating === 'blob' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Cloud className="h-4 w-4" aria-hidden="true" />}
                {migrating === 'blob' ? 'در حال انتقال به ابر...' : 'انتقال کامل به ابر'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminStorageSettings;

