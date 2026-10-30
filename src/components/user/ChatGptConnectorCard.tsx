import React, { useState } from 'react';
import { Bot, Download, Copy, Check, Loader2, AlertCircle } from 'lucide-react';

interface ChatGptConnectorCardProps {
  showToast?: (msg: string) => void;
}

/**
 * Download card for the ChatGPT connector (MCP endpoint).
 * The file returned by `/api/chatgpt-connector` contains the MCP address,
 * every tool schema and the step-by-step setup guide for ChatGPT.
 */
export const ChatGptConnectorCard: React.FC<ChatGptConnectorCardProps> = ({ showToast }) => {
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
      link.download = 'laleh-chatgpt-connector.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast?.('فایل اتصال ChatGPT دانلود شد.');
    } catch {
      setError('دانلود فایل اتصال ناموفق بود.');
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
    <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xs sm:text-sm font-black text-slate-900">افزونه چت‌جی‌پی‌تی</h3>
          <p className="text-[11px] text-slate-500 mt-1 leading-6">
            کانکتور رسمی آتلیه لاله برای ChatGPT: گرفتن قیمت خدمات و سایزها، برآورد قیمت سفارش و
            پیگیری وضعیت سفارش با کد رهگیری.
          </p>

          <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-2.5 py-2">
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
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-rose-700">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>دانلود فایل اتصال</span>
          </button>
        </div>
      </div>
    </div>
  );
};
