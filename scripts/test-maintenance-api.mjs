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
const express = requireProject('express');
const nativeFetch = globalThis.fetch;
const originalVercel = process.env.VERCEL;
const initialDb = {
  users: [{ id: 'admin', role: 'admin', phone: '09120000001', name: 'Admin' },
    ...Array.from({ length: 20 }, (_, i) => ({ id: `user-${i}`, role: 'user', telegramId: String(1000 + i), eitaaId: String(2000 + i) }))],
  orders: [], invoices: [], tickets: [], announcements: [], printTypes: [], dimensions: [], deliveryMethods: [],
  settings: { maintenanceMode: false, telegramToken: 'fixture-telegram', eitaaToken: 'fixture-eitaa' }
};
const fixture = {
  reset() {
    this.db = structuredClone(initialDb); this.state = null; this.sent = []; this.published = [];
    this.saveFails = false; this.publishGate = null; this.sendGate = null; this.saveGate = null; this.background = []; this.writes = 0;
  },
  async cas(revision, next) {
    if (this.saveGate) await this.saveGate;
    if (this.saveFails) throw new Error('fixture storage unavailable');
    if ((this.state?.revision || 0) !== revision) return false;
    this.state = structuredClone(next); return true;
  },
  async publish(topic, tick, options) {
    assert.equal(topic, 'maintenance-notifications');
    assert.equal(options.retentionSeconds, 604800);
    this.published.push({ tick, options });
    if (this.publishGate) await this.publishGate;
  }
};
fixture.reset();
globalThis.__maintenanceTest = fixture;
let listener, temporaryDirectory, base, processNotifications;
before(async () => {
  await fs.mkdir(path.join(repo, 'work'), { recursive: true });
  temporaryDirectory = await fs.mkdtemp(path.join(repo, 'work/maintenance-tests-'));
  const bundle = path.join(temporaryDirectory, 'server.mjs');
  const generic = ['createSession', 'deleteSession', 'deleteUserSessions', 'deleteSessionsByDevice', 'recordAudit', 'listAudit',
    'listUserSessions', 'revokeSession', 'getStorageStatus', 'testPostgresConnection', 'bootstrapPostgresAdminCredentials',
    'copyStorageProviderData', 'switchStorageProvider', 'saveOtpCode', 'verifyOtpCode'];
  await build({ entryPoints: [path.join(repo, 'server.ts')], outfile: bundle, bundle: true,
    packages: 'external', platform: 'node', format: 'esm', logLevel: 'silent', plugins: [{ name: 'maintenance-fixtures', setup(builder) {
      builder.onResolve({ filter: /^\.\/storage$/ }, () => ({ path: 'storage', namespace: 'fixture' }));
      builder.onResolve({ filter: /^@vercel\/queue$/ }, () => ({ path: 'queue', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path: fixturePath }) => ({ loader: 'js', contents: fixturePath === 'queue'
        ? 'export class QueueClient { send(...args) { return globalThis.__maintenanceTest.publish(...args); } }'
        : [
          'const f = globalThis.__maintenanceTest;',
          'export const readDb = async () => structuredClone(f.db);',
          'export const writeDb = async (db) => { f.writes++; f.db = structuredClone(db); };',
          'export const readMaintenanceQueue = async () => structuredClone(f.state);',
          'export const compareAndSetMaintenanceQueue = (...args) => f.cas(...args);',
          'export const readMaintenanceDeliveryConfig = async () => structuredClone(f.db.settings);',
          'export const findSession = async (token) => ["admin", "user-0"].includes(token) ? { userId: token } : null;',
          'export const bumpRateLimit = async () => 1;',
          ...generic.map(name => `export const ${name} = async () => [];`)
        ].join('\n') }));
    } }] });
  process.env.VERCEL = '1';
  globalThis.fetch = async (input, options) => {
    const url = String(input);
    if (url.startsWith('https://api.telegram.org/') || url.startsWith('https://eitaayar.ir/')) {
      fixture.sent.push({ url, payload: JSON.parse(options.body), time: Date.now() });
      if (fixture.sendGate) await fixture.sendGate;
      return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 });
    }
    return nativeFetch(input, options);
  };
  const server = await import(pathToFileURL(bundle).href);
  processNotifications = server.processMaintenanceNotifications;
  const outer = express();
  outer.use((req, _res, next) => { req.waitUntil = promise => fixture.background.push(promise); next(); });
  outer.get('/__test/sign-in', (_req, res) => { res.cookie('laleh_session', 'admin'); res.redirect('/admin/transactions'); });
  outer.use(server.app);
  outer.use(express.static(path.join(repo, 'dist')));
  outer.use((_req, res) => res.sendFile(path.join(repo, 'dist/index.html')));
  listener = outer.listen(0, '127.0.0.1'); await once(listener, 'listening');
  base = `http://127.0.0.1:${listener.address().port}`;
});
beforeEach(() => fixture.reset());
after(async () => {
  globalThis.fetch = nativeFetch;
  if (originalVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = originalVercel;
  if (listener) await new Promise(resolve => listener.close(resolve));
  if (temporaryDirectory) { await fs.unlink(path.join(temporaryDirectory, 'server.mjs')); await fs.rmdir(temporaryDirectory); }
  delete globalThis.__maintenanceTest;
});
async function request(route, { method = 'GET', body, session = 'admin' } = {}) {
  const response = await nativeFetch(`${base}${route}`, { method,
    headers: { ...(session ? { Cookie: `laleh_session=${session}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, headers: response.headers, body: await response.json() };
}
const toggle = enabled => request('/api/admin/maintenance', { method: 'POST', body: { enabled } });
async function promptly(promise) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('request waited for delivery')), 2000); })]); }
  finally { clearTimeout(timer); }
}

test('maintenance status is public, while queue details and changes require an administrator', async () => {
  assert.equal((await request('/api/public/maintenance', { session: null })).status, 200);
  for (const session of [null, 'user-0']) for (const method of ['GET', 'POST']) {
    assert.equal((await request('/api/admin/maintenance?includeRecipients=1', { session, method, body: method === 'POST' ? { enabled: true } : undefined })).status, session ? 403 : 401);
  }
  assert.equal(fixture.state, null); assert.equal(fixture.sent.length, 0);
});

test('rejects invalid toggle input without modifying the queue', async () => {
  for (const enabled of ['true', 1, null]) assert.equal((await toggle(enabled)).status, 400);
  assert.equal(fixture.state, null);
});

test('toggle responds and public/settings reads stay responsive while queue publication hangs', async () => {
  let release;
  fixture.publishGate = new Promise(resolve => { release = resolve; });
  try {
    const result = await promptly(toggle(true));
    assert.equal(result.status, 200); assert.equal(result.body.enabled, true);
    assert.equal(result.body.pending, 40); assert.equal(result.body.status, 'pending');
    assert.equal(fixture.background.length, 1); assert.equal(fixture.sent.length, 0);
    assert.equal(fixture.writes, 0);
    assert.deepEqual((await promptly(request('/api/public/maintenance', { session: null }))).body, { enabled: true });
    assert.equal((await promptly(request('/api/settings'))).body.maintenanceMode, true);
    assert.equal((await promptly(request('/api/db/all'))).body.settings.maintenanceMode, true);
  } finally { release(); await Promise.all(fixture.background); }
});

test('toggle waits for durable persistence, and failed persistence returns a useful error without dispatching', async () => {
  let release;
  fixture.saveGate = new Promise(resolve => { release = resolve; });
  fixture.saveFails = true;
  let settled = false;
  const pending = toggle(true).then(result => { settled = true; return result; });
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(settled, false); assert.equal(fixture.published.length, 0);
  release();
  const result = await pending;
  assert.equal(result.status, 503); assert.equal(result.body.success, false);
  assert.match(result.body.error, /ذخیره/);
  assert.equal(fixture.state, null); assert.equal(fixture.sent.length, 0);
});

test('worker sends one channel at a time and exposes persisted progress and the admin recipient list', async () => {
  await toggle(true); await Promise.all(fixture.background);
  let release;
  fixture.sendGate = new Promise(resolve => { release = resolve; });
  const firstTick = fixture.published[0].tick;
  const working = processNotifications(firstTick);
  while (!fixture.sent.length) await new Promise(resolve => setImmediate(resolve));
  try {
    await assert.rejects(processNotifications(firstTick), /not ready/);
    assert.equal(fixture.sent.length, 1);
    assert.equal((await promptly(request('/api/public/maintenance', { session: null }))).body.enabled, true);
  } finally { release(); await working; fixture.sendGate = null; }
  const progress = await request('/api/admin/maintenance?includeRecipients=1');
  assert.equal(progress.body.sent, 1); assert.equal(progress.body.pending, 39);
  assert.equal(progress.body.recipients.length, 40);
  assert.equal(progress.body.recipients[0].status, 'sent');
  assert.equal(progress.body.recipients[1].status, 'pending');
  assert.equal(JSON.stringify(progress.body).includes('fixture-telegram'), false);
  assert.ok(fixture.published.at(-1).options.delaySeconds >= 1);
});

test('both directions update immediately; same-state saves do not regenerate and settings cannot overwrite the flag', async () => {
  await toggle(true); await Promise.all(fixture.background);
  const firstId = fixture.state.batch.id;
  await toggle(true); assert.equal(fixture.state.batch.id, firstId);
  await toggle(false); await Promise.all(fixture.background);
  assert.notEqual(fixture.state.batch.id, firstId);
  assert.equal((await request('/api/public/maintenance', { session: null })).body.enabled, false);
  await request('/api/settings', { method: 'POST', body: { maintenanceMode: true, studioName: 'Fixture' } });
  assert.equal((await request('/api/settings')).body.maintenanceMode, false);
});

test('browser toggle, progress, errors and stale-response protection', { skip: !process.env.PLAYWRIGHT_MODULE }, async () => {
  const { chromium } = requireProject(process.env.PLAYWRIGHT_MODULE);
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    let releasePublic;
    const publicGate = new Promise(resolve => { releasePublic = resolve; });
    await page.route('**/api/public/maintenance', async route => { await publicGate; await route.fulfill({ json: { enabled: false } }); });
    await page.goto(`${base}/__test/sign-in`, { waitUntil: 'domcontentloaded' });
    const control = page.getByRole('switch');
    await control.waitFor();
    let releaseSave;
    fixture.saveGate = new Promise(resolve => { releaseSave = resolve; });
    await control.click();
    await page.waitForFunction(() => document.querySelector('[role="switch"]').disabled);
    releaseSave(); fixture.saveGate = null;
    await page.waitForFunction(() => document.querySelector('[role="switch"]').getAttribute('aria-checked') === 'true');
    releasePublic();
    await page.waitForTimeout(100);
    assert.equal(await control.getAttribute('aria-checked'), 'true');
    assert.equal(await control.isEnabled(), true);
    const status = page.getByRole('status', { name: 'وضعیت صف اعلان‌های به‌روزرسانی' });
    await status.waitFor(); assert.match(await status.innerText(), /40|۴۰/);
    await processNotifications(fixture.published[0].tick);
    await page.waitForFunction(() => document.querySelector('[aria-label="وضعیت صف اعلان‌های به‌روزرسانی"]').textContent.includes('1') || document.querySelector('[aria-label="وضعیت صف اعلان‌های به‌روزرسانی"]').textContent.includes('۱'));
    assert.equal(fixture.sent.length, 1);
    await control.click();
    await page.waitForFunction(() => document.querySelector('[role="switch"]').getAttribute('aria-checked') === 'false');
    fixture.saveFails = true; await control.click();
    await page.getByRole('alert').filter({ hasText: 'ذخیره وضعیت' }).waitFor();
    assert.equal(await control.getAttribute('aria-checked'), 'false');
    await page.setViewportSize({ width: 390, height: 844 });
    fixture.saveFails = false;
    await page.getByRole('button', { name: 'منوی مدیریت', exact: true }).click();
    await control.waitFor();
    await control.click();
    await page.waitForFunction(() => [...document.querySelectorAll('[role="switch"]')].some(el => el.getAttribute('aria-checked') === 'true' && el.getBoundingClientRect().width > 0));
    assert.equal(await control.getAttribute('aria-checked'), 'true');
    await status.waitFor();
    await page.waitForTimeout(300);
    if (process.env.MAINTENANCE_EVIDENCE) {
      await fs.mkdir(process.env.MAINTENANCE_EVIDENCE, { recursive: true });
      await page.screenshot({ path: path.join(process.env.MAINTENANCE_EVIDENCE, 'mobile.png'), fullPage: true });
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
