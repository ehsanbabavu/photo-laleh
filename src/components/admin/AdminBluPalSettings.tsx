import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Key,
  Globe,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  QrCode,
  Smartphone,
  Copy,
  Check,
  Zap,
  Info,
  Sliders,
  HelpCircle,
  Clock,
  Radio,
  Code,
  CheckCircle,
  FileText
} from 'lucide-react';
import { BluPalSettings } from '../../types';
import { apiClient } from '../../services/apiClient';

interface AdminBluPalSettingsProps {
  settings: BluPalSettings;
  onSaveSettings: (newSettings: BluPalSettings) => void;
}

export const AdminBluPalSettings: React.FC<AdminBluPalSettingsProps> = ({
  settings,
  onSaveSettings
}) => {
  const [token, setToken] = useState(settings?.blupalToken || '');
  const [baseUrl, setBaseUrl] = useState(settings?.blupalBaseUrl || 'https://blupal.top');
  const [merchantId, setMerchantId] = useState(settings?.blupalMerchantId || '');
  const [cardNumber, setCardNumber] = useState(settings?.blupalCardNumber || '6219 8619 4528 7193');
  const [accountHolder, setAccountHolder] = useState(settings?.blupalAccountHolder || 'آتلیه تخصصی لاله');
  const [iban, setIban] = useState(settings?.blupalIban || 'IR720560086190004528719301');
  const [enabled, setEnabled] = useState(settings?.blupalEnabled ?? true);
  const [sandboxMode, setSandboxMode] = useState(settings?.blupalSandboxMode ?? true);
  const [autoPollInterval, setAutoPollInterval] = useState(settings?.blupalAutoPollInterval || 3);
  const [webhookSecret, setWebhookSecret] = useState(settings?.blupalWebhookSecret || '');
  const [customWebhookUrl, setCustomWebhookUrl] = useState(settings?.blupalCustomWebhookUrl || '');
  const [customEndpoint, setCustomEndpoint] = useState(settings?.blupalCustomEndpoint || '/api/v1/invoices/create');

  const [showToken, setShowToken] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    invoiceUrl?: string;
    invoiceId?: string;
    details?: any;
  } | null>(null);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Derive system webhook URL
  const systemWebhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/blupal/webhook`
    : 'https://domain.com/api/blupal/webhook';

  const activeWebhookUrl = customWebhookUrl.trim() || systemWebhookUrl;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fetchWebhookLogs = async () => {
    setIsLoadingLogs(true);
    const logs = await apiClient.getBluPalWebhookLogs();
    setWebhookLogs(logs || []);
    setIsLoadingLogs(false);
  };

  useEffect(() => {
    fetchWebhookLogs();
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const res = await apiClient.testBluPalConnection(token, baseUrl, customEndpoint);
    setIsTesting(false);
    if (res) {
      setTestResult({
        success: Boolean(res.success),
        message: res.message || (res.success ? 'اتصال با موفقیت برقرار شد' : 'خطا در برقراری ارتباط'),
        invoiceUrl: res.invoiceUrl,
        invoiceId: res.invoiceId,
        details: res.details
      });
    } else {
      setTestResult({
        success: false,
        message: 'عدم پاسخ‌گویی از وب‌سرویس بلوپال'
      });
    }
  };

  const handleTriggerWebhookTest = async () => {
    setIsTestingWebhook(true);
    setWebhookTestResult(null);
    const res = await apiClient.testBluPalWebhook();
    setIsTestingWebhook(false);
    if (res && res.success) {
      setWebhookTestResult({
        success: true,
        message: res.message || 'وب‌هوک با موفقیت فراخوانی و وضعیت تسویه ثبت گردید ✅'
      });
      fetchWebhookLogs();
    } else {
      setWebhookTestResult({
        success: false,
        message: res?.message || 'خطا در اجرای وب‌هوک تستی'
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: BluPalSettings = {
      blupalToken: token.trim(),
      blupalBaseUrl: baseUrl.trim() || 'https://blupal.top',
      blupalMerchantId: merchantId.trim(),
      blupalCardNumber: cardNumber.trim(),
      blupalAccountHolder: accountHolder.trim(),
      blupalIban: iban.trim(),
      blupalEnabled: enabled,
      blupalSandboxMode: sandboxMode,
      blupalAutoPollInterval: Number(autoPollInterval) || 3,
      blupalWebhookSecret: webhookSecret.trim(),
      blupalCustomWebhookUrl: customWebhookUrl.trim(),
      blupalCustomEndpoint: customEndpoint.trim()
    };

    onSaveSettings(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-sky-500/20 flex-shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-black text-slate-900 leading-tight">
                  تنظیمات درگاه پرداخت بلوپال و وب‌هوک (BluPal)
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                  وب‌سرویس و وب‌هوک هوشمند
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                پیکربندی اتصال وب‌سرویس، آدرس وب‌هوک دریافت نتیجه تراکنش و تسویه خودکار فاکتورها
              </p>
            </div>
          </div>

          <a
            href="https://blupal.top/documentation"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 w-fit active:scale-95"
          >
            <span>مشاهده مستندات بلوپال</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* WEBHOOK URL HIGHLIGHT CARD (Crucial requirement from documentation) */}
      <div className="bg-gradient-to-l from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center border border-sky-400/30">
                <Radio className="w-4 h-4 animate-pulse text-sky-400" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-white">
                  آدرس وب‌هوک دریافت نتیجه پرداخت (Webhook Endpoint URL)
                </h2>
                <span className="text-[11px] text-sky-200">
                  این آدرس را در پنل پذیرنده بلوپال در بخش «تنظیمات وب‌هوک» وارد فرمایید:
                </span>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-400/30 w-fit">
              HTTP POST 200 OK
            </span>
          </div>

          {/* Webhook URL Input with Copy Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-800/90 border border-slate-700/90 rounded-2xl p-2.5">
            <div className="flex-1 px-3 py-1 font-mono text-xs text-sky-300 text-left dir-ltr break-all select-all font-bold">
              {activeWebhookUrl}
            </div>

            <button
              type="button"
              onClick={() => handleCopy(activeWebhookUrl, 'webhook_url')}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0 shadow-sm"
            >
              {copiedField === 'webhook_url' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-950" />
                  <span>کپی شد!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>کپی آدرس وب‌هوک</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300 pt-1">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>پشتیبانی از فرمت‌های JSON استاندارد بلوپال (invoice_id, status: paid, reference_id)</span>
            </div>

            <button
              type="button"
              onClick={handleTriggerWebhookTest}
              disabled={isTestingWebhook}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/10"
            >
              {isTestingWebhook ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>تست ارسال سیگنال وب‌هوک (شبیه‌ساز)</span>
            </button>
          </div>

          {webhookTestResult && (
            <div
              className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                webhookTestResult.success
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                  : 'bg-red-500/20 text-red-200 border border-red-500/40'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{webhookTestResult.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Settings Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8">
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-xs space-y-5">
            {/* Status Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">وضعیت درگاه بلوپال</span>
                  <span className="text-[11px] text-slate-500">فعال بودن درگاه در مرحله پرداخت کاربر</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    enabled ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      enabled ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 border-t sm:border-t-0 sm:border-r border-slate-200 pt-3 sm:pt-0 sm:pr-3.5">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 block">حالت آزمایشی (Sandbox)</span>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  </div>
                  <span className="text-[11px] text-slate-500">تست پرداخت آنی بدون نیاز به تراکنش واقعی</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSandboxMode(!sandboxMode)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    sandboxMode ? 'bg-amber-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      sandboxMode ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* API Token */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-sky-600" />
                  <span>کلید دسترسی وب‌سرویس / توکن API بلوپال</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="text-[11px] text-sky-600 hover:text-sky-700 font-bold cursor-pointer"
                >
                  {showToken ? 'مخفی‌سازی' : 'نمایش توکن'}
                </button>
              </div>
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="مثال: blupal_live_sec_98410294819481..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono text-xs focus:bg-white focus:outline-none focus:border-sky-500 text-left dir-ltr"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                توکن اختصاصی دریافت شده از پنل مدیریت حساب خود در وب‌سایت بلوپال
              </p>
            </div>

            {/* Base URL & Custom Endpoint & Webhook Secret */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  آدرس وب‌سرویس (Base URL)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://blupal.top"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-slate-900 font-mono text-xs focus:bg-white focus:outline-none focus:border-sky-500 text-left dir-ltr"
                  />
                  <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  مسیر endpoint ایجاد فاکتور
                </label>
                <input
                  type="text"
                  value={customEndpoint}
                  onChange={(e) => setCustomEndpoint(e.target.value)}
                  placeholder="مثال: /api/v1/invoice"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono text-xs focus:bg-white focus:outline-none focus:border-sky-500 text-left dir-ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  سکرت وب‌هوک (Secret)
                </label>
                <input
                  type="text"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="اختیاری - اعتبارسنجی"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono text-xs focus:bg-white focus:outline-none focus:border-sky-500 text-left dir-ltr"
                />
              </div>
            </div>

            {/* Card & Account Details */}
            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>اطلاعات حساب مقصد (بلوبانک / واریز کارت به کارت)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    شماره ۱۶ رقمی کارت بلوبانک پذیرنده
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="6219 8619 ...."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono text-xs font-bold focus:bg-white focus:outline-none focus:border-sky-500 text-center tracking-widest dir-ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    نام و نام خانوادگی صاحب حساب
                  </label>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="آتلیه تخصصی لاله"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-sky-500 font-medium"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    شماره شبا (IBAN) با پیشوند IR
                  </label>
                  <input
                    type="text"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    placeholder="IR720560086190004528719301"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono text-xs focus:bg-white focus:outline-none focus:border-sky-500 text-left dir-ltr"
                  />
                </div>
              </div>
            </div>

            {/* Auto Poll Interval */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold text-slate-800 block">
                  فاصله استعلام خودکار وضعیت پرداخت (Polling Interval)
                </label>
                <span className="text-[11px] text-slate-500">
                  در صورت تاخیر وب‌هوک، وضعیت فاکتور هر چند ثانیه در مرورگر کاربر استعلام شود
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={autoPollInterval}
                  onChange={(e) => setAutoPollInterval(Number(e.target.value))}
                  className="w-16 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-center font-mono font-bold text-xs"
                />
                <span className="text-xs text-slate-600 font-medium">ثانیه</span>
              </div>
            </div>

            {/* Test Connection Button & Result */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white active:scale-95 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  {isTesting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                  )}
                  <span>تست صدور فاکتور واقعی در وب‌سرویس بلوپال</span>
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-3.5 rounded-2xl text-xs space-y-2 font-medium ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                      : 'bg-rose-50 text-rose-900 border border-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>

                  {testResult.invoiceUrl && (
                    <div className="pt-2 border-t border-emerald-200/80 flex items-center justify-between text-[11px]">
                      <span>لینک پرداخت فاکتور تستی دریافتی از بلوپال:</span>
                      <a
                        href={testResult.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 transition-all"
                      >
                        <span>مشاهده درگاه بلوپال</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {testResult.details && (
                    <details className="pt-2 border-t border-slate-200/60 text-[10px]">
                      <summary className="cursor-pointer font-bold text-slate-700 hover:underline">
                        مشاهده پاسخ خامی که سرور بلوپال برگردانده (JSON Response)
                      </summary>
                      <pre className="mt-2 p-2 rounded-xl bg-slate-900 text-sky-300 font-mono text-[10px] overflow-x-auto text-left dir-ltr">
                        {JSON.stringify(testResult.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>

            {/* Save Buttons */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              {saveSuccess ? (
                <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تنظیمات درگاه بلوپال با موفقیت ذخیره شد!</span>
                </div>
              ) : (
                <div />
              )}

              <button
                type="submit"
                className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl transition-all shadow-md shadow-sky-500/20 cursor-pointer flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>ذخیره تنظیمات بلوپال</span>
              </button>
            </div>
          </form>
        </div>

        {/* Documentation & Live Webhook Logs (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Live Webhook Logs Card */}
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-black text-xs sm:text-sm">
                <Radio className="w-4 h-4 text-emerald-600" />
                <span>لاگ رویدادهای وب‌هوک</span>
              </div>
              <button
                type="button"
                onClick={fetchWebhookLogs}
                disabled={isLoadingLogs}
                className="text-[11px] text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1 cursor-pointer"
                title="به‌روزرسانی لاگ‌ها"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                <span>تازه‌سازی</span>
              </button>
            </div>

            {webhookLogs.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400">
                هنوز هیچ درخواست وب‌هوکی ثبت نشده است. با دکمه «تست وب‌هوک» می‌توانید یک رویداد شبیه‌سازی کنید.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {webhookLogs.slice(0, 5).map((log: any) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1 hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-800 text-[10px]">
                        {log.invoiceId}
                      </span>
                      <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                        {log.status === 'paid' ? 'پرداخت تایید شد ✅' : log.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 text-[10px]">
                      <span>کد مرجع: {log.referenceCode}</span>
                      <span>{log.receivedAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Webhook JSON Spec Card */}
          <div className="bg-slate-900 text-white rounded-2xl sm:rounded-3xl p-5 shadow-md space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="font-mono flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-sky-400" />
                <span>نمونه پلود وب‌هوک (JSON)</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">POST</span>
            </div>

            <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono text-sky-300 overflow-x-auto dir-ltr text-left leading-relaxed">
{`{
  "invoice_id": "BLU-849204",
  "status": "paid",
  "amount": 1250000,
  "reference_id": "BLU-94829104",
  "paid_at": "1405-01-14 12:30"
}`}
            </pre>

            <p className="text-[10px] text-slate-400 leading-relaxed">
              سرور شما به صورت خودکار با دریافت این داده، فاکتور و سفارش مشتری را تسویه کرده و به حالت آماده پردازش تغییر می‌دهد.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
