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
    settings: sanitizeSettings(db.settings, isAdmin)
  });
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

    const arrayKeys = ['users', 'orders', 'tickets', 'printTypes', 'announcements', 'invoices', 'webhookLogs'];
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

  const token = await createSession(user.id);
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

  const token = await createSession(user.id);
  if (token) setSessionCookie(res, token);
  res.json({ success: true, user: sanitizeUser(user) });
});

// Active sessions of the current account
app.get('/api/auth/sessions', async (req: any, res) => {
  const sessions = await listUserSessions(req.currentUser.id);
  res.json(sessions);
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

// Helper function to generate candidate BluPal endpoints
function getBluPalEndpoints(baseUrl: string, customEndpoint?: string): string[] {
  const host = (baseUrl || 'https://blupal.top').trim().replace(/\/+$/, '');
  const bases = Array.from(new Set([
    host,
    host.replace('://blupal.top', '://api.blupal.top'),
    host.replace('://blupal.net', '://api.blupal.net'),
    host.replace('://blupal.ir', '://api.blupal.ir'),
    'https://blupal.top',
    'https://api.blupal.top',
    'https://blupal.net',
    'https://api.blupal.net'
  ]));

  const customEp = (customEndpoint || '').trim();
  const paths = [
    ...(customEp ? [customEp.startsWith('/') ? customEp : '/' + customEp] : []),
    '/api/v1/invoices/create',
    '/api/v1/invoices',
    '/api/v1/invoice/create',
    '/api/v1/invoice',
    '/api/v1/create-invoice',
    '/api/v1/create',
    '/api/v1/factor',
    '/api/v1/factors',
    '/api/v1/pay',
    '/api/v1/payment',
    '/api/invoice/create',
    '/api/invoices',
    '/api/invoice',
    '/api/create-invoice',
    '/api/factor',
    '/api/pay'
  ];

  const result: string[] = [];
  for (const base of bases) {
    for (const path of paths) {
      const fullUrl = `${base}${path}`;
      if (!result.includes(fullUrl)) {
        result.push(fullUrl);
      }
    }
  }
  return result;
}

// Create Invoice
app.post('/api/blupal/create-invoice', async (req, res) => {
  try {
    const db = await readDb();
    const settings = db.settings || {};
    const { amount, orderId, customerName, customerPhone, description, invoiceDetails } = req.body;

    const numAmount = typeof amount === 'number' ? amount : (Number(amount) || 0);
    if (numAmount < 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    const invoiceId = 'BLU-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
    // Amount in Rials (Minimum 100,000 Rials as required by BluPal API doc)
    const amountRial = Math.max(100000, numAmount * 10);
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins
    const isFree = numAmount === 0;

    let externalPaymentUrl = '';
    let remoteCardNumber = '';
    let remoteInvoiceId = '';
    let remoteFinalAmount = 0;

    // If real token is configured and sandbox is disabled, call BluPal API (only if amount > 0)
    if (numAmount > 0 && settings.blupalToken && !settings.blupalSandboxMode) {
      try {
        const baseUrl = (settings.blupalBaseUrl || 'https://blupal.top').replace(/\/+$/, '');

        const requestBody = {
          amount: amountRial,
          card_number: settings.blupalCardNumber || undefined
        };

        const endpoints = getBluPalEndpoints(baseUrl, settings.blupalCustomEndpoint);

        for (const endpoint of endpoints) {
          try {
            const blupalRes = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-API-Key': settings.blupalToken,
                'Authorization': `Bearer ${settings.blupalToken}`
              },
              body: JSON.stringify(requestBody)
            });

            if (blupalRes.ok) {
              const resData: any = await blupalRes.json();
              const obj = resData.data || resData.result || resData.invoice || resData;

              if (obj && (obj.success || resData.success || obj.payment_link || obj.invoice_id)) {
                externalPaymentUrl = obj.payment_link || obj.payment_url || obj.url || obj.link || externalPaymentUrl;
                remoteCardNumber = obj.card_number || obj.cardNumber || remoteCardNumber;
                remoteInvoiceId = String(obj.invoice_id || obj.id || '');
                if (obj.final_amount) {
                  const rawFinal = Number(obj.final_amount) || 0;
                  remoteFinalAmount = rawFinal > 10000 ? Math.round(rawFinal / 10) : rawFinal;
                }
                if (externalPaymentUrl || remoteInvoiceId) break; // Successfully retrieved invoice details!
              }
            }
          } catch (endpointErr) {
            // Try next endpoint fallback
          }
        }
      } catch (e) {
        console.warn('BluPal real API call failed, falling back to local invoice:', e);
      }
    }

    const payableToman = remoteFinalAmount || numAmount;

    const newInvoice = {
      invoiceId: remoteInvoiceId || invoiceId,
      localInvoiceId: invoiceId,
      amount: numAmount,
      finalAmount: payableToman,
      amountRial: payableToman * 10,
      orderId: orderId || '',
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      description: description || 'پرداخت سفارش آتلیه دیجیتال لاله',
      status: isFree ? 'paid' : 'pending',
      referenceCode: isFree ? ('GIFT-FREE-' + Math.floor(10000000 + Math.random() * 90000000)) : undefined,
      paidAt: isFree ? new Date().toLocaleDateString('fa-IR') : undefined,
      cardNumber: remoteCardNumber || settings.blupalCardNumber || '6219 8619 4528 7193',
      accountHolder: settings.blupalAccountHolder || 'آتلیه تخصصی لاله',
      iban: settings.blupalIban || 'IR720560086190004528719301',
      qrData: `blupal://pay?invoice=${remoteInvoiceId || invoiceId}&amount=${payableToman}&to=${encodeURIComponent(settings.blupalAccountHolder || 'آتلیه لاله')}`,
      paymentUrl: externalPaymentUrl || `https://blupal.top/pay/${remoteInvoiceId || invoiceId}`,
      createdAt: new Date().toLocaleDateString('fa-IR'),
      expiresAt,
      invoiceDetails: invoiceDetails || null
    };

    db.invoices = [newInvoice, ...(db.invoices || []).slice(0, 99)];
    await writeDb(db);

    res.json({ success: true, invoice: newInvoice });
  } catch (err: any) {
    console.error('Error creating BluPal invoice:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal error' });
  }
});

