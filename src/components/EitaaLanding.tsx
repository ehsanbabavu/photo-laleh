import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, UserPlus, ShieldCheck } from 'lucide-react';
import { User } from '../types';
import { TulipIcon } from './TulipIcon';
import { TelegramIcon } from './BrandIcons';

const CAMPAIGN_BG =
  'https://p6rt5frbosoaqkcy.public.blob.vercel-storage.com/eitaa/eitaa-bg-Y8v18GIL7x6d52WUkfTti2go2uOFxm.jpg';

type Provider = 'eitaa' | 'telegram';

declare global {
  interface Window {
    Eitaa?: {
      WebApp?: {
        initData?: string;
        initDataUnsafe?: {
          user?: { id?: number | string; first_name?: string; last_name?: string; username?: string };
          start_param?: string;
        };
        ready?: () => void;
        expand?: () => void;
      };
    };
    Telegram?: {
      WebApp?: {
        initData?: string;
        initDataUnsafe?: {
          user?: { id?: number | string; first_name?: string; last_name?: string; username?: string };
          start_param?: string;
        };
        ready?: () => void;
        expand?: () => void;
      };
    };
  }
}

interface SignupScreenProps {
  provider: Provider;
  onEnter: (user: User) => void;
}

const PROVIDER_COPY: Record<
  Provider,
  { label: string; idLabel: string; endpoint: string; sdk: string; note: string; queryKeys: string[] }
> = {
  eitaa: {
    label: 'ایتا',
    idLabel: 'شناسه ایتا',
    endpoint: '/api/auth/eitaa',
    sdk: 'https://developer.eitaa.com/eitaa-web-app.js',
    note: 'ورود مستقیم با شناسه ایتا — بدون رمز عبور',
    queryKeys: ['eitaa_id', 'uid']
  },
  telegram: {
    label: 'تلگرام',
    idLabel: 'آیدی عددی تلگرام',
    endpoint: '/api/auth/telegram',
    sdk: 'https://telegram.org/js/telegram-web-app.js',
    note: 'ورود مستقیم با آیدی تلگرام — بدون رمز عبور',
    queryKeys: ['telegram_id', 'uid']
  }
};

const SignupScreen: React.FC<SignupScreenProps> = ({ provider, onEnter }) => {
  const copy = PROVIDER_COPY[provider];
  const [messengerId, setMessengerId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [sdkReady, setSdkReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load the messenger SDK (Eitaa / Telegram mini-app) and read the user id
  useEffect(() => {
    const webApp = () =>
      provider === 'eitaa' ? window.Eitaa?.WebApp : window.Telegram?.WebApp;

    const readUser = () => {
      const app = webApp();
      const user = app?.initDataUnsafe?.user;
      if (user?.id) {
        setMessengerId(String(user.id));
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        if (fullName) setDisplayName(fullName);
        setSdkReady(true);
        return true;
      }
      const startParam = app?.initDataUnsafe?.start_param;
      if (startParam && /^\d{4,20}$/.test(startParam)) {
        setMessengerId(startParam);
        setSdkReady(true);
        return true;
      }
      const params = new URLSearchParams(window.location.search);
      for (const key of copy.queryKeys) {
        const value = params.get(key);
        if (value && /^\d{4,20}$/.test(value)) {
          setMessengerId(value);
          setSdkReady(true);
          return true;
        }
      }
      return false;
    };

    if (readUser()) return;

    const existing = document.querySelector<HTMLScriptElement>(`script[data-${provider}-sdk]`);
    if (existing) {
      existing.addEventListener('load', () => {
        webApp()?.ready?.();
        webApp()?.expand?.();
        readUser();
      });
      return;
    }

    const script = document.createElement('script');
    script.src = copy.sdk;
    script.async = true;
    script.dataset[`${provider}Sdk`] = 'true';
    script.onload = () => {
      webApp()?.ready?.();
      webApp()?.expand?.();
      readUser();
    };
    document.head.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const handleRegister = async () => {
    setError('');
    const id = messengerId.trim();
    if (!/^\d{4,20}$/.test(id)) {
      setError(`شناسه ${copy.label} معتبر نیست. صفحه را از داخل ${copy.label} باز کنید.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(copy.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id, name: displayName.trim() })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(data?.error || 'ثبت‌نام انجام نشد. دوباره تلاش کنید.');
        return;
      }
      onEnter(data.user as User);
    } catch {
      setError('ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#f7efe6]">
      <div
        className="absolute inset-0 bg-cover bg-top bg-no-repeat"
        style={{ backgroundImage: `url(${CAMPAIGN_BG})` }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#f7efe6] via-[#f7efe6]/85 to-transparent"
        aria-hidden="true"
      />

      <div className="relative flex min-h-[100dvh] flex-col">
        <div className="flex items-center justify-center gap-2 pt-5">
          <div className="w-9 h-9 rounded-2xl bg-white/85 border border-white/70 shadow-sm flex items-center justify-center p-1.5">
            <TulipIcon className="w-full h-full object-contain" />
          </div>
          <span className="text-sm font-black text-slate-800 drop-shadow-sm">
            آتلیه دیجیتال <span className="text-red-600">لاله</span>
          </span>
          {provider === 'telegram' && (
            <span className="w-6 h-6 rounded-full bg-[#229ED9] text-white flex items-center justify-center shadow-sm">
              <TelegramIcon className="w-3.5 h-3.5" />
            </span>
          )}
        </div>

        <div className="flex-1" />

        <div
          className="px-4 pb-5"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-2xl bg-rose-50/95 border border-rose-200 px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] leading-6 text-rose-700">{error}</p>
            </div>
          )}

          {!sdkReady && (
            <div className="mb-3 rounded-2xl bg-white/90 border border-slate-200 px-3 py-2.5">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                {copy.idLabel} (اگر خودکار تشخیص داده نشد)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={messengerId}
                onChange={(e) => setMessengerId(e.target.value.replace(/\D/g, ''))}
                placeholder={provider === 'telegram' ? 'مثال: 123456789' : 'مثال: 279058397'}
                dir="ltr"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <button
            type="button"
            onClick={handleRegister}
            disabled={isSubmitting}
            className="w-full h-14 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-700 hover:to-sky-700 active:scale-[0.995] disabled:opacity-70 text-white text-sm font-black shadow-lg shadow-teal-700/25 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <UserPlus className="w-5 h-5" />
            )}
            <span>ثبت نام</span>
          </button>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5" />
            {copy.note}
          </p>
        </div>
      </div>
    </div>
  );
};

export const EitaaLanding: React.FC<{ onEnter: (user: User) => void }> = ({ onEnter }) => (
  <SignupScreen provider="eitaa" onEnter={onEnter} />
);

export const TelegramLanding: React.FC<{ onEnter: (user: User) => void }> = ({ onEnter }) => (
  <SignupScreen provider="telegram" onEnter={onEnter} />
);
