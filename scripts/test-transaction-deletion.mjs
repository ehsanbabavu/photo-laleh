import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireProject = createRequire(path.join(repo, 'package.json'));
const { build } = createRequire(requireProject.resolve('vite'))('esbuild');
const nativeFetch = globalThis.fetch;
const originalVercel = process.env.VERCEL;
const originalSmsToken = process.env.SMS_API_TOKEN;
const initialDb = {
  users: [
    { id: 'admin-1', role: 'admin', phone: '09120000001', name: 'Test admin' },
    { id: 'admin-2', role: 'admin', phone: '09120000002', name: 'Second admin' },
    { id: 'customer', role: 'user', phone: '09120000003' }
  ],
  invoices: [
    { id: 'txn-1', invoiceId: '101', provider: 'blupal', mode: 'live', isRemote: true, status: 'paid', amountRial: 1250123 },
    { id: 'txn-2', invoiceId: '102', provider: 'blupal', mode: 'live', isRemote: true, status: 'paid', amountRial: 1500456 },
    { id: 'pending', invoiceId: '103', provider: 'blupal', status: 'pending', amountRial: 1200000 }
  ],
  orders: [{ id: 'order-1', paymentInvoiceId: '101', paymentReference: 'REF-1', paymentStatus: 'paid' }],
  settings: { smsApiToken: 'fixture-only-token' },
  webhookLogs: [{ id: 'event-1', invoiceId: '101' }]
};
const fixture = {
  reset() {
    this.db = structuredClone(initialDb);
    this.codes = new Map();
    this.sent = [];
    this.now = Date.now();
    this.smsFails = false;
    this.saveFails = false;
    this.writeFails = false;
    this.rateLimited = false;
    this.beforeVerify = null;
  },
  readDb() { return structuredClone(this.db); },
  writeDb(db) {
    if (this.writeFails) throw new Error('Fixture write failed');
    this.db = structuredClone(db);
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
      return { ok: false, error: 'کد تأیید نادرست یا منقضی شده است' };
    }
    if (saved.code !== code) {
      saved.attempts += 1;
      return { ok: false, error: 'کد تأیید نادرست است' };
    }
    this.codes.delete(key);
    this.beforeVerify?.();
    return { ok: true };
  }
};
fixture.reset();
globalThis.__transactionDeletionTest = fixture;
let listener;
let temporaryDirectory;
let base;
const genericExports = [
  'createSession', 'deleteSession', 'deleteUserSessions', 'deleteSessionsByDevice', 'recordAudit', 'listAudit',
  'listUserSessions', 'revokeSession', 'getStorageStatus', 'testPostgresConnection',
  'bootstrapPostgresAdminCredentials', 'copyStorageProviderData', 'switchStorageProvider'
];

before(async () => {
  await fs.mkdir(path.join(repo, 'work'), { recursive: true });
  temporaryDirectory = await fs.mkdtemp(path.join(repo, 'work/deletion-tests-'));
  const bundle = path.join(temporaryDirectory, 'server.mjs');
  await build({
    entryPoints: [path.join(repo, 'server.ts')], outfile: bundle,
    bundle: true, packages: 'external', platform: 'node', format: 'esm', logLevel: 'silent',
    plugins: [{ name: 'test-storage', setup(builder) {
      builder.onResolve({ filter: /^\.\/storage$/ }, () => ({ path: 'storage', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ loader: 'js', contents: [
        'export const readDb = async () => globalThis.__transactionDeletionTest.readDb();',
        'export const writeDb = async (db) => globalThis.__transactionDeletionTest.writeDb(db);',
        'export const saveOtpCode = async (...args) => globalThis.__transactionDeletionTest.saveOtpCode(...args);',
        'export const verifyOtpCode = async (...args) => globalThis.__transactionDeletionTest.verifyOtpCode(...args);',
        'export const findSession = async (token) => ["admin-1", "admin-2", "customer"].includes(token) ? { userId: token } : null;',
        'export const bumpRateLimit = async () => globalThis.__transactionDeletionTest.rateLimited ? 4 : 1;',
        ...genericExports.map((name) => `export const ${name} = async () => [];`)
      ].join('\n') }));
    } }]
  });
  process.env.VERCEL = '1';
  delete process.env.SMS_API_TOKEN;
  globalThis.fetch = async (input, options) => {
    if (String(input) === 'https://s.api.ir/api/sw1/SmsOTP') {
      const payload = JSON.parse(options.body);
      fixture.sent.push(payload);
      return new Response(JSON.stringify({ success: !fixture.smsFails }), { status: fixture.smsFails ? 502 : 200 });
    }
    return nativeFetch(input, options);
  };
  const { app } = await import(pathToFileURL(bundle).href);
  listener = app.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  base = `http://127.0.0.1:${listener.address().port}`;
});

