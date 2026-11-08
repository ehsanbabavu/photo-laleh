import * as mongo from './mongoStore';
import * as postgres from './postgresStore';
import type { OperationalSnapshot, PgDatabase, StorageProvider } from './postgresStore';
import type { MaintenanceQueueState } from './maintenanceQueue';

export async function readMaintenanceQueue(): Promise<MaintenanceQueueState | null> {
  return postgres.withStorageWriteLease((provider, db) => provider === 'postgres'
    ? postgres.readMaintenanceQueue(requirePostgres(db)) : mongo.readMaintenanceQueue());
}

export async function compareAndSetMaintenanceQueue(revision: number, next: MaintenanceQueueState): Promise<boolean> {
  return postgres.withStorageWriteLease((provider, db) => provider === 'postgres'
    ? postgres.compareAndSetMaintenanceQueue(requirePostgres(db), revision, next)
    : mongo.compareAndSetMaintenanceQueue(revision, next));
}

export async function readMaintenanceDeliveryConfig(): Promise<any> {
  return postgres.withStorageWriteLease((provider, db) => provider === 'postgres'
    ? postgres.readMaintenanceDeliveryConfig(requirePostgres(db)) : mongo.readMaintenanceDeliveryConfig());
}

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
          const value = (snapshot as any)[key];
          if (!Array.isArray(value)) return [key, normalizeForComparison(value ?? null)];
          const items = [...value]
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
    throw new Error('اعتبارسنجی داده‌های برنامه پس از کپی ناموفق بود؛ دیتابیس فعال تغییر نکرد.');
  }
  if (operationalFingerprint(sourceOperational) !== operationalFingerprint(targetOperational)) {
    throw new Error('اعتبارسنجی نشست‌ها و داده‌های عملیاتی پس از کپی ناموفق بود؛ دیتابیس فعال تغییر نکرد.');
  }
}

type ProviderSnapshot = {
  state: any;
  operational: OperationalSnapshot;
};

async function assertMongoConnection() {
  const db = await mongo.getDb();
  if (!db) throw new Error('برای کپی یا انتخاب MongoDB ابتدا اتصال آن را تنظیم کنید.');
  await db.command({ ping: 1 });
}

async function readStorageSnapshot(provider: StorageProvider, db: PgDatabase): Promise<ProviderSnapshot> {
  if (provider === 'postgres') {
    const database = requirePostgres(db);
    const [state, operational] = await Promise.all([
      postgres.readDb(database),
      postgres.readOperationalData(database)
    ]);
    return { state, operational };
  }

  await assertMongoConnection();
  const [state, operational] = await Promise.all([mongo.readDb(), mongo.readOperationalData()]);
  return { state, operational };
}

async function writeProviderSnapshot(provider: StorageProvider, db: PgDatabase, snapshot: ProviderSnapshot) {
  if (provider === 'postgres') {
    const database = requirePostgres(db);
    await postgres.replaceAllState(database, snapshot.state);
    await postgres.replaceOperationalData(database, snapshot.operational);
    return;
  }

  await assertMongoConnection();
  await mongo.replaceAllData(snapshot.state, snapshot.operational);
}

async function copyProviderData(source: StorageProvider, target: StorageProvider, db: PgDatabase) {
  const sourceSnapshot = await readStorageSnapshot(source, db);
  const rollbackSnapshot = target === 'mongodb' ? await readStorageSnapshot(target, db) : null;

  try {
    await writeProviderSnapshot(target, db, sourceSnapshot);
    const targetSnapshot = await readStorageSnapshot(target, db);
    verifyMigration(
      sourceSnapshot.state,
      targetSnapshot.state,
      sourceSnapshot.operational,
      targetSnapshot.operational
    );
  } catch (error: any) {
    if (rollbackSnapshot) {
      try {
        await writeProviderSnapshot(target, db, rollbackSnapshot);
      } catch (restoreError: any) {
        throw new Error(
          `کپی ناموفق بود و بازگردانی مقصد هم شکست خورد: ${restoreError?.message || 'خطای نامشخص'}؛ وضعیت دیتابیس مقصد را بررسی کنید.`
        );
      }
    }
    throw error;
  }
}

export async function bootstrapPostgresAdminCredentials(phone: string, passwordHash: string) {
  return postgres.withExclusiveStorageLock(async (activeProvider, db) => {
    if (activeProvider !== 'postgres') throw new Error('برای راه‌اندازی ادمین اولیه، PostgreSQL باید دیتابیس فعال باشد.');

    const state = await postgres.readDb(db);
    const users = Array.isArray(state.users) ? state.users : [];
    const admin = users.find((user: any) => user?.role === 'admin');
    if (!admin) throw new Error('کاربر ادمین اولیه در داده‌های شروع پیدا نشد.');
    if (admin.password) return { created: false };
    if (!/^09\d{9}$/.test(phone)) throw new Error('شماره ادمین معتبر نیست.');
    if (!/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/i.test(passwordHash)) {
      throw new Error('فرمت رمز هش‌شده معتبر نیست.');
    }

    const phoneInUse = users.some((user: any) => user?.id !== admin.id && String(user?.phone || '') === phone);
    if (phoneInUse) throw new Error('این شماره قبلاً برای کاربر دیگری ثبت شده است.');

    state.users = users.map((user: any) =>
      user?.id === admin.id ? { ...user, phone, username: phone, password: passwordHash } : user
    );
    await postgres.writeDb(db, state);
    return { created: true };
  });
}

export async function copyStorageProviderData(source: StorageProvider, target: StorageProvider) {
  if (!['mongodb', 'postgres'].includes(source) || !['mongodb', 'postgres'].includes(target) || source === target) {
    throw new Error('جهت کپی دیتابیس معتبر نیست.');
  }

  return postgres.withExclusiveStorageLock(async (activeProvider, db) => {
    await copyProviderData(source, target, db);
    return { copied: true, sourceProvider: source, targetProvider: target, activeProvider };
  });
}

export async function switchStorageProvider(target: StorageProvider) {
  return postgres.withExclusiveStorageLock(async (source, db) => {
    if (source === target) return { changed: false, activeProvider: source };

    await copyProviderData(source, target, db);
    await postgres.setActiveProvider(db, target);
    return { changed: true, activeProvider: target };
  });
}
