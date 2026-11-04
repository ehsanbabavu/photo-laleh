/**
 * MongoDB persistence layer.
 *
 * MongoDB adapter for the shared storage layer. Application state (users,
 * orders, tickets, print types, settings and related records) is routed here
 * only while MongoDB is the active provider. The connection config is read from
 * the admin panel or, preferably, the MONGODB_URI environment variable.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient, Db } from 'mongodb';
import { INITIAL_DB } from './seedData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IS_SERVERLESS = Boolean(process.env.VERCEL);
const CONFIG_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : IS_SERVERLESS
    ? path.join('/tmp', 'laleh-data')
    : path.join(__dirname, 'data');
const CONFIG_FILE = path.join(CONFIG_DIR, 'db-config.json');

export const DEFAULT_DB_NAME = process.env.MONGODB_DB || 'laleh_studio';

/** Collections where every record has its own document (keyed by `id`). */
export const ARRAY_COLLECTIONS = [
  'users',
  'orders',
  'tickets',
  'printTypes',
  'dimensions',
  'deliveryMethods',
  'announcements',
  'invoices',
  'partnerInvoices',
  'costRequests',
  'webhookLogs'
] as const;

/** Collections that hold a single settings document (`_id: 'main'`). */
export const SINGLETON_COLLECTIONS = ['settings', 'prompts'] as const;

type ArrayCollection = (typeof ARRAY_COLLECTIONS)[number];
type SingletonCollection = (typeof SINGLETON_COLLECTIONS)[number];

export interface DbConfig {
  uri: string;
  dbName: string;
}

export interface DbStatus {
  configured: boolean;
  connected: boolean;
  source: 'admin' | 'env' | 'none';
  dbName: string;
  maskedUri: string;
  error?: string;
  counts?: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Connection config resolution: admin-saved file first, then environment.
// ---------------------------------------------------------------------------

function readConfigFile(): DbConfig | null {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return null;
    const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    if (parsed && typeof parsed.uri === 'string' && parsed.uri.trim()) {
      return { uri: parsed.uri.trim(), dbName: (parsed.dbName || DEFAULT_DB_NAME).trim() };
    }
    return null;
  } catch (err) {
    console.error('Could not read db-config.json:', err);
    return null;
  }
}

export function resolveConfig(): { config: DbConfig; source: 'admin' | 'env' | 'none' } {
  const fromFile = readConfigFile();
  if (fromFile) return { config: fromFile, source: 'admin' };

  const fromEnv = (process.env.MONGODB_URI || '').trim();
  if (fromEnv) return { config: { uri: fromEnv, dbName: DEFAULT_DB_NAME }, source: 'env' };

  return { config: { uri: '', dbName: DEFAULT_DB_NAME }, source: 'none' };
}

export function saveDbConfig(config: DbConfig) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  // Files are written on the server only; nothing sensitive is logged.
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { encoding: 'utf-8', mode: 0o600 });
}

export function clearDbConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) fs.unlinkSync(CONFIG_FILE);
  } catch (err) {
    console.error('Could not remove db-config.json:', err);
  }
}

export function maskUri(uri: string) {
  if (!uri) return '';
  return uri.replace(/\/\/([^@/]+)@/, (_m, creds) => {
    const user = String(creds).split(':')[0];
    return `//${user}:••••@`;
  });
}

// ---------------------------------------------------------------------------
// Client cache (survives warm serverless invocations).
// ---------------------------------------------------------------------------

type Cache = { uri: string; client: MongoClient; db: Db };
const globalCache = globalThis as unknown as { __lalehMongo?: Cache | null };

async function connect(uri: string, dbName: string): Promise<Db> {
  const cached = globalCache.__lalehMongo;
  if (cached && cached.uri === uri) return cached.db;

  if (cached) {
    try {
      await cached.client.close();
    } catch {
      /* ignore */
    }
    globalCache.__lalehMongo = null;
  }

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
    maxPoolSize: 5
  });
  await client.connect();
  const db = client.db(dbName || DEFAULT_DB_NAME);
  await db.command({ ping: 1 });
  globalCache.__lalehMongo = { uri, client, db };
  return db;
}

