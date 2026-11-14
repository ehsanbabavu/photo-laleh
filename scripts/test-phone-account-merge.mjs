import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(repo, 'package.json'));
const { build } = createRequire(require.resolve('vite'))('esbuild');
const nativeFetch = globalThis.fetch;
const originalVercel = process.env.VERCEL;
const phone = '09123456789';
const initialDb = {
  users: [
    { id: 'eitaa', role: 'user', category: 'customer', eitaaId: '12345678', phone: '', name: 'Messenger user', password: 'source-password', walletBalance: 100000 },
    { id: 'owner', role: 'user', category: 'customer', phone, name: 'Existing user', password: 'existing-password', walletBalance: 25000, hasUsedFirstOrderGift: true, telegramId: '87654321' },
    { id: 'other', role: 'user', phone: '', name: 'Other user' },
    { id: 'admin', role: 'admin', phone: '09120000001' }
  ],
  orders: [{ id: 'old-order', userId: 'owner' }, { id: 'new-order', userId: 'eitaa' }],
  tickets: [{ id: 'ticket', userId: 'eitaa', messages: [{ message: 'Keep me' }] }],
  invoices: [{ id: 'invoice', userId: 'eitaa', status: 'paid' }],
  lostOrders: [{ id: 'draft', userId: 'eitaa' }],
  partnerInvoices: [{ id: 'partner', partnerId: 'eitaa' }],
  costRequests: [{ id: 'cost', requestedBy: 'eitaa' }],
  announcements: [{ id: 'announcement', readBy: ['eitaa', 'owner', 'other'] }],
  settings: { smsApiToken: 'fixture-only-token' }
};
const fixture = {
  reset() {
    this.db = structuredClone(initialDb);
    this.sessions = new Map(initialDb.users.map(user => [user.id, user.id]));
    this.codes = new Map(); this.sent = []; this.writes = []; this.now = Date.now();
    this.failSession = false; this.failWrite = false; this.rateLimited = false; this.smsFails = false;
    this.beforeVerify = null;
  },
  verify(key, code) {
    const saved = this.codes.get(key);
    if (!saved || saved.expires < this.now || saved.code !== code) return { ok: false, error: 'Invalid or expired code' };
    this.codes.delete(key); this.beforeVerify?.(); return { ok: true };
  }
};
fixture.reset();
globalThis.__phoneMergeTest = fixture;
let listener, directory, base;

