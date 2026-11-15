import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const requireProject = createRequire(path.join(repo, 'package.json'));
const { build } = createRequire(requireProject.resolve('vite'))('esbuild');

export async function createRecoveryFixture() {
  const fixture = {
    reset() {
      this.db = {
        users: [
          { id: 'customer', role: 'user', name: 'کاربر آزمایشی', phone: '09120000001', telegramId: '123456789', eitaaId: '987654321', password: 'old-password' },
          { id: 'second', role: 'user', phone: '09120000002', telegramId: '222222222', eitaaId: '333333333', password: 'second-password' },
          { id: 'unlinked', role: 'user', phone: '09120000003', password: 'unlinked-password' },
          { id: 'eitaa-only', role: 'user', phone: '', eitaaId: '444444444', password: 'eitaa-password' },
          { id: 'telegram-only', role: 'user', phone: '', telegramId: '555555555', password: 'telegram-password' }
        ],
        settings: { smsApiToken: 'test-sms-token', telegramToken: 'test-telegram-token', eitaaToken: 'test-eitaa-token' },
        orders: [], invoices: [], services: []
      };
      this.codes = new Map();
      this.rates = new Map();
      this.sent = [];
      this.revoked = [];
      this.sessions = [];
      this.now = Date.now();
      this.deliveryFailure = '';
      this.saveFails = false;
    },
    saveOtpCode(key, code, ttl) {
      if (this.saveFails) return false;
      this.codes.set(key, { code, expires: this.now + ttl, attempts: 0 });
      return true;
    },
    verifyOtpCode(key, code) {
      const saved = this.codes.get(key);
      if (!saved || saved.expires < this.now || saved.attempts >= 5) {
        this.codes.delete(key);
        return { ok: false, error: 'کد تایید نادرست یا منقضی شده است' };
      }
      if (saved.code !== code) {
        saved.attempts += 1;
        return { ok: false, error: 'کد تایید نادرست است' };
      }
      this.codes.delete(key);
      return { ok: true };
    }
  };
  fixture.reset();
  globalThis.__passwordRecoveryFixture = fixture;
  const originals = Object.fromEntries(['VERCEL', 'SMS_API_TOKEN', 'TELEGRAM_BOT_TOKEN', 'EITAA_TOKEN'].map(key => [key, process.env[key]]));
  const nativeFetch = globalThis.fetch;
  await fs.mkdir(path.join(repo, 'work'), { recursive: true });
  const directory = await fs.mkdtemp(path.join(repo, 'work/recovery-tests-'));
  const bundle = path.join(directory, 'server.mjs');
  const genericExports = [
    'deleteSession', 'deleteSessionsByDevice', 'recordAudit', 'listAudit', 'listUserSessions', 'revokeSession',
    'getStorageStatus', 'testPostgresConnection', 'bootstrapPostgresAdminCredentials', 'copyStorageProviderData', 'switchStorageProvider'
  ];
  await build({
    entryPoints: [path.join(repo, 'server.ts')], outfile: bundle,
    bundle: true, packages: 'external', platform: 'node', format: 'esm', logLevel: 'silent',
    plugins: [{ name: 'recovery-test-storage', setup(builder) {
      builder.onResolve({ filter: /^\.\/storage$/ }, () => ({ path: 'storage', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ loader: 'js', contents: [
        'const fixture = globalThis.__passwordRecoveryFixture;',
        'export const readDb = async () => structuredClone(fixture.db);',
        'export const writeDb = async (db) => { fixture.db = structuredClone(db); };',
        'export const readMaintenanceQueue = async () => null;',
        'export const readBlogState = async () => null;',
        'export const compareAndSetBlogState = async () => false;',
        'export const compareAndSetMaintenanceQueue = async () => false;',
        'export const readMaintenanceDeliveryConfig = async () => ({});',
        'export const saveOtpCode = async (...args) => fixture.saveOtpCode(...args);',
        'export const verifyOtpCode = async (...args) => fixture.verifyOtpCode(...args);',
        'export const bumpRateLimit = async (key) => { const count = (fixture.rates.get(key) || 0) + 1; fixture.rates.set(key, count); return count; };',
        'export const createSession = async (id) => { fixture.sessions.push(id); return "fixture-session"; };',
        'export const findSession = async () => null;',
        'export const deleteUserSessions = async (id) => { fixture.revoked.push(id); };',
        ...genericExports.map(name => `export const ${name} = async () => [];`)
      ].join('\n') }));
    } }]
  });
  process.env.VERCEL = '1';
  for (const key of ['SMS_API_TOKEN', 'TELEGRAM_BOT_TOKEN', 'EITAA_TOKEN']) delete process.env[key];
  globalThis.fetch = async (input, options) => {
    const url = String(input);
    const channel = url === 'https://s.api.ir/api/sw1/SmsOTP' ? 'sms'
      : url.startsWith('https://api.telegram.org/') ? 'telegram'
      : url.startsWith('https://eitaayar.ir/') ? 'eitaa' : null;
    if (!channel) {
      if (/^http:\/\/127\.0\.0\.1:/.test(url)) return nativeFetch(input, options);
      throw new Error('Unexpected external request in recovery test');
    }
    const payload = JSON.parse(options.body);
    assert.ok(options.signal, 'delivery must have a timeout');
    const code = channel === 'sms' ? payload.code : payload.text.match(/: (\d{6})/)[1];
    fixture.sent.push({ channel, recipient: payload.mobile || payload.chat_id, code, payload });
    if (fixture.deliveryFailure === 'network') throw new Error('Fixture provider unavailable');
    return new Response(JSON.stringify({ success: !fixture.deliveryFailure, ok: !fixture.deliveryFailure }), {
      status: fixture.deliveryFailure === 'http' ? 502 : 200
    });
  };
  const { app } = await import(pathToFileURL(bundle).href);
  return {
    app, fixture, nativeFetch,
    async close() {
      globalThis.fetch = nativeFetch;
      for (const [key, value] of Object.entries(originals)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      delete globalThis.__passwordRecoveryFixture;
      await fs.unlink(bundle);
      await fs.rmdir(directory);
    }
  };
}
