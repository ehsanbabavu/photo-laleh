import React, { useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, CheckCircle2, Database, Loader2, RefreshCw, Server } from 'lucide-react';

export type DatabaseProvider = 'mongodb' | 'postgres';

interface DatabaseStatus {
  activeProvider: DatabaseProvider | null;
  activeProviderError?: string;
  mongodb: {
    configured: boolean;
    connected: boolean;
    source: 'admin' | 'env' | 'none';
    dbName: string;
    maskedUri: string;
    error?: string;
  };
  postgresql: {
    configured: boolean;
    connected: boolean;
    error?: string;
  };
}

interface DatabaseStatusResponse extends DatabaseStatus {
  success: boolean;
  error?: string;
}

interface DatabaseProviderSelectorProps {
  showToast: (message: string) => void;
}

const fetcher = async (url: string): Promise<DatabaseStatusResponse> => {
  const response = await fetch(url);
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    throw new Error(data?.error || 'دریافت وضعیت دیتابیس ناموفق بود.');
  }
  return data;
};

const providerTitle = (provider: DatabaseProvider) => provider === 'mongodb' ? 'MongoDB' : 'PostgreSQL';

export const DatabaseProviderSelector: React.FC<DatabaseProviderSelectorProps> = ({ showToast }) => {
  const { data, error: loadError, isLoading, mutate } = useSWR<DatabaseStatusResponse>('/api/db/status', fetcher);
  const [isTestingPostgres, setIsTestingPostgres] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<DatabaseProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isBusy = isTestingPostgres || switchingTo !== null;
  const canSwitch = data?.activeProvider !== null && data?.activeProvider !== undefined && !data.activeProviderError;
  const canSwitchToMongo = canSwitch && (data?.mongodb.connected || data?.activeProvider === 'mongodb');
  const canSwitchToPostgres = canSwitch && data?.postgresql.configured && data.postgresql.connected;

  const handleTestPostgres = async () => {
    setError(null);
    setSuccess(null);
    setIsTestingPostgres(true);
    try {
      const response = await fetch('/api/db/postgres/test', { method: 'POST' });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        setError(result?.error || 'اتصال PostgreSQL برقرار نشد.');
        return;
      }
      setSuccess('اتصال PostgreSQL برقرار است.');
      await mutate();
    } catch {
      setError('تست اتصال PostgreSQL ناموفق بود.');
    } finally {
      setIsTestingPostgres(false);
    }
  };

  const handleSwitch = async (provider: DatabaseProvider) => {
    if (!data || data.activeProvider === provider) return;
    const targetTitle = providerTitle(provider);
    const message = provider === 'postgres'
      ? 'داده‌های فعلی از MongoDB به PostgreSQL منتقل و پس از اعتبارسنجی فعال می‌شوند. هنگام انتقال، نوشتن داده‌ها موقتاً متوقف می‌شود. ادامه می‌دهید؟'
      : 'داده‌های فعلی از PostgreSQL به MongoDB منتقل و پس از اعتبارسنجی فعال می‌شوند. هنگام انتقال، نوشتن داده‌ها موقتاً متوقف می‌شود. ادامه می‌دهید؟';
    if (!window.confirm(message)) return;

    setError(null);
    setSuccess(null);
    setSwitchingTo(provider);
    try {
      const response = await fetch('/api/db/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, confirm: true })
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        setError(result?.error || `تغییر به ${targetTitle} ناموفق بود.`);
        await mutate();
        return;
      }
      setSuccess(`دیتابیس فعال به ${targetTitle} تغییر کرد.`);
      showToast(`دیتابیس فعال: ${targetTitle}`);
      await mutate();
    } catch {
      setError('تغییر دیتابیس ناموفق بود. وضعیت اتصال را دوباره بررسی کنید.');
      await mutate();
    } finally {
      setSwitchingTo(null);
    }
  };

  const connectionLabel = (configured: boolean, connected: boolean) => {
    if (!configured) return 'تنظیم نشده';
    return connected ? 'متصل' : 'در دسترس نیست';
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4" aria-labelledby="database-provider-title">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center flex-shrink-0">
          <Database className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 id="database-provider-title" className="text-sm font-black text-slate-900">دیتابیس فعال</h2>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            MongoDB پیش‌فرض است. تغییر انتخاب، داده‌ها را یک‌بار منتقل و مقصد را پس از اعتبارسنجی فعال می‌کند؛ از Blob برای نگهداری انتخاب استفاده نمی‌شود.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void mutate()}
          disabled={isLoading || isBusy}
          aria-label="به‌روزرسانی وضعیت اتصال دیتابیس"
          className="ms-auto p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </div>

      {loadError && (
        <div role="alert" className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" aria-hidden="true" />
          <p className="text-[11px] text-rose-700">{loadError.message}</p>
        </div>
      )}

      {data?.activeProviderError && (
        <div role="alert" className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" aria-hidden="true" />
          <p className="text-[11px] text-rose-700">{data.activeProviderError}؛ برای جلوگیری از نوشتن در دیتابیس اشتباه، عملیات ذخیره متوقف است.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" aria-label="انتخاب دیتابیس فعال">
        <article className={`rounded-xl border p-3 space-y-3 ${data?.activeProvider === 'mongodb' ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-700" aria-hidden="true" />
            <h3 className="text-xs font-black text-slate-900">MongoDB</h3>
            {data?.activeProvider === 'mongodb' && (
              <span className="ms-auto inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800">
                <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> فعال
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-600">
            وضعیت: {isLoading ? 'در حال بررسی…' : connectionLabel(Boolean(data?.mongodb.configured), Boolean(data?.mongodb.connected))}
            {data?.mongodb.source === 'env' ? ' · متغیر محیطی' : data?.mongodb.source === 'admin' ? ' · تنظیم ذخیره‌شده' : ''}
          </p>
          {data?.mongodb.error && <p className="text-[10px] text-rose-700 break-all">{data.mongodb.error}</p>}
          <button
            type="button"
            onClick={() => void handleSwitch('mongodb')}
            disabled={isBusy || isLoading || !canSwitch || data?.activeProvider === 'mongodb' || !canSwitchToMongo}
            aria-pressed={data?.activeProvider === 'mongodb'}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold text-emerald-800 bg-white border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {switchingTo === 'mongodb' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
            انتخاب MongoDB
          </button>
        </article>

        <article className={`rounded-xl border p-3 space-y-3 ${data?.activeProvider === 'postgres' ? 'border-sky-300 bg-sky-50/60' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-sky-700" aria-hidden="true" />
            <h3 className="text-xs font-black text-slate-900">PostgreSQL</h3>
            {data?.activeProvider === 'postgres' && (
              <span className="ms-auto inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-1 text-[10px] font-bold text-sky-800">
                <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> فعال
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-600">
            وضعیت: {isLoading ? 'در حال بررسی…' : connectionLabel(Boolean(data?.postgresql.configured), Boolean(data?.postgresql.connected))}
          </p>
          {data?.postgresql.error && <p className="text-[10px] text-rose-700 break-all">{data.postgresql.error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void handleTestPostgres()}
              disabled={isBusy || isLoading || !data?.postgresql.configured}
              className="inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[10px] font-bold text-sky-800 bg-white border border-sky-200 hover:bg-sky-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isTestingPostgres ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />}
              تست اتصال
            </button>
            <button
              type="button"
              onClick={() => void handleSwitch('postgres')}
              disabled={isBusy || isLoading || !canSwitch || data?.activeProvider === 'postgres' || !canSwitchToPostgres}
              aria-pressed={data?.activeProvider === 'postgres'}
              className="inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[10px] font-bold text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {switchingTo === 'postgres' ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : null}
              انتخاب PostgreSQL
            </button>
          </div>
        </article>
      </div>

      {(error || success) && (
        <div
          role={error ? 'alert' : 'status'}
          className={`flex items-center gap-2 p-3 rounded-xl border ${error ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}
        >
          {error ? (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" aria-hidden="true" />
          )}
          <p className={`text-[11px] ${error ? 'text-rose-700' : 'text-emerald-700'}`}>{error || success}</p>
        </div>
      )}
    </section>
  );
};
