import React, { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { AlertCircle, CheckCircle2, Database, Link2, Loader2, RefreshCw, Save } from 'lucide-react';
import { DatabaseProviderSelector } from './DatabaseProviderSelector';

interface AdminDatabaseSettingsProps {
  showToast: (msg: string) => void;
}

interface MongoConfigResponse {
  success: boolean;
  maskedUri?: string;
  dbName?: string;
  source?: 'admin' | 'env' | 'none';
  error?: string;
}

const DEFAULT_DB_NAME = 'laleh_studio';

const fetcher = async (url: string): Promise<MongoConfigResponse> => {
  const response = await fetch(url);
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    throw new Error(data?.error || 'دریافت تنظیم MongoDB ناموفق بود.');
  }
  return data;
};

export const AdminDatabaseSettings: React.FC<AdminDatabaseSettingsProps> = ({ showToast }) => {
  const { data, error: loadError, isLoading, mutate } = useSWR<MongoConfigResponse>('/api/db/config', fetcher);
  const { mutate: mutateCache } = useSWRConfig();
  const [uri, setUri] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const savedMask = data?.maskedUri || '';
  const existingConnection = savedMask ? 'اتصال MongoDB تنظیم شده است.' : 'اتصال MongoDB با متغیر محیطی یا فرم زیر قابل تنظیم است.';

  const connectionPayload = () => {
    const value = uri.trim();
    const keepExisting = !value && Boolean(savedMask);
    return { value, keepExisting };
  };

  const handleTest = async () => {
    setError(null);
    setSuccess(null);
    const { value, keepExisting } = connectionPayload();
    if (!value && !keepExisting) {
      setError('آدرس اتصال را وارد کنید.');
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch('/api/db/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri: value, keepExisting, dbName: DEFAULT_DB_NAME })
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success === false) {
        setError(result?.error || 'اتصال برقرار نشد.');
      } else {
        setSuccess('اتصال MongoDB برقرار است.');
        await Promise.all([mutate(), mutateCache('/api/db/status')]);
      }
    } catch {
      setError('خطا در تست اتصال MongoDB.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    const { value, keepExisting } = connectionPayload();
    if (!value && !keepExisting) {
      setError('آدرس اتصال را وارد کنید.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/db/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri: value, keepExisting, dbName: DEFAULT_DB_NAME })
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success === false) {
        setError(result?.error || 'ذخیره ناموفق بود.');
        return;
      }
      setSuccess('تنظیم MongoDB ذخیره شد.');
      setUri('');
      showToast('تنظیم اتصال MongoDB ذخیره شد.');
      await Promise.all([mutate(), mutateCache('/api/db/status')]);
    } catch {
      setError('خطا در ذخیره تنظیمات MongoDB.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-3">
      <DatabaseProviderSelector showToast={showToast} />

      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3" aria-labelledby="mongodb-connection-title">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-700 flex-shrink-0" aria-hidden="true" />
          <h2 id="mongodb-connection-title" className="text-sm font-black text-slate-900">تنظیم اتصال MongoDB</h2>
        </div>

        <p className="text-[11px] text-slate-500">{existingConnection}</p>
        <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
          برای ماندگاری اتصال MongoDB روی هاست، متغیر محیطی MONGODB_URI را تنظیم کنید؛ فایل تنظیمات این فرم روی دیسک موقت بعضی هاست‌ها پایدار نمی‌ماند.
        </p>
        {savedMask && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="block text-[10px] font-bold text-slate-500 mb-1">آدرس ذخیره‌شده (اطلاعات محرمانه پوشانده شده)</span>
            <code dir="ltr" className="block text-[10px] text-slate-700 font-mono break-all">{savedMask}</code>
          </div>
        )}

        <div className="relative">
          <label htmlFor="mongodb-uri" className="sr-only">آدرس اتصال MongoDB</label>
          <input
            id="mongodb-uri"
            type="password"
            autoComplete="new-password"
            value={uri}
            onChange={(event) => setUri(event.target.value)}
            placeholder="mongodb+srv://..."
            dir="ltr"
            className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          />
          <Link2 className="w-4 h-4 text-slate-400 absolute right-3 top-3" aria-hidden="true" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void handleTest()}
            disabled={isTesting || isSaving || isLoading}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 disabled:opacity-60 cursor-pointer"
          >
            {isTesting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="w-4 h-4" aria-hidden="true" />}
            تست اتصال MongoDB
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || isTesting || isLoading}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
            ذخیره اتصال MongoDB
          </button>
        </div>

        {(loadError || error || success) && (
          <div
            role={error || loadError ? 'alert' : 'status'}
            className={`flex items-center gap-2 p-2.5 rounded-xl border ${error || loadError ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}
          >
            {error || loadError ? (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" aria-hidden="true" />
            )}
            <p className={`text-[11px] ${error || loadError ? 'text-rose-700' : 'text-emerald-700'}`}>
              {error || loadError?.message || success}
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
