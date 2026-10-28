import express from 'express';
import crypto from 'crypto';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  readDb,
  writeDb,
  getDbStatus,
  clearDbConfig,
  testDbConnection,
  applyDbConfig,
  resolveConfig,
  createSession,
  findSession,
  deleteSession,
  deleteUserSessions,
  deleteSessionsByDevice,
  saveOtpCode,
  verifyOtpCode,
  bumpRateLimit,
  recordAudit,
  listAudit,
  listUserSessions,
  revokeSession,
  disconnectDb,
  DEFAULT_DB_NAME
} from './mongoStore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serverless platforms (Vercel) expose a read-only bundle.
const IS_SERVERLESS = Boolean(process.env.VERCEL);



// Initial Database Schema & Seed Data


const app = express();
app.disable('x-powered-by');

// Only same-origin requests are allowed unless extra origins are configured.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-setup-key');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') return res.status(204).end();
  }
  next();
});

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://api.telegram.org https://s.api.ir; font-src 'self' data:; frame-ancestors 'none'"
  );
  next();
});

app.use(
  express.json({
    limit: '15mb',
    verify: (req: any, _res, buffer) => {
      // Keep the raw body for webhook signature verification
      if (req.originalUrl && req.originalUrl.includes('webhook')) {
        req.rawBody = buffer.toString('utf8');
      }
    }
  })
);

// --- Access control: every API route requires a session, sensitive ones an admin ---
const PUBLIC_API_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/otp/request',
  '/api/auth/password/otp',
  '/api/auth/password/reset',
  '/api/auth/login/otp',
  '/api/auth/me',
  '/api/auth/logout',
  '/api/blupal/webhook',
  '/api/webhook/blupal',
  '/api/telegram/webhook'
]);

const ADMIN_ONLY_PREFIXES = [
  '/api/users',
  '/api/settings',
  '/api/db',
  '/api/backup',
  '/api/prompts',
  '/api/blupal/test',
  '/api/blupal/webhook-logs',
  '/api/telegram/test',
  '/api/telegram/send-order'
];

app.use('/api', (req: any, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    res.on('finish', () => {
      const user = req.currentUser;
      if (!user) return;
      const path = String(req.originalUrl || '').split('?')[0];
      if (!path.startsWith('/api/') || path.startsWith('/api/auth/')) return;
      recordAudit({
        userId: user.id,
        userName: user.name,
        phone: user.phone,
        role: user.role,
        method: req.method,
        path,
        status: res.statusCode,
        ip: clientIp(req)
      });
    });
  }
  next();
});

app.use('/api', async (req: any, res, next) => {
  const path = String(req.originalUrl || req.url || '').split('?')[0].replace(/\/+$/, '') || '/api';
  if (!path.startsWith('/api')) return next();
  if (PUBLIC_API_PATHS.has(path)) return next();

  try {
    const session = await currentUserFromRequest(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'برای دسترسی باید وارد حساب شوید' });
    }
    req.currentUser = session.user;

    const isAdmin = session.user?.role === 'admin';
    const adminOnly = ADMIN_ONLY_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + '/'));
    const isWriteOnContent =
      (path.startsWith('/api/print-types') || path.startsWith('/api/announcements') || path.startsWith('/api/tickets')) &&
      req.method !== 'GET';

    if ((adminOnly || isWriteOnContent) && !isAdmin) {
      return res.status(403).json({ success: false, error: 'دسترسی مجاز نیست' });
    }

    next();
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'auth error' });
  }
});



// --- Simple in-memory rate limiter (per instance) ---
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

async function hitRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  try {
    const count = await bumpRateLimit(key, windowMs);
    return count > limit;
  } catch {
    // Fallback to per-instance memory when the database is unreachable
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return false;
    }
    bucket.count += 1;
    return bucket.count > limit;
  }
}

function clientIp(req: any): string {
  return String(req.headers['x-forwarded-for'] || req.ip || 'unknown').split(',')[0].trim();
}

// --- Password hashing (scrypt, no external dependency) ---
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password: string, stored: string | undefined | null): boolean {
  if (!stored) return false;
  if (!stored.startsWith('scrypt$')) return stored === password; // legacy plaintext
  const [, salt, expected] = stored.split('$');
  if (!salt || !expected) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const expectedBuffer = Buffer.from(expected, 'hex');
    return derived.length === expectedBuffer.length && crypto.timingSafeEqual(derived, expectedBuffer);
  } catch {
    return false;
  }
}

function isHashedPassword(value: string | undefined | null): boolean {
  return Boolean(value && value.startsWith('scrypt$'));
}

const SECRET_SETTING_KEYS = [
  'avalaiApiKey',
  'blupalToken',
  'blupalWebhookSecret',
  'telegramToken',
  'smsApiToken'
];

/** Removes admin-only fields (internal cost) from print sizes. */
function sanitizeDimensions(dimensions: any) {
  if (!Array.isArray(dimensions)) return [];
  return dimensions.map((dim: any) => {
    if (!dim || typeof dim !== 'object') return dim;
    const { costPrice, costNote, ...rest } = dim;
    return rest;
  });
}

function sanitizeSettings(settings: any, admin: boolean) {
  if (!settings) return {};
  if (admin) return settings;
  const copy: any = { ...settings };
  for (const key of SECRET_SETTING_KEYS) {
    if (key in copy) delete copy[key];
  }
  return copy;
}

function maskDbUri(uri: string) {
  if (!uri) return '';
  return uri.replace(/\/\/([^@/]+)@/, (_match, credentials) => {
    const user = String(credentials).split(':')[0];
    return `//${user}:••••@`;
  });
}

function sanitizeUser(user: any) {
  if (!user) return user;
  const { password, ...rest } = user;
  return rest;
}

function sanitizeUsers(users: any[]) {
  return (users || []).map(sanitizeUser);
}

// --- REST API ENDPOINTS ---

// Get all DB state
app.get('/api/db/all', async (req: any, res) => {
  const db = await readDb();
  const isAdmin = req.currentUser?.role === 'admin';
  res.json({
    ...db,
    users: isAdmin ? sanitizeUsers(db.users) : [],
    settings: sanitizeSettings(db.settings, isAdmin),
    // Internal cost figures are admin-only: never ship them to a customer's browser
    dimensions: isAdmin ? db.dimensions || [] : sanitizeDimensions(db.dimensions)
  });
});

// --- Photo uploads (Vercel Blob, direct from the browser) ---
app.post('/api/uploads/blob', async (req: any, res) => {
  try {
    const { handleUpload } = await import('@vercel/blob/client');
    const body = req.body;

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        maximumSizeInBytes: 15 * 1024 * 1024,
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ userId: req.currentUser?.id || '' })
      }),
      onUploadCompleted: async () => {
        /* nothing to do: the URL is saved with the order */
      }
    });

    res.json(jsonResponse);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message || 'آپلود ناموفق بود' });
  }
});

// Storage usage of the Vercel Blob store (admin dashboard)
app.get('/api/storage/usage', async (req: any, res) => {
  if (req.currentUser?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'دسترسی مجاز نیست' });
  }
  try {
    const { list } = await import('@vercel/blob');
    let cursor: string | undefined = undefined;
    let usedBytes = 0;
    let count = 0;
    let pages = 0;

    do {
      const page: any = await list({ cursor, limit: 1000 });
      for (const blob of page.blobs || []) {
        usedBytes += Number(blob.size || 0);
        count += 1;
      }
      cursor = page.hasMore ? page.cursor : undefined;
      pages += 1;
    } while (cursor && pages < 20);

    const limitBytes = Number(process.env.BLOB_QUOTA_BYTES) || 1024 * 1024 * 1024;
    res.json({
      success: true,
      usedBytes,
      count,
      limitBytes,
      remainingBytes: Math.max(limitBytes - usedBytes, 0),
      truncated: Boolean(cursor)
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'خواندن وضعیت فضا ناموفق بود' });
  }
});

app.delete('/api/uploads/blob', async (req: any, res) => {
  try {
    const { del } = await import('@vercel/blob');
    const url = String(req.query?.url || '');
    if (!url || !url.startsWith('https://')) {
      return res.status(400).json({ success: false, error: 'آدرس نامعتبر است' });
    }
    await del(url);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message || 'حذف ناموفق بود' });
  }
});

