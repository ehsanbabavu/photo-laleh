import React, { useEffect, useState } from 'react';
import { MessageSquare, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface AdminSmsSettingsProps {
  showToast: (msg: string) => void;
}

export const AdminSmsSettings: React.FC<AdminSmsSettingsProps> = ({ showToast }) => {
  const [token, setToken] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (active && data?.smsApiToken) setToken(data.smsApiToken);
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smsApiToken: token.trim() })
      });
      if (!res.ok) throw new Error('save failed');
      setSuccess('ذخیره شد.');
      showToast('توکن پیامک ذخیره شد.');
    } catch {
      setError('ذخیره ناموفق بود.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-2xl lg:max-w-none mx-auto">
      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <h2 className="text-sm font-black text-slate-900">تنظیمات پیامک</h2>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">توکن پیامک</label>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            dir="ltr"
            className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 font-mono"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <p className="text-[11px] text-rose-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="text-[11px] text-emerald-700">{success}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>ذخیره</span>
        </button>
      </form>
    </div>
  );
};