export async function getDb(): Promise<Db | null> {
  const { config, source } = resolveConfig();
  if (source === 'none' || !config.uri) return null;
  return connect(config.uri, config.dbName);
}

export async function disconnectDb() {
  const cached = globalCache.__lalehMongo;
  if (cached) {
    try {
      await cached.client.close();
    } catch {
      /* ignore */
    }
    globalCache.__lalehMongo = null;
  }
}

// ---------------------------------------------------------------------------
// State read / write. The Express layer works with one state object; this
// module keeps it in sync with real per-entity Mongo collections.
// ---------------------------------------------------------------------------

let stateCache: any = null;

function emptyState() {
  const state: any = {};
  for (const name of ARRAY_COLLECTIONS) state[name] = [];
  for (const name of SINGLETON_COLLECTIONS) state[name] = {};
  return state;
}

function cloneSeed() {
  return JSON.parse(JSON.stringify(INITIAL_DB));
}

function hashDoc(value: any): string {
  const text = JSON.stringify(value ?? null);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${(hash >>> 0).toString(36)}:${text.length}`;
}

/** Snapshot of the ids + content hashes currently stored in MongoDB. */
let signatures: Record<string, Map<string, string>> = {};

function buildSignatures(state: any): Record<string, Map<string, string>> {
  const result: Record<string, Map<string, string>> = {};
  for (const name of ARRAY_COLLECTIONS as readonly ArrayCollection[]) {
    const map = new Map<string, string>();
    for (const item of Array.isArray(state[name]) ? state[name] : []) {
      if (item && item.id !== undefined) map.set(String(item.id), hashDoc(item));
    }
    result[name] = map;
  }
  for (const name of SINGLETON_COLLECTIONS as readonly SingletonCollection[]) {
    result[name] = new Map([['main', hashDoc(state[name] || {})]]);
  }
  return result;
}

/**
 * Databases created before the print-size catalog existed have an empty
 * `dimensions` collection and print types without `dimensionIds`. Seed the
 * default sizes once (tracked with a meta flag) so the storefront always reads
 * its sizes from the database instead of falling back to built-in constants.
 */
async function ensureSizeCatalog(db: Db) {
  const meta = db.collection('meta');
  const migrated = await meta.findOne({ _id: 'sizes_migrated' as any });
  if (migrated) return;

  const seed = cloneSeed();
  const defaultSizes = Array.isArray(seed.dimensions) ? seed.dimensions : [];
  const existingSizes = await db.collection('dimensions').countDocuments().catch(() => 0);

  if (existingSizes === 0 && defaultSizes.length > 0) {
    await db
      .collection('dimensions')
      .insertMany(defaultSizes.map((item: any) => ({ ...item })), { ordered: false })
      .catch(() => undefined);
    await db.collection('dimensions').createIndex({ id: 1 }, { unique: true, sparse: true }).catch(() => undefined);
  }

  // Print types created before sizes existed: attach the default assignment
  const defaultByType = new Map<string, string[]>(
    (seed.printTypes || []).map((type: any) => [type.id, Array.isArray(type.dimensionIds) ? type.dimensionIds : []])
  );
  const types = await db.collection('printTypes').find({}).toArray().catch(() => []);
  for (const type of types) {
    if (Array.isArray(type.dimensionIds) && type.dimensionIds.length > 0) continue;
    const fallback = defaultByType.get(type.id);
    if (!fallback || fallback.length === 0) continue;
    await db
      .collection('printTypes')
      .updateOne({ _id: (type as any)._id }, { $set: { dimensionIds: fallback } })
      .catch(() => undefined);
  }

  await meta.insertOne({ _id: 'sizes_migrated' as any, migratedAt: new Date().toISOString() }).catch(() => undefined);
}

/**
 * Older databases may have been seeded when only a subset of the print services
 * existed (e.g. a single type). Restore any missing default service once so the
 * storefront always lists the complete catalog stored in the database.
 */
export async function ensurePrintTypeCatalog(db: Db) {
  const meta = db.collection('meta');
  const migrated = await meta.findOne({ _id: 'print_types_migrated' as any });
  if (migrated) return;

  const seed = cloneSeed();
  const defaultTypes: any[] = Array.isArray(seed.printTypes) ? seed.printTypes : [];
  const existing = await db.collection('printTypes').find({}).toArray().catch(() => [] as any[]);
  const existingIds = new Set(existing.map((type: any) => String(type.id)));

  const missing = defaultTypes.filter((type) => !existingIds.has(String(type.id)));
  if (missing.length > 0) {
    await db
      .collection('printTypes')
      .insertMany(missing.map((item) => ({ ...item })), { ordered: false })
      .catch(() => undefined);
    await db.collection('printTypes').createIndex({ id: 1 }, { unique: true, sparse: true }).catch(() => undefined);
  }

  // Repair services saved with missing fields (only fills blanks, never overrides edits)
  const defaultsById = new Map<string, any>(
    defaultTypes.map((type) => [String(type.id), type])
  );
  const REPAIRABLE_FIELDS = [
    'subtitle',
    'description',
    'basePrice',
    'features',
    'sampleImage',
    'tag',
    'dimensionIds'
  ];
  for (const type of existing) {
    const defaults = defaultsById.get(String(type.id));
    if (!defaults) continue;

    const patch: Record<string, any> = {};
    for (const field of REPAIRABLE_FIELDS) {
      if (defaults[field] === undefined) continue;
      const current = (type as any)[field];
      const isBlank =
        current === undefined ||
        current === null ||
        current === '' ||
        (Array.isArray(current) && current.length === 0);
      if (isBlank) patch[field] = defaults[field];
    }
    if (Object.keys(patch).length === 0) continue;
    await db
      .collection('printTypes')
      .updateOne({ _id: (type as any)._id }, { $set: patch })
      .catch(() => undefined);
  }

  await meta
    .insertOne({ _id: 'print_types_migrated' as any, migratedAt: new Date().toISOString(), added: missing.length })
    .catch(() => undefined);
}

/**
 * «تبدیل سیاه سفید به رنگی» was retired from the catalog. Delete it from databases
 * that were seeded before that, once.
 */
const RETIRED_PRINT_TYPE_IDS = ['bw_to_color'];

export async function ensureRetiredPrintTypesRemoved(db: Db) {
  const meta = db.collection('meta');
  const done = await meta.findOne({ _id: 'retired_print_types_v1' as any });
  if (done) return;
  await db
    .collection('printTypes')
    .deleteMany({ id: { $in: RETIRED_PRINT_TYPE_IDS } })
    .catch(() => undefined);
  await meta
    .insertOne({ _id: 'retired_print_types_v1' as any, at: new Date().toISOString() })
    .catch(() => undefined);
}

/** Belt and braces: hide the retired services from every read. */
export function dropRetiredPrintTypes(state: any) {
  if (Array.isArray(state?.printTypes)) {
    state.printTypes = state.printTypes.filter(
      (type: any) => !RETIRED_PRINT_TYPE_IDS.includes(String(type?.id))
    );
  }
  return state;
}

/** Existing databases have no transport methods yet → add the built-in ones once. */
export async function ensureDeliveryMethodCatalog(db: Db) {
  const existing = await db
    .collection('deliveryMethods')
    .find({})
    .toArray()
    .catch(() => [] as any[]);
  if (existing.length > 0) return;

  const seed = cloneSeed();
  const defaults: any[] = Array.isArray(seed.deliveryMethods) ? seed.deliveryMethods : [];
  if (defaults.length === 0) return;

  await db
    .collection('deliveryMethods')
    .insertMany(defaults.map((item) => ({ ...item })), { ordered: false })
    .catch(() => undefined);
  await db
    .collection('deliveryMethods')
    .createIndex({ id: 1 }, { unique: true, sparse: true })
    .catch(() => undefined);
}

async function ensureSeeded(db: Db) {
  const meta = db.collection('meta');
  const seeded = await meta.findOne({ _id: 'seed' as any });
  if (seeded) {
    await ensurePrintTypeCatalog(db);
    await ensureSizeCatalog(db);
    await ensureDeliveryMethodCatalog(db);
    await ensureRetiredPrintTypesRemoved(db);
    return;
  }

  const seed = cloneSeed();
  for (const name of ARRAY_COLLECTIONS) {
    const items = Array.isArray(seed[name]) ? seed[name] : [];
    if (items.length) {
      await db.collection(name).insertMany(items.map((item: any) => ({ ...item })), { ordered: false });
    }
    await db.collection(name).createIndex({ id: 1 }, { unique: true, sparse: true }).catch(() => undefined);
  }
  for (const name of SINGLETON_COLLECTIONS) {
    await db.collection(name).replaceOne({ _id: 'main' as any }, { ...(seed[name] || {}) }, { upsert: true });
  }
  await meta.insertOne({ _id: 'seed' as any, seededAt: new Date().toISOString() });
  await ensurePrintTypeCatalog(db);
  await ensureSizeCatalog(db);
  await ensureDeliveryMethodCatalog(db);
}

async function loadState(db: Db) {
  const state = emptyState();
  for (const name of ARRAY_COLLECTIONS) {
    const docs = await db.collection(name).find({}, { projection: { _id: 0 } }).toArray();
    state[name] = docs;
  }
  for (const name of SINGLETON_COLLECTIONS) {
    const doc = await db.collection(name).findOne({ _id: 'main' as any }, { projection: { _id: 0 } });
    state[name] = doc || {};
  }
  return state;
}

export async function readDb(): Promise<any> {
  const db = await getDb();

  // Not configured yet: serve the seed so the panel (and the admin page that
  // lets you set the connection URL) still works.
  if (!db) {
    stateCache = dropRetiredPrintTypes(stateCache || cloneSeed());
    return stateCache;
  }

  // Always reload from Mongo so every instance sees the same data. The object
  // returned here is mutated in place by the Express layer; `signatures` keeps
  // a snapshot of what is actually stored so writeDb() can diff against it.
  await ensureSeeded(db);
  stateCache = dropRetiredPrintTypes(await loadState(db));
  signatures = buildSignatures(stateCache);
  return stateCache;
}

export async function writeDb(state: any): Promise<void> {
  const db = await getDb();
  if (!db) {
    stateCache = state;
    signatures = buildSignatures(state);
    return;
  }

  for (const name of ARRAY_COLLECTIONS as readonly ArrayCollection[]) {
    const nextItems: any[] = Array.isArray(state[name]) ? state[name] : [];
    const stored = signatures[name] || new Map<string, string>();
    const nextIds = new Set<string>();

    const operations: any[] = [];
    for (const item of nextItems) {
      if (!item || item.id === undefined) continue;
      const id = String(item.id);
      nextIds.add(id);
      const hash = hashDoc(item);
      if (stored.get(id) !== hash) {
        const replacement = { ...item };
        delete replacement._id;
        operations.push({ replaceOne: { filter: { id: item.id }, replacement, upsert: true } });
      }
    }
    for (const id of stored.keys()) {
      if (!nextIds.has(id)) {
        operations.push({ deleteOne: { filter: { id } } });
      }
    }

    if (operations.length) {
      await db.collection(name).bulkWrite(operations, { ordered: false });
    }
  }

  for (const name of SINGLETON_COLLECTIONS as readonly SingletonCollection[]) {
    const nextValue = state[name] || {};
    if (signatures[name]?.get('main') !== hashDoc(nextValue)) {
      await db.collection(name).replaceOne({ _id: 'main' as any }, { ...nextValue }, { upsert: true });
    }
  }

  stateCache = state;
  signatures = buildSignatures(state);
}

// ---------------------------------------------------------------------------
// Sessions (survive page refresh, stored in MongoDB)
// ---------------------------------------------------------------------------

const SESSION_COLLECTION = 'sessions';
export const SESSION_IDLE_MS = Number(process.env.SESSION_IDLE_MS) || 10 * 60 * 1000;
let sessionIndexReady = false;

async function sessionsCollection() {
  const db = await getDb();
  if (!db) return null;
  const collection = db.collection(SESSION_COLLECTION);
  if (!sessionIndexReady) {
    await collection.createIndex({ token: 1 }, { unique: true }).catch(() => undefined);
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => undefined);
    sessionIndexReady = true;
  }
  return collection;
}

export async function createSession(
  userId: string,
  ttlMs = 30 * 24 * 60 * 60 * 1000,
  meta?: { userAgent?: string; ip?: string }
): Promise<string | null> {
  const collection = await sessionsCollection();
  if (!collection) return null;
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const userAgent = String(meta?.userAgent || '').slice(0, 300);
  const ip = String(meta?.ip || '').slice(0, 60);
  const deviceId = crypto
    .createHash('sha256')
    .update(`${userAgent}|${ip}`)
    .digest('hex')
    .slice(0, 16);

  // One active session per device: logging in again replaces the previous one.
  // Sessions created before device tracking existed are dropped as well.
  await collection.deleteMany({ userId, deviceId }).catch(() => undefined);
  await collection.deleteMany({ userId, deviceId: { $exists: false } }).catch(() => undefined);

  await collection.insertOne({
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

export async function findSession(token: string): Promise<{ userId: string } | null> {
  if (!token) return null;
  const collection = await sessionsCollection();
  if (!collection) return null;
  const doc: any = await collection.findOne({ token });
  if (!doc) return null;
  if (doc.expiresAt && new Date(doc.expiresAt).getTime() < Date.now()) {
    await collection.deleteOne({ token }).catch(() => undefined);
    return null;
  }
  const now = Date.now();
  const lastSeen = Number(doc.lastSeenAt || doc.createdAt || 0);
  if (lastSeen && now - lastSeen > SESSION_IDLE_MS) {
    await collection.deleteOne({ token }).catch(() => undefined);
    return null;
  }
  await collection.updateOne({ token }, { $set: { lastSeenAt: now } }).catch(() => undefined);
  return { userId: doc.userId };
}

export async function deleteUserSessions(userId: string): Promise<void> {
  const collection = await sessionsCollection();
  if (!collection) return;
  await collection.deleteMany({ userId }).catch(() => undefined);
}

export async function deleteSession(token: string): Promise<void> {
  if (!token) return;
  const collection = await sessionsCollection();
  if (!collection) return;
  await collection.deleteOne({ token }).catch(() => undefined);
}

// ---------------------------------------------------------------------------
// One-time codes for SMS verification
// ---------------------------------------------------------------------------

export async function saveOtpCode(phone: string, code: string, ttlMs = 120000): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const collection = db.collection('otps');
  await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => undefined);
  await collection.deleteMany({ phone }).catch(() => undefined);
  await collection.insertOne({
    phone,
    code,
    attempts: 0,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + ttlMs)
  });
  return true;
}

export async function verifyOtpCode(phone: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { ok: false, error: 'دیتابیس در دسترس نیست' };
  const collection = db.collection('otps');
  const doc: any = await collection.findOne({ phone });
  if (!doc) return { ok: false, error: 'کدی برای این شماره ارسال نشده است' };
  if (new Date(doc.expiresAt).getTime() < Date.now()) {
    await collection.deleteOne({ phone }).catch(() => undefined);
    return { ok: false, error: 'کد منقضی شده است' };
  }
  if (Number(doc.attempts || 0) >= 5) {
    await collection.deleteOne({ phone }).catch(() => undefined);
    return { ok: false, error: 'تعداد تلاش‌ها بیش از حد مجاز است' };
  }
  if (String(doc.code) !== String(code).trim()) {
    await collection.updateOne({ phone }, { $inc: { attempts: 1 } }).catch(() => undefined);
    return { ok: false, error: 'کد وارد شده صحیح نیست' };
  }
  await collection.deleteOne({ phone }).catch(() => undefined);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Distributed rate limiting (MongoDB backed, works across serverless instances)
// ---------------------------------------------------------------------------

export async function bumpRateLimit(key: string, windowMs: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('db unavailable');
  const collection = db.collection('rate_limits');
  await collection.createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 }).catch(() => undefined);

  const now = Date.now();
  const fresh = await collection.findOneAndUpdate(
    { _id: key as any, resetAt: { $gt: new Date(now) } },
    { $inc: { count: 1 } },
    { returnDocument: 'after' }
  );
  if ((fresh as any)?.count) return Number((fresh as any).count);

  await collection.updateOne(
    { _id: key as any },
    { $set: { count: 1, resetAt: new Date(now + windowMs) } },
    { upsert: true }
  );
  return 1;
}

// ---------------------------------------------------------------------------
// Audit log for admin actions
// ---------------------------------------------------------------------------

export async function recordAudit(entry: Record<string, any>): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const collection = db.collection('audit_logs');
    await collection.createIndex({ createdAt: -1 }).catch(() => undefined);
    await collection.insertOne({ ...entry, createdAt: new Date() });
  } catch {
    /* auditing must never break a request */
  }
}

export async function listAudit(limit = 100): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .collection('audit_logs')
    .find({}, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 300))
    .toArray();
}

export async function listUserSessions(userId: string): Promise<any[]> {
  const collection = await sessionsCollection();
  if (!collection) return [];
  return collection
    .find({ userId }, { projection: { _id: 0, token: 0 } })
    .sort({ lastSeenAt: -1 })
    .toArray();
}

export async function deleteSessionsByDevice(userId: string, deviceId: string): Promise<void> {
  const collection = await sessionsCollection();
  if (!collection) return;
  await collection.deleteMany({ userId, deviceId }).catch(() => undefined);
}

export async function revokeSession(userId: string, createdAt: string): Promise<void> {
  const collection = await sessionsCollection();
  if (!collection) return;
  const numeric = Number(createdAt);
  const storedCreatedAt = Number.isFinite(numeric) ? numeric : new Date(createdAt);
  await collection.deleteOne({ userId, createdAt: storedCreatedAt }).catch(() => undefined);
}

export async function readOperationalData() {
  const db = await getDb();
  if (!db) return { sessions: [], otps: [], rateLimits: [], auditLogs: [] };

  const [sessions, otps, rateLimitDocs, auditLogs] = await Promise.all([
    db.collection('sessions').find({}, { projection: { _id: 0 } }).toArray(),
    db.collection('otps').find({}, { projection: { _id: 0 } }).toArray(),
    db.collection('rate_limits').find({}).toArray(),
    db.collection('audit_logs').find({}, { projection: { _id: 0 } }).toArray()
  ]);

  return {
    sessions,
    otps,
    rateLimits: rateLimitDocs.map((doc: any) => {
      const { _id, ...rest } = doc;
      return { key: String(_id), ...rest };
    }),
    auditLogs
  };
}

export async function replaceAllData(state: any, operational: any) {
  const db = await getDb();
  if (!db) throw new Error('اتصال MongoDB در دسترس نیست');
  await db.command({ ping: 1 });

  const nextState = dropRetiredPrintTypes(JSON.parse(JSON.stringify(state || {})));
  for (const name of ARRAY_COLLECTIONS) {
    const items = Array.isArray(nextState[name]) ? nextState[name] : [];
    const collection = db.collection(name);
    await collection.deleteMany({});
    for (let index = 0; index < items.length; index += 250) {
      const batch = items.slice(index, index + 250).map((item: any) => {
        const copy = { ...item };
        delete copy._id;
        return copy;
      });
      if (batch.length) await collection.insertMany(batch, { ordered: true });
    }
  }

  for (const name of SINGLETON_COLLECTIONS) {
    const value = nextState[name] && typeof nextState[name] === 'object' ? nextState[name] : {};
    const copy = { ...value };
    delete copy._id;
    await db.collection(name).replaceOne({ _id: 'main' as any }, copy, { upsert: true });
  }

  const migratedAt = new Date().toISOString();
  const meta = db.collection('meta');
  await meta.deleteMany({});
  await meta.insertMany([
    { _id: 'seed', seededAt: migratedAt },
    { _id: 'print_types_migrated', migratedAt },
    { _id: 'sizes_migrated', migratedAt },
    { _id: 'retired_print_types_v1', at: migratedAt }
  ]);

  const data = operational || { sessions: [], otps: [], rateLimits: [], auditLogs: [] };
  for (const name of ['sessions', 'otps', 'rate_limits', 'audit_logs']) {
    await db.collection(name).deleteMany({});
  }
  const sessionRows = (data.sessions || []).map((item: any) => ({
    ...item,
    expiresAt: item.expiresAt ? new Date(item.expiresAt) : item.expiresAt
  }));
  const otpRows = (data.otps || []).map((item: any) => ({
    ...item,
    createdAt: item.createdAt ? new Date(item.createdAt) : item.createdAt,
    expiresAt: item.expiresAt ? new Date(item.expiresAt) : item.expiresAt
  }));
  const rateLimitRows = (data.rateLimits || []).map((item: any) => {
    const { key, ...rest } = item;
    return { _id: String(key), ...rest, resetAt: item.resetAt ? new Date(item.resetAt) : item.resetAt };
  });
  const auditRows = (data.auditLogs || []).map((item: any) => ({
    ...item,
    createdAt: item.createdAt ? new Date(item.createdAt) : item.createdAt
  }));

  const operationalBatches: Array<[string, any[]]> = [
    ['sessions', sessionRows],
    ['otps', otpRows],
    ['rate_limits', rateLimitRows],
    ['audit_logs', auditRows]
  ];
  for (const [name, items] of operationalBatches) {
    for (let index = 0; index < items.length; index += 250) {
      const batch = items.slice(index, index + 250);
      if (batch.length) await db.collection(name).insertMany(batch, { ordered: true });
    }
  }

  await db.collection('sessions').createIndex({ token: 1 }, { unique: true });
  await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection('otps').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection('rate_limits').createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection('audit_logs').createIndex({ createdAt: -1 });

  stateCache = nextState;
  signatures = buildSignatures(nextState);
}

// ---------------------------------------------------------------------------
// Admin helpers
// ---------------------------------------------------------------------------

export async function testDbConnection(uri: string, dbName?: string): Promise<{ ok: boolean; error?: string; collections?: number }> {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000, maxPoolSize: 1 });
  try {
    await client.connect();
    const db = client.db(dbName || DEFAULT_DB_NAME);
    await db.command({ ping: 1 });
    const collections = await db.listCollections().toArray();
    return { ok: true, collections: collections.length };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'اتصال به دیتابیس ناموفق بود' };
  } finally {
    await client.close().catch(() => undefined);
  }
}

export async function getDbStatus(): Promise<DbStatus> {
  const { config, source } = resolveConfig();
  if (source === 'none' || !config.uri) {
    return { configured: false, connected: false, source: 'none', dbName: config.dbName, maskedUri: '' };
  }

  const status: DbStatus = {
    configured: true,
    connected: false,
    source,
    dbName: config.dbName,
    maskedUri: maskUri(config.uri)
  };

  try {
    const db = await getDb();
    if (!db) return status;
    await db.command({ ping: 1 });
    const counts: Record<string, number> = {};
    for (const name of [...ARRAY_COLLECTIONS, 'meta'] as string[]) {
      counts[name] = await db.collection(name).countDocuments();
    }
    status.connected = true;
    status.counts = counts;
  } catch (err: any) {
    status.error = err?.message || 'اتصال برقرار نشد';
  }

  return status;
}

/** Apply a new connection config at runtime (validated before saving). */
export async function applyDbConfig(uri: string, dbName: string): Promise<{ ok: boolean; error?: string }> {
  const trimmed = (uri || '').trim();
  if (!/^mongodb(\+srv)?:\/\//i.test(trimmed)) {
    return { ok: false, error: 'آدرس دیتابیس باید با mongodb:// یا mongodb+srv:// شروع شود' };
  }
  if (!/^[A-Za-z0-9_-]{1,63}$/.test(dbName || '')) {
    return { ok: false, error: 'نام دیتابیس نامعتبر است (فقط حروف، عدد، - و _)' };
  }

  const test = await testDbConnection(trimmed, dbName);
  if (!test.ok) return { ok: false, error: test.error };

  saveDbConfig({ uri: trimmed, dbName });
  stateCache = null;
  signatures = {};
  await disconnectDb();
  // Connect once immediately so the first read does not pay the handshake.
  await getDb();
  return { ok: true };
}
