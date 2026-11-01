import React, { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, UserPlus, ShieldCheck, Phone } from 'lucide-react';
import { User } from '../types';
import { TelegramIcon } from './BrandIcons';

/** Default campaign artwork (used by the Telegram screen). */
const CAMPAIGN_BG =
  'https://p6rt5frbosoaqkcy.public.blob.vercel-storage.com/eitaa/eitaa-bg-Y8v18GIL7x6d52WUkfTti2go2uOFxm.jpg';

/** Eitaa login artwork: «خاطره‌ای که رنگ گرفت» (portrait poster, shipped in /public). */
const EITAA_BG = '/eitaa-bg.svg';

/** Background artwork for the login page of each messenger. */
const BACKGROUND_BY_PROVIDER: Record<Provider, string> = {
  eitaa: EITAA_BG,
  telegram: CAMPAIGN_BG
};

type Provider = 'eitaa' | 'telegram';

declare global {
  interface Window {
    Eitaa?: {
      WebApp?: {
        initDataUnsafe?: {
          user?: { id?: number | string; first_name?: string; last_name?: string; username?: string };
          start_param?: string;
        };
        ready?: () => void;
        expand?: () => void;
        requestContact?: (
          callback: (isOk: boolean, data?: { response?: unknown }) => void
        ) => void;
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
        requestContact?: (callback?: (shared: boolean) => void) => void;
      };
    };
  }
}

interface SignupScreenProps {
  provider: Provider;
  onEnter: (user: User) => void;
}

/**
 * Telegram bot that owns this login flow. Used as a hard fallback so the login
 * button never disappears, even when /api/auth/telegram/config is slow or the
 * panel has no cached bot username yet.
 */
const TELEGRAM_BOT_USERNAME = 'photo_laleh_bot';
const telegramBotLoginUrl = (username?: string) => {
  const clean = String(username || TELEGRAM_BOT_USERNAME).trim().replace(/^@/, '');
  return `https://t.me/${clean}?start=login`;
};

const PROVIDER_COPY: Record<Provider, { label: string; endpoint: string; sdk: string; note: string }> = {
  eitaa: {
    label: 'ایتا',
    endpoint: '/api/auth/eitaa',
    sdk: 'https://developer.eitaa.com/eitaa-web-app.js',
    note: 'ثبت‌نام با اشتراک‌گذاری شماره موبایل — بدون رمز عبور'
  },
  telegram: {
    label: 'تلگرام',
    endpoint: '/api/auth/telegram',
    sdk: 'https://telegram.org/js/telegram-web-app.js',
    note: 'ورود مستقیم با آیدی تلگرام — بدون رمز عبور'
  }
};

const normalizePhoneDigits = (value: any): string => {
  const digits = String(value ?? '').replace(/[^\d+]/g, '');
  if (!digits) return '';
  let d = digits.replace(/^\+/, '');
  if (d.startsWith('98')) d = `0${d.slice(2)}`;
  if (d.startsWith('9') && d.length === 10) d = `0${d}`;
  return d.replace(/\D/g, '').slice(0, 11);
};

/** Digs a phone number out of whatever shape the messenger returns. */
const findPhone = (input: any): string => {
  if (!input) return '';
  if (typeof input === 'string') {
    const candidate = normalizePhoneDigits(input);
    return /^09\d{9}$/.test(candidate) ? candidate : '';
  }
  if (Array.isArray(input)) {
    for (const item of input) {
      const found = findPhone(item);
      if (found) return found;
    }
    return '';
  }
  if (typeof input === 'object') {
    for (const key of ['phone', 'phone_number', 'phoneNumber', 'number', 'mobile']) {
      const found = findPhone((input as any)[key]);
      if (found) return found;
    }
    for (const value of Object.values(input as Record<string, unknown>)) {
      const found = findPhone(value);
      if (found) return found;
    }
  }
  return '';
};

