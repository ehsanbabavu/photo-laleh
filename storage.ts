import * as mongo from './mongoStore';
import * as postgres from './postgresStore';
import type { OperationalSnapshot, PgDatabase, StorageProvider } from './postgresStore';

const STATE_PROVIDER = Symbol.for('laleh.storage.provider');

function attachProvider(state: any, provider: StorageProvider) {
  if (state && typeof state === 'object') {
    Object.defineProperty(state, STATE_PROVIDER, {
      value: provider,
      enumerable: true,
      configurable: true,
      writable: true
    });
  }
  return state;
}

function readProviderSnapshot(state: any): StorageProvider | undefined {
  return state?.[STATE_PROVIDER];
}

function requirePostgres(db: PgDatabase | null): PgDatabase {
  if (!db) throw new Error('اتصال PostgreSQL در دسترس نیست');
  return db;
}

export async function readDb(): Promise<any> {
  return postgres.withStorageWriteLease(async (provider, db) => {
    const state = provider === 'postgres'
      ? await postgres.readDb(requirePostgres(db))
      : await mongo.readDb();
    return attachProvider(state, provider);
  });
}

export async function writeDb(state: any): Promise<void> {
  await postgres.withStorageWriteLease(async (provider, db) => {
    const snapshotProvider = readProviderSnapshot(state);
    if (snapshotProvider && snapshotProvider !== provider) {
      throw new Error('منبع داده هنگام ذخیره تغییر کرده است؛ صفحه را تازه کنید و دوباره تلاش کنید.');
    }

    if (provider === 'postgres') return postgres.writeDb(requirePostgres(db), state);
    return mongo.writeDb(state);
  });
}

export async function createSession(
  userId: string,
  ttlMs?: number,
  meta?: { userAgent?: string; ip?: string }
): Promise<string | null> {
  return postgres.withStorageWriteLease((provider, db) =>
    provider === 'postgres'
      ? postgres.createSession(requirePostgres(db), userId, ttlMs, meta)
      : mongo.createSession(userId, ttlMs, meta)
  );
}

export async function findSession(token: string): Promise<{ userId: string } | null> {
  return postgres.withStorageWriteLease((provider, db) =>
    provider === 'postgres'
      ? postgres.findSession(requirePostgres(db), token)
      : mongo.findSession(token)
  );
}

export async function deleteUserSessions(userId: string): Promise<void> {
  await postgres.withStorageWriteLease((provider, db) =>
    provider === 'postgres'
      ? postgres.deleteUserSessions(requirePostgres(db), userId)
      : mongo.deleteUserSessions(userId)
  );
}

export async function deleteSession(token: string): Promise<void> {
  await postgres.withStorageWriteLease((provider, db) =>
    provider === 'postgres'
      ? postgres.deleteSession(requirePostgres(db), token)
      : mongo.deleteSession(token)
  );
}

export async function saveOtpCode(phone: string, code: string, ttlMs = 120000): Promise<boolean> {
  return postgres.withStorageWriteLease((provider, db) =>
    provider === 'postgres'
      ? postgres.saveOtpCode(requirePostgres(db), phone, code, ttlMs)
      : mongo.saveOtpCode(phone, code, ttlMs)
  );
}

export async function verifyOtpCode(phone: string, code: string): Promise<{ ok: boolean; error?: string }> {
  return postgres.withStorageWriteLease((provider, db) =>
    provider === 'postgres'
      ? postgres.verifyOtpCode(requirePostgres(db), phone, code)
      : mongo.verifyOtpCode(phone, code)
  );
}

export async function bumpRateLimit(key: string, windowMs: number): Promise<number> {
  return postgres.withStorageWriteLease((provider, db) =>
    provider === 'postgres'
      ? postgres.bumpRateLimit(requirePostgres(db), key, windowMs)
      : mongo.bumpRateLimit(key, windowMs)
  );
}

export async function recordAudit(entry: Record<string, any>): Promise<void> {
  try {
    await postgres.withStorageWriteLease((provider, db) =>
      provider === 'postgres'
        ? postgres.recordAudit(requirePostgres(db), entry)
        : mongo.recordAudit(entry)
    );
  } catch {
    // Audit failures must not interrupt the request that was being recorded.
  }
}

export async function listAudit(limit = 100): Promise<any[]> {
  return postgres.withStorageWriteLease((provider, db) =>
    provider === 'postgres'
      ? postgres.listAudit(requirePostgres(db), limit)
      : mongo.listAudit(limit)
  );
}

