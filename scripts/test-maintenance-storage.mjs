import assert from 'node:assert/strict';
import { before, beforeEach, after, test } from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(repo, 'package.json'));
const { build } = createRequire(require.resolve('vite'))('esbuild');
let directory, storage;
const fixture = { snapshots: {}, corrupt: false, active: 'mongodb' };
globalThis.__maintenanceMigration = fixture;
before(async () => {
  directory = await fs.mkdtemp(path.join(repo, 'work/maintenance-storage-'));
  const source = await fs.readFile(path.join(repo, 'storage.ts'), 'utf8');
  const output = path.join(directory, 'storage.mjs');
  await build({ entryPoints: [path.join(repo, 'storage.ts')], outfile: output, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent',
    plugins: [{ name: 'migration-fixture', setup(builder) {
      builder.onResolve({ filter: /^\.\/(mongoStore|postgresStore)$/ }, ({ path: module }) => ({ path: module.includes('mongo') ? 'mongo' : 'postgres', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path: adapter }) => {
        const names = [...new Set([...source.matchAll(new RegExp(`${adapter}\\.([A-Za-z]+)`, 'g'))].map(match => match[1]))];
        return { loader: 'js', contents: names.map(name => `export const ${name} = (...args) => globalThis.__maintenanceMigration.${adapter}.${name}(...args);`).join('\n') };
      });
    } }] });
  storage = await import(pathToFileURL(output).href);
});
beforeEach(() => {
  fixture.active = 'mongodb'; fixture.corrupt = false;
  const state = { users: [{ id: 'admin' }], settings: { maintenanceMode: false } };
  const queue = { revision: 5, enabled: true, nextSendAt: 1000, batch: { id: 'batch', index: 1, sent: 1, failed: 0,
    recipients: [{ userId: '1', channel: 'telegram', recipient: '100', attempts: 1, status: 'sent' },
      { userId: '2', channel: 'eitaa', recipient: '200', attempts: 0, status: 'pending' }] } };
  const operational = { sessions: [{ userId: 'admin' }], otps: [], rateLimits: [], auditLogs: [], maintenanceQueue: queue };
  fixture.snapshots = { mongodb: { state, operational }, postgres: { state: {}, operational: {} } };
  for (const [adapter, provider] of [['mongo', 'mongodb'], ['postgres', 'postgres']]) {
    const normalizeArgs = args => adapter === 'mongo' ? args : args.slice(1);
    fixture[adapter] = {
      getDb: async () => ({ command: async () => ({ ok: 1 }) }),
      withExclusiveStorageLock: async callback => callback(fixture.active, {}),
      readDb: async () => structuredClone(fixture.snapshots[provider].state),
      readOperationalData: async () => structuredClone(fixture.snapshots[provider].operational),
      replaceAllState: async (...args) => { fixture.snapshots[provider].state = structuredClone(normalizeArgs(args)[0]); },
      replaceOperationalData: async (...args) => {
        fixture.snapshots[provider].operational = structuredClone(normalizeArgs(args)[0]);
        if (fixture.corrupt) fixture.snapshots[provider].operational.maintenanceQueue.revision++;
      },
      replaceAllData: async (state, operational) => { fixture.snapshots[provider] = structuredClone({ state, operational }); },
      setActiveProvider: async (_db, provider) => { fixture.active = provider; }
    };
  }
});
after(async () => { await fs.unlink(path.join(directory, 'storage.mjs')); await fs.rmdir(directory); delete globalThis.__maintenanceMigration; });

test('provider migration preserves the mode, recipient order and queue checkpoint', async () => {
  const original = structuredClone(fixture.snapshots.mongodb);
  await storage.switchStorageProvider('postgres');
  assert.equal(fixture.active, 'postgres');
  assert.deepEqual(fixture.snapshots.postgres, original);
  await storage.switchStorageProvider('mongodb');
  assert.deepEqual(fixture.snapshots.mongodb, original);
});
test('a corrupted queue checkpoint prevents switching the active provider', async () => {
  fixture.corrupt = true;
  await assert.rejects(storage.switchStorageProvider('postgres'), /عملیاتی/);
  assert.equal(fixture.active, 'mongodb');
});
test('migration also supports a site without a maintenance queue', async () => {
  fixture.snapshots.mongodb.operational.maintenanceQueue = null;
  await storage.copyStorageProviderData('mongodb', 'postgres');
  assert.equal(fixture.snapshots.postgres.operational.maintenanceQueue, null);
});