// --- Backup & restore ---
app.get('/api/backup', async (_req, res) => {
  const state = await readDb();
  const safeState = {
    ...state,
    users: sanitizeUsers(state.users)
  };
  const payload = {
    app: 'laleh-digital-studio',
    version: 1,
    createdAt: new Date().toISOString(),
    data: safeState
  };
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="laleh-backup-${stamp}.json"`);
  res.send(JSON.stringify(payload, null, 2));
});

app.post('/api/backup/restore', async (req, res) => {
  try {
    const payload = req.body || {};
    const data = payload.data && typeof payload.data === 'object' ? payload.data : payload;

    const arrayKeys = ['users', 'orders', 'tickets', 'printTypes', 'dimensions', 'announcements', 'invoices', 'webhookLogs'];
    const objectKeys = ['settings', 'prompts'];
    const providedKeys = [...arrayKeys, ...objectKeys].filter((key) => data[key] !== undefined);
    if (providedKeys.length === 0) {
      return res.status(400).json({ success: false, error: 'فایل پشتیبان معتبر نیست' });
    }
    for (const key of arrayKeys) {
      if (data[key] !== undefined && !Array.isArray(data[key])) {
        return res.status(400).json({ success: false, error: `ساختار ${key} نامعتبر است` });
      }
    }

    const current = await readDb();
    // Backups never contain passwords: keep the current ones for existing users
    if (Array.isArray(data.users)) {
      const passwordById = new Map(
        (current.users || []).map((u: any) => [u.id, u.password])
      );
      data.users = data.users.map((u: any) => {
        if (u.password) return u;
        const existing = passwordById.get(u.id);
        return existing ? { ...u, password: existing } : u;
      });
    }

    const next: any = { ...current };
    for (const key of arrayKeys) {
      if (data[key] !== undefined) next[key] = data[key];
    }
    for (const key of objectKeys) {
      if (data[key] !== undefined && data[key] !== null && typeof data[key] === 'object') {
        next[key] = data[key];
      }
    }

    await writeDb(next);
    res.json({ success: true, restored: providedKeys });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'بازیابی ناموفق بود' });
  }
});

// --- Authentication (server-side sessions stored in MongoDB) ---
const SESSION_COOKIE = 'laleh_session';

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}

function sessionMeta(req: any) {
  return { userAgent: String(req.headers['user-agent'] || ''), ip: clientIp(req) };
}

function setSessionCookie(res: any, token: string) {
  const maxAge = 30 * 24 * 60 * 60;
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${IS_SERVERLESS ? '; Secure' : ''}`
  );
}

function clearSessionCookie(res: any) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

const normalizePhone = (value: any) =>
  String(value || '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[\s\-()]/g, '');

async function currentUserFromRequest(req: any) {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (!token) return null;
  const session = await findSession(token);
  if (!session) return null;
  const db = await readDb();
  const user = (db.users || []).find((u: any) => u.id === session.userId);
  if (!user) return null;
  return { user, token };
}

app.post('/api/auth/login', async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const password = String(req.body?.password ?? '');
  if (!phone || !password) {
    return res.status(400).json({ success: false, error: 'شماره موبایل و رمز عبور را وارد کنید.' });
  }

  if (await hitRateLimit(`login:${clientIp(req)}:${phone}`, 10, 10 * 60 * 1000)) {
    return res.status(429).json({ success: false, error: 'تلاش‌های ناموفق بیش از حد. چند دقیقه بعد دوباره تلاش کنید.' });
  }

  const db = await readDb();
  const user = (db.users || []).find((u: any) => normalizePhone(u.phone) === phone);
  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ success: false, error: 'شماره موبایل یا رمز عبور اشتباه است.' });
  }

  // Upgrade legacy plaintext passwords transparently on successful login
  if (!isHashedPassword(user.password)) {
    db.users = (db.users || []).map((u: any) => (u.id === user.id ? { ...u, password: hashPassword(password) } : u));
    await writeDb(db);
  }

  if (user.role === 'admin' && db.settings?.adminLoginOtp === true) {
    const sent = await sendOtpSms(phone);
    if (!sent.ok) {
      return res.status(400).json({ success: false, error: sent.error });
    }
    return res.json({ success: true, requiresOtp: true, phone });
  }

  const token = await createSession(user.id, undefined, sessionMeta(req));
  if (token) setSessionCookie(res, token);
  res.json({ success: true, user: sanitizeUser(user) });
});

// Send a one-time code with the api.ir SMS service
async function sendOtpSms(phone: string): Promise<{ ok: boolean; error?: string }> {
  const db = await readDb();
  const token = String(db.settings?.smsApiToken || process.env.SMS_API_TOKEN || '').trim();
  if (!token) return { ok: false, error: 'توکن پیامک در تنظیمات ثبت نشده است' };

  const code = String(Math.floor(100000 + Math.random() * 900000));
  try {
    const smsRes = await fetch('https://s.api.ir/api/sw1/SmsOTP', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code, mobile: phone, template: 2 })
    });
    const smsData: any = await smsRes.json().catch(() => null);
    const ok = Boolean(smsRes.ok && smsData && smsData.success !== false);
    if (!ok) return { ok: false, error: smsData?.message || 'ارسال پیامک ناموفق بود' };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'ارسال پیامک ناموفق بود' };
  }

  const saved = await saveOtpCode(phone, code, 2 * 60 * 1000);
  if (!saved) return { ok: false, error: 'ذخیره کد ناموفق بود' };
  return { ok: true };
}

// Request an SMS one-time code for registration
app.post('/api/auth/otp/request', async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    if (!/^09\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, error: 'شماره موبایل نامعتبر است' });
    }

    const db = await readDb();
    // Never reveal whether a number is already registered
    if ((db.users || []).some((u: any) => normalizePhone(u.phone) === phone)) {
      return res.json({ success: true });
    }

    if (await hitRateLimit(`otp:${phone}`, 3, 15 * 60 * 1000) || await hitRateLimit(`otp-ip:${clientIp(req)}`, 10, 15 * 60 * 1000)) {
      return res.status(429).json({ success: false, error: 'تعداد درخواست کد بیش از حد مجاز است. کمی بعد تلاش کنید.' });
    }

    const sent = await sendOtpSms(phone);
    if (!sent.ok) {
      return res.status(400).json({ success: false, error: sent.error });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'خطای سرور' });
  }
});

// Complete registration after the SMS code is verified
app.post('/api/auth/register', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const phone = normalizePhone(req.body?.phone);
    const password = String(req.body?.password || '');
    const code = String(req.body?.code || '').trim();

    if (!name || !phone || !password) {
      return res.status(400).json({ success: false, error: 'اطلاعات ثبت‌نام کامل نیست' });
    }
    if (!/^09\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, error: 'شماره موبایل نامعتبر است' });
    }
    if (!code) {
      return res.status(400).json({ success: false, error: 'کد تایید را وارد کنید' });
    }

    const db = await readDb();
    if ((db.users || []).some((u: any) => normalizePhone(u.phone) === phone)) {
      return res.status(400).json({ success: false, error: 'این شماره موبایل قبلاً ثبت‌نام شده است' });
    }

    if (await hitRateLimit(`register:${clientIp(req)}`, 8, 30 * 60 * 1000)) {
      return res.status(429).json({ success: false, error: 'درخواست‌های ثبت‌نام بیش از حد مجاز است' });
    }

    const verification = await verifyOtpCode(phone, code);
    if (!verification.ok) {
      return res.status(400).json({ success: false, error: verification.error });
    }

    const newUser: any = {
      id: 'usr-' + Date.now(),
      name,
      phone,
      password: hashPassword(password),
      role: 'user',
      // Self-registration always creates a customer; colleagues are admin-created only
      category: 'customer',
      createdAt: new Date().toLocaleDateString('fa-IR'),
      walletBalance: 100000,
      hasUsedFirstOrderGift: false
    };

    db.users = [...(db.users || []), newUser];
    await writeDb(db);

    const token = await createSession(newUser.id);
    if (token) setSessionCookie(res, token);
    res.json({ success: true, user: sanitizeUser(newUser) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'خطای سرور' });
  }
});

