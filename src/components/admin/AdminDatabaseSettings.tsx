import React, { useEffect, useState } from 'react';
import { Link2, Loader2, RefreshCw, Save, AlertCircle, CheckCircle2, Database } from 'lucide-react';

interface AdminDatabaseSettingsProps {
  showToast: (msg: string) => void;
}

const DEFAULT_DB_NAME = 'laleh_studio';

export const AdminDatabaseSettings: React.FC<AdminDatabaseSettingsProps> = ({ showToast }) => {
  const [uri, setUri] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/db/config');
        const data = await res.json();
        if (active && data?.uri) setUri(data.uri);
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleTest = async () => {
    setError(null);
    setSuccess(null);
    if (!uri.trim()) {
      setError('آدرس اتصال را وارد کنید.');
      return;
    }
    setIsTesting(true);
    try {
      const res = await fetch('/api/db/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri: uri.trim(), dbName: DEFAULT_DB_NAME })
      });
      const data = await res.json();
      if (!res.ok || data.success === false) setError(data?.error || 'اتصال برقرار نشد.');
      else setSuccess('اتصال برقرار شد.');
    } catch {
      setError('خطا در تست اتصال.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    if (!uri.trim()) {
      setError('آدرس اتصال را وارد کنید.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/db/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri: uri.trim(), dbName: DEFAULT_DB_NAME })
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        setError(data?.error || 'ذخیره ناموفق بود.');
      } else {
        setSuccess('ذخیره شد.');
        showToast('اتصال دیتابیس ذخیره شد.');
      }
    } catch {
      setError('خطا در ذخیره تنظیمات.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <h2 className="text-sm font-black text-slate-900">اتصال به MongoDB</h2>
        </div>

        <div className="relative">
          <input
            type="text"
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            placeholder="mongodb+srv://..."
            dir="ltr"
            className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          />
          <Link2 className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={handleTest}
            disabled={isTesting}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 disabled:opacity-60 cursor-pointer"
          >
            {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            تست اتصال
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            ذخیره
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <p className="text-[11px] text-rose-700 break-all">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="text-[11px] text-emerald-700">{success}</p>
          </div>
        )}
      </div>
    </div>
  );
};
