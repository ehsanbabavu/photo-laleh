import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMaintenanceQueue, maintenanceQueueSummary, MaintenanceRetry, type MaintenanceQueueState, type MaintenanceTick } from '../maintenanceQueue';

const users = [
  { id: '1', name: 'First', telegramId: '101', eitaaId: '201' },
  { id: '2', name: 'Second', telegramId: '102' }
];
const config = { telegramToken: 'test-token', eitaaToken: 'test-token' };
function fixture() {
  let state: MaintenanceQueueState | null = null;
  let time = 100_000;
  const published: { tick: MaintenanceTick; delay: number; key: string }[] = [];
  const sent: { recipient: string; message: string; time: number }[] = [];
  const controls = { ok: true, publishFails: false, saveFails: false, gate: null as Promise<void> | null };
  const dependencies = {
    read: async () => structuredClone(state),
    compareAndSet: async (revision: number, next: MaintenanceQueueState) => {
      if (controls.saveFails) throw new Error('storage unavailable');
      if ((state?.revision || 0) !== revision) return false;
      state = structuredClone(next);
      return true;
    },
    publish: async (tick: MaintenanceTick, delay: number, key: string) => {
      if (controls.publishFails) throw new Error('queue unavailable');
      published.push({ tick, delay, key });
    },
    send: async (target: { recipient: string }, message: string) => {
      sent.push({ recipient: target.recipient, message, time });
      if (controls.gate) await controls.gate;
      return { ok: controls.ok };
    },
    now: () => time
  };
  const queue = createMaintenanceQueue(dependencies);
  return { queue, dependencies, controls, published, sent, read: () => structuredClone(state),
    advance: (ms = 1000) => { time += ms; },
    next: async () => { const job = published.at(-1)!; time += job.delay * 1000; await queue.process(job.tick); } };
}

test('stores a deduplicated ordered recipient list without sending or persisting tokens', async () => {
  const f = fixture();
  await f.queue.changeMode(true, [...users, users[0], { id: 'empty' }], config);
  assert.deepEqual(f.read()!.batch!.recipients.map(r => `${r.channel}:${r.recipient}`), ['telegram:101', 'eitaa:201', 'telegram:102']);
  assert.equal(f.sent.length, 0);
  assert.equal(JSON.stringify(f.read()).includes('test-token'), false);
  assert.equal(maintenanceQueueSummary(f.read()).pending, 3);
});

test('sends exactly one target per tick in order, with at least one second between sends', async () => {
  const f = fixture();
  await f.queue.changeMode(true, users, config);
  await f.queue.dispatch();
  for (let i = 0; i < 3; i++) await f.next();
  assert.deepEqual(f.sent.map(s => s.recipient), ['101', '201', '102']);
  assert.deepEqual(f.sent.map(s => s.time), [100000, 101000, 102000]);
  assert.deepEqual(maintenanceQueueSummary(f.read()), { enabled: true, batchId: f.read()!.batch!.id, status: 'completed', total: 3, pending: 0, sent: 3, failed: 0 });
});

test('duplicate concurrent ticks cannot overlap sends across workers', async () => {
  const f = fixture();
  let release!: () => void;
  f.controls.gate = new Promise<void>(resolve => { release = resolve; });
  await f.queue.changeMode(true, users, config);
  await f.queue.dispatch();
  const tick = f.published[0].tick;
  const first = f.queue.process(tick);
  while (!f.sent.length) await new Promise(resolve => setImmediate(resolve));
  const secondWorker = createMaintenanceQueue(f.dependencies);
  await assert.rejects(secondWorker.process(tick), MaintenanceRetry);
  assert.equal(f.sent.length, 1);
  release();
  await first;
  await secondWorker.process(tick);
  assert.equal(f.sent.length, 1);
});

test('early delivery requests a delay and does not send before the pacing interval', async () => {
  const f = fixture();
  await f.queue.changeMode(true, users, config);
  await f.queue.dispatch();
  await f.next();
  await assert.rejects(f.queue.process(f.published.at(-1)!.tick), (e: MaintenanceRetry) => e.afterSeconds === 1);
  assert.equal(f.sent.length, 1);
});

test('a restarted worker resumes the persisted cursor without repeating sent targets', async () => {
  const f = fixture();
  await f.queue.changeMode(true, users, config);
  await f.queue.dispatch();
  await f.next();
  const restarted = createMaintenanceQueue(f.dependencies);
  await restarted.dispatch(true);
  f.advance();
  await restarted.process(f.published.at(-1)!.tick);
  assert.deepEqual(f.sent.map(s => s.recipient), ['101', '201']);
});

test('failed delivery retries three times with five-second spacing, then continues', async () => {
  const f = fixture();
  f.controls.ok = false;
  await f.queue.changeMode(true, users, config);
  await f.queue.dispatch();
  for (let i = 0; i < 3; i++) await f.next();
  assert.deepEqual(f.sent.map(s => s.time), [100000, 105000, 110000]);
  assert.equal(f.read()!.batch!.failed, 1);
  assert.equal(f.read()!.batch!.recipients[0].status, 'failed');
  f.controls.ok = true;
  await f.next();
  assert.equal(f.sent.at(-1)!.recipient, '201');
});

test('publication failure after delivery preserves the checkpoint and retry only schedules the next target', async () => {
  const f = fixture();
  await f.queue.changeMode(true, users, config);
  await f.queue.dispatch();
  const tick = f.published[0].tick;
  f.controls.publishFails = true;
  await assert.rejects(f.queue.process(tick), /queue unavailable/);
  assert.equal(f.read()!.batch!.index, 1);
  f.controls.publishFails = false;
  await f.queue.process(tick);
  assert.equal(f.sent.length, 1);
  await f.next();
  assert.equal(f.sent.at(-1)!.recipient, '201');
});

test('new toggles supersede unsent announcements and preserve an in-flight send lease', async () => {
  const f = fixture();
  let release!: () => void;
  f.controls.gate = new Promise<void>(resolve => { release = resolve; });
  await f.queue.changeMode(true, users, config);
  await f.queue.dispatch();
  const oldTick = f.published[0].tick;
  const send = f.queue.process(oldTick);
  while (!f.sent.length) await new Promise(resolve => setImmediate(resolve));
  await f.queue.changeMode(false, users, config);
  await f.queue.dispatch();
  const newTick = f.published.at(-1)!.tick;
  await assert.rejects(f.queue.process(newTick), MaintenanceRetry);
  release();
  await send;
  f.controls.gate = null;
  f.advance();
  await f.queue.process(newTick);
  await f.queue.process(oldTick);
  assert.equal(f.sent.length, 2);
  assert.match(f.sent[1].message, /پایان یافت/);
  assert.equal(f.read()!.batch!.sent, 1);
});

test('repeating the same state does not create duplicate announcements', async () => {
  const f = fixture();
  await f.queue.changeMode(true, users, config);
  const before = f.read();
  await f.queue.changeMode(true, users, config);
  assert.deepEqual(f.read(), before);
  await f.queue.dispatch();
  await f.queue.dispatch();
  assert.equal(f.published.length, 1);
});

test('empty lists complete immediately and storage failure creates no work', async () => {
  const f = fixture();
  await f.queue.changeMode(true, users, {});
  await f.queue.dispatch();
  assert.equal(maintenanceQueueSummary(f.read()).status, 'completed');
  assert.equal(f.published.length, 0);
  f.controls.saveFails = true;
  await assert.rejects(f.queue.changeMode(false, users, config), /storage unavailable/);
  assert.equal(f.read()!.enabled, true);
  assert.equal(f.sent.length, 0);
});
