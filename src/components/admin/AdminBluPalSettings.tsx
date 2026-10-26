import React, { useState } from 'react';
import {
  CreditCard,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  ExternalLink,
  ShieldCheck,
  User,
  Building2
} from 'lucide-react';
import { BluPalSettings } from '../../types';
import { apiClient } from '../../services/apiClient';

interface AdminBluPalSettingsProps {
  settings: BluPalSettings;
  onSaveSettings: (newSettings: BluPalSettings) => void;
}

export const AdminBluPalSettings: React.FC<AdminBluPalSettingsProps> = ({ settings, onSaveSettings }) => {
  const [token, setToken] = useState(settings?.blupalToken || '');
  const [cardNumber, setCardNumber] = useState(settings?.blupalCardNumber || '');
  const [accountHolder, setAccountHolder] = useState(settings?.blupalAccountHolder || '');
  const [iban, setIban] = useState(settings?.blupalIban || '');
  const [enabled, setEnabled] = useState(settings?.blupalEnabled ?? true);
  const [sandboxMode, setSandboxMode] = useState(settings?.blupalSandboxMode ?? true);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    invoiceUrl?: string;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await apiClient.testBluPalConnection(
      token,
      settings?.blupalBaseUrl || 'https://blupal.top',
      settings?.blupalCustomEndpoint || '/api/v1/invoices/create'
    );
    setIsTesting(false);
    setTestResult(
      res
        ? {
            success: Boolean(res.success),
            message: res.message || (res.success ? 'اتصال برقرار شد' : 'خطا در برقراری ارتباط'),
            invoiceUrl: res.invoiceUrl
          }
        : { success: false, message: 'عدم پاسخ‌گویی از وب‌سرویس بلوپال' }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      blupalToken: token.trim(),
      blupalCardNumber: cardNumber.trim(),
      blupalAccountHolder: accountHolder.trim(),
      blupalIban: iban.trim(),
      blupalEnabled: enabled,
      blupalSandboxMode: sandboxMode
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-sky-600 flex-shrink-0" />
          <h2 className="text-sm font-black text-slate-900">تنظیمات بلوپال</h2>
        </div>

        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-xs font-bold text-slate-900">وضعیت درگاه بلوپال</span>
          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-xs font-bold text-slate-900">حالت آزمایشی (Sandbox)</span>
          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={sandboxMode}
              onChange={(e) => setSandboxMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
          </label>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
            <span>کلید دسترسی وب‌سرویس / توکن API بلوپال</span>
          </label>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            dir="ltr"
            className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
            <span>شماره کارت (۱۶ رقم)</span>
          </label>
          <input
            type="text"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            dir="ltr"
            inputMode="numeric"
            className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
            <span>نام و نام خانوادگی صاحب حساب</span>
          </label>
          <input
            type="text"
            value={accountHolder}
            onChange={(e) => setAccountHolder(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
            <span>شماره شبا (IBAN)</span>
          </label>
          <input
            type="text"
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            dir="ltr"
            className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 font-mono"
          />
        </div>

        <button
          type="button"
          onClick={handleTestConnection}
          disabled={isTesting}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
        >
          {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          <span>ثبت صدور فاکتور واقعی در وب‌سرویس بلوپال</span>
        </button>

        {testResult && (
          <div
            className={`p-3 rounded-xl border text-[11px] ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold">
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="break-all">{testResult.message}</span>
            </div>
            {testResult.invoiceUrl && (
              <a
                href={testResult.invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 font-bold underline"
              >
                <span>مشاهده درگاه</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          {saveSuccess ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 font-bold text-[11px]">
              <ShieldCheck className="w-4 h-4" />
              ذخیره شد
            </span>
          ) : (
            <span />
          )}
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>ذخیره تنظیمات بلوپال</span>
          </button>
        </div>
      </form>
    </div>
  );
};