// Forgot password: send a code to the registered mobile number
app.post('/api/auth/password/otp', async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    if (!/^09\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, error: 'شماره موبایل نامعتبر است' });
    }
    const db = await readDb();
    const user = (db.users || []).find((u: any) => normalizePhone(u.phone) === phone);
    // Do not reveal whether the number exists
    if (!user) {
      return res.json({ success: true });
    }
    if (await hitRateLimit(`pwotp:${phone}`, 3, 15 * 60 * 1000) || await hitRateLimit(`pwotp-ip:${clientIp(req)}`, 10, 15 * 60 * 1000)) {
      return res.status(429).json({ success: false, error: 'تعداد درخواست کد بیش از حد مجاز است. کمی بعد تلاش کنید.' });
    }

    const sent = await sendOtpSms(phone);
    if (!sent.ok) {
      return res.status(400).json({ success: false, error: sent.error });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'خطای سرور' });
  }
});

// Forgot password: verify the code and set a new password
app.post('/api/auth/password/reset', async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    const code = String(req.body?.code || '').trim();
    const password = String(req.body?.password || '');

    if (!/^09\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, error: 'شماره موبایل نامعتبر است' });
    }
    if (!code) {
      return res.status(400).json({ success: false, error: 'کد تایید را وارد کنید' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'رمز عبور باید حداقل ۶ نویسه باشد' });
    }

    const db = await readDb();
    const user = (db.users || []).find((u: any) => normalizePhone(u.phone) === phone);
    if (!user) {
      return res.status(400).json({ success: false, error: 'کاربری با این شماره یافت نشد' });
    }

    const verification = await verifyOtpCode(phone, code);
    if (!verification.ok) {
      return res.status(400).json({ success: false, error: verification.error });
    }

    db.users = (db.users || []).map((u: any) =>
      u.id === user.id ? { ...u, password: hashPassword(password) } : u
    );
    await writeDb(db);

    // Any previously issued session becomes invalid after a password change
    await deleteUserSessions(user.id);

    const token = await createSession(user.id);
    if (token) setSessionCookie(res, token);
    const updated = (db.users || []).find((u: any) => u.id === user.id);
    res.json({ success: true, user: sanitizeUser(updated) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'خطای سرور' });
  }
});

// Optional second factor for admin accounts
app.post('/api/auth/login/otp', async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const code = String(req.body?.code || '').trim();
  if (!phone || !code) {
    return res.status(400).json({ success: false, error: 'کد تایید را وارد کنید' });
  }
  if (await hitRateLimit(`loginotp:${clientIp(req)}:${phone}`, 10, 10 * 60 * 1000)) {
    return res.status(429).json({ success: false, error: 'تلاش‌های ناموفق بیش از حد مجاز است' });
  }

  const db = await readDb();
  const user = (db.users || []).find((u: any) => normalizePhone(u.phone) === phone);
  if (!user) return res.status(401).json({ success: false, error: 'کد تایید نامعتبر است' });

  const verification = await verifyOtpCode(phone, code);
  if (!verification.ok) return res.status(401).json({ success: false, error: verification.error });

  const token = await createSession(user.id, undefined, sessionMeta(req));
  if (token) setSessionCookie(res, token);
  res.json({ success: true, user: sanitizeUser(user) });
});

// Keeps an active session alive (called while the user is interacting)
app.get('/api/auth/heartbeat', async (_req, res) => {
  res.json({ success: true, at: Date.now() });
});

// Active sessions grouped by device
app.get('/api/auth/sessions', async (req: any, res) => {
  const sessions = await listUserSessions(req.currentUser.id);
  const devices = new Map<string, any>();
  for (const session of sessions) {
    const key = session.deviceId || `${session.userAgent || ''}|${session.ip || ''}` || 'unknown';
    const current = devices.get(key);
    const lastSeen = Number(session.lastSeenAt || session.createdAt || 0);
    if (!current) {
      devices.set(key, {
        deviceId: key,
        userAgent: session.userAgent || '',
        ip: session.ip || '',
        firstLogin: session.createdAt,
        lastSeen,
        expiresAt: session.expiresAt,
        sessions: 1
      });
    } else {
      current.sessions += 1;
      current.lastSeen = Math.max(current.lastSeen, lastSeen);
      current.firstLogin = Math.min(Number(current.firstLogin || lastSeen), Number(session.createdAt || lastSeen));
    }
  }
  res.json(Array.from(devices.values()).sort((a, b) => b.lastSeen - a.lastSeen));
});

app.delete('/api/auth/sessions/:deviceId', async (req: any, res) => {
  await deleteSessionsByDevice(req.currentUser.id, req.params.deviceId);
  res.json({ success: true });
});

app.delete('/api/auth/sessions', async (req: any, res) => {
  await deleteUserSessions(req.currentUser.id);
  clearSessionCookie(res);
  res.json({ success: true });
});

// Audit trail (admin only)
app.get('/api/audit', async (req: any, res) => {
  if (req.currentUser?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'دسترسی مجاز نیست' });
  }
  const limit = Number(req.query?.limit) || 100;
  res.json(await listAudit(limit));
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const session = await currentUserFromRequest(req);
    if (!session) return res.status(401).json({ success: false, error: 'unauthenticated' });
    res.json({ success: true, user: sanitizeUser(session.user) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'session error' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (token) await deleteSession(token);
  clearSessionCookie(res);
  res.json({ success: true });
});

// --- MongoDB connection settings (admin panel) ---
// Optional extra protection: set ADMIN_SETUP_KEY in the environment and the
// panel must send the same value in the x-setup-key header.
function checkSetupKey(req: any, res: any) {
  const expected = process.env.ADMIN_SETUP_KEY;
  if (expected && req.headers['x-setup-key'] !== expected) {
    res.status(401).json({ success: false, error: 'کلید تنظیمات ادمین نامعتبر است' });
    return false;
  }
  return true;
}

// Connection status of the MongoDB database
app.get('/api/db/status', async (_req, res) => {
  try {
    const status = await getDbStatus();
    res.json({ success: true, ...status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'خطا در بررسی وضعیت دیتابیس' });
  }
});

// Current saved connection string (credentials are masked)
app.get('/api/db/config', async (_req, res) => {
  const { config, source } = resolveConfig();
  res.json({
    success: true,
    uri: '',
    maskedUri: maskDbUri(config.uri || ''),
    dbName: config.dbName || DEFAULT_DB_NAME,
    source
  });
});

// Test a connection string without saving it
app.post('/api/db/test', async (req, res) => {
  if (!checkSetupKey(req, res)) return;
  const { keepExisting } = req.body || {};
  let { uri, dbName } = req.body || {};
  if ((!uri || !String(uri).includes('://')) && keepExisting) {
    const saved = resolveConfig();
    uri = saved.config.uri;
    dbName = saved.config.dbName;
  }
  if (!uri || !/^mongodb(\+srv)?:\/\//i.test(String(uri).trim())) {
    return res.status(400).json({ success: false, error: 'آدرس دیتابیس باید با mongodb:// یا mongodb+srv:// شروع شود' });
  }
  const result = await testDbConnection(String(uri).trim(), dbName || undefined);
  if (!result.ok) {
    return res.status(400).json({ success: false, error: result.error });
  }
  res.json({ success: true, message: 'اتصال با موفقیت برقرار شد', collections: result.collections });
});

// Save the connection string and connect to it
app.post('/api/db/config', async (req, res) => {
  if (!checkSetupKey(req, res)) return;
  const { keepExisting } = req.body || {};
  let { uri, dbName } = req.body || {};
  if ((!uri || !String(uri).includes('://')) && keepExisting) {
    const saved = resolveConfig();
    uri = saved.config.uri;
    dbName = saved.config.dbName;
  }
  if (!uri) {
    return res.status(400).json({ success: false, error: 'آدرس اتصال دیتابیس الزامی است' });
  }
  const result = await applyDbConfig(String(uri), String(dbName || DEFAULT_DB_NAME));
  if (!result.ok) {
    return res.status(400).json({ success: false, error: result.error });
  }
  const status = await getDbStatus();
  res.json({ success: true, message: 'دیتابیس متصل شد', status });
});

