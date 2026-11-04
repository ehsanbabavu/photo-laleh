import crypto from 'crypto';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  bigint,
  bigserial,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp
} from 'drizzle-orm/pg-core';
import { Pool, type PoolClient } from 'pg';
import { ARRAY_COLLECTIONS, SINGLETON_COLLECTIONS, SESSION_IDLE_MS, dropRetiredPrintTypes } from './mongoStore';
import { INITIAL_DB } from './seedData';

export type StorageProvider = 'mongodb' | 'postgres';
export type OperationalSnapshot = {
  sessions: any[];
  otps: any[];
  rateLimits: any[];
  auditLogs: any[];
};

export const appRecords = pgTable(
  'laleh_app_records',
  {
    collection: text('collection').notNull(),
    recordId: text('record_id').notNull(),
    position: integer('position').notNull().default(0),
    data: jsonb('data').notNull().$type<Record<string, any>>(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [primaryKey({ columns: [table.collection, table.recordId] })]
);

export const storageControl = pgTable('laleh_storage_control', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const sessions = pgTable('laleh_sessions', {
  token: text('token').primaryKey(),
  userId: text('user_id').notNull(),
  deviceId: text('device_id').notNull().default(''),
  userAgent: text('user_agent').notNull().default(''),
  ip: text('ip').notNull().default(''),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  lastSeenAt: bigint('last_seen_at', { mode: 'number' }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
});

export const otps = pgTable('laleh_otps', {
  phone: text('phone').primaryKey(),
  code: text('code').notNull(),
  attempts: integer('attempts').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
});

export const rateLimits = pgTable('laleh_rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  resetAt: timestamp('reset_at', { withTimezone: true }).notNull()
});

export const auditLogs = pgTable('laleh_audit_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  entry: jsonb('entry').notNull().$type<Record<string, any>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull()
});

const schema = { appRecords, storageControl, sessions, otps, rateLimits, auditLogs };
export type PgDatabase = NodePgDatabase<typeof schema>;

const POSTGRES_LOCK_KEY = '7216031492871';
const APP_STATE_SNAPSHOT = Symbol.for('laleh.postgres.state-signatures');
const PROVIDER_CONTROL_KEY = 'active_provider';

type CachedPool = { connectionString: string; pool: Pool };
const globalForPool = globalThis as typeof globalThis & { __lalehPostgresPool?: CachedPool };

function hasPostgresConfig() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function getPool(): Pool {
  const connectionString = String(process.env.DATABASE_URL || '').trim();
  if (!connectionString) throw new Error('اتصال PostgreSQL در پروژه تنظیم نشده است');

  const cached = globalForPool.__lalehPostgresPool;
  if (cached?.connectionString === connectionString) return cached.pool;
  if (cached) void cached.pool.end().catch(() => undefined);

  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000
  });
  globalForPool.__lalehPostgresPool = { connectionString, pool };
  return pool;
}

function createDatabase(client: Pool | PoolClient): PgDatabase {
  return drizzle(client as any, { schema }) as PgDatabase;
}

export function getPostgresDatabase(): PgDatabase {
  return createDatabase(getPool());
}

async function readActiveProviderFrom(db: PgDatabase): Promise<StorageProvider> {
  const [row] = await db
    .select({ value: storageControl.value })
    .from(storageControl)
    .where(eq(storageControl.key, PROVIDER_CONTROL_KEY))
    .limit(1);

  if (!row) return 'mongodb';
  if (row.value !== 'postgres') throw new Error('نشانگر دیتابیس فعال نامعتبر است');
  return 'postgres';
}

export async function getActiveProvider(): Promise<StorageProvider> {
  if (!hasPostgresConfig()) return 'mongodb';
  return readActiveProviderFrom(createDatabase(getPool()));
}

