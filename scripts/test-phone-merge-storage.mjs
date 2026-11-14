import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(repo, 'package.json'));
const { build } = createRequire(require.resolve('vite'))('esbuild');
const originalUri = process.env.MONGODB_URI;
const originalDataDir = process.env.DATA_DIR;
const originalCache = globalThis.__lalehMongo;
const uri = 'mongodb://fixture-only';
const initial = {
  users: [{ id: 'source' }, { id: 'owner', eitaaId: '' }],
  orders: [{ id: 'order', userId: 'source' }], deliveryMethods: [{ id: 'delivery' }], settings: {}
};
const fixture = {
  db: structuredClone(initial), writes: [], failCollection: null, ended: 0,
  collection(name) {
    return {
      find: () => ({ toArray: async () => structuredClone(fixture.db[name] || []) }),
      findOne: async () => name === 'meta' ? { migrated: true } : structuredClone(fixture.db[name] || {}),
      bulkWrite: async (operations, options) => {
        fixture.writes.push({ collection: name, session: options.session });
        if (fixture.failCollection === name) throw new Error('Fixture collection failure');
        const state = options.session?.state || fixture.db;
        state[name] ||= [];
        for (const operation of operations) {
          if (operation.deleteOne) state[name] = state[name].filter(item => item.id !== operation.deleteOne.filter.id);
          if (operation.replaceOne) {
            const { filter, replacement } = operation.replaceOne;
            const index = state[name].findIndex(item => item.id === filter.id);
            if (index >= 0) state[name][index] = structuredClone(replacement);
            else state[name].push(structuredClone(replacement));
          }
        }
      },
      replaceOne: async (_filter, value, options) => {
        fixture.writes.push({ collection: name, session: options.session });
        (options.session?.state || fixture.db)[name] = structuredClone(value);
      }
    };
  }
};
const client = {
  startSession() {
    return {
      async withTransaction(callback) {
        this.state = structuredClone(fixture.db);
        await callback();
        fixture.db = this.state;
      },
      async endSession() { fixture.ended++; }
    };
  }
};
let directory, mongo;
before(async () => {
  await fs.mkdir(path.join(repo, 'work'), { recursive: true });
  directory = await fs.mkdtemp(path.join(repo, 'work/phone-storage-tests-'));
  process.env.MONGODB_URI = uri;
  process.env.DATA_DIR = directory;
  globalThis.__lalehMongo = { uri, client, db: { collection: name => fixture.collection(name) } };
  const output = path.join(directory, 'mongo.mjs');
  await build({ entryPoints: [path.join(repo, 'mongoStore.ts')], outfile: output, bundle: true, packages: 'external', platform: 'node', format: 'esm', logLevel: 'silent' });
  mongo = await import(pathToFileURL(output).href);
});
beforeEach(async () => {
  fixture.db = structuredClone(initial); fixture.writes = []; fixture.failCollection = null; fixture.ended = 0;
  await mongo.readDb();
});
after(async () => {
  if (originalUri === undefined) delete process.env.MONGODB_URI; else process.env.MONGODB_URI = originalUri;
  if (originalDataDir === undefined) delete process.env.DATA_DIR; else process.env.DATA_DIR = originalDataDir;
  if (originalCache === undefined) delete globalThis.__lalehMongo; else globalThis.__lalehMongo = originalCache;
  if (directory) { await fs.unlink(path.join(directory, 'mongo.mjs')).catch(() => undefined); await fs.rmdir(directory); }
});
const merged = () => ({ ...fixture.db, users: [{ id: 'owner', eitaaId: '12345678' }], orders: [{ id: 'order', userId: 'owner' }] });

test('MongoDB commits the account and related records in the same transaction', async () => {
  await mongo.writeDb(merged(), { atomic: true });
  assert.equal(fixture.db.users.length, 1);
  assert.equal(fixture.db.orders[0].userId, 'owner');
  assert.ok(fixture.writes.length >= 2);
  assert.ok(fixture.writes.every(write => write.session && write.session === fixture.writes[0].session));
  assert.equal(fixture.ended, 1);
});
test('a later collection failure rolls back the account deletion and leaves signatures usable', async () => {
  fixture.failCollection = 'orders';
  await assert.rejects(mongo.writeDb(merged(), { atomic: true }), /Fixture collection failure/);
  assert.deepEqual(fixture.db, initial);
  assert.equal(fixture.ended, 1);
  fixture.failCollection = null; fixture.writes = [];
  await mongo.writeDb(merged(), { atomic: true });
  assert.ok(fixture.writes.some(write => write.collection === 'users'));
  assert.equal(fixture.db.orders[0].userId, 'owner');
});
test('ordinary database writes preserve the existing non-transactional behavior', async () => {
  await mongo.writeDb(merged());
  assert.equal(fixture.db.orders[0].userId, 'owner');
  assert.ok(fixture.writes.every(write => !write.session));
  assert.equal(fixture.ended, 0);
});
