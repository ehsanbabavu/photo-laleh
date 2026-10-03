import React, { useState } from 'react';
import { Send, CheckCircle2, Key, MessageSquare, AlertCircle } from 'lucide-react';

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(botToken.trim(), adminChatId.trim(), enabled);
    showToast('تنظیمات ربات تلگرام با موفقیت ذخیره شد.');
  };

  const handleTestSend = async () => {
    if (!botToken.trim() || !adminChatId.trim()) {
      showToast('لطفا ابتدا توکن ربات و Chat ID را وارد نمایید.');
      return;
    }
    setIsTesting(true);
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken.trim()}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId.trim(),
          text: '🤖 تست اتصال ربات تلگرام آتلیه دیجیتال لاله با موفقیت برقرار شد!\n\nسفارشات جدید و وضعیت‌های هوش مصنوعی به این کانال/چت ارسال خواهند شد.'
        })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('پیام تست با موفقیت به تلگرام ارسال شد!');
      } else {
        showToast(`خطای تلگرام: ${data.description || 'اطلاعات نادرست'}`);
      }
    } catch (err) {
      console.error(err);
      showToast('خطا در ارسال درخواست به سرور تلگرام.');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 shadow-xs">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">اتصال به ربات تلگرام (Telegram Bot)</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              مدیریت هوشمند سفارشات، دریافت فوری گزارش‌های ثبت سفارش و وضعیت هوش مصنوعی در کانال یا گروه تلگرامی شما.
            </p>
          </div>
        </div>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="space-y-4">
          {/* Active Switch */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="space-y-0.5">
              <span className="text-xs sm:text-sm font-bold text-slate-900 block">فعال‌سازی اطلاع‌رسانی تلگرام</span>
              <p className="text-[11px] text-slate-500">ارسال خودکار پیام به محض ثبت یا تکمیل سفارشات</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600" />
            </label>
          </div>

          {/* Bot Token */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-sky-600" />
              <span>توکن ربات تلگرام (Bot Token از طریق BotFather)</span>
            </label>
            <input
              type="text"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="مثال: 583920194:AAH9bK2... (توسط @BotFather دریافت کنید)"
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          {/* Chat ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
              <span>شناسه چت یا کانال (Chat ID یا @ChannelUsername)</span>
            </label>
            <input
              type="text"
              value={adminChatId}
              onChange={(e) => setAdminChatId(e.target.value)}
              placeholder="مثال: @laleh_studio_orders یا -1001849201"
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>
        </div>

        {/* Guide Box */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>راهنمای سریع اتصال ربات:</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            ۱. در تلگرام به ربات <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="underline font-bold">@BotFather</a> مراجعه کرده و با دستور <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">/newbot</code> یک ربات جدید بسازید.<br/>
            ۲. توکن (API Token) دریافتی را در کادر بالا وارد کنید.<br/>
            ۳. ربات را به کانال یا گروه مدیریتی خود اضافه کرده و دسترسی ارسال پیام (Admin) به آن بدهید.<br/>
            ۴. شناسه چت یا نام کاربری کانال (مثلاً <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">@my_channel</code>) را وارد کرده و دکمه تست اتصال را بزنید.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleTestSend}
            disabled={isTesting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isTesting ? (
              <span className="w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>ارسال پیام تست به تلگرام</span>
          </button>

          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>ذخیره تنظیمات ربات</span>
          </button>
        </div>
      </form>
    </div>
  );
};
