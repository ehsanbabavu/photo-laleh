import React, { useEffect, useState } from 'react';
import { HardDrive, Cloud, Database, Save } from 'lucide-react';

export const AdminStorageSettings: React.FC<{ showToast: (message: string) => void }> = ({ showToast }) => {
  const [mode, setMode] = useState<'local' | 'blob'>('local');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((data) => {
      if (data?.storageMode === 'blob' || data?.storageMode === 'local') setMode(data.storageMode);
    }).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storageMode: mode })
      });
      if (!res.ok) throw new Error();
      showToast('تنظیمات ذخیره‌سازی ذخیره شد.');
    } catch {
      showToast('ذخیره تنظیمات ذخیره‌سازی ناموفق بود.');
    } finally { setSaving(false); }
  };

  return <div className="space-y-3" dir="rtl">
    <div><h1 className="text-lg font-black text-slate-900">ذخیره‌سازی</h1><p className="mt-0.5 text-xs text-slate-500">محل ذخیره عکس‌ها و فایل‌های سامانه را انتخاب کنید.</p></div>
    <div className="grid gap-3 md:grid-cols-2">
      <button type="button" onClick={() => setMode('local')} className={`rounded-xl border p-3 text-right transition ${mode === 'local' ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-200' : 'border-slate-200 bg-white'}`}>
        <HardDrive className="mb-2 h-5 w-5 text-sky-600" /><h2 className="font-black text-slate-900">ذخیره‌سازی داخلی</h2><p className="mt-1 text-[11px] leading-5 text-slate-500">فایل‌ها داخل پوشهٔ پروژه و فضای دیسک سرور ذخیره می‌شوند.</p>
      </button>
      <button type="button" onClick={() => setMode('blob')} className={`rounded-xl border p-3 text-right transition ${mode === 'blob' ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200' : 'border-slate-200 bg-white'}`}>
        <Cloud className="mb-2 h-5 w-5 text-violet-600" /><h2 className="font-black text-slate-900">ذخیره‌سازی ابری</h2><p className="mt-1 text-[11px] leading-5 text-slate-500">فایل‌ها در Vercel Blob ذخیره می‌شوند و از CDN ارائه خواهند شد.</p>
      </button>
    </div>
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-5 text-amber-900"><Database className="mb-1 inline h-4 w-4" /> تغییر این گزینه برای آپلودهای جدید اعمال می‌شود.</div>
    <button type="button" disabled={loading || saving} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}</button>
  </div>;
};

export default AdminStorageSettings;
