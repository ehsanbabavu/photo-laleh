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
const originalTelegramToken = process.env.TELEGRAM_BOT_TOKEN;
const originalEitaaToken = process.env.EITAA_TOKEN;
const initialDb = {
  users: [
    { id: 'admin-1', role: 'admin', phone: '09120000001', name: 'Test admin', telegramId: '123456789', eitaaId: '987654321' },
    { id: 'admin-2', role: 'admin', phone: '09120000002', name: 'Second admin', telegramId: '222222222', eitaaId: '333333333' },
    { id: 'customer', role: 'user', phone: '09120000003' }
  ],
  invoices: [
    { id: 'txn-1', invoiceId: '101', provider: 'blupal', mode: 'live', isRemote: true, status: 'paid', amountRial: 1250123 },
    { id: 'txn-2', invoiceId: '102', provider: 'blupal', mode: 'live', isRemote: true, status: 'paid', amountRial: 1500456 },
    { id: 'pending', invoiceId: '103', provider: 'blupal', status: 'pending', amountRial: 1200000 }
  ],
  orders: [{ id: 'order-1', paymentInvoiceId: '101', paymentReference: 'REF-1', paymentStatus: 'paid' }],
  settings: { smsApiToken: 'fixture-only-token', telegramToken: 'fixture-telegram-token', eitaaToken: 'fixture-eitaa-token' },
  webhookLogs: [{ id: 'event-1', invoiceId: '101' }]
};
const fixture = {
  reset() {
    this.db = structuredClone(initialDb);
    this.codes = new Map();
    this.sent = [];
    this.messengerSent = [];
    this.messengerFails = false;
    this.messengerHttpFails = false;
    this.messengerThrows = false;
    this.rateKeys = [];
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
        'export const bumpRateLimit = async (key) => { const fixture = globalThis.__transactionDeletionTest; fixture.rateKeys.push(key); return fixture.rateLimited ? 4 : 1; };',
        ...genericExports.map((name) => `export const ${name} = async () => [];`)
      ].join('\n') }));
    } }]
  });
  process.env.VERCEL = '1';
  delete process.env.SMS_API_TOKEN;
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.EITAA_TOKEN;
  globalThis.fetch = async (input, options) => {
    if (String(input) === 'https://s.api.ir/api/sw1/SmsOTP') {
      const payload = JSON.parse(options.body);
      fixture.sent.push(payload);
      return new Response(JSON.stringify({ success: !fixture.smsFails }), { status: fixture.smsFails ? 502 : 200 });
    }
    const url = String(input);
    if (url.startsWith('https://api.telegram.org/') || url.startsWith('https://eitaayar.ir/')) {
      const payload = JSON.parse(options.body);
      const channel = url.includes('telegram.org') ? 'telegram' : 'eitaa';
      fixture.messengerSent.push({ channel, payload, code: payload.text.match(/: (\d{6})/)[1] });
      assert.ok(options.signal);
      if (fixture.messengerThrows) throw new Error('Fixture network failure');
      return new Response(JSON.stringify({ ok: !fixture.messengerFails, description: 'Fixture failure', result: { message_id: 1 } }), { status: fixture.messengerHttpFails ? 502 : 200 });
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
  if (originalTelegramToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
  else process.env.TELEGRAM_BOT_TOKEN = originalTelegramToken;
  if (originalEitaaToken === undefined) delete process.env.EITAA_TOKEN;
  else process.env.EITAA_TOKEN = originalEitaaToken;
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
const requestCode = (id = 'txn-1', session = 'admin-1', channel = 'sms') => post(`/api/admin/transactions/${id}/delete/request`, { channel }, session);
const confirm = (id, code, session = 'admin-1', channel = 'sms') => post(`/api/admin/transactions/${id}/delete/confirm`, { code, channel }, session);
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

for (const channel of ['telegram', 'eitaa']) {
  const field = channel === 'telegram' ? 'telegramId' : 'eitaaId';
  const tokenField = channel === 'telegram' ? 'telegramToken' : 'eitaaToken';
  test(`${channel}: delivers to the stored administrator identity and deletes only after confirmation`, async () => {
    fixture.db.users[1].phone = '';
    const response = await post('/api/admin/transactions/txn-1/delete/request', { channel, recipient: 'attacker', telegramId: 'attacker', eitaaId: 'attacker' }, 'admin-2');
    assert.equal(response.status, 200);
    assert.equal(response.body.channel, channel);
    assert.equal(response.body.destination, fixture.db.users[1][field]);
    assert.equal(response.body.expiresIn, 120);
    assert.equal('code' in response.body, false);
    assert.equal(fixture.sent.length, 0);
    const sent = fixture.messengerSent[0];
    assert.equal(sent.channel, channel);
    assert.equal(sent.payload.chat_id, fixture.db.users[1][field]);
    assert.match(sent.payload.text, /فاکتور 101/);
    assert.match(sent.code, /^\d{6}$/);
    assert.equal(fixture.db.invoices.length, 3);
    assert.equal((await confirm('txn-1', '000000', 'admin-2', channel)).status, 400);
    assert.equal((await confirm('txn-1', sent.code, 'admin-2', channel)).status, 200);
    assert.deepEqual(fixture.db.invoices, initialDb.invoices.slice(1));
    assert.deepEqual(fixture.db.orders, initialDb.orders);
    assert.deepEqual(fixture.db.webhookLogs, initialDb.webhookLogs);
    assert.equal((await confirm('txn-2', sent.code, 'admin-2', channel)).status, 400);
  });

  test(`${channel}: codes cannot cross channels, administrators, transactions or changed recipients`, async () => {
    assert.equal((await requestCode('txn-1', 'admin-1', channel)).status, 200);
    const sentCode = fixture.messengerSent[0].code;
    for (const otherChannel of ['sms', 'telegram', 'eitaa'].filter((value) => value !== channel)) {
      assert.equal((await confirm('txn-1', sentCode, 'admin-1', otherChannel)).status, 400);
    }
    assert.equal((await confirm('txn-1', sentCode, 'admin-2', channel)).status, 400);
    assert.equal((await confirm('txn-2', sentCode, 'admin-1', channel)).status, 400);
    fixture.db.users[0][field] = '444444444';
    assert.equal((await confirm('txn-1', sentCode, 'admin-1', channel)).status, 400);
    assert.equal(fixture.db.invoices.length, 3);
  });

  test(`${channel}: rejects unauthenticated requests and missing identities or tokens`, async () => {
    for (const session of [null, 'customer']) {
      assert.equal((await requestCode('txn-1', session, channel)).status, session ? 403 : 401);
      assert.equal((await confirm('txn-1', '123456', session, channel)).status, session ? 403 : 401);
    }
    fixture.db.users[0][field] = '';
    assert.equal((await requestCode('txn-1', 'admin-1', channel)).status, 400);
    fixture.db.users[0][field] = initialDb.users[0][field];
    fixture.db.settings[tokenField] = '';
    assert.equal((await requestCode('txn-1', 'admin-1', channel)).status, 400);
    assert.equal(fixture.messengerSent.length, 0);
    assert.equal(fixture.codes.size, 0);
  });

  test(`${channel}: provider errors, HTTP failures, network failures and code-save failures cannot authorize deletion`, async () => {
    for (const failure of ['messengerFails', 'messengerHttpFails', 'messengerThrows', 'saveFails']) {
      fixture[failure] = true;
      assert.equal((await requestCode('txn-1', 'admin-1', channel)).status, 400);
      fixture[failure] = false;
      assert.equal(fixture.codes.size, 0);
      assert.equal((await confirm('txn-1', fixture.messengerSent.at(-1).code, 'admin-1', channel)).status, 400);
    }
    assert.deepEqual(fixture.db, initialDb);
  });

  test(`${channel}: expired codes and five incorrect attempts prevent deletion`, async () => {
    await requestCode('txn-1', 'admin-1', channel);
    const sentCode = fixture.messengerSent.at(-1).code;
    fixture.now += 120001;
    assert.equal((await confirm('txn-1', sentCode, 'admin-1', channel)).status, 400);
    await requestCode('txn-1', 'admin-1', channel);
    const newCode = fixture.messengerSent.at(-1).code;
    for (let index = 0; index < 5; index += 1) assert.equal((await confirm('txn-1', '000000', 'admin-1', channel)).status, 400);
    assert.equal((await confirm('txn-1', newCode, 'admin-1', channel)).status, 400);
    assert.deepEqual(fixture.db, initialDb);
  });
}

test('rejects unsupported channels and non-private Telegram recipients', async () => {
  for (const channel of ['email', '', null]) {
    assert.equal((await requestCode('txn-1', 'admin-1', channel)).status, 400);
    assert.equal((await confirm('txn-1', '123456', 'admin-1', channel)).status, 400);
  }
  for (const telegramId of ['@username', '-100123456789', 'not-an-id']) {
    fixture.db.users[0].telegramId = telegramId;
    assert.equal((await requestCode('txn-1', 'admin-1', 'telegram')).status, 400);
  }
  assert.equal(fixture.messengerSent.length, 0);
  assert.equal(fixture.sent.length, 0);
});

test('all delivery channels share the transaction request rate limit', async () => {
  for (const channel of ['sms', 'telegram', 'eitaa']) assert.equal((await requestCode('txn-1', 'admin-1', channel)).status, 200);
  assert.equal(new Set(fixture.rateKeys).size, 1);
  fixture.rateLimited = true;
  for (const channel of ['sms', 'telegram', 'eitaa']) assert.equal((await requestCode('txn-1', 'admin-1', channel)).status, 429);
  assert.equal(fixture.sent.length, 1);
  assert.equal(fixture.messengerSent.length, 2);
});

test('administrator messenger identities persist through user creation and editing', async () => {
  const response = await post('/api/users', { id: 'new-admin', role: 'admin', category: 'customer', name: 'New admin', telegramId: ' ۱۲۳۴۵۶۷۸۹ ', eitaaId: ' ۹۸۷۶۵۴۳۲۱ ' });
  assert.equal(response.status, 200);
  assert.equal(fixture.db.users.at(-1).telegramId, '123456789');
  assert.equal(fixture.db.users.at(-1).eitaaId, '987654321');
  const saved = await nativeFetch(`${base}/api/users/new-admin`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: 'laleh_session=admin-1' },
    body: JSON.stringify({ category: 'customer', role: 'admin', telegramId: ' ۲۲۲۲۲۲۲۲۲ ', eitaaId: ' ۳۳۳۳۳۳۳۳۳ ' })
  });
  assert.equal(saved.status, 200);
  assert.equal(fixture.db.users.at(-1).telegramId, '222222222');
  assert.equal(fixture.db.users.at(-1).eitaaId, '333333333');
});

const requestOrderCode = (channel = 'sms', id = 'order-1', session = 'admin-1') => post(`/api/admin/orders/${id}/delete/request`, { channel }, session);
const confirmOrder = (value, channel = 'sms', id = 'order-1', session = 'admin-1') => post(`/api/admin/orders/${id}/delete/confirm`, { code: value, channel }, session);

for (const channel of ['sms', 'telegram', 'eitaa']) {
  const sentOrderCode = () => channel === 'sms' ? fixture.sent.at(-1).code : fixture.messengerSent.at(-1).code;
  test(`orders ${channel}: only a verified code deletes the chosen order and preserves invoices`, async () => {
    fixture.db.orders.push({ id: 'order-2', trackingCode: 'OTHER' });
    fixture.db.orders[0].trackingCode = 'TRACK-1';
    const response = await requestOrderCode(channel, 'order-1', 'admin-2');
    assert.equal(response.status, 200);
    assert.equal(response.body.channel, channel);
    assert.equal(response.body.expiresIn, 120);
    assert.equal('code' in response.body, false);
    if (channel === 'sms') {
      assert.equal(response.body.destination, '091*****002');
      assert.equal(fixture.sent[0].mobile, '09120000002');
    } else {
      assert.equal(fixture.messengerSent[0].payload.chat_id, fixture.db.users[1][`${channel}Id`]);
      assert.match(fixture.messengerSent[0].payload.text, /حذف سفارش TRACK-1/);
    }
    const sentCode = sentOrderCode();
    assert.equal(fixture.db.orders.length, 2);
    assert.equal((await confirmOrder('000000', channel, 'order-1', 'admin-2')).status, 400);
    assert.equal(fixture.db.orders.length, 2);
    const persianCode = sentCode.replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
    const confirmed = await confirmOrder(persianCode, channel, 'order-1', 'admin-2');
    assert.equal(confirmed.status, 200);
    assert.equal(confirmed.body.deletedId, 'order-1');
    assert.deepEqual(fixture.db.orders, [{ id: 'order-2', trackingCode: 'OTHER' }]);
    assert.deepEqual(fixture.db.invoices, initialDb.invoices);
    assert.deepEqual(fixture.db.webhookLogs, initialDb.webhookLogs);
    assert.equal((await confirmOrder(sentCode, channel, 'order-2', 'admin-2')).status, 400);
  });

  test(`orders ${channel}: scopes codes to operation, order, administrator, channel and recipient`, async () => {
    fixture.db.orders[0].id = 'txn-1';
    fixture.db.orders.push({ id: 'order-2' });
    await requestOrderCode(channel, 'txn-1');
    const sentCode = sentOrderCode();
    assert.equal((await confirm('txn-1', sentCode, 'admin-1', channel)).status, 400);
    assert.equal((await confirmOrder(sentCode, channel, 'order-2')).status, 400);
    assert.equal((await confirmOrder(sentCode, channel, 'txn-1', 'admin-2')).status, 400);
    const otherChannel = channel === 'sms' ? 'telegram' : 'sms';
    assert.equal((await confirmOrder(sentCode, otherChannel, 'txn-1')).status, 400);
    const field = channel === 'sms' ? 'phone' : `${channel}Id`;
    fixture.db.users[0][field] = channel === 'sms' ? '09120000009' : '444444444';
    assert.equal((await confirmOrder(sentCode, channel, 'txn-1')).status, 400);
    assert.equal(fixture.db.orders.length, 2);
  });

  test(`orders ${channel}: rejects unauthenticated requests, missing orders and failed delivery`, async () => {
    for (const session of [null, 'customer']) {
      assert.equal((await requestOrderCode(channel, 'order-1', session)).status, session ? 403 : 401);
      assert.equal((await confirmOrder('123456', channel, 'order-1', session)).status, session ? 403 : 401);
    }
    assert.equal((await requestOrderCode(channel, 'missing')).status, 404);
    fixture[channel === 'sms' ? 'smsFails' : 'messengerFails'] = true;
    assert.equal((await requestOrderCode(channel)).status, 400);
    assert.equal(fixture.codes.size, 0);
    assert.equal((await confirmOrder(sentOrderCode(), channel)).status, 400);
    assert.deepEqual(fixture.db, initialDb);
  });

  test(`orders ${channel}: enforces expiry and the five-attempt limit`, async () => {
    await requestOrderCode(channel);
    const expired = sentOrderCode();
    fixture.now += 120001;
    assert.equal((await confirmOrder(expired, channel)).status, 400);
    await requestOrderCode(channel);
    const sentCode = sentOrderCode();
    for (let index = 0; index < 5; index += 1) assert.equal((await confirmOrder('000000', channel)).status, 400);
    assert.equal((await confirmOrder(sentCode, channel)).status, 400);
    assert.deepEqual(fixture.db, initialDb);
  });
}

test('order deletion preserves new records added during verification and handles failed writes', async () => {
  await requestOrderCode();
  fixture.writeFails = true;
  assert.equal((await confirmOrder(code())).status, 500);
  assert.deepEqual(fixture.db, initialDb);
  fixture.writeFails = false;
  await requestOrderCode();
  fixture.beforeVerify = () => fixture.db.orders.push({ id: 'new-order' });
  assert.equal((await confirmOrder(code())).status, 200);
  assert.deepEqual(fixture.db.orders, [{ id: 'new-order' }]);
  assert.deepEqual(fixture.db.invoices, initialDb.invoices);
});

test('order code requests reject invalid configuration and share rate limits across channels', async () => {
  for (const channel of ['email', null, '']) {
    assert.equal((await requestOrderCode(channel)).status, 400);
    assert.equal((await confirmOrder('123456', channel)).status, 400);
  }
  fixture.db.users[0].telegramId = '';
  assert.equal((await requestOrderCode('telegram')).status, 400);
  fixture.db.users[0].telegramId = initialDb.users[0].telegramId;
  fixture.db.settings.eitaaToken = '';
  assert.equal((await requestOrderCode('eitaa')).status, 400);
  fixture.db.settings.eitaaToken = initialDb.settings.eitaaToken;
  fixture.rateKeys = [];
  for (const channel of ['sms', 'telegram', 'eitaa']) assert.equal((await requestOrderCode(channel)).status, 200);
  assert.equal(new Set(fixture.rateKeys).size, 1);
  fixture.rateLimited = true;
  for (const channel of ['sms', 'telegram', 'eitaa']) assert.equal((await requestOrderCode(channel)).status, 429);
  assert.deepEqual(fixture.db, initialDb);
});

async function updateUser(id, body, session = 'admin-1') {
  const response = await nativeFetch(`${base}/api/users/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', ...(session ? { Cookie: `laleh_session=${session}` } : {}) },
    body: JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
}

test('editing administrator messenger IDs cannot implicitly downgrade the role through category', async () => {
  for (const role of [undefined, 'admin']) {
    const response = await updateUser('admin-1', { category: 'colleague', role, telegramId: ' ۱۲۳۴۵۶۷۸۹ ' });
    assert.equal(response.status, 200);
    assert.equal(fixture.db.users[0].role, 'admin');
    assert.equal(fixture.db.users[0].category, 'customer');
    assert.equal(fixture.db.users[0].telegramId, '123456789');
    assert.equal(fixture.db.users[0].eitaaId, '987654321');
    const session = await nativeFetch(`${base}/api/auth/me`, { headers: { Cookie: 'laleh_session=admin-1' } });
    assert.equal((await session.json()).user.role, 'admin');
  }
});

test('rejects self-demotion sent by an older colleague editing form without changing the account', async () => {
  const before = structuredClone(fixture.db.users);
  const response = await updateUser('admin-1', { role: 'user', category: 'colleague', telegramId: '444444444' });
  assert.equal(response.status, 400);
  assert.match(response.body.error, /حساب خود/);
  assert.deepEqual(fixture.db.users, before);
});

test('the only administrator keeps access when an explicit role change is attempted', async () => {
  fixture.db.users = fixture.db.users.filter(user => user.id !== 'admin-2');
  assert.equal((await updateUser('admin-1', { role: 'user' })).status, 400);
  assert.equal(fixture.db.users.filter(user => user.role === 'admin').length, 1);
});

test('another administrator can still explicitly change a different administrator role', async () => {
  assert.equal((await updateUser('admin-2', { role: 'user', category: 'colleague' })).status, 200);
  assert.equal(fixture.db.users[1].role, 'user');
  assert.equal(fixture.db.users[1].category, 'colleague');
  assert.equal(fixture.db.users[0].role, 'admin');
});

test('user upserts preserve an existing administrator role and account ID', async () => {
  for (const body of [
    { id: 'admin-1', role: 'user', category: 'colleague' },
    { id: 'different-id', phone: initialDb.users[0].phone, role: 'user', category: 'colleague' }
  ]) {
    assert.equal((await post('/api/users', body)).status, 200);
    assert.equal(fixture.db.users[0].id, 'admin-1');
    assert.equal(fixture.db.users[0].role, 'admin');
    assert.equal(fixture.db.users[0].category, 'customer');
  }
});

test('creating an administrator with a stale colleague category preserves the requested admin role', async () => {
  const response = await post('/api/users', { id: 'new-admin', role: 'admin', category: 'colleague', telegramId: '۱۲۳۴۵۶۷۸۹' });
  assert.equal(response.status, 200);
  assert.equal(fixture.db.users.at(-1).role, 'admin');
  assert.equal(fixture.db.users.at(-1).category, 'customer');
  assert.equal(fixture.db.users.at(-1).telegramId, '123456789');
});

test('profile edits cannot replace the account ID that the administrator session uses', async () => {
  assert.equal((await updateUser('admin-1', { id: 'replacement-id', telegramId: '444444444' })).status, 200);
  assert.equal(fixture.db.users[0].id, 'admin-1');
  const session = await nativeFetch(`${base}/api/auth/me`, { headers: { Cookie: 'laleh_session=admin-1' } });
  assert.equal((await session.json()).user.role, 'admin');
});

test('ordinary users and unauthenticated callers cannot promote themselves through user management', async () => {
  for (const session of ['customer', null]) {
    const before = structuredClone(fixture.db.users);
    assert.equal((await updateUser('customer', { role: 'admin', category: 'customer' }, session)).status, session ? 403 : 401);
    assert.equal((await post('/api/users', { id: 'customer', role: 'admin' }, session)).status, session ? 403 : 401);
    assert.deepEqual(fixture.db.users, before);
  }
});
