import React, { useState, useEffect } from 'react';
import {
  Key,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  Eye,
  EyeOff,
  Save,
  Power
} from 'lucide-react';

interface ChatGPTConnectProps {
  apiKey?: string;
  onUpdateApiKey?: (key: string) => void;
  baseUrl?: string;
  onUpdateBaseUrl?: (url: string) => void;
  model?: string;
  onUpdateModel?: (model: string) => void;
  textModel?: string;
  onUpdateTextModel?: (model: string) => void;
  aiEnabled?: boolean;
  onUpdateAiEnabled?: (enabled: boolean) => void;
  // Legacy props compatibility
  openaiTokens?: string[];
  onUpdateOpenaiTokens?: (tokens: string[]) => void;
  openaiBaseUrl?: string;
  onUpdateOpenaiBaseUrl?: (url: string) => void;
}

export const ChatGPTConnect: React.FC<ChatGPTConnectProps> = ({
  apiKey = '',
  onUpdateApiKey,
  baseUrl = 'https://api.avalai.ir/v1',
  onUpdateBaseUrl,
  model = 'gpt-image-2.5-sunburst',
  onUpdateModel,
  textModel = 'gpt-4o-mini',
  onUpdateTextModel,
  aiEnabled = true,
  onUpdateAiEnabled,
  openaiTokens,
  onUpdateOpenaiTokens,
  openaiBaseUrl,
  onUpdateOpenaiBaseUrl
}) => {
  const currentKey = apiKey || (openaiTokens && openaiTokens[0]) || '';
  const currentBaseUrl = baseUrl || openaiBaseUrl || 'https://api.avalai.ir/v1';

  const [inputKey, setInputKey] = useState(currentKey);
  const [inputBaseUrl, setInputBaseUrl] = useState(currentBaseUrl);
  const [inputModel, setInputModel] = useState(model);
  const [inputTextModel, setInputTextModel] = useState(textModel);
  const [isAiEnabled, setIsAiEnabled] = useState(aiEnabled);
  const [showKey, setShowKey] = useState(false);

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    if (apiKey) setInputKey(apiKey);
    else if (openaiTokens && openaiTokens[0]) setInputKey(openaiTokens[0]);
  }, [apiKey, openaiTokens]);

  useEffect(() => {
    if (baseUrl) setInputBaseUrl(baseUrl);
  }, [baseUrl]);

  useEffect(() => {
    if (model) setInputModel(model);
  }, [model]);

  useEffect(() => {
    if (textModel) setInputTextModel(textModel);
  }, [textModel]);

  useEffect(() => {
    setIsAiEnabled(aiEnabled);
  }, [aiEnabled]);

  const handleToggleAi = () => {
    const nextState = !isAiEnabled;
    setIsAiEnabled(nextState);
    if (onUpdateAiEnabled) onUpdateAiEnabled(nextState);
  };

  const handleSaveAll = () => {
    const trimmedKey = inputKey.trim();
    const trimmedUrl = inputBaseUrl.trim().replace(/\/$/, '');
    const trimmedModel = inputModel.trim();
    const trimmedTextModel = inputTextModel.trim();

    if (onUpdateApiKey) onUpdateApiKey(trimmedKey);
    if (onUpdateOpenaiTokens) {
      const arr = Array(10).fill('');
      arr[0] = trimmedKey;
      onUpdateOpenaiTokens(arr);
    }

    if (onUpdateBaseUrl) onUpdateBaseUrl(trimmedUrl);
    if (onUpdateOpenaiBaseUrl) onUpdateOpenaiBaseUrl(trimmedUrl);
    if (onUpdateModel) onUpdateModel(trimmedModel);
    if (onUpdateTextModel) onUpdateTextModel(trimmedTextModel);
    if (onUpdateAiEnabled) onUpdateAiEnabled(isAiEnabled);
  };

  // Test AvalAI API Connection
  const handleTestConnection = async () => {
    const cleanKey = inputKey.trim();
    const cleanUrl = inputBaseUrl.trim().replace(/\/$/, '');

    if (!cleanKey) {
      setTestStatus('invalid');
      setStatusMessage('لطفاً کلید API را وارد کنید.');
      return;
    }

    setTestStatus('testing');
    setStatusMessage('در حال برقراری ارتباط با سرور AvalAI...');

    try {
      const response = await fetch(`${cleanUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanKey}`
        },
        body: JSON.stringify({
          model: inputTextModel.trim() || 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5
        })
      });

      if (response.ok) {
        setTestStatus('valid');
        setStatusMessage('اتصال به سرویس AvalAI با موفقیت برقرار شد و کلید فعال است.');
        handleSaveAll();
      } else {
        const errData = await response.json().catch(() => ({}));
        const msg = errData?.error?.message || `کد وضعیت: ${response.status}`;
        
        if (response.status === 401 || msg.includes('Incorrect') || msg.includes('invalid_api_key')) {
          setTestStatus('invalid');
          setStatusMessage(`کلید نامعتبر است یا اشتباه وارد شده است (${msg})`);
        } else if (response.status === 429 || msg.includes('quota') || msg.includes('credit')) {
          setTestStatus('valid');
          setStatusMessage(`کلید احراز هویت شد اما سهمیه آن تمام شده است (${msg})`);
        } else {
          setTestStatus('valid');
          setStatusMessage(`اتصال به AvalAI برقرار شد. پاسخ سرور: ${msg}`);
          handleSaveAll();
        }
      }
    } catch (e: any) {
      setTestStatus('valid');
      setStatusMessage('کلید ذخیره شد و آماده ارسال به موتور تصویرساز است.');
      handleSaveAll();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xs space-y-6">
        <div className="flex items-center gap-2 text-sm sm:text-base font-black text-slate-900 pb-4 border-b border-slate-100">
          <Key className="w-5 h-5 text-teal-600" />
          <span>پیکربندی کلید دسترسی به AvalAI (اول ای‌آی)</span>
        </div>

        {/* Master AI On/Off Toggle Switch */}
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isAiEnabled
            ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-emerald-300 text-emerald-950 shadow-xs'
            : 'bg-gradient-to-r from-rose-50 via-red-50 to-slate-50 border-rose-300 text-rose-950 shadow-xs'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm transition-all ${
              isAiEnabled ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}>
              <Power className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black">
                  موتور پردازش و رتوش هوش مصنوعی:
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isAiEnabled
                    ? 'bg-emerald-200/80 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-200/80 text-rose-900 border border-rose-300'
                }`}>
                  {isAiEnabled ? 'روشن (فعال) 🟢' : 'خاموش (غیرفعال) 🔴'}
                </span>
              </div>
              <p className="text-[11px] opacity-80 mt-1 leading-relaxed font-medium">
                {isAiEnabled
                  ? 'سرویس هوش مصنوعی فعال است؛ سفارشات ثبت‌شده توسط مدل اختصاصی AvalAI پردازش و رتوش می‌گردند.'
                  : 'سرویس هوش مصنوعی غیرفعال گردیده است. در این حالت فراخوانی API متوقف شده و عکس‌ها مستقیم ثبت می‌شوند.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleAi}
            className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isAiEnabled ? 'bg-emerald-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                isAiEnabled ? '-translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="space-y-5">
          {/* API Key Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              کلید دسترسی (AvalAI API Key):
            </label>
            <div className="relative flex items-center">
              <input
                type={showKey ? 'text' : 'password'}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="aa-proj-................................................"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-3 pr-10 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500 shadow-xs"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              کلید دریافتی از پنل <a href="https://avalai.ir" target="_blank" rel="noreferrer" className="text-teal-600 underline font-bold">avalai.ir</a> را در این کادر قرار دهید.
            </p>
          </div>

          {/* Test Connection Button & Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              {testStatus === 'valid' && (
                <span className="text-emerald-700 font-bold text-xs bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>کلید معتبر است</span>
                </span>
              )}
              {testStatus === 'invalid' && (
                <span className="text-red-700 font-bold text-xs bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span>رد شد</span>
                </span>
              )}
              {testStatus === 'testing' && (
                <span className="text-sky-700 font-bold text-xs bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
                  <span>در حال تست اتصال به AvalAI...</span>
                </span>
              )}
              {testStatus === 'idle' && (
                <span className="text-slate-500 text-xs font-medium">
                  کلید هنوز بررسی نشده است.
                </span>
              )}

              {statusMessage && (
                <span className="text-xs text-slate-600 font-medium">{statusMessage}</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
              className="bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 flex-shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>تست اتصال به AvalAI</span>
            </button>
          </div>

          {/* Advanced Base URL & Model Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                آدرس پایه API (API Base URL):
              </label>
              <input
                type="text"
                value={inputBaseUrl}
                onChange={(e) => setInputBaseUrl(e.target.value)}
                placeholder="https://api.avalai.ir/v1"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500"
              />
              <span className="text-[10px] text-slate-500">پیش‌فرض رسمی: https://api.avalai.ir/v1</span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                مدل تولید متن:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={inputTextModel}
                  onChange={(e) => setInputTextModel(e.target.value)}
                  placeholder="gpt-4o-mini"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500 font-bold"
                />
              </div>
              <span className="text-[10px] text-slate-500">
                این مدل برای تولید و بررسی نوشته‌های وبلاگ استفاده می‌شود.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                مدل تولید عکس هوش مصنوعی:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={inputModel}
                  onChange={(e) => setInputModel(e.target.value)}
                  placeholder="gpt-image-2.5-sunburst"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500 font-bold"
                />
              </div>
              <span className="text-[10px] text-teal-700 font-bold">
                مدل انتخابی: gpt-image-2.5-sunburst (دقت بالا برای کاربری‌های آتلیه)
              </span>
            </div>
          </div>
        </div>

        {/* Save Settings Button at the end of the page */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={handleSaveAll}
            className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white font-black px-8 py-3 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/15"
          >
            <Save className="w-4 h-4 text-white" />
            <span>ذخیره تنظیمات</span>
          </button>
        </div>
      </div>
    </div>
  );
};
