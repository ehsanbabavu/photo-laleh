import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { once } from 'node:events';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(repo, 'package.json'));
const { build } = createRequire(require.resolve('vite'))('esbuild');
const express = require('express');
let directory, listener, base;
const originalVercel = process.env.VERCEL;
const fixture = {
  reset() { this.state = null; this.saveFails = false; this.rateLimited = false; this.casConflict = false; },
  async cas(revision, next) {
    if (this.saveFails) throw new Error('fixture storage unavailable');
    if (this.casConflict) { this.casConflict = false; return false; }
    if ((this.state?.revision || 0) !== revision) return false;
    this.state = structuredClone(next); return true;
  }
};
fixture.reset(); globalThis.__blogTest = fixture;
before(async () => {
  await fs.mkdir(path.join(repo, 'work'), { recursive: true });
  directory = await fs.mkdtemp(path.join(repo, 'work/blog-tests-'));
  const output = path.join(directory, 'server.mjs');
  const generic = ['createSession', 'deleteSession', 'deleteUserSessions', 'deleteSessionsByDevice', 'recordAudit', 'listAudit', 'listUserSessions', 'revokeSession', 'getStorageStatus', 'testPostgresConnection', 'bootstrapPostgresAdminCredentials', 'copyStorageProviderData', 'switchStorageProvider', 'saveOtpCode', 'verifyOtpCode'];
  await build({ entryPoints: [path.join(repo, 'server.ts')], outfile: output, bundle: true, packages: 'external', platform: 'node', format: 'esm', logLevel: 'silent', plugins: [{ name: 'blog-fixture', setup(builder) {
    builder.onResolve({ filter: /^\.\/storage$/ }, () => ({ path: 'storage', namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ loader: 'js', contents: [
      'const f = globalThis.__blogTest;',
      'export const readDb = async () => ({ users: [{ id: "admin", role: "admin", name: "Fixture admin", phone: "09120000001" }, { id: "user", role: "user" }], orders: [], invoices: [], dimensions: [{id:"size"}], settings: {} });',
      'export const writeDb = async () => {};',
      'export const readMaintenanceQueue = async () => null;',
      'export const compareAndSetMaintenanceQueue = async () => false;',
      'export const readMaintenanceDeliveryConfig = async () => ({});',
      'export const readBlogState = async () => structuredClone(f.state);',
      'export const compareAndSetBlogState = (...args) => f.cas(...args);',
      'export const findSession = async token => ["admin","user"].includes(token) ? { userId: token } : null;',
      'export const bumpRateLimit = async () => f.rateLimited ? 100 : 1;',
      ...generic.map(name => `export const ${name} = async () => [];`)
    ].join('\n') }));
  } }] });
  process.env.VERCEL = '1';
  const { app } = await import(pathToFileURL(output).href);
  const outer = express();
  outer.get('/__test/sign-in', (_req, res) => { res.cookie('laleh_session', 'admin'); res.redirect('/admin/posts'); });
  outer.use(app); outer.use(express.static(path.join(repo, 'dist')));
  outer.use((_req, res) => res.sendFile(path.join(repo, 'dist/index.html')));
  listener = outer.listen(0, '127.0.0.1'); await once(listener, 'listening'); base = `http://127.0.0.1:${listener.address().port}`;
});
beforeEach(() => fixture.reset());
after(async () => {
  if (originalVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = originalVercel;
  if (listener) await new Promise(resolve => listener.close(resolve));
  if (directory) { await fs.unlink(path.join(directory, 'server.mjs')); await fs.rmdir(directory); }
  delete globalThis.__blogTest;
});
async function request(route, { method = 'GET', body, session = 'admin' } = {}) {
  const response = await fetch(`${base}${route}`, { method, redirect: 'manual', headers: { ...(session ? { Cookie: `laleh_session=${session}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await response.text(); let data; try { data = JSON.parse(text); } catch { data = null; }
  return { status: response.status, headers: response.headers, text, data };
}
const cms = (path = '', method = 'GET', body) => request(`/api/admin/blog${path}`, { method, body });
const create = (patch = {}) => cms('/posts', 'POST', { title: 'راهنمای چاپ عکس', slug: 'photo-guide', content: '<h2>چاپ خاطره‌ها</h2><p>راهنمای انتخاب عکس و چاپ با کیفیت برای همه خوانندگان وبلاگ.</p>', status: 'draft', ...patch });
const update = (post, patch) => cms(`/posts/${post.id}`, 'PUT', { ...post, ...patch });
const action = (post, value) => cms(`/posts/${post.id}/action`, 'POST', { version: post.version, action: value });

test('sanitizer loads when the runtime disables requiring ES modules', () => {
  const output = execFileSync(process.execPath, ['--no-experimental-require-module', '--input-type=module', '-e',
    `import sanitizeHtml from 'sanitize-html'; process.stdout.write(sanitizeHtml('<p>Safe</p><script>alert(1)</script>'));`], { cwd: repo, encoding: 'utf8' });
  assert.equal(output, '<p>Safe</p>');
});

test('only administrators can read or write CMS data and preview drafts', async () => {
  const post = (await create()).data;
  for (const session of [null, 'user']) {
    assert.equal((await request('/api/admin/blog', { session })).status, session ? 403 : 401);
    assert.equal((await request('/api/admin/blog/posts', { session, method: 'POST', body: { title: 'bad' } })).status, session ? 403 : 401);
    assert.equal((await request(`/blog/preview/${post.id}`, { session })).status, 403);
  }
  assert.equal(fixture.state.posts.length, 1);
});
test('drafts are persisted but absent from public routes, listing, sitemap and RSS', async () => {
  const post = (await create()).data;
  assert.equal((await request('/blog/photo-guide/', { session: null })).status, 404);
  assert.equal((await request('/api/public/blog', { session: null })).data.posts.length, 0);
  assert.equal((await request('/sitemap.xml', { session: null })).text.includes('photo-guide'), false);
  assert.equal((await request('/blog/feed.xml', { session: null })).text.includes('photo-guide'), false);
  const preview = await request(`/blog/preview/${post.id}`);
  assert.equal(preview.status, 200); assert.match(preview.text, /noindex, nofollow/); assert.match(preview.text, /چاپ خاطره‌ها/);
});
test('publishing returns complete server-rendered content, SEO and automatic sitemap URLs', async () => {
  const category = (await cms('/categories', 'POST', { name: 'چاپ عکس', slug: 'printing' })).data;
  const tag = (await cms('/tags', 'POST', { name: 'خاطره', slug: 'memory' })).data;
  const post = (await create({ status: 'published', seoTitle: 'عنوان سئو', seoDescription: 'توضیح ویژه سئو', categoryIds: [category.id], tagIds: [tag.id] })).data;
  const page = await request('/blog/photo-guide/', { session: null });
  assert.equal(page.status, 200); assert.match(page.text, /<h1>راهنمای چاپ عکس<\/h1>/); assert.match(page.text, /<h2>چاپ خاطره‌ها<\/h2>/);
  assert.match(page.text, /<title>عنوان سئو \| لاله<\/title>/); assert.match(page.text, /BlogPosting/);
  assert.match(page.text, /rel="canonical" href="https:\/\/www.photo-laleh.ir\/blog\/photo-guide\/"/);
  const sitemap = await request('/sitemap.xml', { session: null });
  assert.equal(sitemap.status, 200); assert.match(sitemap.headers.get('content-type'), /xml/);
  for (const url of ['/blog/', '/blog/photo-guide/', '/blog/category/printing/', '/blog/tag/memory/']) assert.ok(sitemap.text.includes(`https://www.photo-laleh.ir${url}`));
  assert.match((await request('/blog/feed.xml', { session: null })).text, /<item>/);
  assert.match((await request('/blog/category/printing/', { session: null })).text, /راهنمای چاپ عکس/);
  const listing = (await request('/api/public/blog', { session: null })).data;
  assert.equal('revisions' in listing.posts[0], false); assert.equal('comments' in listing, false);
});
test('HTML is sanitized, image and link protocols are checked, and metadata is escaped', async () => {
  const post = (await create({ status: 'published', title: '<script>unsafe</script>', slug: 'safe', content: '<h2>عنوان سالم</h2><p>متن سالم و قابل نمایش</p><script>alert(1)</script><iframe src="https://bad.invalid"></iframe><img src="javascript:alert(1)" onerror="alert(1)"><a href="javascript:alert(1)" onclick="alert(1)">پیوند</a>' })).data;
  assert.equal(/<script|<iframe|onerror|onclick|javascript:/i.test(post.content), false);
  assert.match(post.content, /<h2>عنوان سالم<\/h2>/);
  const page = await request('/blog/safe/', { session: null });
  assert.match(page.text, /&lt;script&gt;unsafe&lt;\/script&gt;/);
  assert.equal((await create({ slug: 'invalid-cover', coverImage: 'javascript:alert(1)' })).status, 400);
});
test('scheduled posts become public when due without cron writes, while noindex is excluded from sitemap', async () => {
  const scheduled = (await create({ status: 'scheduled', publishedAt: new Date(Date.now() + 86400000).toISOString() })).data;
  assert.equal((await request('/blog/photo-guide/', { session: null })).status, 404);
  fixture.state.posts[0].publishedAt = new Date(Date.now() - 1000).toISOString();
  assert.equal((await request('/blog/photo-guide/', { session: null })).status, 200);
  assert.equal(fixture.state.posts[0].status, 'scheduled');
  const hidden = (await update({ ...scheduled, publishedAt: fixture.state.posts[0].publishedAt }, { noIndex: true })).data;
  assert.match((await request('/blog/photo-guide/', { session: null })).text, /noindex, nofollow/);
  assert.equal((await request('/sitemap.xml', { session: null })).text.includes('photo-guide'), false);
});
test('slug changes redirect old public URLs and cannot collide with current or previous URLs', async () => {
  const first = (await create({ status: 'published' })).data;
  const changed = (await update(first, { slug: 'new-guide' })).data;
  const response = await request('/blog/photo-guide/', { session: null });
  assert.equal(response.status, 301); assert.equal(response.headers.get('location'), '/blog/new-guide/');
  assert.equal((await create({ slug: 'photo-guide' })).status, 409);
  assert.equal((await create({ slug: 'category' })).status, 400);
  assert.equal((await request('/blog/new-guide', { session: null })).status, 301);
  assert.equal((await request('/sitemap.xml', { session: null })).text.includes('/blog/photo-guide/'), false);
});
test('concurrent saves preserve other posts, stale versions fail, and previous content is retained', async () => {
  fixture.casConflict = true;
  const responses = await Promise.all([create({ slug: 'one' }), create({ slug: 'two' })]);
  assert.deepEqual(responses.map(r => r.status), [201, 201]); assert.equal(fixture.state.posts.length, 2);
  const first = responses[0].data;
  const changed = (await update(first, { content: '<p>متن نسخه دوم نوشته برای ویرایش جدید</p>' })).data;
  assert.equal(changed.revisions[0].content, first.content);
  assert.equal((await update(first, { title: 'stale' })).status, 409);
  const restored = (await update(changed, { content: changed.revisions[0].content })).data;
  assert.equal(restored.content, first.content); assert.equal(fixture.state.posts.length, 2);
});
test('trash, restore, duplicate and permanent deletion update public pages and related comments', async () => {
  const post = (await create({ status: 'published' })).data;
  const copy = (await action(post, 'duplicate')).data; assert.equal(copy.status, 'draft'); assert.notEqual(copy.slug, post.slug);
  assert.equal((await action(post, 'delete')).status, 400);
  const trashed = (await action(post, 'trash')).data;
  assert.equal((await request('/blog/photo-guide/', { session: null })).status, 404);
  assert.equal((await request('/sitemap.xml', { session: null })).text.includes('photo-guide'), false);
  const restored = (await action(trashed, 'restore')).data; assert.equal(restored.status, 'draft');
  const trashAgain = (await action(restored, 'trash')).data;
  fixture.state.comments.push({ id: 'related', postId: post.id, status: 'pending' });
  assert.equal((await action(trashAgain, 'delete')).status, 200);
  assert.equal(fixture.state.comments.some(item => item.postId === post.id), false);
  assert.equal(fixture.state.posts.length, 1);
});
test('comments require moderation, never expose email, and reject abuse and closed discussions', async () => {
  const post = (await create({ status: 'published' })).data;
  const submit = body => request(`/api/public/blog/${post.id}/comments`, { session: null, method: 'POST', body });
  assert.equal((await submit({ name: 'خواننده', email: 'private@example.com', content: '<script>دیدگاه</script>' })).status, 202);
  assert.equal(fixture.state.comments[0].status, 'pending');
  assert.equal((await request('/blog/photo-guide/', { session: null })).text.includes('&lt;script&gt;دیدگاه'), false);
  await cms(`/comments/${fixture.state.comments[0].id}`, 'PUT', { status: 'approved' });
  const publicPage = await request('/blog/photo-guide/', { session: null });
  assert.match(publicPage.text, /&lt;script&gt;دیدگاه&lt;\/script&gt;/); assert.equal(publicPage.text.includes('private@example.com'), false);
  assert.equal((await submit({ name: 'خواننده', content: 'متن دیدگاه', email: 'bad' })).status, 400);
  fixture.rateLimited = true; assert.equal((await submit({ name: 'خواننده', content: 'تکراری' })).status, 429); fixture.rateLimited = false;
  fixture.state.settings.commentsEnabled = false; assert.equal((await submit({ name: 'خواننده', content: 'دیدگاه تازه' })).status, 403);
  assert.equal(fixture.state.comments.length, 1);
});
test('taxonomy hierarchy is validated and removal updates post relations and editor versions', async () => {
  const parent = (await cms('/categories', 'POST', { name: 'مادر', slug: 'parent' })).data;
  const child = (await cms('/categories', 'POST', { name: 'فرزند', slug: 'child', parentId: parent.id })).data;
  assert.equal((await cms(`/categories/${parent.id}`, 'PUT', { ...parent, parentId: child.id })).status, 400);
  const post = (await create({ status: 'published', categoryIds: [child.id, 'unknown'] })).data;
  assert.deepEqual(post.categoryIds, [child.id]);
  assert.match((await request('/blog/category/parent/', { session: null })).text, /راهنمای چاپ عکس/);
  assert.match((await request('/sitemap.xml', { session: null })).text, /\/blog\/category\/parent\//);
  await cms(`/categories/${child.id}`, 'DELETE');
  assert.deepEqual(fixture.state.posts[0].categoryIds, []);
  assert.equal((await update(post, { title: 'stale' })).status, 409);
});
test('blog export/import and the full site backup preserve content; malformed imports cannot replace it', async () => {
  const post = (await create({ status: 'published' })).data;
  const snapshot = (await cms('/export')).data;
  assert.equal(snapshot.app, 'laleh-blog'); assert.equal(snapshot.data.posts[0].id, post.id);
  assert.equal((await request('/api/backup')).data.blog.posts[0].id, post.id);
  const before = structuredClone(fixture.state);
  assert.equal((await cms('/import', 'POST', { app: 'laleh-blog', version: 1, data: {} })).status, 400);
  assert.deepEqual(fixture.state, before);
  await action(post, 'trash');
  assert.equal((await cms('/import', 'POST', snapshot)).status, 200);
  assert.equal((await update(post, { title: 'stale import editor' })).status, 409);
  assert.equal((await request('/blog/photo-guide/', { session: null })).status, 200);
  const unsafe = structuredClone(snapshot); unsafe.data.posts[0].content += '<script>alert(1)</script>';
  assert.equal((await cms('/import', 'POST', unsafe)).status, 200);
  assert.equal(fixture.state.posts[0].content.includes('<script>'), false);
  const siteBackup = (await request('/api/backup')).data;
  const current = fixture.state.posts[0]; await action(current, 'trash');
  assert.equal((await request('/api/backup/restore', { method: 'POST', body: siteBackup })).status, 200);
  assert.equal((await request('/blog/photo-guide/', { session: null })).status, 200);
});
test('media metadata is editable, unsafe URLs fail, and images in posts cannot be removed', async () => {
  assert.equal((await cms('/media', 'POST', { url: 'javascript:alert(1)' })).status, 400);
  const media = (await cms('/media', 'POST', { url: '/logo.png', title: 'تصویر', alt: 'متن جایگزین' })).data;
  const post = (await create({ coverImage: media.url })).data;
  assert.equal((await cms(`/media/${media.id}`, 'DELETE')).status, 409);
  assert.equal((await cms(`/media/${media.id}`, 'PUT', { title: 'تازه', alt: 'جدید' })).data.alt, 'جدید');
  await update(post, { coverImage: '' });
  assert.equal((await cms(`/media/${media.id}`, 'DELETE')).status, 200);
});
test('settings, search and pagination work, and storage failures return errors without altering content', async () => {
  const state = (await cms()).data;
  await cms('/settings', 'PUT', { ...state.settings, title: 'مجله تازه', postsPerPage: 6 });
  for (let i = 0; i < 7; i++) await create({ slug: `post-${i}`, title: `نوشته شماره ${i}`, status: 'published' });
  const list = await request('/blog/', { session: null }); assert.match(list.text, /مجله تازه/); assert.match(list.text, /صفحه ۱ از ۲/);
  assert.match((await request('/blog/?page=2', { session: null })).text, /صفحه ۲ از ۲/);
  const search = await request('/blog/?q=شماره%206', { session: null }); assert.match(search.text, /noindex, nofollow/); assert.equal((search.text.match(/class="blog-card"/g) || []).length, 1);
  const before = structuredClone(fixture.state); fixture.saveFails = true;
  assert.equal((await create({ slug: 'failed' })).status, 503); assert.deepEqual(fixture.state, before);
});

test('browser CMS and public blog support draft, publication, moderation, mobile layout and trash', { skip: !process.env.PLAYWRIGHT_MODULE }, async () => {
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  try {
    const admin = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
    const page = await admin.newPage(); const errors = []; page.on('pageerror', err => errors.push(err.message));
    await page.goto(`${base}/__test/sign-in`, { waitUntil: 'networkidle' });
    const panel = page.locator('section[aria-labelledby="blog-admin-title"]');
    const postMenu = page.locator('[aria-label="زیرمنوی نوشته‌ها"]:visible'); await panel.waitFor();
    for (const [section, label] of [['list', 'همه نوشته‌ها'], ['write', 'افزودن نوشته'], ['categories', 'دسته‌بندی‌ها'], ['tags', 'برچسب‌ها'], ['comments', 'دیدگاه‌ها'], ['media', 'رسانه‌ها'], ['settings', 'تنظیمات'], ['trash', 'زباله‌دان']]) {
      await postMenu.getByRole('button', { name: label, exact: true }).click();
      await panel.getByRole('heading', { name: label, exact: true }).waitFor();
      assert.equal(new URL(page.url()).pathname, section === 'list' ? '/admin/posts' : `/admin/posts/${section}`);
      await page.reload({ waitUntil: 'networkidle' });
      await panel.getByRole('heading', { name: label, exact: true }).waitFor();
    }
    await page.goBack({ waitUntil: 'networkidle' });
    await panel.getByRole('heading', { name: 'تنظیمات', exact: true }).waitFor();
    await page.goForward({ waitUntil: 'networkidle' });
    await panel.getByRole('heading', { name: 'زباله‌دان', exact: true }).waitFor();
    await postMenu.getByRole('button', { name: 'دسته‌بندی‌ها', exact: true }).click();
    await panel.getByLabel('نام', { exact: true }).fill('چاپ عکس'); await panel.getByLabel('نامک', { exact: true }).fill('printing');
    await panel.getByRole('button', { name: 'افزودن دسته‌بندی', exact: true }).click(); await panel.getByRole('status').waitFor();
    const media = (await cms('/media', 'POST', { url: '/logo.png', title: 'لوگوی لاله', alt: 'لاله' })).data;
    await panel.getByRole('button', { name: 'نوشته تازه', exact: true }).click();
    // A fresh list load fetches the media registered through the fixture API.
    await page.reload({ waitUntil: 'networkidle' });
    await panel.getByLabel('عنوان نوشته', { exact: true }).fill('راهنمای وبلاگ آزمایشی');
    await panel.getByRole('textbox', { name: 'متن نوشته', exact: true }).fill('این متن نمونه درباره انتخاب عکس و چاپ با کیفیت نوشته شده است.');
    await panel.getByLabel('چکیده نوشته', { exact: true }).fill('چکیده نوشته آزمایشی');
    await panel.getByRole('group', { name: 'دسته‌بندی‌ها', exact: true }).getByLabel('چاپ عکس').check();
    await panel.getByLabel('انتخاب از رسانه‌ها', { exact: true }).selectOption(media.id);
    await panel.getByRole('button', { name: 'ذخیره پیش‌نویس', exact: true }).click();
    await panel.getByRole('status').filter({ hasText: 'پیش‌نویس ذخیره شد' }).waitFor();
    assert.equal(fixture.state.posts[0].status, 'draft'); const id = fixture.state.posts[0].id;
    assert.equal((await request(`/blog/${encodeURIComponent(fixture.state.posts[0].slug)}/`, { session: null })).status, 404);
    await panel.getByLabel('وضعیت', { exact: true }).selectOption('published');
    await panel.getByRole('button', { name: 'ذخیره و انتشار', exact: true }).click(); await panel.getByRole('status').filter({ hasText: 'وضعیت انتشار' }).waitFor();
    const post = fixture.state.posts.find(item => item.id === id); assert.equal(post.status, 'published');
    const publicContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const article = await publicContext.newPage(); article.on('pageerror', err => errors.push(err.message));
    await article.goto(`${base}/blog/${encodeURIComponent(post.slug)}/`, { waitUntil: 'networkidle' });
    await article.getByRole('heading', { name: post.title, exact: true }).waitFor();
    assert.match(await article.title(), /راهنمای وبلاگ آزمایشی/);
    assert.ok(await article.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await article.getByLabel('نام', { exact: true }).fill('خواننده وبلاگ');
    await article.getByLabel('دیدگاه', { exact: true }).fill('دیدگاه آزمایشی برای بررسی مدیر');
    await article.getByRole('button', { name: 'ارسال دیدگاه', exact: true }).click();
    await article.getByRole('status').filter({ hasText: 'پس از تأیید مدیر' }).waitFor();
    await postMenu.getByRole('button', { name: 'دیدگاه‌ها', exact: true }).click();
    await page.reload({ waitUntil: 'networkidle' });
    await panel.getByRole('button', { name: 'تأیید دیدگاه', exact: true }).click();
    await panel.getByRole('status').waitFor(); await article.reload({ waitUntil: 'networkidle' });
    await article.getByText('دیدگاه آزمایشی برای بررسی مدیر', { exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'منوی مدیریت', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'نوشته‌ها', exact: true }).getAttribute('aria-expanded'), 'true');
    await postMenu.getByRole('button', { name: 'همه نوشته‌ها', exact: true }).click();
    await panel.getByRole('button', { name: `حذف ${post.title}`, exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'تأیید', exact: true }).click();
    await page.getByRole('button', { name: 'منوی مدیریت', exact: true }).click();
    await postMenu.getByRole('button', { name: 'زباله‌دان', exact: true }).click();
    await panel.getByRole('button', { name: `بازیابی ${post.title}`, exact: true }).waitFor();
    assert.equal((await request(`/blog/${encodeURIComponent(post.slug)}/`, { session: null })).status, 404);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    if (process.env.BLOG_EVIDENCE) { await fs.mkdir(process.env.BLOG_EVIDENCE, { recursive: true }); await page.screenshot({ path: path.join(process.env.BLOG_EVIDENCE, 'admin-mobile.png'), fullPage: true }); await article.screenshot({ path: path.join(process.env.BLOG_EVIDENCE, 'article-mobile.png'), fullPage: true }); }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