beforeEach(() => fixture.reset());
after(async () => {
  globalThis.fetch = nativeFetch;
  if (originalVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = originalVercel;
  if (originalSmsToken === undefined) delete process.env.SMS_API_TOKEN;
  else process.env.SMS_API_TOKEN = originalSmsToken;
  if (listener) await new Promise((resolve) => listener.close(resolve));
  if (temporaryDirectory) {
    await fs.unlink(path.join(temporaryDirectory, 'server.mjs')).catch(() => undefined);
    await fs.rmdir(temporaryDirectory);
  }
  delete globalThis.__transactionDeletionTest;
});

async function post(route, body = {}, session = 'admin-1') {
  const response = await nativeFetch(`${base}${route}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(session ? { Cookie: `laleh_session=${session}` } : {}) },
    body: JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
}
const requestCode = (id = 'txn-1', session = 'admin-1') => post(`/api/admin/transactions/${id}/delete/request`, {}, session);
const confirm = (id, code, session = 'admin-1') => post(`/api/admin/transactions/${id}/delete/confirm`, { code }, session);
const code = () => fixture.sent.at(-1).code;
const wrongCode = () => code() === '123456' ? '654321' : '123456';

test('requires an admin session for both deletion endpoints', async () => {
  for (const session of [null, 'customer']) {
    assert.equal((await requestCode('txn-1', session)).status, session ? 403 : 401);
    assert.equal((await confirm('txn-1', '123456', session)).status, session ? 403 : 401);
  }
  assert.deepEqual(fixture.db, initialDb);
  assert.equal(fixture.sent.length, 0);
});

test('sends a code to the signed-in admin and does not delete during the request', async () => {
  const response = await requestCode('txn-1', 'admin-2');
  assert.equal(response.status, 200);
  assert.equal(response.body.phone, '091*****002');
  assert.equal(response.body.expiresIn, 120);
  assert.equal('code' in response.body, false);
  assert.equal(fixture.sent[0].mobile, '09120000002');
  assert.match(code(), /^\d{6}$/);
  assert.deepEqual(fixture.db, initialDb);
});

test('rejects missing, wrong and expired codes without deleting', async () => {
  assert.equal((await confirm('txn-1', '123456')).status, 400);
  await requestCode();
  assert.equal((await confirm('txn-1', '')).status, 400);
  assert.equal((await confirm('txn-1', wrongCode())).status, 400);
  fixture.now += 120001;
  assert.equal((await confirm('txn-1', code())).status, 400);
  assert.deepEqual(fixture.db, initialDb);
});

test('binds the code to the selected transaction and administrator', async () => {
  await requestCode();
  assert.equal((await confirm('txn-2', code())).status, 400);
  assert.equal((await confirm('txn-1', code(), 'admin-2')).status, 400);
  assert.deepEqual(fixture.db, initialDb);
});

test('limits incorrect guesses', async () => {
  await requestCode();
  for (let index = 0; index < 5; index += 1) assert.equal((await confirm('txn-1', wrongCode())).status, 400);
  assert.equal((await confirm('txn-1', code())).status, 400);
  assert.deepEqual(fixture.db, initialDb);
});

test('rejects missing and pending transactions before sending a code', async () => {
  for (const id of ['missing', 'pending']) assert.equal((await requestCode(id)).status, 404);
  assert.equal(fixture.sent.length, 0);
  assert.deepEqual(fixture.db, initialDb);
});

test('SMS failures, missing configuration and invalid admin phones cannot authorize deletion', async () => {
  fixture.smsFails = true;
  assert.equal((await requestCode()).status, 400);
  assert.equal(fixture.codes.size, 0);
  fixture.smsFails = false;
  fixture.db.settings.smsApiToken = '';
  assert.equal((await requestCode()).status, 400);
  fixture.db.users[0].phone = '';
  assert.equal((await requestCode()).status, 400);
  assert.equal(fixture.db.invoices.length, 3);
});

test('a failed code save cannot authorize deletion', async () => {
  fixture.saveFails = true;
  assert.equal((await requestCode()).status, 400);
  assert.equal((await confirm('txn-1', code())).status, 400);
  assert.deepEqual(fixture.db, initialDb);
});

test('rate limits repeated SMS requests', async () => {
  fixture.rateLimited = true;
  assert.equal((await requestCode()).status, 429);
  assert.equal(fixture.sent.length, 0);
  assert.deepEqual(fixture.db, initialDb);
});

test('a valid Persian-digit code deletes only the selected invoice and cannot be replayed', async () => {
  await requestCode();
  const originalCode = code();
  const persianCode = originalCode.replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
  const response = await confirm('txn-1', persianCode);
  assert.equal(response.status, 200);
  assert.equal(response.body.deletedId, 'txn-1');
  assert.deepEqual(fixture.db.invoices, initialDb.invoices.slice(1));
  assert.deepEqual(fixture.db.orders, initialDb.orders);
  assert.deepEqual(fixture.db.webhookLogs, initialDb.webhookLogs);
  assert.equal(fixture.codes.size, 0);
  assert.equal((await confirm('txn-1', originalCode)).status, 404);
  assert.equal((await confirm('txn-2', originalCode)).status, 400);
});

test('preserves records added while the verification is in flight', async () => {
  await requestCode();
  fixture.beforeVerify = () => fixture.db.invoices.push({ ...initialDb.invoices[1], id: 'new-txn', invoiceId: '104' });
  assert.equal((await confirm('txn-1', code())).status, 200);
  assert.equal(fixture.db.invoices.some((invoice) => invoice.id === 'new-txn'), true);
});

test('reports a persistence failure and leaves the invoice present', async () => {
  await requestCode();
  fixture.writeFails = true;
  assert.equal((await confirm('txn-1', code())).status, 500);
  assert.deepEqual(fixture.db, initialDb);
});

test('order deletion checks the verification result and cannot reuse its code for a transaction', async () => {
  fixture.db.orders[0].id = 'txn-1';
  assert.equal((await post('/api/admin/orders/txn-1/delete/request')).status, 200);
  assert.equal((await confirm('txn-1', code())).status, 400);
  assert.equal((await post('/api/admin/orders/txn-1/delete/confirm', { code: wrongCode() })).status, 400);
  assert.equal(fixture.db.orders.length, 1);
  assert.equal((await post('/api/admin/orders/txn-1/delete/confirm', { code: code() })).status, 200);
  assert.equal(fixture.db.orders.length, 0);
  assert.deepEqual(fixture.db.invoices, initialDb.invoices);
});
