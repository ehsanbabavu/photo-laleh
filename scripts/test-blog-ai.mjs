import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { apiClient } from '../src/services/apiClient.ts';
import { BLOG_ARTICLE_TYPES, BLOG_ARTICLE_TOPICS } from '../src/utils/blogAiOptions.ts';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(repo, 'package.json'));
const { build } = createRequire(require.resolve('vite'))('esbuild');
const express = require('express');
const nativeFetch = globalThis.fetch;
const originalEnv = Object.fromEntries(['VERCEL', 'AVALAI_API_KEY', 'AVALAI_BASE_URL', 'AVALAI_TEXT_MODEL', 'AVALAI_IMAGE_MODEL', 'BLOB_READ_WRITE_TOKEN'].map(key => [key, process.env[key]]));
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=';
const article = { title: 'انتخاب کاغذ برای چاپ عکس', slug: 'choose-photo-paper', excerpt: 'راهنمای چاپ عکس',
  html: `<h2>انتخاب کاغذ</h2><p>${'برای چاپ عکس، اندازه و نوع کاغذ را متناسب با کاربرد و نور محیط انتخاب کنید. '.repeat(8)}</p>`,
  category: 'چاپ عکس', tags: ['کاغذ عکس'], imagePrompt: 'A photographic print on a studio table', imageAlt: 'عکس چاپ‌شده روی میز' };
const settings = () => ({ avalaiApiKey: 'fixture-api-key', avalaiBaseUrl: 'https://api.avalai.ir/v1',
  avalaiTextModel: 'gemini-3.7-flash', avalaiModel: 'gemini-3.1-flash-lite-image', aiEnabled: true });
