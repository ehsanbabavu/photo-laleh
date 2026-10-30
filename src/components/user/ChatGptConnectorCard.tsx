import React, { useState } from 'react';
import { Download, Copy, Check, Loader2, AlertCircle, ChevronDown, ShieldCheck } from 'lucide-react';
import { ChatGptIcon } from '../BrandIcons';

interface ChatGptConnectorCardProps {
  showToast?: (msg: string) => void;
}

/**
 * Collapsible card for the ChatGPT connector (MCP endpoint).
 * The ZIP returned by `/api/chatgpt-connector` contains the MCP address,
 * every tool schema and the step-by-step setup guide.
 */
export const ChatGptConnectorCard: React.FC<ChatGptConnectorCardProps> = ({ showToast }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mcpUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/api/mcp` : '/api/mcp';

  const handleDownload = async () => {
    setError(null);
    setIsDownloading(true);
    try {
      const res = await fetch('/api/chatgpt-connector');
      if (!res.ok) throw new Error('download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'laleh-chatgpt-connector.zip';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast?.('بسته افزونه ChatGPT دانلود شد.');
    } catch {
      setError('دانلود بسته افزونه ناموفق بود.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mcpUrl);
      setCopied(true);
      showToast?.('آدرس کانکتور کپی شد.');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('کپی آدرس ناموفق بود.');
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
      {/* Header — click to expand downward */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-3 p-4 sm:p-5 text-right cursor-pointer hover:bg-slate-50/70 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
          <ChatGptIcon className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xs sm:text-sm font-black text-slate-900">افزونه چت‌جی‌پی‌تی</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">اتصال گفتگو به قیمت‌ها و سفارش‌های آتلیه</p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Collapsible body */}
      <div
        className={`grid transition-all duration-300 ease-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3">
            <p className="text-[11px] text-slate-500 leading-6">
              بسته ZIP کانکتور رسمی آتلیه لاله برای ChatGPT: راهنمای نصب، فایل تنظیمات و شمای
              ابزارها (قیمت خدمات و سایزها، برآورد قیمت سفارش و پیگیری وضعیت).
            </p>

            <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-2.5 py-2">
              <code className="text-[10px] text-slate-600 font-mono truncate flex-1" dir="ltr">
                {mcpUrl}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-slate-900 flex-shrink-0 cursor-pointer"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copied ? 'کپی شد' : 'کپی'}</span>
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-[10px] text-rose-700">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>دانلود بسته افزونه (ZIP)</span>
            </button>

            <p className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              دسترسی فقط خواندنی؛ پیگیری سفارش با کد رهگیری و ۴ رقم آخر موبایل
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