// Remove the saved connection string (falls back to the MONGODB_URI env var)
app.delete('/api/db/config', async (_req, res) => {
  clearDbConfig();
  await disconnectDb();
  const status = await getDbStatus();
  res.json({ success: true, status });
});

// Full state sync
app.post('/api/db/sync', async (req, res) => {
  const current = await readDb();
  const updated = {
    ...current,
    ...req.body
  };
  await writeDb(updated);
  res.json({ success: true, db: updated });
});

// Orders APIs
app.get('/api/orders', async (req: any, res) => {
  const db = await readDb();
  const orders = db.orders || [];
  if (req.currentUser?.role === 'admin') return res.json(orders);
  const mine = orders.filter((o: any) => o.userId === req.currentUser.id);
  res.json(mine);
});

app.post('/api/orders', async (req, res) => {
  const db = await readDb();
  const newOrder = req.body;
  const existingIdx = (db.orders || []).findIndex((o: any) => o.id === newOrder.id);
  if (existingIdx >= 0) {
    db.orders[existingIdx] = newOrder;
  } else {
    db.orders = [newOrder, ...(db.orders || [])];
  }
  await writeDb(db);
  res.json({ success: true, order: newOrder });
});

app.put('/api/orders/:id', async (req, res) => {
  const db = await readDb();
  const orderId = req.params.id;
  const updatedOrder = req.body;
  db.orders = (db.orders || []).map((o: any) => (o.id === orderId ? { ...o, ...updatedOrder } : o));
  await writeDb(db);
  res.json({ success: true });
});

app.delete('/api/orders/:id', async (req, res) => {
  const db = await readDb();
  const orderId = req.params.id;
  db.orders = (db.orders || []).filter((o: any) => o.id !== orderId);
  await writeDb(db);
  res.json({ success: true });
});

app.delete('/api/orders', async (_req, res) => {
  const db = await readDb();
  db.orders = [];
  await writeDb(db);
  res.json({ success: true });
});

// Support Tickets APIs
app.get('/api/tickets', async (req: any, res) => {
  const db = await readDb();
  const tickets = db.tickets || [];
  if (req.currentUser?.role === 'admin') return res.json(tickets);
  const mine = tickets.filter((t: any) => t.userId === req.currentUser.id || t.userName === req.currentUser.name);
  res.json(mine);
});

app.post('/api/tickets', async (req, res) => {
  const db = await readDb();
  const newTicket = req.body;
  const existingIdx = (db.tickets || []).findIndex((t: any) => t.id === newTicket.id);
  if (existingIdx >= 0) {
    db.tickets[existingIdx] = newTicket;
  } else {
    db.tickets = [newTicket, ...(db.tickets || [])];
  }
  await writeDb(db);
  res.json({ success: true, ticket: newTicket });
});

app.put('/api/tickets/:id', async (req, res) => {
  const db = await readDb();
  const ticketId = req.params.id;
  const updatedTicket = req.body;
  db.tickets = (db.tickets || []).map((t: any) => (t.id === ticketId ? { ...t, ...updatedTicket } : t));
  await writeDb(db);
  res.json({ success: true });
});

app.delete('/api/tickets/:id', async (req, res) => {
  const db = await readDb();
  const ticketId = req.params.id;
  db.tickets = (db.tickets || []).filter((t: any) => t.id !== ticketId);
  await writeDb(db);
  res.json({ success: true });
});

// Prompts APIs
app.get('/api/prompts', async (_req, res) => {
  const db = await readDb();
  res.json(db.prompts || {});
});

app.post('/api/prompts', async (req, res) => {
  const db = await readDb();
  db.prompts = { ...(db.prompts || {}), ...req.body };
  await writeDb(db);
  res.json({ success: true, prompts: db.prompts });
});

// Print Types APIs
app.get('/api/print-types', async (_req, res) => {
  const db = await readDb();
  res.json(db.printTypes || []);
});

app.post('/api/print-types', async (req, res) => {
  const db = await readDb();
  const newPrintType = req.body;
  const existingIdx = (db.printTypes || []).findIndex((pt: any) => pt.id === newPrintType.id);
  if (existingIdx >= 0) {
    db.printTypes[existingIdx] = newPrintType;
  } else {
    db.printTypes.push(newPrintType);
  }
  await writeDb(db);
  res.json({ success: true, printType: newPrintType });
});

app.put('/api/print-types/:id', async (req, res) => {
  const db = await readDb();
  const ptId = req.params.id;
  db.printTypes = (db.printTypes || []).map((pt: any) => (pt.id === ptId ? { ...pt, ...req.body } : pt));
  await writeDb(db);
  res.json({ success: true });
});

app.delete('/api/print-types/:id', async (req, res) => {
  const db = await readDb();
  const ptId = req.params.id;
  db.printTypes = (db.printTypes || []).filter((pt: any) => pt.id !== ptId);
  await writeDb(db);
  res.json({ success: true });
});

// Users APIs
app.get('/api/users', async (_req, res) => {
  const db = await readDb();
  res.json(sanitizeUsers(db.users || []));
});

app.post('/api/users', async (req, res) => {
  const db = await readDb();
  const newUser = { ...req.body };

  const category: 'customer' | 'colleague' = newUser.category === 'colleague' ? 'colleague' : 'customer';
  newUser.category = category;
  // Colleagues are always regular users (never admins)
  newUser.role = category === 'colleague' ? 'user' : newUser.role === 'admin' ? 'admin' : 'user';

  if (category === 'colleague') {
    newUser.telegramId = String(newUser.telegramId || '').trim();
    newUser.eitaaId = String(newUser.eitaaId || '').trim();
  } else {
    // Keep those ids meaningful for colleagues only
    delete newUser.telegramId;
    delete newUser.eitaaId;
  }

  if (newUser.password) newUser.password = hashPassword(String(newUser.password));
  const existingIdx = (db.users || []).findIndex((u: any) => u.id === newUser.id || (newUser.phone && u.phone === newUser.phone));
  if (existingIdx >= 0) {
    db.users[existingIdx] = { ...db.users[existingIdx], ...newUser };
  } else {
    db.users.push(newUser);
  }
  await writeDb(db);
  res.json({ success: true, user: sanitizeUser(newUser) });
});

app.put('/api/users/:id', async (req, res) => {
  const db = await readDb();
  const userId = req.params.id;
  const patch: any = { ...req.body };

  if (patch.password) patch.password = hashPassword(String(patch.password));
  else delete patch.password;

  if (patch.category) {
    patch.category = patch.category === 'colleague' ? 'colleague' : 'customer';
    if (patch.category === 'colleague') {
      // Colleagues never keep an admin role
      patch.role = 'user';
    } else {
      patch.telegramId = '';
      patch.eitaaId = '';
    }
  }

  db.users = (db.users || []).map((u: any) => (u.id === userId ? { ...u, ...patch } : u));
  await writeDb(db);
  res.json({ success: true });
});

app.delete('/api/users/:id', async (req, res) => {
  const db = await readDb();
  const userId = req.params.id;
  const target = (db.users || []).find((u: any) => u.id === userId);
  if (!target) {
    return res.status(404).json({ success: false, error: 'کاربر یافت نشد' });
  }
  if (target.role === 'admin') {
    return res.status(400).json({ success: false, error: 'حذف کاربر ادمین مجاز نیست' });
  }
  db.users = (db.users || []).filter((u: any) => u.id !== userId);
  await writeDb(db);
  res.json({ success: true });
});

// Announcements APIs
app.get('/api/announcements', async (_req, res) => {
  const db = await readDb();
  res.json(db.announcements || []);
});

app.post('/api/announcements', async (req, res) => {
  const db = await readDb();
  const newAnn = req.body;
  const existingIdx = (db.announcements || []).findIndex((a: any) => a.id === newAnn.id);
  if (existingIdx >= 0) {
    db.announcements[existingIdx] = newAnn;
  } else {
    db.announcements = [newAnn, ...(db.announcements || [])];
  }
  await writeDb(db);
  res.json({ success: true, announcement: newAnn });
});