export async function withStorageWriteLease<T>(
  callback: (provider: StorageProvider, db: PgDatabase | null) => Promise<T>
): Promise<T> {
  if (!hasPostgresConfig()) return callback('mongodb', null);

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock_shared($1::bigint)', [POSTGRES_LOCK_KEY]);
    const db = createDatabase(client);
    const provider = await readActiveProviderFrom(db);
    const result = await callback(provider, db);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function withExclusiveStorageLock<T>(
  callback: (provider: StorageProvider, db: PgDatabase) => Promise<T>
): Promise<T> {
  if (!hasPostgresConfig()) throw new Error('اتصال PostgreSQL در پروژه تنظیم نشده است');

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [POSTGRES_LOCK_KEY]);
    const db = createDatabase(client);
    const provider = await readActiveProviderFrom(db);
    const result = await callback(provider, db);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function setActiveProvider(db: PgDatabase, provider: StorageProvider) {
  if (provider === 'postgres') {
    await db
      .insert(storageControl)
      .values({ key: PROVIDER_CONTROL_KEY, value: 'postgres' })
      .onConflictDoUpdate({
        target: storageControl.key,
        set: { value: 'postgres', updatedAt: new Date() }
      });
    return;
  }

  await db.delete(storageControl).where(eq(storageControl.key, PROVIDER_CONTROL_KEY));
}

export async function getPostgresStatus(): Promise<{ configured: boolean; connected: boolean; error?: string }> {
  if (!hasPostgresConfig()) return { configured: false, connected: false };

  try {
    await createDatabase(getPool()).execute(sql`select 1`);
    return { configured: true, connected: true };
  } catch (error: any) {
    return {
      configured: true,
      connected: false,
      error: error?.message || 'اتصال PostgreSQL برقرار نشد'
    };
  }
}

function cloneSeed() {
  return JSON.parse(JSON.stringify(INITIAL_DB));
}

function emptyState() {
  const state: Record<string, any> = {};
  for (const name of ARRAY_COLLECTIONS) state[name] = [];
  for (const name of SINGLETON_COLLECTIONS) state[name] = {};
  return state;
}

function normalizeState(value: any) {
  const state = { ...(value || {}) } as Record<string, any>;
  for (const name of ARRAY_COLLECTIONS) state[name] = Array.isArray(state[name]) ? state[name] : [];
  for (const name of SINGLETON_COLLECTIONS) {
    state[name] = state[name] && typeof state[name] === 'object' ? state[name] : {};
  }
  return dropRetiredPrintTypes(state);
}

function hashDoc(value: any): string {
  const text = JSON.stringify(value ?? null);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${(hash >>> 0).toString(36)}:${text.length}`;
}

type SignatureSnapshot = Record<string, Map<string, string>>;

function buildSignatures(state: any): SignatureSnapshot {
  const result: SignatureSnapshot = {};
  for (const name of ARRAY_COLLECTIONS) {
    const map = new Map<string, string>();
    const items = Array.isArray(state[name]) ? state[name] : [];
    items.forEach((item: any, position: number) => {
      if (item && item.id !== undefined) map.set(String(item.id), `${position}:${hashDoc(item)}`);
    });
    result[name] = map;
  }
  for (const name of SINGLETON_COLLECTIONS) {
    result[name] = new Map([['main', hashDoc(state[name] || {})]]);
  }
  return result;
}

function attachStateSnapshot(state: any, snapshot: SignatureSnapshot) {
  Object.defineProperty(state, APP_STATE_SNAPSHOT, {
    value: snapshot,
    enumerable: true,
    configurable: true,
    writable: true
  });
  return state;
}

function getStateSnapshot(state: any): SignatureSnapshot | undefined {
  return state?.[APP_STATE_SNAPSHOT];
}

function removeMongoId(value: any) {
  const copy = { ...(value || {}) };
  delete copy._id;
  return copy;
}

function stateToRows(value: any) {
  const state = normalizeState(value);
  const rows: Array<{ collection: string; recordId: string; position: number; data: Record<string, any> }> = [];

  for (const name of ARRAY_COLLECTIONS) {
    const items = state[name] as any[];
    items.forEach((item, position) => {
      if (!item || item.id === undefined) return;
      rows.push({
        collection: name,
        recordId: String(item.id),
        position,
        data: removeMongoId(item)
      });
    });
  }

  for (const name of SINGLETON_COLLECTIONS) {
    rows.push({ collection: name, recordId: 'main', position: 0, data: removeMongoId(state[name] || {}) });
  }
  rows.push({
    collection: '__laleh_internal',
    recordId: 'initialized',
    position: 0,
    data: { initialized: true }
  });

  return rows;
}

function chunks<T>(items: T[], size = 250) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

async function insertStateRows(db: PgDatabase, rows: ReturnType<typeof stateToRows>, ignoreConflicts = false) {
  for (const batch of chunks(rows)) {
    const insert = db.insert(appRecords).values(batch);
    if (ignoreConflicts) await insert.onConflictDoNothing();
    else await insert;
  }
}

function signaturesFromRows(rows: Array<{ collection: string; recordId: string; data: any; position: number }>) {
  const state = emptyState();
  for (const row of rows) {
    if ((ARRAY_COLLECTIONS as readonly string[]).includes(row.collection)) {
      state[row.collection].push(row.data);
    } else if ((SINGLETON_COLLECTIONS as readonly string[]).includes(row.collection)) {
      state[row.collection] = row.data || {};
    }
  }
  return buildSignatures(state);
}

function stateFromRows(rows: Array<{ collection: string; recordId: string; data: any; position: number }>) {
  const state = emptyState();
  for (const row of rows) {
    if ((ARRAY_COLLECTIONS as readonly string[]).includes(row.collection)) {
      state[row.collection].push(row.data);
    } else if ((SINGLETON_COLLECTIONS as readonly string[]).includes(row.collection)) {
      state[row.collection] = row.data || {};
    }
  }
  const storedSignatures = buildSignatures(state);
  return attachStateSnapshot(dropRetiredPrintTypes(state), storedSignatures);
}

async function selectStateRows(db: PgDatabase) {
  return db
    .select({
      collection: appRecords.collection,
      recordId: appRecords.recordId,
      position: appRecords.position,
      data: appRecords.data
    })
    .from(appRecords)
    .orderBy(asc(appRecords.collection), asc(appRecords.position), asc(appRecords.recordId));
}

export async function readDb(db?: PgDatabase): Promise<any> {
  const executor = db || createDatabase(getPool());
  const rows = await selectStateRows(executor);
  if (rows.length === 0) {
    const seed = normalizeState(cloneSeed());
    return attachStateSnapshot(seed, buildSignatures(emptyState()));
  }
  return stateFromRows(rows);
}

async function storedSignatures(db: PgDatabase): Promise<SignatureSnapshot> {
  return signaturesFromRows(await selectStateRows(db));
}

async function upsertStateRows(
  db: PgDatabase,
  rows: Array<{ collection: string; recordId: string; position: number; data: Record<string, any> }>
) {
  for (const batch of chunks(rows)) {
    await db
      .insert(appRecords)
      .values(batch)
      .onConflictDoUpdate({
        target: [appRecords.collection, appRecords.recordId],
        set: { position: sql`excluded.position`, data: sql`excluded.data`, updatedAt: new Date() }
      });
  }
}

async function deleteStateRows(db: PgDatabase, collection: string, recordIds: string[]) {
  for (const batch of chunks(recordIds)) {
    if (batch.length === 0) continue;
    await db
      .delete(appRecords)
      .where(and(eq(appRecords.collection, collection), inArray(appRecords.recordId, batch)));
  }
}

export async function writeDb(db: PgDatabase, value: any): Promise<void> {
  const state = normalizeState(value);
  const previous = getStateSnapshot(value) || (await storedSignatures(db));
  const next = buildSignatures(state);

  for (const name of ARRAY_COLLECTIONS) {
    const oldItems = previous[name] || new Map<string, string>();
    const nextItems = Array.isArray(state[name]) ? state[name] : [];
    const nextIds = new Set<string>();
    const changedRows: Array<{ collection: string; recordId: string; position: number; data: Record<string, any> }> = [];

    nextItems.forEach((item: any, position: number) => {
      if (!item || item.id === undefined) return;
      const recordId = String(item.id);
      nextIds.add(recordId);
      if (oldItems.get(recordId) !== next[name].get(recordId)) {
        changedRows.push({ collection: name, recordId, position, data: removeMongoId(item) });
      }
    });

    if (changedRows.length) await upsertStateRows(db, changedRows);
    const removedIds = Array.from(oldItems.keys()).filter((id) => !nextIds.has(id));
    if (removedIds.length) await deleteStateRows(db, name, removedIds);
  }

  for (const name of SINGLETON_COLLECTIONS) {
    const oldSignature = previous[name]?.get('main');
    const nextValue = state[name] || {};
    if (oldSignature !== next[name].get('main')) {
      await upsertStateRows(db, [{ collection: name, recordId: 'main', position: 0, data: removeMongoId(nextValue) }]);
    }
  }

  await upsertStateRows(db, [{
    collection: '__laleh_internal',
    recordId: 'initialized',
    position: 0,
    data: { initialized: true }
  }]);
  attachStateSnapshot(value, next);
}

export async function replaceAllState(db: PgDatabase, value: any) {
  const state = normalizeState(value);
  await db.delete(appRecords);
  await insertStateRows(db, stateToRows(state));
}

export const emptyOperationalSnapshot = (): OperationalSnapshot => ({
  sessions: [],
  otps: [],
  rateLimits: [],
  auditLogs: []
});

export async function readOperationalData(db?: PgDatabase): Promise<OperationalSnapshot> {
  const executor = db || createDatabase(getPool());
  const [sessionRows, otpRows, rateLimitRows, auditRows] = await Promise.all([
    executor.select().from(sessions),
    executor.select().from(otps),
    executor.select().from(rateLimits),
    executor.select().from(auditLogs).orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
  ]);

  return {
    sessions: sessionRows.map((row) => ({
      token: row.token,
      userId: row.userId,
      deviceId: row.deviceId,
      userAgent: row.userAgent,
      ip: row.ip,
      createdAt: row.createdAt,
      lastSeenAt: row.lastSeenAt,
      expiresAt: row.expiresAt
    })),
    otps: otpRows.map((row) => ({
      phone: row.phone,
      code: row.code,
      attempts: row.attempts,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt
    })),
    rateLimits: rateLimitRows.map((row) => ({ key: row.key, count: row.count, resetAt: row.resetAt })),
    auditLogs: auditRows.map((row) => ({ ...(row.entry || {}), createdAt: row.createdAt }))
  };
}

export async function replaceOperationalData(db: PgDatabase, value: OperationalSnapshot) {
  const data = value || emptyOperationalSnapshot();
  await db.delete(sessions);
  await db.delete(otps);
  await db.delete(rateLimits);
  await db.delete(auditLogs);

  for (const batch of chunks(data.sessions || [])) {
    if (batch.length) {
      await db.insert(sessions).values(
        batch.map((row: any) => ({
          token: String(row.token),
          userId: String(row.userId),
          deviceId: String(row.deviceId || ''),
          userAgent: String(row.userAgent || ''),
          ip: String(row.ip || ''),
          createdAt: Number(row.createdAt || Date.now()),
          lastSeenAt: Number(row.lastSeenAt || row.createdAt || Date.now()),
          expiresAt: toDate(row.expiresAt)
        }))
      );
    }
  }

  for (const batch of chunks(data.otps || [])) {
    if (batch.length) {
      await db.insert(otps).values(
        batch.map((row: any) => ({
          phone: String(row.phone),
          code: String(row.code),
          attempts: Number(row.attempts || 0),
          createdAt: toDate(row.createdAt),
          expiresAt: toDate(row.expiresAt)
        }))
      );
    }
  }

  for (const batch of chunks(data.rateLimits || [])) {
    if (batch.length) {
      await db.insert(rateLimits).values(
        batch.map((row: any) => ({
          key: String(row.key),
          count: Number(row.count || 0),
          resetAt: toDate(row.resetAt)
        }))
      );
    }
  }

  for (const batch of chunks(data.auditLogs || [])) {
    if (batch.length) {
      await db.insert(auditLogs).values(
        batch.map((row: any) => {
          const { createdAt, ...entry } = row || {};
          return { entry, createdAt: toDate(createdAt) };
        })
      );
    }
  }
}

function toDate(value: any): Date {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export async function createSession(
  db: PgDatabase,
  userId: string,
  ttlMs = 30 * 24 * 60 * 60 * 1000,
  meta?: { userAgent?: string; ip?: string }
): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const userAgent = String(meta?.userAgent || '').slice(0, 300);
  const ip = String(meta?.ip || '').slice(0, 60);
  const deviceId = crypto.createHash('sha256').update(`${userAgent}|${ip}`).digest('hex').slice(0, 16);

  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), eq(sessions.deviceId, deviceId)));
  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), eq(sessions.deviceId, '')));
  await db.insert(sessions).values({
    token,
    userId,
    deviceId,
    userAgent,
    ip,
    createdAt: now,
    lastSeenAt: now,
    expiresAt: new Date(now + ttlMs)
  });
  return token;
}

export async function findSession(db: PgDatabase, token: string): Promise<{ userId: string } | null> {
  if (!token) return null;
  const [row] = await db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
  if (!row) return null;

  const now = Date.now();
  if (row.expiresAt.getTime() < now) {
    await db.delete(sessions).where(eq(sessions.token, token));
    return null;
  }
  const lastSeen = Number(row.lastSeenAt || row.createdAt || 0);
  if (lastSeen && now - lastSeen > SESSION_IDLE_MS) {
    await db.delete(sessions).where(eq(sessions.token, token));
    return null;
  }
  await db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.token, token));
  return { userId: row.userId };
}

export async function deleteUserSessions(db: PgDatabase, userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function deleteSession(db: PgDatabase, token: string) {
  if (token) await db.delete(sessions).where(eq(sessions.token, token));
}

export async function saveOtpCode(db: PgDatabase, phone: string, code: string, ttlMs = 120000) {
  const now = new Date();
  await db
    .insert(otps)
    .values({ phone, code, attempts: 0, createdAt: now, expiresAt: new Date(now.getTime() + ttlMs) })
    .onConflictDoUpdate({
      target: otps.phone,
      set: { code, attempts: 0, createdAt: now, expiresAt: new Date(now.getTime() + ttlMs) }
    });
  return true;
}

export async function verifyOtpCode(
  db: PgDatabase,
  phone: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const [row] = await db.select().from(otps).where(eq(otps.phone, phone)).limit(1).for('update');
  if (!row) return { ok: false, error: 'کدی برای این شماره ارسال نشده است' };
  if (row.expiresAt.getTime() < Date.now()) {
    await db.delete(otps).where(eq(otps.phone, phone));
    return { ok: false, error: 'کد منقضی شده است' };
  }
  if (Number(row.attempts || 0) >= 5) {
    await db.delete(otps).where(eq(otps.phone, phone));
    return { ok: false, error: 'تعداد تلاش‌ها بیش از حد مجاز است' };
  }
  if (String(row.code) !== String(code).trim()) {
    await db.update(otps).set({ attempts: row.attempts + 1 }).where(eq(otps.phone, phone));
    return { ok: false, error: 'کد وارد شده صحیح نیست' };
  }
  await db.delete(otps).where(eq(otps.phone, phone));
  return { ok: true };
}

export async function bumpRateLimit(db: PgDatabase, key: string, windowMs: number): Promise<number> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, resetAt })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`CASE WHEN ${rateLimits.resetAt} > ${now} THEN ${rateLimits.count} + 1 ELSE 1 END`,
        resetAt: sql`CASE WHEN ${rateLimits.resetAt} > ${now} THEN ${rateLimits.resetAt} ELSE ${resetAt} END`
      }
    })
    .returning({ count: rateLimits.count });
  return Number(row?.count || 1);
}

export async function recordAudit(db: PgDatabase, entry: Record<string, any>) {
  const { createdAt, ...data } = entry || {};
  await db.insert(auditLogs).values({ entry: data, createdAt: toDate(createdAt) });
}

export async function listAudit(db: PgDatabase, limit = 100): Promise<any[]> {
  const rows = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(Math.min(Math.max(limit, 1), 300));
  return rows.map((row) => ({ ...(row.entry || {}), createdAt: row.createdAt }));
}

export async function listUserSessions(db: PgDatabase, userId: string): Promise<any[]> {
  return db
    .select({
      userId: sessions.userId,
      deviceId: sessions.deviceId,
      userAgent: sessions.userAgent,
      ip: sessions.ip,
      createdAt: sessions.createdAt,
      lastSeenAt: sessions.lastSeenAt,
      expiresAt: sessions.expiresAt
    })
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.lastSeenAt));
}

export async function deleteSessionsByDevice(db: PgDatabase, userId: string, deviceId: string) {
  await db.delete(sessions).where(and(eq(sessions.userId, userId), eq(sessions.deviceId, deviceId)));
}

export async function revokeSession(db: PgDatabase, userId: string, createdAt: string) {
  const timestamp = Number(createdAt);
  const createdAtMs = Number.isFinite(timestamp) ? timestamp : Date.parse(createdAt);
  if (!Number.isFinite(createdAtMs)) return;
  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), eq(sessions.createdAt, createdAtMs)));
}
