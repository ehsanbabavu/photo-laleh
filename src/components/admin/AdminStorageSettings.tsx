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
      if (data?.storageMode === 'blob' || data?.storageMode === 'local') setMode(data.storageMode);
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
    if (!window.confirm(`فایل‌های مقصد پاک و همه فایل‌ها به ذخیره‌سازی ${label} منتقل می‌شوند. ادامه می‌دهید؟`)) return;

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
  const activeModeLabel = mode === 'blob' ? 'ابری' : 'داخلی';

  return (
    <section
      className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
      aria-labelledby="storage-settings-title"
      dir="rtl"
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
            <Database className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h1 id="storage-settings-title" className="text-sm font-black text-slate-900">تنظیمات ذخیره‌سازی</h1>
            <p className="mt-0.5 text-[10px] text-slate-500 sm:text-[11px]">محل نگهداری فایل‌های جدید و انتقال فایل‌های قبلی</p>
          </div>
        </div>
        <span
          className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black ${
            loadError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
          aria-live="polite"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
          {loading ? 'در حال دریافت' : loadError ? 'خطا در دریافت' : `فعال: ${activeModeLabel}`}
        </span>
      </div>

      {loadError && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2" role="alert">
          <p className="text-[10px] font-bold text-rose-700">تنظیمات دریافت نشد و عملیات غیرفعال است.</p>
          <button type="button" onClick={() => void loadSettings()} className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700">
            <RefreshCw className="h-3 w-3" aria-hidden="true" /> تلاش دوباره
          </button>
        </div>
      )}

      <fieldset disabled={actionsDisabled} className="mt-3 grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">انتخاب محل ذخیره فایل‌های جدید</legend>
        {([
          { id: 'local' as const, title: 'ذخیره‌سازی داخلی', description: 'دیسک پایدار سرور', icon: HardDrive, tone: 'sky' },
          { id: 'blob' as const, title: 'ذخیره‌سازی ابری', description: 'Vercel Blob و CDN', icon: Cloud, tone: 'violet' }
        ]).map((option) => {
          const Icon = option.icon;
          const selected = mode === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option.id)}
              aria-pressed={selected}
              className={`flex min-h-14 items-center gap-2.5 rounded-xl border px-3 py-2 text-right transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                selected
                  ? option.tone === 'sky' ? 'border-sky-400 bg-sky-50' : 'border-violet-400 bg-violet-50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${option.tone === 'sky' ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-black text-slate-900">{option.title}</span>
                <span className="block text-[9px] text-slate-500 sm:text-[10px]">{option.description}</span>
              </span>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 text-transparent'}`} aria-hidden="true">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            </button>
          );
        })}
      </fieldset>

      <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-1.5 text-[9px] text-amber-800 sm:text-[10px]">
          <Info className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
          تغییر حالت فقط روی آپلودهای جدید اثر دارد.
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="ml-1 inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 sm:text-[10px]">
            <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" /> انتقال قبلی‌ها:
          </span>
          <button type="button" disabled={actionsDisabled} onClick={() => void migrate('local')} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[9px] font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50 sm:text-[10px]">
            {migrating === 'local' ? 'در حال انتقال...' : 'به داخلی'}
          </button>
          <button type="button" disabled={actionsDisabled} onClick={() => void migrate('blob')} className="rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[9px] font-black text-violet-700 hover:bg-violet-100 disabled:opacity-50 sm:text-[10px]">
            {migrating === 'blob' ? 'در حال انتقال...' : 'به ابر'}
          </button>
          <button type="button" disabled={actionsDisabled} onClick={() => void save()} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[10px] font-black text-white hover:bg-slate-800 disabled:opacity-50">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Save className="h-3.5 w-3.5" aria-hidden="true" />}
            {saving ? 'ذخیره...' : 'ذخیره تنظیمات'}
          </button>
        </div>
      </div>
    </section>
  );
};

export default AdminStorageSettings;