const fixture = {
  reset() { this.settings = settings(); this.state = null; this.calls = []; this.uploads = []; this.writes = [];
    this.saveFails = false; this.imageStatus = 200; this.imageError = null; this.missingImage = false; this.networkFails = false; this.responseData = undefined; },
  async cas(revision, next) { if ((this.state?.revision || 0) !== revision) return false; this.state = structuredClone(next); return true; }
};
fixture.reset(); globalThis.__blogAiTest = fixture;
let directory, listener, base;
before(async () => {
  await fs.mkdir(path.join(repo, 'work'), { recursive: true });
  directory = await fs.mkdtemp(path.join(repo, 'work/blog-ai-tests-'));
  const serverPath = path.join(directory, 'server.mjs');
  const generic = ['createSession', 'deleteSession', 'deleteUserSessions', 'deleteSessionsByDevice', 'recordAudit', 'listAudit', 'listUserSessions', 'revokeSession', 'getStorageStatus', 'testPostgresConnection', 'bootstrapPostgresAdminCredentials', 'copyStorageProviderData', 'switchStorageProvider', 'saveOtpCode', 'verifyOtpCode'];
  await build({ entryPoints: [path.join(repo, 'server.ts')], outfile: serverPath, bundle: true, packages: 'external', platform: 'node', format: 'esm', logLevel: 'silent', plugins: [{ name: 'ai-fixture', setup(builder) {
    builder.onResolve({ filter: /^\.\/storage$/ }, () => ({ path: 'storage', namespace: 'fixture' }));
    builder.onResolve({ filter: /^@vercel\/blob$/ }, () => ({ path: 'blob', namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path: name }) => ({ loader: 'js', contents: name === 'blob'
      ? 'export const put = async (name, bytes, options) => { globalThis.__blogAiTest.uploads.push({ name, bytes, options }); return { url: "https://images.example.test/blog/generated.png" }; };'
      : [
        'const f = globalThis.__blogAiTest;',
        'export const readDb = async () => ({ users: [{ id: "admin", role: "admin", name: "Fixture admin", phone: "09120000001" }, { id: "user", role: "user" }], orders: [], invoices: [], dimensions: [{ id: "size" }], settings: structuredClone(f.settings) });',
        'export const writeDb = async db => { if (f.saveFails) throw new Error("fixture unavailable"); f.writes.push(structuredClone(db.settings)); f.settings = structuredClone(db.settings); };',
        'export const readMaintenanceQueue = async () => null;',
        'export const compareAndSetMaintenanceQueue = async () => false;',
        'export const readMaintenanceDeliveryConfig = async () => ({});',
        'export const readBlogState = async () => structuredClone(f.state);',
        'export const compareAndSetBlogState = (...args) => f.cas(...args);',
        'export const findSession = async token => ["admin","user"].includes(token) ? { userId: token } : null;',
        'export const bumpRateLimit = async () => 1;',
        ...generic.map(name => `export const ${name} = async () => [];`)
      ].join('\n') }));
  } }] });
  process.env.VERCEL = '1'; process.env.BLOB_READ_WRITE_TOKEN = 'fixture-blob-token';
  // Deliberately conflict with saved settings to verify that env/body cannot
  // override the database's selected model, key or base URL.
  process.env.AVALAI_API_KEY = 'wrong-env-key'; process.env.AVALAI_BASE_URL = 'https://wrong.example.test/v1';
  process.env.AVALAI_TEXT_MODEL = 'wrong-env-text'; process.env.AVALAI_IMAGE_MODEL = 'wrong-env-image';
  const { app } = await import(pathToFileURL(serverPath).href);
  globalThis.__blogAiApp = app;
  const handlerPath = path.join(directory, 'handler.mjs');
  await build({ entryPoints: [path.join(repo, 'api/blog-ai-generate.ts')], outfile: handlerPath, bundle: true, packages: 'external', platform: 'node', format: 'esm', logLevel: 'silent', plugins: [{ name: 'handler-fixture', setup(builder) {
    builder.onResolve({ filter: /server\.bundle\.mjs$/ }, () => ({ path: 'app', namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export default globalThis.__blogAiApp;' }));
  } }] });
  const handler = (await import(pathToFileURL(handlerPath).href)).default;
  const outer = express();
  outer.get('/__test/sign-in', (_req, res) => { res.cookie('laleh_session', 'admin'); res.redirect('/admin/posts/ai-settings'); });
  outer.all('/api/blog-ai-generate', handler); outer.use(app);
  outer.use(express.static(path.join(repo, 'dist')));
  outer.use((_req, res) => res.sendFile(path.join(repo, 'dist/index.html')));
  listener = outer.listen(0, '127.0.0.1'); await once(listener, 'listening'); base = `http://127.0.0.1:${listener.address().port}`;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === '/api/settings') return nativeFetch(`${base}${url}`, { ...init, headers: { ...init.headers, Cookie: 'laleh_session=admin' } });
    if (url.startsWith('http://127.0.0.1:')) return nativeFetch(input, init);
    assert.ok(['https://api.avalai.ir/v1/', 'https://blog.example.test/v1/'].some(base => url.startsWith(base)), `Unexpected external request: ${url}`);
    const body = JSON.parse(init.body); fixture.calls.push({ url, body, headers: init.headers });
    if (fixture.networkFails) throw new Error('fixture network failure');
    if (body.response_format?.type === 'json_object') return Response.json({ choices: [{ message: { content: JSON.stringify(article) } }] });
    if (fixture.imageStatus !== 200) return Response.json({ error: { message: fixture.imageError } }, { status: fixture.imageStatus });
    if (fixture.missingImage) return Response.json({ choices: [{ message: { content: 'No image was generated.' } }] });
    if (url.endsWith('/responses')) return Response.json(fixture.responseData === undefined
      ? { status: 'completed', output: [{ type: 'reasoning', summary: [] }, { type: 'image_generation_call', status: 'completed', result: png }] }
      : fixture.responseData);
    return Response.json(url.endsWith('/images/generations') ? { data: [{ b64_json: png }] }
      : { choices: [{ message: { content: 'Image generated', images: [{ image_url: { url: `data:image/png;base64,${png}` } }] } }] });
  };
});
beforeEach(() => fixture.reset());
after(async () => {
  globalThis.fetch = nativeFetch;
  for (const [key, value] of Object.entries(originalEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  if (listener) await new Promise(resolve => listener.close(resolve));
  if (directory) { for (const file of ['server.mjs', 'handler.mjs']) await fs.unlink(path.join(directory, file)); await fs.rmdir(directory); }
  delete globalThis.__blogAiTest; delete globalThis.__blogAiApp;
});
async function request(route, body = {}, session = 'admin') {
  const response = await nativeFetch(`${base}${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(session ? { Cookie: `laleh_session=${session}` } : {}) }, body: JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}
const generate = (body = {}) => request('/api/admin/blog/ai-generate', body);

test('article types and topics reach the provider prompt and unknown selections are rejected', async () => {
  for (const type of BLOG_ARTICLE_TYPES.filter(item => item.id !== 'news')) {
    fixture.calls = [];
    assert.equal((await generate({ kind: type.id, topic: 'restoration' })).status, 200);
    const prompt = fixture.calls[0].body.messages[1].content;
    assert.ok(prompt.includes(type.brief));
    assert.ok(prompt.includes(BLOG_ARTICLE_TOPICS.find(item => item.id === 'restoration').brief));
  }
  for (const topic of BLOG_ARTICLE_TOPICS) {
    fixture.calls = [];
    assert.equal((await generate({ kind: 'guide', topic: topic.id })).status, 200);
    assert.ok(fixture.calls[0].body.messages[1].content.includes(topic.brief));
  }
  fixture.calls = [];
  assert.equal((await generate({ kind: 'unknown' })).status, 400);
  assert.equal((await generate({ topic: 'unknown' })).status, 400);
  assert.equal(fixture.calls.length, 0);
});

test('AI settings are normalized and saved together in one acknowledged database write', async () => {
  const saved = await apiClient.saveAiSettings({ ...settings(), avalaiModel: ' gemini-3.1-flash-lite-image ', avalaiBaseUrl: ' https://api.avalai.ir/v1/// ' });
  assert.deepEqual(saved, settings()); assert.deepEqual(fixture.settings, settings()); assert.equal(fixture.writes.length, 1);
});
test('database save failures reject the client promise and preserve the old settings', async () => {
  fixture.saveFails = true;
  await assert.rejects(apiClient.saveAiSettings({ avalaiModel: 'gpt-image-2.5-sunburst' }), /ذخیره تنظیمات/);
  assert.equal(fixture.settings.avalaiModel, 'gemini-3.1-flash-lite-image'); assert.equal(fixture.writes.length, 0);
});

test('blog connection overrides persist independently and fall back per field to ChatGPT settings', async () => {
  const saved = await apiClient.saveAiSettings({ avalaiBlogApiKey: ' blog-fixture-key ', avalaiBlogBaseUrl: ' https://blog.example.test/v1/// ' });
  assert.equal(saved.avalaiBlogApiKey, 'blog-fixture-key'); assert.equal(saved.avalaiBlogBaseUrl, 'https://blog.example.test/v1');
  assert.equal(saved.avalaiApiKey, settings().avalaiApiKey); assert.equal(saved.avalaiBaseUrl, settings().avalaiBaseUrl);
  const check = async (url, key) => {
    fixture.calls = [];
    assert.equal((await generate()).status, 200);
    assert.ok(fixture.calls.every(call => call.url.startsWith(url + '/') && call.headers.Authorization === `Bearer ${key}`));
  };
  await check('https://blog.example.test/v1', 'blog-fixture-key');
  await apiClient.saveAiSettings({ avalaiBlogApiKey: '  ' });
  await check('https://blog.example.test/v1', 'fixture-api-key');
  await apiClient.saveAiSettings({ avalaiBlogApiKey: 'blog-fixture-key', avalaiBlogBaseUrl: ' ' });
  await check('https://api.avalai.ir/v1', 'blog-fixture-key');
  await apiClient.saveAiSettings({ avalaiBlogApiKey: '', avalaiBlogBaseUrl: '' });
  await check('https://api.avalai.ir/v1', 'fixture-api-key');
  await apiClient.saveAiSettings({ avalaiApiKey: 'changed-chatgpt-key' });
  await check('https://api.avalai.ir/v1', 'changed-chatgpt-key');
});

test('blog credentials remain administrator-only and invalid override types cannot be saved', async () => {
  await apiClient.saveAiSettings({ avalaiBlogApiKey: 'blog-fixture-key' });
  assert.equal((await nativeFetch(`${base}/api/settings`)).status, 401);
  assert.equal((await nativeFetch(`${base}/api/settings`, { headers: { Cookie: 'laleh_session=user' } })).status, 403);
  const userState = await (await nativeFetch(`${base}/api/db/all`, { headers: { Cookie: 'laleh_session=user' } })).json();
  assert.equal('avalaiBlogApiKey' in userState.settings, false); assert.equal('avalaiApiKey' in userState.settings, false);
  const adminSettings = await (await nativeFetch(`${base}/api/settings`, { headers: { Cookie: 'laleh_session=admin' } })).json();
  assert.equal(adminSettings.avalaiBlogApiKey, 'blog-fixture-key');
  assert.equal((await request('/api/settings', { avalaiBlogApiKey: 123 })).status, 400);
  assert.equal((await request('/api/settings', { avalaiBlogBaseUrl: {} })).status, 400);
  assert.equal(fixture.settings.avalaiBlogApiKey, 'blog-fixture-key');
});

test('server connection testing uses unsaved blog overrides or current ChatGPT defaults without saving them', async () => {
  fixture.settings = { ...settings(), avalaiBlogApiKey: 'saved-blog-key', avalaiBlogBaseUrl: 'https://blog.example.test/v1', aiEnabled: false };
  const cases = [
    [{ purpose: 'blog', apiKey: ' unsaved-blog-key ', baseUrl: ' https://blog.example.test/v1/// ' }, 'https://blog.example.test/v1', 'unsaved-blog-key'],
    [{ purpose: 'blog', apiKey: '', baseUrl: '' }, 'https://api.avalai.ir/v1', 'fixture-api-key'],
    [{ purpose: 'blog', apiKey: '', baseUrl: 'https://blog.example.test/v1' }, 'https://blog.example.test/v1', 'fixture-api-key'],
    [{ purpose: 'orders', apiKey: 'fixture-api-key', baseUrl: 'https://api.avalai.ir/v1' }, 'https://api.avalai.ir/v1', 'fixture-api-key']
  ];
  for (const [body, url, key] of cases) {
    fixture.calls = [];
    assert.equal((await request('/api/settings/ai-test', { ...body, textModel: 'gpt-5.1' })).status, 200);
    assert.equal(fixture.calls[0].url, `${url}/chat/completions`);
    assert.equal(fixture.calls[0].headers.Authorization, `Bearer ${key}`);
    assert.equal(fixture.calls[0].body.model, 'gpt-5.1');
    assert.equal(fixture.writes.length, 0); assert.equal(fixture.settings.avalaiBlogApiKey, 'saved-blog-key');
  }
});

test('connection testing requires an administrator and rejects invalid inputs or provider failures safely', async () => {
  const body = { purpose: 'blog', apiKey: 'blog-fixture-key', baseUrl: 'https://blog.example.test/v1', textModel: 'gpt-5.1' };
  assert.equal((await request('/api/settings/ai-test', body, null)).status, 401);
  assert.equal((await request('/api/settings/ai-test', body, 'user')).status, 403);
  for (const patch of [{ purpose: 'unknown' }, { apiKey: 123 }, { baseUrl: {} }, { textModel: '' }]) {
    assert.equal((await request('/api/settings/ai-test', { ...body, ...patch })).status, 400);
  }
  assert.equal(fixture.calls.length, 0);
  fixture.imageStatus = 403; fixture.imageError = 'tool denied: blog-fixture-key';
  const failure = await request('/api/settings/ai-test', body);
  assert.equal(failure.status, 502); assert.match(failure.data.error.message, /tool denied/);
  assert.doesNotMatch(failure.data.error.message, /blog-fixture-key/); assert.equal(fixture.writes.length, 0);
});
test('saved Gemini models beat env/body overrides and inline output is uploaded before publication', async () => {
  const result = await generate({ model: 'wrong-body-model', imageModel: 'wrong-body-image' });
  assert.equal(result.status, 200); assert.equal(result.data.imageUrl, 'https://images.example.test/blog/generated.png');
  assert.deepEqual(fixture.calls.map(call => call.body.model), ['gemini-3.7-flash', 'gemini-3.1-flash-lite-image']);
  assert.ok(fixture.calls.every(call => call.headers.Authorization === 'Bearer fixture-api-key'));
  const imageCall = fixture.calls[1]; assert.ok(imageCall.url.endsWith('/chat/completions'));
  assert.deepEqual(imageCall.body.modalities, ['image', 'text']); assert.equal(imageCall.body.generationConfig.imageConfig.imageSize, '1K');
  assert.equal('response_format' in imageCall.body, false); assert.equal(fixture.uploads.length, 1);
  assert.equal(fixture.uploads[0].options.contentType, 'image/png'); assert.equal(fixture.uploads[0].bytes.toString('base64'), png);
  const category = (await request('/api/admin/blog/categories', { name: result.data.category })).data;
  const tag = (await request('/api/admin/blog/tags', { name: result.data.tags[0] })).data;
  const post = await request('/api/admin/blog/posts', { ...result.data, coverImage: result.data.imageUrl, coverAlt: result.data.imageAlt,
    categoryIds: [category.id], tagIds: [tag.id], status: 'published' });
  assert.equal(post.status, 201);
  const page = await nativeFetch(`${base}/blog/${post.data.slug}/`); assert.equal(page.status, 200); assert.match(await page.text(), /generated\.png/);
  assert.match(await (await nativeFetch(`${base}/sitemap.xml`)).text(), /choose-photo-paper/);
});
test('the next request uses a changed database image model and GPT Image parameters', async () => {
  await generate(); fixture.calls = []; fixture.uploads = [];
  await apiClient.saveAiSettings({ avalaiModel: 'gpt-image-2.5-sunburst' });
  assert.equal((await generate()).status, 200);
  const imageCall = fixture.calls[1]; assert.ok(imageCall.url.endsWith('/images/generations'));
  assert.equal(imageCall.body.model, 'gpt-image-2.5-sunburst'); assert.equal(imageCall.body.size, '1024x1024');
  assert.equal('response_format' in imageCall.body, false); assert.equal('modalities' in imageCall.body, false);
  assert.equal(fixture.uploads.length, 1);
});

test('saved GPT-5.1 invokes the Responses image tool and uploads the result', async () => {
  await apiClient.saveAiSettings({ avalaiModel: 'gpt-5.1' });
  const result = await generate({ imageModel: 'wrong-body-image' });
  assert.equal(result.status, 200); assert.equal(result.data.imageUrl, 'https://images.example.test/blog/generated.png');
  assert.deepEqual(fixture.calls.map(call => call.body.model), ['gemini-3.7-flash', 'gpt-5.1']);
  const imageCall = fixture.calls[1]; assert.equal(imageCall.url, 'https://api.avalai.ir/v1/responses');
  assert.equal(imageCall.headers.Authorization, 'Bearer fixture-api-key');
  assert.match(imageCall.body.input, /Generate a new image:.*studio table/);
  assert.deepEqual(imageCall.body.tool_choice, { type: 'image_generation' });
  assert.deepEqual(imageCall.body.tools, [{ type: 'image_generation', action: 'generate', size: '1024x1024', quality: 'medium' }]);
  assert.equal('prompt' in imageCall.body, false); assert.equal('messages' in imageCall.body, false);
  assert.equal('response_format' in imageCall.body, false); assert.equal('n' in imageCall.body, false);
  assert.equal(fixture.uploads.length, 1); assert.equal(fixture.uploads[0].bytes.toString('base64'), png);
  assert.equal(fixture.uploads[0].options.contentType, 'image/png');
});

test('the next generation reads changed GPT aliases and snapshots from the database', async () => {
  for (const model of ['gpt-5.1', 'gpt-5.2', 'gpt-5.2-2025-12-11', 'gpt-4.1-mini', 'chat-latest']) {
    fixture.calls = []; fixture.uploads = [];
    await apiClient.saveAiSettings({ avalaiModel: model });
    assert.equal((await generate()).status, 200, model);
    assert.equal(fixture.calls[1].url, 'https://api.avalai.ir/v1/responses', model);
    assert.equal(fixture.calls[1].body.model, model); assert.equal(fixture.uploads.length, 1);
  }
});

test('Responses searches output items for an image after text and reasoning', async () => {
  fixture.settings.avalaiModel = 'gpt-5.1';
  fixture.responseData = { status: 'completed', output: [
    { type: 'message', content: [{ type: 'output_text', text: 'Image created.' }] },
    { type: 'reasoning', summary: [] },
    { type: 'image_generation_call', status: 'completed', result: png }
  ] };
  const result = await generate(); assert.equal(result.status, 200); assert.equal(fixture.uploads.length, 1);
  assert.equal(result.data.imageUrl, 'https://images.example.test/blog/generated.png');
});

test('Responses HTTP rejection preserves the selected model and reason without fallback or secrets', async () => {
  fixture.settings.avalaiModel = 'gpt-5.1'; fixture.imageStatus = 403;
  fixture.imageError = 'image_generation tool denied; fixture-api-key; Bearer aa-proj-private';
  const result = await generate(); assert.equal(result.status, 502);
  assert.match(result.data.error, /gpt-5\.1/); assert.match(result.data.error, /HTTP 403/); assert.match(result.data.error, /tool denied/);
  assert.doesNotMatch(result.data.error, /fixture-api-key|aa-proj-private/);
  assert.equal(fixture.calls.length, 2); assert.equal(fixture.calls[1].url, 'https://api.avalai.ir/v1/responses');
  assert.equal(fixture.uploads.length, 0); assert.equal(fixture.state, null);
});

test('failed or incomplete Responses and image calls cannot upload a partial result', async () => {
  for (const responseData of [
    { status: 'failed', error: { message: 'tool denied; fixture-api-key' } },
    { status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output: [{ type: 'image_generation_call', status: 'completed', result: png }] },
    { status: 'completed', output: [{ type: 'image_generation_call', status: 'failed', error: { message: 'tool failed; fixture-api-key' } }] },
    { status: 'completed', output: [{ type: 'image_generation_call', status: 'in_progress', result: png }] }
  ]) {
    fixture.reset(); fixture.settings.avalaiModel = 'gpt-5.1'; fixture.responseData = responseData;
    const result = await generate(); assert.equal(result.status, 502);
    assert.match(result.data.error, /کامل نشد.*gpt-5\.1/); assert.doesNotMatch(result.data.error, /fixture-api-key/);
    assert.equal(fixture.uploads.length, 0); assert.equal(fixture.state, null); assert.equal(fixture.calls.length, 2);
    const detail = responseData.error?.message || responseData.incomplete_details?.reason || responseData.output?.[0]?.error?.message;
    if (detail) assert.ok(result.data.error.includes(detail.split(';')[0]));
  }
});

test('text-only or malformed Responses output cannot produce a cover', async () => {
  for (const responseData of [null, { status: 'completed', output: [null] }, { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'No image.' }] }] }]) {
    fixture.reset(); fixture.settings.avalaiModel = 'gpt-5.1'; fixture.responseData = responseData;
    const result = await generate(); assert.equal(result.status, 502); assert.match(result.data.error, /خروجی قابل استفاده.*gpt-5\.1/);
    assert.equal(fixture.uploads.length, 0); assert.equal(fixture.state, null);
  }
});

test('Responses image bytes pass the same format validation before upload', async () => {
  fixture.settings.avalaiModel = 'gpt-5.1';
  fixture.responseData = { status: 'completed', output: [{ type: 'image_generation_call', status: 'completed', result: Buffer.from('not an image').toString('base64') }] };
  const result = await generate(); assert.equal(result.status, 502); assert.match(result.data.error, /فرمت یا اندازه/);
  assert.equal(fixture.uploads.length, 0); assert.equal(fixture.state, null);
});
test('upstream rejection shows the actual model, HTTP status and reason without credentials', async () => {
  fixture.imageStatus = 403; fixture.imageError = 'Requires tier 1; fixture-api-key; Bearer aa-proj-should-be-hidden';
  const result = await generate(); assert.equal(result.status, 502);
  assert.match(result.data.error, /gemini-3\.1-flash-lite-image/); assert.match(result.data.error, /HTTP 403/); assert.match(result.data.error, /Requires tier 1/);
  assert.doesNotMatch(result.data.error, /fixture-api-key|aa-proj-should-be-hidden/); assert.equal(fixture.state, null); assert.equal(fixture.uploads.length, 0);
});
test('missing models and disabled AI fail before any billed provider request', async () => {
  delete fixture.settings.avalaiModel;
  assert.equal((await generate()).status, 400); assert.equal(fixture.calls.length, 0);
  fixture.settings = { ...settings(), aiEnabled: false };
  assert.equal((await generate()).status, 400); assert.equal(fixture.calls.length, 0);
});
test('invalid image models cannot be silently stored', async () => {
  const result = await request('/api/settings', { avalaiModel: ' ' });
  assert.equal(result.status, 400); assert.equal(fixture.writes.length, 0);
});
test('a response without an image cannot create or publish an article', async () => {
  fixture.missingImage = true; const result = await generate();
  assert.equal(result.status, 502); assert.match(result.data.error, /خروجی قابل استفاده/); assert.equal(fixture.state, null);
});
test('provider transport failures are reported as AI errors', async () => {
  fixture.networkFails = true; const result = await generate();
  assert.equal(result.status, 504); assert.match(result.data.error, /gemini-3\.7-flash/); assert.equal(fixture.state, null);
});
test('the dedicated generation handler retains authentication and administrator checks', async () => {
  for (const route of ['/api/admin/blog/ai-generate', '/api/blog-ai-generate']) {
    assert.equal((await request(route, {}, null)).status, 401);
    assert.equal((await request(route, {}, 'user')).status, 403);
  }
  assert.equal(fixture.calls.length, 0);
  assert.equal((await request('/api/blog-ai-generate')).status, 200);
});
test('Vercel routes generation to its longer-running handler before the catch-all', async () => {
  const config = JSON.parse(await fs.readFile(path.join(repo, 'vercel.json'), 'utf8'));
  assert.equal(config.functions['api/blog-ai-generate.ts'].maxDuration, 300);
  assert.equal(config.functions['api/[...route].ts'].maxDuration, 60);
  assert.ok(config.rewrites.findIndex(rule => rule.source === '/api/admin/blog/ai-generate') < config.rewrites.findIndex(rule => rule.source === '/api/(.*)'));
});

test('browser AI settings wait for persistence, retain failures and reload before generation', { skip: !process.env.PLAYWRIGHT_MODULE }, async () => {
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  let releaseSave;
  try {
    fixture.settings.aiEnabled = false;
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('https://images.example.test/**', route => route.fulfill({ body: Buffer.from(png, 'base64'), contentType: 'image/png' }));
    await page.goto(`${base}/__test/sign-in`, { waitUntil: 'networkidle' });
    assert.ok(page.url().endsWith('/admin/posts/ai-settings'));
    await page.getByRole('heading', { name: 'تنظیمات هوش مصنوعی نوشته‌ها', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'تنظیمات هوش مصنوعی', exact: true }).getAttribute('aria-current'), 'page');
    const generator = page.getByRole('button', { name: 'تولید و انتشار مطلب', exact: true });
    assert.equal(await generator.isDisabled(), true);
    const control = page.getByRole('switch', { name: 'فعال‌سازی سرویس هوش مصنوعی' });
    assert.equal(await control.getAttribute('aria-checked'), 'false');
    const model = page.getByPlaceholder('gpt-image-2.5-sunburst', { exact: true });
    const blogKey = page.getByLabel('کلید دسترسی (AvalAI API Key):', { exact: true });
    const blogUrl = page.getByLabel('آدرس پایه API (API Base URL):', { exact: true });
    assert.equal(await blogKey.inputValue(), ''); assert.equal(await blogUrl.inputValue(), '');
    assert.equal(await blogUrl.getAttribute('placeholder'), settings().avalaiBaseUrl);
    await blogKey.fill(' blog-fixture-key '); await blogUrl.fill(' https://blog.example.test/v1/// ');
    assert.equal(await model.inputValue(), 'gemini-3.1-flash-lite-image');
    await model.fill('gpt-image-2.5-sunburst');
    const gate = new Promise(resolve => { releaseSave = resolve; });
    let settingsPosts = 0;
    await page.route('**/api/settings', async route => {
      if (route.request().method() === 'POST') { settingsPosts++; await gate; }
      await route.continue();
    });
    await page.getByRole('button', { name: 'ذخیره تنظیمات', exact: true }).click();
    await page.getByRole('button', { name: 'در حال ذخیره…', exact: true }).waitFor();
    assert.equal(await model.isDisabled(), true);
    assert.equal(await generator.isDisabled(), true);
    assert.equal(fixture.writes.length, 0);
    releaseSave();
    await page.getByRole('status').filter({ hasText: 'تنظیمات هوش مصنوعی در دیتابیس ذخیره شد.' }).waitFor();
    assert.equal(settingsPosts, 1); assert.equal(fixture.writes.length, 1);
    assert.equal(fixture.settings.avalaiModel, 'gpt-image-2.5-sunburst');
    assert.equal(fixture.settings.avalaiApiKey, settings().avalaiApiKey); assert.equal(fixture.settings.avalaiBaseUrl, settings().avalaiBaseUrl);
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await model.inputValue(), 'gpt-image-2.5-sunburst');
    assert.equal(await blogKey.inputValue(), 'blog-fixture-key'); assert.equal(await blogUrl.inputValue(), 'https://blog.example.test/v1');
    assert.equal(await control.getAttribute('aria-checked'), 'false');
    fixture.saveFails = true;
    await model.fill('gemini-3.1-flash-lite-image');
    await page.getByRole('button', { name: 'ذخیره تنظیمات', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'ذخیره تنظیمات در دیتابیس ناموفق بود' }).waitFor();
    assert.equal(fixture.settings.avalaiModel, 'gpt-image-2.5-sunburst');
    assert.equal(await model.isEnabled(), true);
    fixture.saveFails = false;
    await model.fill('gpt-5.1');
    await page.getByPlaceholder('gpt-4o-mini', { exact: true }).fill('gpt-5.1');
    await page.getByRole('button', { name: 'ذخیره تنظیمات', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'تنظیمات هوش مصنوعی در دیتابیس ذخیره شد.' }).waitFor();
    await control.click();
    await page.waitForFunction(() => document.querySelector('[aria-label="فعال‌سازی سرویس هوش مصنوعی"]').getAttribute('aria-checked') === 'true');
    await page.goto(`${base}/admin/chatgpt`, { waitUntil: 'networkidle' });
    assert.equal(await page.getByLabel('مدل تولید متن:', { exact: true }).count(), 0);
    await blogKey.fill('changed-chatgpt-key');
    await page.getByRole('button', { name: 'ذخیره تنظیمات', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'تنظیمات هوش مصنوعی در دیتابیس ذخیره شد.' }).waitFor();
    assert.equal(fixture.settings.avalaiTextModel, 'gpt-5.1');
    assert.equal(fixture.settings.avalaiBlogApiKey, 'blog-fixture-key'); assert.equal(fixture.settings.avalaiBlogBaseUrl, 'https://blog.example.test/v1');
    await page.goto(`${base}/admin/posts/ai-settings`, { waitUntil: 'networkidle' });
    await page.getByLabel('نوع مطلب', { exact: true }).selectOption('comparison');
    await page.getByLabel('موضوع تولید مطلب', { exact: true }).selectOption('mobile-photography');
    if (process.env.BLOG_AI_SCREENSHOTS) {
      await fs.mkdir(process.env.BLOG_AI_SCREENSHOTS, { recursive: true });
      await page.screenshot({ path: path.join(process.env.BLOG_AI_SCREENSHOTS, 'desktop.png'), fullPage: true });
    }
    await generator.click();
    await page.waitForURL('**/admin/posts/write?id=*');
    await page.getByRole('heading', { name: 'ویرایش نوشته', exact: true, level: 1 }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'تولید و انتشار مطلب', exact: true }).count(), 0);
    assert.deepEqual(fixture.calls.map(call => call.body.model), ['gpt-5.1', 'gpt-5.1']);
    assert.equal(fixture.calls[0].url, 'https://blog.example.test/v1/chat/completions');
    assert.ok(fixture.calls.every(call => call.headers.Authorization === 'Bearer blog-fixture-key'));
    assert.ok(fixture.calls[0].body.messages[1].content.includes(BLOG_ARTICLE_TOPICS.find(topic => topic.id === 'mobile-photography').brief));
    assert.equal(fixture.calls[1].url, 'https://blog.example.test/v1/responses');
    assert.equal(fixture.state.posts[0].status, 'published');
    const post = fixture.state.posts[0];
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'منوی مدیریت', exact: true }).click();
    await page.getByRole('button', { name: 'تنظیمات هوش مصنوعی', exact: true }).click();
    await page.waitForURL('**/admin/posts/ai-settings');
    await page.getByRole('heading', { name: 'تنظیمات هوش مصنوعی نوشته‌ها', exact: true }).waitFor();
    assert.equal(await page.getByLabel('مدل تولید متن:', { exact: true }).inputValue(), 'gpt-5.1');
    await page.getByLabel('موضوع تولید مطلب', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('موضوع تولید مطلب', { exact: true }).locator('option').count(), BLOG_ARTICLE_TOPICS.length);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    if (process.env.BLOG_AI_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.BLOG_AI_SCREENSHOTS, 'mobile.png'), fullPage: true });
    await blogKey.fill(''); await blogUrl.fill('');
    let testConnection;
    fixture.calls = [];
    await page.getByRole('button', { name: 'تست اتصال به AvalAI', exact: true }).click();
    await page.getByText('اتصال به سرویس AvalAI با موفقیت برقرار شد و کلید فعال است.', { exact: true }).waitFor();
    await page.getByRole('status').filter({ hasText: 'تنظیمات هوش مصنوعی در دیتابیس ذخیره شد.' }).waitFor();
    testConnection = fixture.calls[0];
    assert.equal(testConnection.url, 'https://api.avalai.ir/v1/chat/completions');
    assert.equal(testConnection.headers.Authorization, 'Bearer changed-chatgpt-key');
    assert.equal(fixture.settings.avalaiBlogApiKey, ''); assert.equal(fixture.settings.avalaiBlogBaseUrl, '');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await blogKey.inputValue(), ''); assert.equal(await blogUrl.inputValue(), '');
    await page.goto(`${base}/blog/${post.slug}/`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: post.title, exact: true }).waitFor();
    assert.match(await (await nativeFetch(`${base}/sitemap.xml`)).text(), /choose-photo-paper/);
    assert.deepEqual(errors, []);
  } finally { releaseSave?.(); await browser.close(); }
});