export async function listUserSessions(userId: string): Promise<any[]> {
  return postgres.withStorageWriteLease((provider, db) =>
    provider === 'postgres'
      ? postgres.listUserSessions(requirePostgres(db), userId)
      : mongo.listUserSessions(userId)
  );
}

export async function deleteSessionsByDevice(userId: string, deviceId: string): Promise<void> {
  await postgres.withStorageWriteLease((provider, db) =>
    provider === 'postgres'
      ? postgres.deleteSessionsByDevice(requirePostgres(db), userId, deviceId)
      : mongo.deleteSessionsByDevice(userId, deviceId)
  );
}

export async function revokeSession(userId: string, createdAt: string): Promise<void> {
  await postgres.withStorageWriteLease((provider, db) =>
    provider === 'postgres'
      ? postgres.revokeSession(requirePostgres(db), userId, createdAt)
      : mongo.revokeSession(userId, createdAt)
  );
}

export async function getStorageStatus() {
  const [mongodb, postgresql] = await Promise.all([mongo.getDbStatus(), postgres.getPostgresStatus()]);
  let activeProvider: StorageProvider | null = null;
  let activeProviderError: string | undefined;
  try {
    activeProvider = await postgres.getActiveProvider();
  } catch (error: any) {
    activeProviderError = error?.message || 'منبع دیتابیس فعال قابل تشخیص نیست';
  }
  return { activeProvider, activeProviderError, mongodb, postgresql };
}

export async function testPostgresConnection() {
  return postgres.getPostgresStatus();
}

function normalizeForComparison(value: any): any {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalizeForComparison);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalizeForComparison(value[key])])
    );
  }
  return value;
}

function stateFingerprint(state: any) {
  return JSON.stringify(normalizeForComparison(state));
}

function operationalFingerprint(snapshot: OperationalSnapshot) {
  return JSON.stringify(
    Object.fromEntries(
      Object.keys(snapshot)
        .sort()
        .map((key) => {
          const items = [...((snapshot as any)[key] || [])]
            .map((item) => normalizeForComparison(item))
            .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
          return [key, items];
        })
    )
  );
}

function verifyMigration(
  sourceState: any,
  targetState: any,
  sourceOperational: OperationalSnapshot,
  targetOperational: OperationalSnapshot
) {
  if (stateFingerprint(sourceState) !== stateFingerprint(targetState)) {
    throw new Error('اعتبارسنجی داده‌های برنامه پس از انتقال ناموفق بود؛ دیتابیس مبدأ فعال باقی ماند.');
  }
  if (operationalFingerprint(sourceOperational) !== operationalFingerprint(targetOperational)) {
    throw new Error('اعتبارسنجی نشست‌ها و داده‌های عملیاتی پس از انتقال ناموفق بود؛ دیتابیس مبدأ فعال ماند.');
  }
}

export async function switchStorageProvider(target: StorageProvider) {
  return postgres.withExclusiveStorageLock(async (source, db) => {
    if (source === target) return { changed: false, activeProvider: source };

    if (target === 'postgres') {
      const sourceState = await mongo.readDb();
      const sourceOperational = await mongo.readOperationalData();
      await postgres.replaceAllState(db, sourceState);
      await postgres.replaceOperationalData(db, sourceOperational);

      const targetState = await postgres.readDb(db);
      const targetOperational = await postgres.readOperationalData(db);
      verifyMigration(sourceState, targetState, sourceOperational, targetOperational);
      await postgres.setActiveProvider(db, 'postgres');
      return { changed: true, activeProvider: 'postgres' as const };
    }

    const mongoDb = await mongo.getDb();
    if (!mongoDb) throw new Error('برای انتخاب MongoDB ابتدا اتصال آن را تنظیم و آزمایش کنید.');
    await mongoDb.command({ ping: 1 });

    const sourceState = await postgres.readDb(db);
    const sourceOperational = await postgres.readOperationalData(db);
    await mongo.replaceAllData(sourceState, sourceOperational);

    const targetState = await mongo.readDb();
    const targetOperational = await mongo.readOperationalData();
    verifyMigration(sourceState, targetState, sourceOperational, targetOperational);
    await postgres.setActiveProvider(db, 'mongodb');
    return { changed: true, activeProvider: 'mongodb' as const };
  });
}
