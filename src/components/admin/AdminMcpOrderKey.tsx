import React, { useEffect, useState } from 'react';
import { KeyRound, RefreshCw, Copy, Check, ShieldAlert, Loader2 } from 'lucide-react';

/**
 * Order key for the ChatGPT connector: `create_order` / `create_payment_link`
 * refuse to run without it (sent as the `x-mcp-key` header by ChatGPT).
 */
export const AdminMcpOrderKey: React.FC<{ showToast?: (msg: string) => void }> = ({ showToast }) => {
  const [key, setKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json().catch(() => null);
        if (active && data?.mcpOrderKey) setKey(String(data.mcpOrderKey));
      } catch {
        /* ignore */
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const generate = async () => {
    setIsSaving(true);
    try {
      const random = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mcpOrderKey: random })
      });
      if (!res.ok) throw new Error('save failed');
      setKey(random);
      showToast?.('کلید ثبت سفارش ساخته شد.');
    } catch {
      showToast?.('ساخت کلید ناموفق بود.');
    } finally {
      setIsSaving(false);
    }
  };

  const copy = async () => {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      showToast?.('کلید کپی شد.');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast?.('کپی ناموفق بود.');
    }
  };

  const mcpUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/mcp` : '/api/mcp';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center flex-shrink-0">
          <KeyRound className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-black text-slate-900">کلید ثبت سفارش افزونه</h2>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-6">
            ابزارهای <span className="font-mono">create_order</span> و{' '}
            <span className="font-mono">create_payment_link</span> فقط با این کلید کار می‌کنند تا کسی
            نتواند از بیرون برای آتلیه سفارش جعلی ثبت کند.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> در حال خواندن…
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-2.5 py-2">
            <code className="text-[10px] font-mono text-slate-700 truncate flex-1" dir="ltr">
              {key || '— هنوز ساخته نشده —'}
            </code>
            <button
              type="button"
              onClick={copy}
              disabled={!key}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-slate-900 disabled:opacity-40 cursor-pointer flex-shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'کپی شد' : 'کپی'}</span>
            </button>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1.5 text-[10px] text-slate-600 leading-6">
            <p className="font-bold text-slate-800">تنظیم در کانکتور ChatGPT</p>
            <p>در بخش Headers کانکتور این هدر را اضافه کن:</p>
            <code className="block font-mono text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1" dir="ltr">
              x-mcp-key: {key || '<کلید>'}
            </code>
            <p className="pt-1">آدرس MCP:</p>
            <code className="block font-mono text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1" dir="ltr">
              {mcpUrl}
            </code>
          </div>

          <div className="flex items-start gap-2 text-[10px] text-amber-700">
            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>این کلید را عمومی نکن؛ هر کسی آن را داشته باشد می‌تواند سفارش ثبت کند.</span>
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={isSaving}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>{key ? 'ساخت کلید جدید (کلید قبلی باطل می‌شود)' : 'ساخت کلید'}</span>
          </button>
        </>
      )}
    </div>
  );
};