// Check Invoice Status
app.get('/api/blupal/status/:invoiceId', async (req, res) => {
  try {
    const db = await readDb();
    const reqId = String(req.params.invoiceId || '').trim();
    const invoice = (db.invoices || []).find((inv: any) =>
      String(inv.invoiceId || '').trim() === reqId ||
      String(inv.localInvoiceId || '').trim() === reqId ||
      String(inv.orderId || '').trim() === reqId
    );

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    // Check expiration
    if (invoice.status === 'pending' && Date.now() > invoice.expiresAt) {
      invoice.status = 'expired';
      await writeDb(db);
    }

    // If real token and not paid yet, check with BluPal API
    const settings = db.settings || {};
    if (invoice.status === 'pending' && settings.blupalToken && !settings.blupalSandboxMode) {
      try {
        const baseUrl = (settings.blupalBaseUrl || 'https://blupal.top').replace(/\/+$/, '');
        const targetRemoteId = invoice.invoiceId || reqId;

        const blupalRes = await fetch(`${baseUrl}/api/v1/invoices/${targetRemoteId}`, {
          headers: {
            'Accept': 'application/json',
            'X-API-Key': settings.blupalToken,
            'Authorization': `Bearer ${settings.blupalToken}`
          }
        });

        if (blupalRes.ok) {
          const data: any = await blupalRes.json();
          const statusStr = String(data.status || data.event || '').toUpperCase();
          if (
            statusStr === 'PAID' ||
            statusStr === 'COMPLETED' ||
            statusStr === 'PAYMENT.COMPLETED' ||
            (data.success && statusStr === 'PAID')
          ) {
            invoice.status = 'paid';
            invoice.referenceCode = String(data.transaction_id || data.reference_id || ('BLU-' + Math.floor(10000000 + Math.random() * 90000000)));
            invoice.paidAt = new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
            await writeDb(db);
          }
        }
      } catch (e) {
        // Ignore remote check failure
      }
    }

    res.json({ success: true, status: invoice.status, invoice });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Simulate / Trigger instant payment (Sandbox / Demo mode)
app.post('/api/blupal/simulate-pay/:invoiceId', async (req, res) => {
  try {
    const db = await readDb();
    const invoiceId = req.params.invoiceId;
    const invoice = (db.invoices || []).find((inv: any) => inv.invoiceId === invoiceId);

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    invoice.status = 'paid';
    invoice.referenceCode = 'BLU-' + Math.floor(100000000 + Math.random() * 900000000);
    invoice.paidAt = new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    await writeDb(db);

    res.json({ success: true, status: 'paid', referenceCode: invoice.referenceCode, invoice });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test Connection with BluPal (Performs real invoice creation test and reports exact result or error)
app.post('/api/blupal/test-connection', async (req, res) => {
  try {
    const { token, baseUrl, customEndpoint } = req.body;
    const url = (baseUrl || 'https://blupal.top').replace(/\/+$/, '');

    if (!token) {
      return res.json({
        success: false,
        message: 'لطفاً ابتدا توکن دسترسی API بلوپال را در کادر مربوطه وارد نمایید.'
      });
    }

    const testOrderId = 'BLU-TEST-' + Date.now().toString(36).toUpperCase();

    // 100,000 Rials = 10,000 Tomans (Minimum allowed amount by BluPal API doc!)
    const requestBody = {
      amount: 100000
    };

    const endpoints = getBluPalEndpoints(url, customEndpoint);

    let lastError = '';
    let lastStatus = 0;
    let rawResponse: any = null;

    for (const endpoint of endpoints) {
      try {
        const blupalRes = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-Key': token,
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(requestBody)
        });

        lastStatus = blupalRes.status;
        const contentType = blupalRes.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          rawResponse = await blupalRes.json();
        } else {
          const rawText = await blupalRes.text();
          rawResponse = { text: rawText };
        }

        const obj = rawResponse?.data || rawResponse?.result || rawResponse?.invoice || rawResponse;
        const invoiceUrl = obj?.payment_link || obj?.payment_url || obj?.url || obj?.link || obj?.redirect_url;
        const invoiceId = String(obj?.invoice_id || obj?.id || testOrderId);

        if (blupalRes.ok && (rawResponse?.success || obj?.payment_link || obj?.invoice_id)) {
          return res.json({
            success: true,
            message: `فاکتور واقعی با موفقیت در وب‌سرویس بلوپال ایجاد شد! ✅ (شناسه فاکتور: ${invoiceId})`,
            invoiceUrl: invoiceUrl || '',
            invoiceId,
            details: rawResponse
          });
        } else {
          const msg =
            rawResponse?.message ||
            rawResponse?.error ||
            rawResponse?.errors ||
            rawResponse?.detail ||
            (typeof rawResponse?.text === 'string' ? rawResponse.text.slice(0, 150) : null) ||
            `HTTP Error ${blupalRes.status}`;
          lastError = typeof msg === 'object' ? JSON.stringify(msg) : String(msg);
        }
      } catch (endpointErr: any) {
        lastError = endpointErr.message || 'خطا در شبکه';
      }
    }

    // If all endpoints failed, report detailed error to admin
    return res.json({
      success: false,
      message: `خطا در صدور فاکتور توسط سرور بلوپال (کد ${lastStatus || 'شبکه'}): ${lastError}`,
      details: rawResponse
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
    const isPaid =
      rawStatus === 'PAID' ||
      rawStatus === 'COMPLETED' ||
      rawStatus === 'SUCCESSFUL' ||
      rawStatus === 'PAYMENT.COMPLETED' ||
      payload.event === 'payment.completed' ||
      payload.success === true;

    const referenceCode = String(
      payload.transaction_id ||
      payload.reference_id ||
      payload.tracking_code ||
      payload.referenceCode ||
      ('BLU-WH-' + Math.floor(10000000 + Math.random() * 90000000))
    );
    const amount = payload.amount || payload.amount_rial || payload.final_amount;

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
        (strInvoiceId && String(inv.orderId || '').trim() === strInvoiceId) ||
        (!strInvoiceId && inv.status === 'pending');

      if (isMatch) {
        invoiceFound = true;
        return {
          ...inv,
          status: isPaid ? 'paid' : inv.status,
          referenceCode,
          paidAt: isPaid ? timeFa : inv.paidAt
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

// Test/Simulate incoming Webhook trigger from admin
app.post('/api/blupal/test-webhook', async (req, res) => {
  try {
    const db = await readDb();
    const { invoiceId, status = 'paid' } = req.body;
    const targetInvoice = (db.invoices || [])[0];
    const invId = invoiceId || targetInvoice?.invoiceId || ('BLU-DEMO-' + Date.now().toString(36).toUpperCase());

    const timeFa = new Date().toLocaleString('fa-IR', {
      timeZone: 'Asia/Tehran',
      hour: '2-digit',
      minute: '2-digit',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const refCode = 'BLU-TEST-' + Math.floor(10000000 + Math.random() * 90000000);

    // Update invoice
    db.invoices = (db.invoices || []).map((inv: any) => {
      if (inv.invoiceId === invId) {
        return { ...inv, status: 'paid', referenceCode: refCode, paidAt: timeFa };
      }
      return inv;
    });

    const logEntry = {
      id: 'wh-test-' + Date.now(),
      receivedAt: timeFa,
      invoiceId: invId,
      status: 'paid',
      referenceCode: refCode,
      amount: targetInvoice ? targetInvoice.amount : 125000,
      rawPayload: { invoice_id: invId, status: 'paid', reference_id: refCode, simulated: true },
      isMatched: true
    };

    db.webhookLogs = [logEntry, ...(db.webhookLogs || []).slice(0, 19)];
    await writeDb(db);

    res.json({
      success: true,
      message: `تست وب‌هوک با موفقیت انجام شد و وضعیت فاکتور ${invId} به پرداخت شده تغییر یافت ✅`,
      log: logEntry
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
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
    app.get('*', async (_req, res) => {
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
