import React, { useState } from 'react';
import { Send, CheckCircle2, Key, MessageSquare, RefreshCw, AlertCircle, Zap } from 'lucide-react';

interface AdminTelegramBotProps {
  token: string;
  chatId: string;
  isEnabled: boolean;
  onSave: (token: string, chatId: string, isEnabled: boolean) => void;
  showToast: (msg: string) => void;
}

export const AdminTelegramBot: React.FC<AdminTelegramBotProps> = ({
  token,
  chatId,
  isEnabled,
  onSave,
  showToast
}) => {
  const [botToken, setBotToken] = useState(token);
  const [adminChatId, setAdminChatId] = useState(chatId);
  const [enabled, setEnabled] = useState(isEnabled);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTest = async () => {
    setTestResult(null);
    if (!botToken.trim() || !adminChatId.trim()) {
      setTestResult({ success: false, message: 'توکن ربات و شناسه چت الزامی است' });
      return;
    }
    setIsTesting(true);
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: botToken.trim(), chatId: adminChatId.trim() })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setTestResult({ success: true, message: 'پیام تست ارسال شد' });
      } else {
        setTestResult({ success: false, message: data?.error || 'تست اتصال ناموفق بود' });
      }
    } catch {
      setTestResult({ success: false, message: 'خطا در تست اتصال' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(botToken.trim(), adminChatId.trim(), enabled);
    showToast('تنظیمات ربات تلگرام ذخیره شد.');
  };

  return (
    <div className="w-full max-w-2xl lg:max-w-none mx-auto">
      <form
        onSubmit={handleSave}
        className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 flex-shrink-0">
            <Send className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-black text-slate-900">اتصال به ربات تلگرام</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className="space-y-1.5 lg:col-span-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
              <span>توکن ربات</span>
            </label>
            <input
              type="text"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              dir="ltr"
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
              <span>شناسه چت</span>
            </label>
            <input
              type="text"
              value={adminChatId}
              onChange={(e) => setAdminChatId(e.target.value)}
              dir="ltr"
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 font-mono"
            />
          </div>

          <div className="flex items-center justify-between gap-3 h-full min-h-[46px] px-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-bold text-slate-900">فعال‌سازی ربات</span>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600" />
            </label>
          </div>
        </div>

        {testResult && (
          <div
            className={`flex items-center gap-2 p-2.5 rounded-xl border ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-rose-50 border-rose-200'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <p className={`text-[11px] ${testResult.success ? 'text-emerald-700' : 'text-rose-700'}`}>
              {testResult.message}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 lg:max-w-md">
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 hover:bg-sky-100 disabled:opacity-60 text-xs font-bold transition-colors cursor-pointer w-full"
          >
            {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            <span>تست اتصال</span>
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer w-full"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>ذخیره</span>
          </button>
        </div>
      </form>
    </div>
  );
};