app.put('/api/announcements/:id', async (req, res) => {
  const db = await readDb();
  const annId = req.params.id;
  db.announcements = (db.announcements || []).map((a: any) => (a.id === annId ? { ...a, ...req.body } : a));
  await writeDb(db);
  res.json({ success: true });
});

app.delete('/api/announcements/:id', async (req, res) => {
  const db = await readDb();
  const annId = req.params.id;
  db.announcements = (db.announcements || []).filter((a: any) => a.id !== annId);
  await writeDb(db);
  res.json({ success: true });
});

// Settings APIs
app.get('/api/settings', async (req: any, res) => {
  const db = await readDb();
  res.json(sanitizeSettings(db.settings || {}, req.currentUser?.role === 'admin'));
});

app.post('/api/settings', async (req, res) => {
  const db = await readDb();
  db.settings = { ...(db.settings || {}), ...req.body };
  await writeDb(db);
  res.json({ success: true, settings: db.settings });
});

// ---------------------------------------------------------------------------
// BluPal payment gateway — implemented against https://blupal.top/documentation
//
//   Base URL : https://blupal.top/api
//   Auth     : header  X-API-Key: <key>   (or ?api_key=...)
//   Create   : POST /v1/invoices/create          body { amount: <Rial>, card_number? }
//   Status   : GET  /v1/invoices/{invoice_id}    (invoice_id is an integer)
//
//   amount  : Rial, integer, min 100,000 and max 500,000,000
//   response: { success, invoice_id, amount, final_amount, status,
//               payment_link, card_number, mode, expires_at }
//
//   IMPORTANT: final_amount = amount + a random 0..999 Rial tracking suffix.
//   The exact amount the customer must transfer is final_amount (in Rial),
//   so it is stored and displayed untouched. Rounding it to Tomans destroys
//   the tracking suffix and the payment can never be matched again.
// ---------------------------------------------------------------------------
const BLUPAL_DEFAULT_BASE_URL = 'https://blupal.top';
const BLUPAL_MIN_AMOUNT_RIAL = 100000; // 10,000 Toman
const BLUPAL_MAX_AMOUNT_RIAL = 500000000; // 50,000,000 Toman
const BLUPAL_CREATE_PATH = '/api/v1/invoices/create';

function formatRialFa(value: number): string {
  return `${new Intl.NumberFormat('fa-IR').format(Math.round(value))} ریال`;
}

/** Accepts "blupal.top", "https://blupal.top" or "https://blupal.top/api" and returns the API base. */
function getBluPalApiBase(baseUrl?: string): string {
  let host = String(baseUrl || BLUPAL_DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
  if (!host) host = BLUPAL_DEFAULT_BASE_URL;
  if (!/^https?:\/\//i.test(host)) host = `https://${host}`;
  return /\/api$/i.test(host) ? host : `${host}/api`;
}

/** Full URL of POST /v1/invoices/create. A custom endpoint overrides the documented path. */
function getBluPalCreateUrl(baseUrl?: string, customEndpoint?: string): string {
  const apiBase = getBluPalApiBase(baseUrl);
  const custom = String(customEndpoint || '').trim();
  if (!custom || custom === BLUPAL_CREATE_PATH || custom === '/v1/invoices/create') {
    return `${apiBase}/v1/invoices/create`;
  }
  if (/^https?:\/\//i.test(custom)) return custom.replace(/\/+$/, '');
  const path = custom.startsWith('/') ? custom : `/${custom}`;
  if (path === '/api' || path.startsWith('/api/')) {
    return `${apiBase.replace(/\/api$/i, '')}${path}`;
  }
  return `${apiBase}${path}`;
}

const BLUPAL_ERROR_MESSAGES: Record<string, string> = {
  unauthorized: 'کلید API بلوپال نامعتبر است یا ارسال نشده است (unauthorized).',
  amount_required: 'مبلغ فاکتور برای بلوپال ارسال نشده است (amount_required).',
  amount_too_low: `مبلغ فاکتور کمتر از حداقل مجاز بلوپال یعنی ${formatRialFa(
    BLUPAL_MIN_AMOUNT_RIAL
  )} است (amount_too_low).`,
  amount_too_high: `مبلغ فاکتور بیشتر از حداکثر مجاز بلوپال یعنی ${formatRialFa(
    BLUPAL_MAX_AMOUNT_RIAL
  )} است (amount_too_high).`,
  no_active_card: 'هیچ کارت فعالی برای این حساب در بلوپال ثبت نشده است (no_active_card).',
  invalid_invoice_id: 'شناسه فاکتور ارسالی برای بلوپال نامعتبر است (invalid_invoice_id).',
  not_found: 'فاکتور در سامانه بلوپال یافت نشد (not_found).',
  mode_mismatch:
    'کلید API با محیط فاکتور هم‌خوانی ندارد (mode_mismatch). لطفاً کلید اصلی حساب را در تنظیمات بلوپال بررسی کنید.',
  invalid_scenario: 'سناریوی شبیه‌سازی نامعتبر است (invalid_scenario).',
  invalid_state: 'فاکتور برای شبیه‌سازی آماده نیست (invalid_state).'
};

function blupalErrorMessage(payload: any, httpStatus: number): string {
  const code = String(payload?.error || '').trim().toLowerCase();
  if (code && BLUPAL_ERROR_MESSAGES[code]) return BLUPAL_ERROR_MESSAGES[code];
  const rawMessage = payload?.message ?? payload?.detail ?? payload?.errors;
  if (rawMessage) {
    return typeof rawMessage === 'object' ? JSON.stringify(rawMessage) : String(rawMessage);
  }
  if (httpStatus === 401) return BLUPAL_ERROR_MESSAGES.unauthorized;
  return `پاسخ نامعتبر از سرور بلوپال (کد HTTP ${httpStatus}).`;
}

/** Single low-level call to BluPal: JSON in, JSON out, never throws on a non-2xx status. */
async function blupalRequest(
  url: string,
  token: string,
  init: RequestInit = {}
): Promise<{ response: any; payload: any; ok: boolean }> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-API-Key': token,
      ...((init.headers as Record<string, string>) || {})
    }
  });

  const text = await response.text();
  let payload: any = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text.slice(0, 300) };
    }
  }

  const ok = response.ok && payload?.success !== false;
  return { response, payload, ok };
}

/** BluPal statuses: PENDING | PAID | EXPIRED | CANCELED */
function normalizeBluPalStatus(value: any): 'pending' | 'paid' | 'expired' | 'failed' {
  const status = String(value || '').toUpperCase();
  if (status === 'PAID' || status === 'COMPLETED' || status === 'SUCCESSFUL' || status === 'SUCCESS') {
    return 'paid';
  }
  if (status === 'EXPIRED') return 'expired';
  if (status === 'CANCELED' || status === 'CANCELLED' || status === 'FAILED') return 'failed';
  return 'pending';
}