before(async () => {
  await fs.mkdir(path.join(repo, 'work'), { recursive: true });
  directory = await fs.mkdtemp(path.join(repo, 'work/phone-merge-tests-'));
  const output = path.join(directory, 'server.mjs');
  const exports = [
    'deleteSessionsByDevice', 'recordAudit', 'listAudit', 'listUserSessions', 'revokeSession', 'getStorageStatus',
    'testPostgresConnection', 'bootstrapPostgresAdminCredentials', 'copyStorageProviderData', 'switchStorageProvider'
  ];
  await build({ absWorkingDir: repo, tsconfigRaw: {}, entryPoints: [path.join(repo, 'server.ts')], outfile: output, bundle: true, packages: 'external', platform: 'node', format: 'esm', logLevel: 'silent',
    plugins: [{ name: 'phone-merge-storage', setup(builder) {
      builder.onResolve({ filter: /^\.\/storage$/ }, () => ({ path: 'storage', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ loader: 'js', contents: [
        'const f = globalThis.__phoneMergeTest;',
        'export const readDb = async () => structuredClone(f.db);',
        'export const writeDb = async (db, options) => { if (f.failWrite) throw new Error("Fixture write failure"); f.writes.push(options); f.db = structuredClone(db); };',
        'export const findSession = async token => f.sessions.has(token) ? { userId: f.sessions.get(token) } : null;',
        'export const createSession = async id => { if (f.failSession) return null; const token = "session-" + f.sessions.size; f.sessions.set(token, id); return token; };',
        'export const deleteSession = async token => { f.sessions.delete(token); };',
        'export const deleteUserSessions = async id => { for (const [token, userId] of f.sessions) if (userId === id) f.sessions.delete(token); };',
        'export const saveOtpCode = async (key, code, ttl) => { f.codes.set(key, { code, expires: f.now + ttl }); return true; };',
        'export const verifyOtpCode = async (key, code) => f.verify(key, code);',
        'export const bumpRateLimit = async () => f.rateLimited ? 100 : 1;',
        'export const readMaintenanceQueue = async () => null;',
        'export const readBlogState = async () => null;',
        'export const compareAndSetBlogState = async () => false;',
        'export const compareAndSetMaintenanceQueue = async () => false;',
        'export const readMaintenanceDeliveryConfig = async () => f.db.settings;',
        ...exports.map(name => `export const ${name} = async () => [];`)
      ].join('\n') }));
    } }]
  });
  process.env.VERCEL = '1';
  globalThis.fetch = async (url, options) => {
    if (String(url) === 'https://s.api.ir/api/sw1/SmsOTP') {
      fixture.sent.push(JSON.parse(options.body));
      return new Response(JSON.stringify({ success: !fixture.smsFails }), { status: fixture.smsFails ? 502 : 200 });
    }
    return nativeFetch(url, options);
  };
  const { app } = await import(pathToFileURL(output).href);
  listener = app.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  base = `http://127.0.0.1:${listener.address().port}`;
});
beforeEach(() => fixture.reset());
after(async () => {
  globalThis.fetch = nativeFetch;
  if (originalVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = originalVercel;
  if (listener) await new Promise(resolve => listener.close(resolve));
  if (directory) { await fs.unlink(path.join(directory, 'server.mjs')).catch(() => undefined); await fs.rmdir(directory); }
  delete globalThis.__phoneMergeTest;
});
async function post(route, body, session = 'eitaa') {
  const response = await nativeFetch(`${base}/api/auth/${route}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(session ? { Cookie: `laleh_session=${session}` } : {}) }, body: JSON.stringify(body)
  });
  return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie') };
}
const request = (number = phone, session = 'eitaa') => post('phone/otp/request', { phone: number }, session);
const verify = (code = fixture.sent.at(-1)?.code, number = phone, session = 'eitaa') => post('phone/otp/verify', { phone: number, code }, session);

test('an existing phone receives an OTP without modifying either account', async () => {
  assert.equal((await request('+98 912 345 6789')).status, 200);
  assert.equal(fixture.sent[0].mobile, phone);
  assert.deepEqual(fixture.db, initialDb);
  assert.equal(fixture.writes.length, 0);
});

test('verified phone merges records into its owner and replaces the active session', async () => {
  await request();
  const response = await verify();
  assert.equal(response.status, 200);
  assert.equal(response.body.merged, true);
  assert.equal(response.body.user.id, 'owner');
  assert.equal(response.body.user.eitaaId, '12345678');
  assert.equal(response.body.user.password, undefined);
  const owner = fixture.db.users.find(user => user.id === 'owner');
  assert.equal(owner.password, 'existing-password');
  assert.equal(owner.walletBalance, 25000);
  assert.equal(owner.hasUsedFirstOrderGift, true);
  assert.equal(owner.telegramId, '87654321');
  assert.ok(owner.phoneVerifiedAt);
  assert.ok(!fixture.db.users.some(user => user.id === 'eitaa'));
  for (const collection of ['orders', 'tickets', 'invoices', 'lostOrders']) {
    assert.ok(fixture.db[collection].every(item => item.userId === 'owner'));
  }
  assert.equal(fixture.db.partnerInvoices[0].partnerId, 'owner');
  assert.equal(fixture.db.costRequests[0].requestedBy, 'owner');
  assert.deepEqual(fixture.db.tickets[0].messages, initialDb.tickets[0].messages);
  assert.deepEqual(fixture.db.announcements[0].readBy, ['owner', 'other']);
  assert.deepEqual(fixture.writes, [{ atomic: true }]);
  assert.ok(!fixture.sessions.has('eitaa'));
  const cookie = response.cookie.split(';')[0];
  const me = await nativeFetch(`${base}/api/auth/me`, { headers: { Cookie: cookie } });
  assert.equal((await me.json()).user.id, 'owner');
  assert.equal((await verify()).status, 401);
  const login = await post('eitaa', { userId: '12345678' }, null);
  assert.equal(login.status, 200);
  assert.equal(login.body.user.id, 'owner');
});

test('invalid and expired codes cannot mutate or merge accounts', async () => {
  await request();
  assert.equal((await verify('000000')).status, 400);
  fixture.now += 121000;
  assert.equal((await verify()).status, 400);
  assert.deepEqual(fixture.db, initialDb);
});

test('profile OTPs are bound to both the requesting session owner and phone', async () => {
  fixture.db.users.find(user => user.id === 'other').eitaaId = '99887766';
  await request();
  assert.equal((await verify(undefined, phone, 'other')).status, 400);
  assert.equal((await verify(undefined, '09121111111')).status, 400);
  const code = fixture.sent.at(-1).code;
  fixture.codes.clear(); fixture.codes.set(phone, { code, expires: fixture.now + 120000 });
  assert.equal((await verify(code)).status, 400);
  assert.equal(fixture.writes.length, 0);
});

test('new phone verification keeps the current account and its session', async () => {
  const newPhone = '۰۹۱۲۱۱۱۱۱۱۱';
  await request(newPhone);
  const response = await verify(undefined, newPhone);
  assert.equal(response.status, 200);
  assert.equal(response.body.user.id, 'eitaa');
  assert.equal(response.body.user.phone, '09121111111');
  assert.equal(fixture.db.users.length, initialDb.users.length);
  assert.ok(fixture.sessions.has('eitaa'));
});

test('non-messenger users and admin phone owners cannot be merged', async () => {
  assert.equal((await request(phone, 'other')).status, 409);
  assert.equal((await request('09120000001')).status, 409);
  assert.equal(fixture.sent.length, 0);
  assert.deepEqual(fixture.db, initialDb);
});

test('conflicting messenger identities are not overwritten', async () => {
  fixture.db.users.find(user => user.id === 'owner').eitaaId = '11112222';
  assert.equal((await request()).status, 409);
  fixture.db.users.find(user => user.id === 'owner').eitaaId = '';
  fixture.db.users.find(user => user.id === 'eitaa').telegramId = '11112222';
  assert.equal((await request()).status, 409);
});

test('a conflict introduced during OTP verification is rechecked before writing', async () => {
  await request();
  fixture.beforeVerify = () => { fixture.db.users.find(user => user.id === 'owner').role = 'admin'; };
  assert.equal((await verify()).status, 409);
  assert.equal(fixture.writes.length, 0);
  assert.ok(fixture.db.users.some(user => user.id === 'eitaa'));
});

test('failed session creation or persistence leaves the original accounts intact', async () => {
  await request(); fixture.failSession = true;
  assert.equal((await verify()).status, 503);
  assert.deepEqual(fixture.db, initialDb);
  fixture.failSession = false; fixture.failWrite = true;
  await request();
  assert.equal((await verify()).status, 500);
  assert.deepEqual(fixture.db, initialDb);
  assert.deepEqual([...fixture.sessions.keys()], initialDb.users.map(user => user.id));
});

test('unauthenticated, invalid, rate-limited and failed SMS requests do not change accounts', async () => {
  assert.equal((await request(phone, null)).status, 401);
  assert.equal((await request('123')).status, 400);
  fixture.rateLimited = true;
  assert.equal((await request()).status, 429);
  fixture.rateLimited = false; fixture.smsFails = true;
  assert.equal((await request()).status, 400);
  assert.equal(fixture.codes.size, 0);
  assert.deepEqual(fixture.db, initialDb);
});
