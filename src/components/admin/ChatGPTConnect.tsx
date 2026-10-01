import React, { useState } from 'react';
import {
  BotMessageSquare,
  Key,
  Send,
  RefreshCw,
  Cpu,
  Sliders,
  Terminal,
  Zap,
  Copy,
  Check
} from 'lucide-react';
import { ApiConnection } from '../../types';

interface ChatGPTConnectProps {
  chatGptApi: ApiConnection;
  onUpdateApi: (updated: ApiConnection) => void;
}

export const ChatGPTConnect: React.FC<ChatGPTConnectProps> = ({ chatGptApi, onUpdateApi }) => {
  const [apiKey, setApiKey] = useState(chatGptApi.apiKey);
  const [model, setModel] = useState(chatGptApi.model);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [systemPrompt, setSystemPrompt] = useState(
    'شما دستیار هوشمند و متخصص استودیو چاپ و ترمیم عکس «آتلیه دیجیتال لاله» هستید. وظیفه شما راهنمایی در مورد استانداردهای چاپ عکس پرسنلی، فرمول‌های بازسازی تصاویر سیاه و سفید، پیشنهادات سایز شاسی و روتوش پوست است.'
  );

  // Prompt tester state
  const [testPrompt, setTestPrompt] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Chat conversation in sandbox
  const [chatLog, setChatLog] = useState<Array<{ role: 'user' | 'assistant'; text: string; time: string }>>([
    {
      role: 'assistant',
      text: 'درود احسان عزیز! ارتباط با سرویس OpenAI ChatGPT برقرار است. من آماده تحلیل کیفیت عکس‌ها، تنظیم دستورات ترمیم رنگ و پاسخگویی به استانداردهای چاپ در آتلیه دیجیتال لاله هستم.',
      time: '۱۰:۱۴'
    }
  ]);

  const presetPrompts = [
    'بهترین رزولوشن برای چاپ شاسی ۳۰ در ۴۰ چیست؟',
    'چطور پس‌زمینه عکس پرسنلی را بدون هاله مو به سفید تبدیل کنیم؟',
    'نکات نگهداری عکس‌های ترمیم شده روی کاغذ سیلک مات چیست؟'
  ];

  const handleSaveSettings = () => {
    onUpdateApi({
      ...chatGptApi,
      apiKey,
      model,
      status: 'connected',
      lastPing: 'هم‌اکنون'
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleTestPrompt = () => {
    if (!testPrompt.trim() || isTesting) return;

    const userText = testPrompt.trim();
    const timeNow = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    
    setChatLog(prev => [...prev, { role: 'user', text: userText, time: timeNow }]);
    setTestPrompt('');
    setIsTesting(true);

    setTimeout(() => {
      let reply = '';
      if (userText.includes('رزولوشن') || userText.includes('۳۰ در ۴۰')) {
        reply = 'برای چاپ باکیفیت روی شاسی ۳۰×۴۰ سانتی‌متر، حداقل رزولوشن ۳۰۰ DPI (معادل ۳۵۴۳×۴۷۲۴ پیکسل) با فرمت RGB توصیه می‌شود. کاغذ سیلک مات فینیش طبیعی و بدون انعکاس نور ارائه می‌دهد.';
      } else if (userText.includes('پرسنلی') || userText.includes('پس‌زمینه')) {
        reply = 'برای عکس پرسنلی گذرنامه و مدارک اداری: زمینه باید سفید یکدست (#FFFFFF) با روشنایی یکنواخت باشد. در RMBG تار موها حفظ شده و سایه زیر چانه ملایم می‌شود.';
      } else {
        reply = `پاسخ از مدل ${model}: دستور با موفقیت پردازش شد. در آتلیه دیجیتال لاله، تمام مراحل روتوش چهره با حفظ بافت اصیل پوست (Skin Texture) انجام می‌گیرد.`;
      }

      setChatLog(prev => [...prev, { role: 'assistant', text: reply, time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) }]);
      setIsTesting(false);
    }, 1000);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600 rounded-2xl sm:rounded-3xl p-4 sm:p-7 relative overflow-hidden shadow-lg shadow-sky-600/15 text-white">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 border border-white/20 text-white flex items-center justify-center flex-shrink-0 backdrop-blur-xs">
              <BotMessageSquare className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl lg:text-2xl font-black text-white">اتصال به چت جی پی تی</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  فعال
                </span>
              </div>
              <p className="text-xs sm:text-sm text-sky-100 mt-0.5 leading-relaxed">
                یکپارچه‌سازی سرویس OpenAI در آتلیه دیجیتال لاله جهت روتوش خودکار و راهنمایی مشتریان
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            className="w-full sm:w-auto bg-white hover:bg-slate-50 active:scale-95 text-slate-900 font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md min-h-[42px]"
          >
            {savedSuccess ? <Check className="w-4 h-4 text-emerald-600" /> : <SaveIcon />}
            <span>{savedSuccess ? 'تنظیمات ذخیره شد' : 'ذخیره پیکربندی'}</span>
          </button>
        </div>
      </div>

      {/* Grid: Settings on right, Live Sandbox on left */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Settings Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* API Key Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900">
                <Key className="w-4 h-4 text-sky-600" />
                <span>کلید OpenAI API Key</span>
              </div>
              <button
                onClick={handleCopyKey}
                className="text-[11px] text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer font-bold"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey ? 'کپی شد' : 'کپی'}</span>
              </button>
            </div>

            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-proj-..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          {/* Model Selection & Parameters */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900">
              <Cpu className="w-4 h-4 text-emerald-600" />
              <span>انتخاب مدل هوش مصنوعی</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'gpt-4o', label: 'GPT-4o (توصیه شده)', desc: 'بالاترین کیفیت' },
                { id: 'gpt-4o-mini', label: 'GPT-4o Mini', desc: 'مقرون به‌صرفه' },
                { id: 'o1-preview', label: 'OpenAI o1', desc: 'استدلال عمیق' },
                { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', desc: 'کلاسیک' }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  className={`p-2.5 sm:p-3 rounded-xl text-right border transition-all cursor-pointer ${
                    model === m.id
                      ? 'bg-gradient-to-r from-sky-50 to-emerald-50 border-sky-300 text-sky-900 font-bold shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <p className="text-xs font-bold truncate">{m.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">{m.desc}</p>
                </button>
              ))}
            </div>

            {/* Sliders */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">دما (Temperature):</span>
                <span className="font-mono text-sky-700 font-bold">{temperature}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-sky-600 bg-slate-200 cursor-pointer h-2"
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-600 font-medium">حداکثر توکن:</span>
                <span className="font-mono text-emerald-700 font-bold">{maxTokens}</span>
              </div>
              <input
                type="range"
                min="256"
                max="4096"
                step="256"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full accent-emerald-600 bg-slate-200 cursor-pointer h-2"
              />
            </div>
          </div>

          {/* System Prompt Customization */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-2 shadow-xs">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900">
              <Sliders className="w-4 h-4 text-teal-600" />
              <span>دستورالعمل سیستمی (System Prompt)</span>
            </div>
            <textarea
              rows={3}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 sm:p-3 text-xs text-slate-800 leading-relaxed focus:bg-white focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>
        </div>

        {/* Live Prompt Sandbox / Chat Tester (7 cols) */}
        <div className="lg:col-span-7 flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden min-h-[460px] sm:min-h-[520px] shadow-xs">
          {/* Sandbox Header */}
          <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-sky-600 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-slate-900">محیط تست زنده پرامپت</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-slate-600">
              <span className="flex items-center gap-1 font-bold text-emerald-700">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                <span>۲۴۰ms</span>
              </span>
              <span className="font-mono text-slate-700 font-bold">{model}</span>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-3 sm:p-4 space-y-3.5 overflow-y-auto max-h-[380px]">
            {chatLog.map((msg, idx) => (
              <div key={idx} className="flex gap-2 sm:gap-3 items-start">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    msg.role === 'assistant'
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-sky-100 text-sky-700 border border-sky-200'
                  }`}
                >
                  {msg.role === 'assistant' ? <BotMessageSquare className="w-3.5 h-3.5" /> : 'شما'}
                </div>
                <div
                  className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                    msg.role === 'assistant'
                      ? 'bg-slate-100 border border-slate-200 text-slate-800'
                      : 'bg-gradient-to-r from-sky-50 to-emerald-50 border border-sky-200 text-slate-900 font-medium'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <span className="block text-[10px] text-slate-500 mt-1 font-mono text-left">
                    {msg.time}
                  </span>
                </div>
              </div>
            ))}

            {isTesting && (
              <div className="flex gap-2 sm:gap-3 items-center">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>در حال استخراج پاسخ از ChatGPT...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Preset Prompts */}
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar text-[11px]">
            <span className="text-slate-500 font-medium flex-shrink-0">پرامپت:</span>
            {presetPrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => setTestPrompt(p)}
                className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-sky-700 hover:border-sky-300 transition-colors cursor-pointer text-[10px] sm:text-xs font-medium"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-2.5 sm:p-3.5 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTestPrompt()}
              placeholder="دستور تستی به چت‌جی‌پی‌تی..."
              className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
            <button
              onClick={handleTestPrompt}
              disabled={isTesting || !testPrompt.trim()}
              className="bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 disabled:opacity-50 text-white font-bold px-3.5 sm:px-4 py-2.5 rounded-xl text-xs transition-all flex items-center gap-1 cursor-pointer flex-shrink-0 min-h-[38px] shadow-xs"
            >
              <span>ارسال</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function SaveIcon() {
  return (
    <svg className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  );
}