/** BluPal returns an ISO timestamp with offset (e.g. 2026-07-14T12:30:00+03:30). */
function bluPalExpiryToTimestamp(expiresAt: any, fallbackMs: number): number {
  if (expiresAt !== null && expiresAt !== undefined && expiresAt !== '') {
    const asNumber = Number(expiresAt);
    if (Number.isFinite(asNumber) && asNumber > 0) {
      return asNumber > 1e12 ? asNumber : asNumber * 1000;
    }
    const parsed = Date.parse(String(expiresAt));
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now() + fallbackMs;
}

function nowFa(): string {
  return new Date().toLocaleString('fa-IR', {
    timeZone: 'Asia/Tehran',
    hour: '2-digit',
    minute: '2-digit',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function digitsOnly(value: any): string {
  return String(value || '').replace(/\D/g, '');
}

// Create Invoice
app.post('/api/blupal/create-invoice', async (req, res) => {
  try {
    const db = await readDb();
    const settings = db.settings || {};
    const body = req.body || {};
    const { orderId, customerName, customerPhone, description, invoiceDetails } = body;

    // --- 1) Validate the requested amount (Toman in, Rial out) ---
    const requestedToman = Number(body.amount);
    if (!Number.isFinite(requestedToman) || requestedToman < 0) {
      return res.status(400).json({
        success: false,
        error: 'invalid_amount',
        message: 'مبلغ ارسالی برای صدور فاکتور نامعتبر است.'
      });
    }

    const requestedRial = Math.round(requestedToman * 10);
    const isFree = requestedRial === 0;

    if (!isFree && (requestedRial < BLUPAL_MIN_AMOUNT_RIAL || requestedRial > BLUPAL_MAX_AMOUNT_RIAL)) {
      const tooLow = requestedRial < BLUPAL_MIN_AMOUNT_RIAL;
      return res.status(400).json({
        success: false,
        error: tooLow ? 'amount_too_low' : 'amount_too_high',
        message: tooLow
          ? `مبلغ این سفارش (${formatRialFa(requestedRial)}) کمتر از حداقل مجاز درگاه بلوپال (${formatRialFa(
              BLUPAL_MIN_AMOUNT_RIAL
            )}) است، بنابراین فاکتور آنلاین صادر نمی‌شود. لطفاً مبلغ سفارش را افزایش دهید یا پرداخت را حضوری انجام دهید.`
          : `مبلغ این سفارش (${formatRialFa(requestedRial)}) بیشتر از حداکثر مجاز درگاه بلوپال (${formatRialFa(
              BLUPAL_MAX_AMOUNT_RIAL
            )}) است.`
      });
    }

    const localInvoiceId =
      'BLU-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
    const token = String(settings.blupalToken || '').trim();
    const configuredCard = digitsOnly(settings.blupalCardNumber);

    // Sandbox / demo invoicing has been removed: only real (live) invoices are issued.
    if (!isFree) {
      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'gateway_not_configured',
          message:
            'درگاه پرداخت بلوپال پیکربندی نشده است. لطفاً کلید API واقعی را در تنظیمات بلوپال ثبت کنید.'
        });
      }
      if (/^blu_test/i.test(token)) {
        return res.status(400).json({
          success: false,
          error: 'sandbox_not_supported',
          message:
            'حالت آزمایشی (Sandbox) غیرفعال شده است. برای صدور فاکتور واقعی، کلید اصلی بلوپال (blu_live_...) را در تنظیمات ثبت کنید.'
        });
      }
    }

    // --- 2) Ask BluPal for a real invoice ---
    let remote: {
      invoiceId: string;
      amountRial: number;
      finalAmountRial: number;
      status: 'pending' | 'paid' | 'expired' | 'failed';
      paymentLink: string;
      cardNumber: string;
      expiresAt: any;
    } | null = null;
    let remoteError = '';

    if (!isFree) {
      try {
        const createUrl = getBluPalCreateUrl(settings.blupalBaseUrl, settings.blupalCustomEndpoint);
        const { response, payload } = await blupalRequest(createUrl, token, {
          method: 'POST',
          body: JSON.stringify({
            amount: requestedRial,
            ...(configuredCard ? { card_number: configuredCard } : {})
          })
        });

        const remoteInvoiceId = payload?.invoice_id ?? payload?.id;

        if (!response.ok || payload?.success === false) {
          remoteError = blupalErrorMessage(payload, response.status);
        } else if (remoteInvoiceId === undefined || remoteInvoiceId === null || remoteInvoiceId === '') {
          remoteError = 'پاسخ بلوپال فاقد شناسه فاکتور (invoice_id) بود.';
        } else {
          // `final_amount` carries the unique tracking suffix — keep it exactly as returned.
          const amountRial = Number(payload?.amount) || requestedRial;
          const finalAmountRial = Number(payload?.final_amount) || amountRial;

          remote = {
            invoiceId: String(remoteInvoiceId),
            amountRial,
            finalAmountRial,
            status: normalizeBluPalStatus(payload?.status),
            paymentLink: String(payload?.payment_link || payload?.payment_url || ''),
            cardNumber: digitsOnly(payload?.card_number),
            expiresAt: payload?.expires_at
          };
        }
      } catch (err: any) {
        remoteError = `ارتباط با سرور بلوپال برقرار نشد: ${err?.message || 'خطای شبکه'}`;
      }
    }

    // The gateway refused / was unreachable → never invent an invoice
    // (a fake id / fake card would make the transfer unmatched).
    if (!isFree && !remote) {
      return res.status(502).json({
        success: false,
        error: 'invoice_not_created',
        message: remoteError || 'صدور فاکتور در بلوپال انجام نشد.',
        amount: requestedToman,
        amountRial: requestedRial,
        invoiceDetails: invoiceDetails || null
      });
    }

    // --- 3) Persist the real BluPal invoice ---
    const payableRial = remote ? remote.finalAmountRial : requestedRial;
    const expiresInMs = 15 * 60 * 1000;

    const newInvoice: any = {
      invoiceId: remote ? remote.invoiceId : localInvoiceId,
      localInvoiceId,
      remoteInvoiceId: remote ? remote.invoiceId : '',
      provider: 'blupal',
      mode: 'live',
      isRemote: Boolean(remote),
      amount: requestedToman,
      requestedAmountRial: requestedRial,
      amountRial: payableRial,
      finalAmount: Math.round(payableRial / 10),
      finalAmountRial: payableRial,
      orderId: orderId || '',
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      description: description || 'پرداخت سفارش آتلیه دیجیتال لاله',
      status: isFree ? 'paid' : remote ? remote.status : 'pending',
      referenceCode: isFree ? 'GIFT-FREE-' + Math.floor(10000000 + Math.random() * 90000000) : undefined,
      paidAt: isFree ? nowFa() : undefined,
      cardNumber: remote?.cardNumber || configuredCard,
      accountHolder: settings.blupalAccountHolder || 'آتلیه تخصصی لاله',
      iban: settings.blupalIban || '',
      qrData: `blupal://pay?invoice=${remote ? remote.invoiceId : localInvoiceId}&amount=${payableRial}&to=${encodeURIComponent(
        settings.blupalAccountHolder || 'آتلیه لاله'
      )}`,
      paymentUrl: remote?.paymentLink || '',
      createdAt: nowFa(),
      expiresAt: remote ? bluPalExpiryToTimestamp(remote.expiresAt, expiresInMs) : Date.now() + expiresInMs,
      invoiceDetails: invoiceDetails || null
    };

    db.invoices = [newInvoice, ...(db.invoices || []).slice(0, 99)];
    await writeDb(db);

    res.json({
      success: true,
      invoice: newInvoice,
      amountRial: newInvoice.amountRial,
      finalAmountRial: newInvoice.finalAmountRial,
      paymentUrl: newInvoice.paymentUrl
    });
  } catch (err: any) {
    console.error('Error creating BluPal invoice:', err);
    res.status(500).json({ success: false, error: 'internal_error', message: err.message || 'Internal error' });
  }
});

// Check Invoice Status
app.get('/api/blupal/status/:invoiceId', async (req, res) => {
  try {
    const db = await readDb();
    const reqId = String(req.params.invoiceId || '').trim();
    const invoice = (db.invoices || []).find(
      (inv: any) =>
        String(inv.invoiceId || '').trim() === reqId ||
        String(inv.localInvoiceId || '').trim() === reqId ||
        String(inv.orderId || '').trim() === reqId
    );

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'not_found', message: 'فاکتور یافت نشد.' });
    }

    const settings = db.settings || {};
    const token = String(settings.blupalToken || '').trim();
    let gateError = '';

    // --- Ask the gateway while the invoice is payable (and once more after payment
    //     to capture the payer details BluPal only exposes on PAID invoices) ---
    const shouldAskGateway =
      (invoice.status === 'pending' || (invoice.status === 'paid' && !invoice.payerName)) &&
      token &&
      invoice.isRemote !== false &&
      /^\d+$/.test(String(invoice.remoteInvoiceId || invoice.invoiceId || ''));

    if (shouldAskGateway) {
      try {
        const apiBase = getBluPalApiBase(settings.blupalBaseUrl);
        const remoteId = String(invoice.remoteInvoiceId || invoice.invoiceId);
        const { response, payload } = await blupalRequest(`${apiBase}/v1/invoices/${remoteId}`, token);

        if (response.ok && payload?.success !== false) {
          const status = normalizeBluPalStatus(payload?.status);
          const wasPaid = invoice.status === 'paid';
          if (!wasPaid) invoice.status = status;

          const finalAmountRial = Number(payload?.final_amount);
          if (Number.isFinite(finalAmountRial) && finalAmountRial > 0) {
            invoice.finalAmountRial = finalAmountRial;
            invoice.amountRial = finalAmountRial;
            invoice.finalAmount = Math.round(finalAmountRial / 10);
          }

          if (status === 'paid') {
            invoice.referenceCode = String(
              payload?.transaction_id ||
                invoice.referenceCode ||
                'BLU-' + Math.floor(10000000 + Math.random() * 90000000)
            );
            invoice.paidAt = invoice.paidAt || nowFa();
            invoice.payerName = payload?.payer_name || invoice.payerName;
            invoice.payerCard = payload?.payer_card || invoice.payerCard;
            invoice.payerBankName = payload?.payer_bank_name || invoice.payerBankName;
          }
        } else if (response.status !== 404) {
          gateError = blupalErrorMessage(payload, response.status);
        }

        await writeDb(db);
      } catch (e: any) {
        gateError = gateError || `استعلام وضعیت از بلوپال انجام نشد: ${e?.message || 'خطای شبکه'}`;
      }
    }

    // --- Local expiry only when the gateway says nothing different ---
    if (invoice.status === 'pending' && invoice.expiresAt && Date.now() > Number(invoice.expiresAt)) {
      invoice.status = 'expired';
      await writeDb(db);
    }

    res.json({
      success: true,
      status: invoice.status,
      invoice,
      amountRial: invoice.amountRial,
      finalAmountRial: invoice.finalAmountRial ?? invoice.amountRial,
      warning: gateError || undefined
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'internal_error', message: err.message });
  }
});