const SignupScreen: React.FC<SignupScreenProps> = ({ provider, onEnter }) => {
  const copy = PROVIDER_COPY[provider];
  const [displayName, setDisplayName] = useState('');
  const [messengerId, setMessengerId] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [needsManualPhone, setNeedsManualPhone] = useState(false);
  const [inMessenger, setInMessenger] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [botUsername, setBotUsername] = useState(TELEGRAM_BOT_USERNAME);
  const pollRef = useRef<number | null>(null);

  const webApp = () =>
    provider === 'eitaa' ? window.Eitaa?.WebApp : window.Telegram?.WebApp;

  useEffect(() => {
    const readUser = () => {
      const app = webApp();
      const user = app?.initDataUnsafe?.user;
      if (user?.id) {
        setMessengerId(String(user.id));
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        if (fullName) setDisplayName(fullName);
        setInMessenger(true);
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.get(provider === 'eitaa' ? 'eitaa_id' : 'telegram_id');
      if (fromQuery && /^\d{4,20}$/.test(fromQuery)) {
        setMessengerId(fromQuery);
        setInMessenger(true);
      }
    };

    readUser();
    if (webApp()?.initDataUnsafe?.user?.id) return;

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


  // Opening the page: if the messenger already knows this user, log them in
  // silently — the signup screen is only shown when no account exists.
  const autoAskedRef = useRef(false);
  const autoLoginRef = useRef(false);

  const resolveIdentity = () => {
    const initData = (webApp() as any)?.initData || '';
    const signinToken =
      new URLSearchParams(window.location.search).get('t') ||
      (webApp() as any)?.initDataUnsafe?.start_param ||
      '';
    return { initData: String(initData), signinToken: String(signinToken || '') };
  };

  // Keep the newest identity value available to the delayed timer without
  // restarting the countdown every time a piece of identity arrives.
  const messengerIdRef = useRef(messengerId);
  messengerIdRef.current = messengerId;

  /** How long the mini app waits before it tries to sign the visitor in. */
  const AUTO_LOGIN_PAUSE_MS = 10_000;

  useEffect(() => {
    if (autoLoginRef.current) return;

    // Eitaa: identity is the Eitaa id only — the phone number is never requested here
    if (provider === 'eitaa') {
      return;
    }

    autoLoginRef.current = true;
    let cancelled = false;
    setIsAutoLoggingIn(true);

    const timer = window.setTimeout(async () => {
      if (cancelled) return;

      const { initData, signinToken } = resolveIdentity();
      const telegramId = messengerIdRef.current || '';
      // "login only when a phone number or a Telegram id exists"
      const hasIdentity = Boolean(initData || signinToken || telegramId);
      if (!hasIdentity) {
        setIsAutoLoggingIn(false);
        return;
      }

      // The bot may already hold the phone number for this chat: it is the strongest
      // identity we can use, so prefer it when it is there.
      if (provider === 'telegram' && telegramId) {
        try {
          const pendingRes = await fetch(
            `/api/auth/telegram/pending?id=${encodeURIComponent(telegramId)}`,
            { cache: 'no-store' }
          );
          const pending = await pendingRes.json().catch(() => null);
          if (!cancelled && pending?.phone) {
            await submitPhone(String(pending.phone));
            return;
          }
        } catch {
          /* fall through to the id/token sign-in */
        }
      }

      try {
        const res = await fetch('/api/auth/telegram/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initData,
            signinToken,
            telegramId: telegramId || undefined,
            createIfMissing: false
          })
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success && data?.user) {
          // Do not keep the one-time sign-in token in the address bar / history
          if (new URLSearchParams(window.location.search).has('t')) {
            window.history.replaceState({}, '', window.location.pathname);
          }
          onEnter(data.user as User);
          return;
        }
      } catch {
        /* fall through to the signup screen */
      }
      setIsAutoLoggingIn(false);
      // A missing account is fine — we still know the Telegram id, so let the user
      // register straight away instead of asking for a phone number.
      if (!telegramId) setNeedsManualPhone(true);
    }, AUTO_LOGIN_PAUSE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  // Root fix for "no user id": when Telegram did not open this page as a mini app
  // nothing can identify the visitor, so we need the bot's deep link to send them
  // through the bot, which then returns a one-time sign-in token (?t=…).
  useEffect(() => {
    if (provider !== 'telegram') return;
    let cancelled = false;
    fetch('/api/auth/telegram/config', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.botUsername) setBotUsername(String(data.botUsername));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [provider]);

  useEffect(() => () => {
    if (pollRef.current) window.clearInterval(pollRef.current);
  }, []);

  const submitPhone = async (phone: string) => {
    setIsSubmitting(true);
    setError('');
    try {
      const payload: Record<string, string> = { name: displayName.trim() };
      if (phone) payload.phone = phone;
      if (messengerId) payload.userId = messengerId;
      const res = await fetch(copy.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
      setStatus('');
    }
  };

  /** Telegram: the phone arrives through the bot webhook, so we poll for it. */
  const waitForTelegramPhone = async () => {
    setStatus('منتظر تایید شماره…');
    const deadline = Date.now() + 45_000;
    await new Promise<void>((resolve) => {
      pollRef.current = window.setInterval(async () => {
        try {
          const res = await fetch(
            `/api/auth/telegram/pending?id=${encodeURIComponent(messengerId)}`,
            { cache: 'no-store' }
          );
          const data = await res.json().catch(() => null);
          if (data?.phone) {
            if (pollRef.current) window.clearInterval(pollRef.current);
            resolve();
            await submitPhone(String(data.phone));
            return;
          }
        } catch {
          /* keep polling */
        }
        if (Date.now() > deadline) {
          if (pollRef.current) window.clearInterval(pollRef.current);
          resolve();
          setStatus('');
          setNeedsManualPhone(true);
          setError('شماره‌ای دریافت نشد؛ می‌توانید شماره را دستی وارد کنید.');
        }
      }, 2500);
    });
  };

  const requestPhone = async () => {
    setError('');
    const app = webApp();

    if (app?.requestContact) {
      let phoneFromSdk = '';
      let finished = false;

      const done = async () => {
        if (finished) return;
        finished = true;
        if (phoneFromSdk) {
          await submitPhone(phoneFromSdk);
        } else if (provider === 'telegram' && messengerId) {
          await waitForTelegramPhone();
        } else {
          setNeedsManualPhone(true);
          setError('شماره دریافت نشد؛ لطفاً شماره موبایل را دستی وارد کنید.');
        }
      };

      try {
        if (provider === 'eitaa') {
          (app as any).requestContact((isOk: boolean, data?: { response?: unknown }) => {
            if (isOk) phoneFromSdk = findPhone(data?.response ?? data);
            void done();
          });
          window.setTimeout(() => void done(), 20_000);
        } else {
          (app as any).requestContact(() => void done());
        }
      } catch {
        setNeedsManualPhone(true);
      }
      return;
    }

    setNeedsManualPhone(true);
    setError('برای دریافت خودکار شماره، صفحه را از داخل برنامه باز کنید.');
  };

  /** Telegram: ask the server who this chat belongs to (verified initData or bot token). */
  const loginWithTelegramIdentity = async () => {
    setIsSubmitting(true);
    setError('');
    const signinToken =
      new URLSearchParams(window.location.search).get('t') ||
      window.Telegram?.WebApp?.initDataUnsafe?.start_param ||
      '';
    const initData = (window.Telegram?.WebApp as any)?.initData || '';
    try {
      const res = await fetch('/api/auth/telegram/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, signinToken, telegramId: messengerId || undefined })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        // No Telegram identity available → the phone number stored in the bot is the identity
        setIsSubmitting(false);
        setNeedsManualPhone(true);
        const reason = data?.diagnostics;
        if (reason && !reason.hasBotToken) {
          setError('توکن ربات در پنل تنظیم نشده؛ با شماره موبایل وارد شوید.');
        } else if (reason?.hasInitData && reason?.initDataValid === false) {
          setError('شناسه تلگرام تأیید نشد؛ با شماره موبایل ثبت‌شده در ربات وارد شوید.');
        } else {
          setError('شناسه تلگرام در دسترس نیست؛ با شماره موبایل ثبت‌شده در ربات وارد شوید.');
        }
        await requestPhone();
        return;
      }
      onEnter(data.user as User);
    } catch {
      setError('ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async () => {
    // Telegram: the identity is the numeric Telegram id (no phone step)
    if (provider === 'telegram') {
      if (!messengerId) {
        await loginWithTelegramIdentity();
        return;
      }
      await submitPhone('');
      return;
    }

    // Eitaa: only the Eitaa id is used, the phone number is never asked
    if (provider === 'eitaa') {
      if (!messengerId) {
        setError('شناسه ایتا شناسایی نشد. صفحه را از داخل برنامک ایتا باز کنید.');
        return;
      }
      await submitPhone('');
      return;
    }

    if (needsManualPhone) {
      const phone = normalizePhoneDigits(manualPhone);
      if (!/^09\d{9}$/.test(phone)) {
        setError('شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.');
        return;
      }
      await submitPhone(phone);
      return;
    }
    await requestPhone();
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#f7efe6]">
      <div
        className="absolute inset-0 bg-cover bg-top bg-no-repeat"
        style={{
          backgroundImage: `url(${BACKGROUND_BY_PROVIDER[provider]})`,
          // Eitaa artwork sits a little higher so the headline clears the login card.
          // The extra scale hides the edge the shift would otherwise expose.
          ...(provider === 'eitaa'
            ? { transform: 'translateY(-5%) scale(1.08)', transformOrigin: 'top center' }
            : {})
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#f7efe6] via-[#f7efe6]/85 to-transparent"
        aria-hidden="true"
      />

      <div className="relative flex min-h-[100dvh] flex-col">
        <div className="flex-1" />

        <div
          className="px-4 pb-5"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          {isAutoLoggingIn && (
            <div className="mb-3 flex items-center justify-center gap-2 rounded-2xl bg-white/95 border border-slate-200 px-3 py-3 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <p className="text-[11px] font-bold text-slate-600">در حال بررسی حساب…</p>
            </div>
          )}

          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-2xl bg-rose-50/95 border border-rose-200 px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] leading-6 text-rose-700">{error}</p>
            </div>
          )}

          {!isAutoLoggingIn && provider === 'telegram' && !messengerId && (
            <div className="mb-3 rounded-2xl bg-white/95 border border-sky-200 px-3 py-3">
              <p className="flex items-center gap-1.5 text-[11px] font-black text-slate-700">
                <span className="w-5 h-5 rounded-full bg-[#229ED9] text-white flex items-center justify-center flex-shrink-0">
                  <TelegramIcon className="w-3 h-3" />
                </span>
                شناسه تلگرام شما در دسترس نیست
              </p>
              <p className="mt-1.5 text-[10px] leading-5 text-slate-500">
                برای ورود خودکار، صفحه باید از داخل ربات تلگرام باز شود. روی دکمه زیر بزنید؛ ربات
                لینک ورود اختصاصی شما را می‌فرستد.
              </p>
              <a
                href={telegramBotLoginUrl(botUsername)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-[#229ED9] hover:bg-[#1e8fc4] text-white text-xs font-black transition-colors"
              >
                <TelegramIcon className="w-4 h-4" />
                ورود از طریق ربات تلگرام
              </a>
            </div>
          )}

          {!isAutoLoggingIn && provider === 'telegram' && needsManualPhone && (
            <div className="mb-3 rounded-2xl bg-white/95 border border-slate-200 px-3 py-2.5">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 mb-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                شماره موبایل
              </label>
              <input
                type="tel"
                inputMode="numeric"
                value={manualPhone}
                onChange={(e) => setManualPhone(normalizePhoneDigits(e.target.value))}
                placeholder="09xxxxxxxxx"
                dir="ltr"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <button
            type="button"
            onClick={handleRegister}
            disabled={isSubmitting || isAutoLoggingIn}
            className="w-full h-14 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-700 hover:to-sky-700 active:scale-[0.995] disabled:opacity-70 text-white text-sm font-black shadow-lg shadow-teal-700/25 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <UserPlus className="w-5 h-5" />
            )}
            <span>
              {isAutoLoggingIn
                ? 'لطفاً کمی صبر کنید…'
                : provider === 'eitaa'
                ? 'ورود'
                : needsManualPhone
                ? 'ادامه ثبت نام'
                : 'ثبت نام'}
            </span>
          </button>

          {status && (
            <p className="mt-2 text-center text-[11px] font-bold text-emerald-700">{status}</p>
          )}

          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10px] leading-5 text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
            {provider === 'telegram'
              ? 'ورود با شماره موبایل ثبت‌شده در ربات یا شناسه تلگرام'
              : 'ورود مستقیم با شناسه ایتا — بدون شماره موبایل'}
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