// Test Connection with BluPal (real invoice creation on the documented endpoint)
app.post('/api/blupal/test-connection', async (req, res) => {
  try {
    const { token, baseUrl, customEndpoint } = req.body || {};

    if (!token) {
      return res.json({
        success: false,
        message: 'لطفاً ابتدا توکن دسترسی API بلوپال را در کادر مربوطه وارد نمایید.'
      });
    }

    const createUrl = getBluPalCreateUrl(baseUrl, customEndpoint);

    // 100,000 Rial = the documented minimum amount for a test invoice
    const { response, payload, ok } = await blupalRequest(createUrl, String(token).trim(), {
      method: 'POST',
      body: JSON.stringify({ amount: BLUPAL_MIN_AMOUNT_RIAL })
    });

    const obj = payload?.data || payload?.result || payload || {};
    const invoiceId = String(obj?.invoice_id ?? obj?.id ?? '');
    const invoiceUrl = obj?.payment_link || obj?.payment_url || obj?.url || obj?.link || '';
    const mode = String(obj?.mode || '').toLowerCase();

    if (ok && invoiceId) {
      return res.json({
        success: true,
        message: `فاکتور واقعی با موفقیت در وب‌سرویس بلوپال ایجاد شد ✅ (شناسه فاکتور: ${invoiceId}${
          mode ? ` — محیط: ${mode}` : ''
        })`,
        invoiceUrl,
        invoiceId,
        finalAmountRial: Number(obj?.final_amount) || BLUPAL_MIN_AMOUNT_RIAL,
        endpoint: createUrl,
        details: payload
      });
    }

    return res.json({
      success: false,
      message: `خطا در صدور فاکتور توسط سرور بلوپال (کد ${response.status}): ${blupalErrorMessage(
        payload,
        response.status
      )}`,
      endpoint: createUrl,
      details: payload
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: `خطای داخلی سرور هنگام تست اتصال: ${err.message}`
    });
  }
});

// BluPal Incoming Webhook Handler (POST /api/blupal/webhook)
app.post(['/api/blupal/webhook', '/api/webhook/blupal'], async (req: any, res) => {
  try {
    const dbForSecret = await readDb();
    const webhookSecret = String(dbForSecret.settings?.blupalWebhookSecret || '').trim();
    if (webhookSecret) {
      const provided = String(req.headers['x-blupal-signature'] || req.headers['x-webhook-signature'] || '');
      const raw = String(req.rawBody || '');
      const expected = crypto.createHmac('sha256', webhookSecret).update(raw).digest('hex');
      const a = Buffer.from(provided, 'utf8');
      const b = Buffer.from(expected, 'utf8');
      if (!provided || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(401).json({ success: false, error: 'invalid signature' });
      }
    }
  } catch {
    // Never block the gateway because of a verification error
  }

  try {
    const payload = req.body || {};
    const db = await readDb();

    const rawInvoiceId = payload.invoice_id ?? payload.invoiceId ?? payload.id ?? payload.order_id ?? payload.orderId;
    const strInvoiceId = String(rawInvoiceId || '').trim();

    const rawStatus = String(payload.status || payload.event || '').toUpperCase();
    // Only an explicit payment.completed / PAID event may settle an invoice.
    // A bare `success: true` is NOT proof of payment per the BluPal docs.
    const isPaid =
      rawStatus === 'PAID' ||
      rawStatus === 'COMPLETED' ||
      rawStatus === 'SUCCESSFUL' ||
      rawStatus === 'PAYMENT.COMPLETED' ||
      String(payload.event || '').toLowerCase() === 'payment.completed';

    const referenceCode = String(
      payload.transaction_id ||
      payload.reference_id ||
      payload.tracking_code ||
      payload.referenceCode ||
      ('BLU-WH-' + Math.floor(10000000 + Math.random() * 90000000))
    );
    const amount = payload.final_amount || payload.amount || payload.amount_rial;
    const finalAmountRial = Number(payload.final_amount) || 0;

    const timeFa = new Date().toLocaleString('fa-IR', {
      timeZone: 'Asia/Tehran',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    // 1. Update matching invoice in DB
    let invoiceFound = false;
    db.invoices = (db.invoices || []).map((inv: any) => {
      const isMatch =
        (strInvoiceId && String(inv.invoiceId || '').trim() === strInvoiceId) ||
        (strInvoiceId && String(inv.localInvoiceId || '').trim() === strInvoiceId) ||
        (strInvoiceId && String(inv.orderId || '').trim() === strInvoiceId);

      if (isMatch) {
        invoiceFound = true;
        // Idempotent: an already-paid invoice keeps its original reference/time.
        const alreadyPaid = inv.status === 'paid';
        return {
          ...inv,
          status: isPaid ? 'paid' : inv.status,
          // Webhook `final_amount` is the exact Rial amount that was matched.
          ...(finalAmountRial > 0
            ? {
                amountRial: finalAmountRial,
                finalAmountRial,
                finalAmount: Math.round(finalAmountRial / 10)
              }
            : {}),
          referenceCode: alreadyPaid ? inv.referenceCode || referenceCode : referenceCode,
          paidAt: isPaid ? inv.paidAt || timeFa : inv.paidAt,
          payerName: payload.payer_name || inv.payerName,
          payerCard: payload.payer_card || inv.payerCard,
          payerBankName: payload.payer_bank_name || inv.payerBankName
        };
      }
      return inv;
    });

    // 2. Update matching order in DB if any
    db.orders = (db.orders || []).map((ord: any) => {
      const isOrderMatch =
        (strInvoiceId && String(ord.id || '').trim() === strInvoiceId) ||
        (strInvoiceId && String(ord.trackingCode || '').trim() === strInvoiceId);
      if (isOrderMatch && isPaid) {
        return {
          ...ord,
          paymentStatus: 'paid',
          paymentReference: referenceCode
        };
      }
      return ord;
    });

    // 3. Record in webhook event logs
    const logEntry = {
      id: 'wh-' + Date.now(),
      receivedAt: timeFa,
      invoiceId: strInvoiceId || 'نامشخص',
      status: isPaid ? 'paid' : rawStatus,
      referenceCode,
      amount: amount || '—',
      rawPayload: payload,
      isMatched: invoiceFound
    };

    db.webhookLogs = [logEntry, ...(db.webhookLogs || []).slice(0, 19)];
    await writeDb(db);

    console.log(`[BluPal Webhook] Received status for invoice ${strInvoiceId}: ${isPaid ? 'PAID' : rawStatus} (Ref: ${referenceCode}, Matched: ${invoiceFound})`);

    // Return HTTP 200 OK with received: true as specified in BluPal docs
    res.status(200).json({
      received: true,
      success: true,
      message: 'نتیجه تراکنش وب‌هوک با موفقیت پردازش شد',
      invoiceId: strInvoiceId,
      status: isPaid ? 'paid' : rawStatus
    });
  } catch (err: any) {
    console.error('Error handling BluPal webhook:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get recent Webhook Logs
app.get('/api/blupal/webhook-logs', async (_req, res) => {
  const db = await readDb();
  res.json(db.webhookLogs || []);
});


// Unified Telegram Callback Query Handler
async function handleTelegramCallbackQuery(cb: any, token: string) {
  if (!cb || !token) return;
  const data = cb.data || '';

  if (data.startsWith('mark_ready:')) {
    const orderIdOrCode = data.replace('mark_ready:', '');
    const db = await readDb();
    const orders = db.orders || [];

    const targetOrderIndex = orders.findIndex(
      (o: any) => o.id === orderIdOrCode || o.trackingCode === orderIdOrCode
    );

    if (targetOrderIndex >= 0) {
      orders[targetOrderIndex].status = 'ready_to_ship';
      const messagesToDelete = orders[targetOrderIndex].sentMessageIds || [];
      
      // Update DB to clear tracking only
      orders[targetOrderIndex].sentMessageIds = [];
      db.orders = orders;
      await writeDb(db);

      // 1. Popup alert
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: cb.id, text: `وضعیت ${orders[targetOrderIndex].trackingCode} به «آماده ارسال» تغییر یافت ✅`, show_alert: true })
      });

      // 2. Edit message text with automatic deletion countdown
      if (cb.message && cb.message.chat && cb.message.message_id) {
        await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: cb.message.chat.id,
            message_id: cb.message.message_id,
            text: `⏳ با تشکر از شما فایل‌های چاپ تا ۱۰ ثانیه دیگر حذف خواهند شد.`,
            parse_mode: 'Markdown'
          })
        });

        // 3. Schedule deletion of ALL tracked messages
        setTimeout(async () => {
          for (const msgId of messagesToDelete) {
            try {
              await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: cb.message.chat.id, message_id: msgId })
              });
            } catch (e) {
              console.error(`Error deleting message ${msgId}:`, e);
            }
          }
        }, 10000);
      }
    }
  } else if (data.startsWith('delete_files:')) {
    // This branch is now deprecated in favor of automatic cleanup
  }
}

let lastTelegramUpdateId = 0;
async function pollTelegramUpdates() {
  try {
    const db = await readDb();
    const token = db.settings?.telegramToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;

    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${lastTelegramUpdateId + 1}&timeout=1`);
    if (!res.ok) {
      const errJson: any = await res.json().catch(() => ({}));
      if (errJson.error_code === 409) {
        await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
      }
      return;
    }

    const data = await res.json();
    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        lastTelegramUpdateId = Math.max(lastTelegramUpdateId, update.update_id);
        if (update.callback_query) {
          await handleTelegramCallbackQuery(update.callback_query, token);
        }
      }
    }
  } catch (err) {
    // Ignore polling errors
  }
}

setInterval(pollTelegramUpdates, 2000);

// Telegram Send Order API
app.post('/api/telegram/test', async (req, res) => {
  const { token, chatId } = req.body || {};
  if (!token || !chatId) {
    return res.status(400).json({ success: false, error: 'توکن ربات و شناسه چت الزامی است' });
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${String(token).trim()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: String(chatId).trim(),
        text: 'تست اتصال ربات تلگرام آتلیه دیجیتال لاله ✅'
      })
    });
    const data: any = await response.json().catch(() => null);
    if (response.ok && data?.ok) {
      return res.json({ success: true });
    }
    res.status(400).json({ success: false, error: data?.description || 'ارسال پیام تست ناموفق بود' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'خطا در ارتباط با تلگرام' });
  }
});

app.post('/api/telegram/send-order', async (req, res) => {
  try {
    const { botToken, chatId, order, dimensionTitle, materialName } = req.body;
    if (!botToken || !chatId || !order) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    // Always update settings so polling has the latest botToken
    const dbSettings = await readDb();
    dbSettings.settings = { ...(dbSettings.settings || {}), telegramToken: botToken, telegramChatId: chatId };
    await writeDb(dbSettings);

    const sentMessageIds: number[] = [];

    const timeFa = new Date().toLocaleString('fa-IR', {
      timeZone: 'Asia/Tehran',
      hour: '2-digit',
      minute: '2-digit',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    async function sendDocumentFromDataUrl(dataUrl: string, caption: string, filename: string) {
      if (!dataUrl) return null;
      try {
        const parts = dataUrl.split(';base64,');
        if (parts.length < 2) return null;
        const contentType = parts[0].split(':')[1] || 'image/jpeg';
        const raw = Buffer.from(parts[1], 'base64');
        const blob = new Blob([raw], { type: contentType });

        const form = new FormData();
        form.append('chat_id', chatId);
        form.append('caption', caption);
        form.append('document', blob, filename);

        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
          method: 'POST',
          body: form
        });
        const result = await response.json();
        return result.ok ? result.result.message_id : null;
      } catch (err) {
        console.error('Error sending document to telegram:', err);
        return null;
      }
    }

    // 1. Send 9-pack sheet image
    if (order.printSheetImage) {
      let sheetCountText = `${order.quantity || 1} سری`;
      if (order.dimensionId === 'personnel_12x3x4') {
        sheetCountText = `${2 * (order.quantity || 1)} سری`;
      }
      const captionSheet = `🎴 شیت ۹تایی چاپ\n📌 شماره سفارش: ${order.trackingCode}\n📐 اندازه: 10*15\n🔢 تعداد: ${sheetCountText}\n📅 ثبت: ${timeFa}`;
      const msgId = await sendDocumentFromDataUrl(order.printSheetImage, captionSheet, `sheet-9pack-${order.trackingCode}.jpg`);
      if (msgId) sentMessageIds.push(msgId);
    }

    // 2. Send commercial promotional image
    const commercialImg = order.commercialSheet10x15Image || order.commercialImage;
    if (commercialImg) {
      const captionComm = `🎨 عکس تبلیغاتی ۱۰×۱۵\n📌 شماره سفارش: ${order.trackingCode}\n📐 اندازه: 10*15\n🔢 تعداد: ${order.quantity || 1} سری\n📅 ثبت: ${timeFa}`;
      const msgId = await sendDocumentFromDataUrl(commercialImg, captionComm, `commercial-10x15-${order.trackingCode}.jpg`);
      if (msgId) sentMessageIds.push(msgId);
    }

    // 3. Send inquiry message
    try {
      const confirmMsg = `آیا سفارش ${order.trackingCode} چاپ شده است؟`;
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: confirmMsg,
          reply_markup: {
            inline_keyboard: [[{ text: 'بله، چاپ شد (تغییر به آماده ارسال) ✅', callback_data: `mark_ready:${order.id}` }]]
          }
        })
      });
      const resData = await res.json();
      if (resData.ok) sentMessageIds.push(resData.result.message_id);
    } catch (err) {
      console.error('Error sending confirmation message:', err);
    }
    
    // Save sent message IDs to DB
    const db = await readDb();
    const orderIdx = db.orders.findIndex((o: any) => o.id === order.id);
    if (orderIdx >= 0) {
      db.orders[orderIdx].sentMessageIds = sentMessageIds;
      await writeDb(db);
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('Telegram send order error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});

// Telegram Webhook Handler for Inline Buttons & Callbacks
app.post('/api/telegram/webhook', async (req, res) => {
  try {
    const update = req.body;
    if (update && update.callback_query) {
      const db = await readDb();
      const token = db.settings?.telegramToken || process.env.TELEGRAM_BOT_TOKEN;
      await handleTelegramCallbackQuery(update.callback_query, token);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Telegram webhook error:', err);
    res.json({ ok: true });
  }
});

// Start Express + Vite Server
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else if (!IS_SERVERLESS) {
    // Self-hosted production: serve the built SPA from Express.
    // On Vercel the static files are served by the CDN instead.
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.use(async (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Real Database Server running on http://localhost:${PORT}`);
  });
}

if (!IS_SERVERLESS) {
  startServer();
}

export default app;
export { app };
