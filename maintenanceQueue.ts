import crypto from 'node:crypto';

export type MaintenanceRecipient = {
  userId: string; name: string; channel: 'telegram' | 'eitaa'; recipient: string;
  status: 'pending' | 'sent' | 'failed'; attempts: number;
};
export type MaintenanceTick = { batchId: string; index: number; attempt: number };
export type MaintenanceQueueState = {
  revision: number;
  enabled: boolean;
  nextSendAt: number;
  lease?: { token: string; until: number };
  batch: null | {
    id: string; enabled: boolean; createdAt: string; index: number; sent: number; failed: number;
    recipients: MaintenanceRecipient[]; dispatchedTick?: string; dispatchedAt?: number;
  };
};
export class MaintenanceRetry extends Error {
  constructor(public afterSeconds: number) { super('Maintenance notification is not ready'); }
}

type Dependencies = {
  read: () => Promise<MaintenanceQueueState | null>;
  compareAndSet: (revision: number, next: MaintenanceQueueState) => Promise<boolean>;
  publish: (tick: MaintenanceTick, delaySeconds: number, key: string) => Promise<void>;
  send: (recipient: MaintenanceRecipient, message: string) => Promise<{ ok: boolean; error?: string }>;
  now?: () => number;
};

export function maintenanceQueueSummary(state: MaintenanceQueueState | null, fallback = false) {
  const batch = state?.batch;
  const total = batch?.recipients.length || 0;
  const processed = batch?.index || 0;
  return {
    enabled: state?.enabled ?? fallback, batchId: batch?.id || null,
    status: !batch ? 'idle' : processed >= total ? 'completed' : 'pending',
    total, pending: total - processed, sent: batch?.sent || 0, failed: batch?.failed || 0
  };
}

export function createMaintenanceQueue(deps: Dependencies) {
  const now = deps.now || Date.now;
  const mutate = async (change: (state: MaintenanceQueueState | null) => MaintenanceQueueState | null) => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const previous = await deps.read();
      const next = change(previous);
      if (!next) return previous;
      next.revision = (previous?.revision || 0) + 1;
      if (await deps.compareAndSet(previous?.revision || 0, next)) return next;
    }
    throw new Error('صف اعلان‌ها مشغول است. دوباره تلاش کنید.');
  };

  const changeMode = async (enabled: boolean, users: any[], config: any, fallback = false) => {
    const recipients: MaintenanceRecipient[] = [];
    const seen = new Set<string>();
    for (const user of users) {
      if (!user) continue;
      for (const channel of ['telegram', 'eitaa'] as const) {
        const recipient = String(user[`${channel}Id`] || '').trim();
        if (!recipient || !config[`${channel}Token`]) continue;
        const key = `${channel}:${recipient}`;
        if (seen.has(key)) continue;
        seen.add(key);
        recipients.push({ userId: String(user.id || ''), name: String(user.name || ''), channel, recipient, status: 'pending', attempts: 0 });
      }
    }
    const batchId = crypto.randomUUID();
    return mutate((previous) => {
      if ((previous?.enabled ?? fallback) === enabled) return null;
      return {
        revision: 0, enabled, nextSendAt: previous?.nextSendAt || 0,
        ...(previous?.lease ? { lease: previous.lease } : {}),
        batch: { id: batchId, enabled, createdAt: new Date(now()).toISOString(), index: 0, sent: 0, failed: 0, recipients }
      };
    });
  };

  const dispatch = async (force = false) => {
    const state = await deps.read();
    const batch = state?.batch;
    if (!batch || batch.index >= batch.recipients.length) return;
    const tick = { batchId: batch.id, index: batch.index, attempt: batch.recipients[batch.index].attempts };
    const key = `${tick.batchId}:${tick.index}:${tick.attempt}`;
    if (!force && batch.dispatchedTick === key && now() - (batch.dispatchedAt || 0) < 24 * 60 * 60 * 1000) return;
    const delaySeconds = Math.max(0, Math.ceil(((state.nextSendAt || 0) - now()) / 1000));
    await deps.publish(tick, delaySeconds, key);
    await mutate((current) => {
      if (!current?.batch || current.batch.id !== batch.id || current.batch.index !== tick.index || current.batch.recipients[tick.index].attempts !== tick.attempt) return null;
      return { ...current, batch: { ...current.batch, dispatchedTick: key, dispatchedAt: now() } };
    });
  };

  const process = async (tick: MaintenanceTick) => {
    const token = crypto.randomUUID();
    const claimed = await mutate((state) => {
      const batch = state?.batch;
      if (!batch || batch.id !== tick.batchId || batch.index !== tick.index || batch.index >= batch.recipients.length || batch.recipients[batch.index].attempts !== tick.attempt) return null;
      const readyAt = Math.max(state.nextSendAt || 0, state.lease?.until || 0);
      if (readyAt > now()) throw new MaintenanceRetry(Math.max(1, Math.ceil((readyAt - now()) / 1000)));
      return { ...state, lease: { token, until: now() + 60_000 } };
    });
    if (claimed?.lease?.token !== token) {
      await dispatch();
      return;
    }
    const latest = await deps.read();
    if (latest?.batch?.id !== tick.batchId) {
      await mutate((state) => state?.lease?.token === token ? { ...state, lease: undefined } : null);
      await dispatch();
      return;
    }
    const target = claimed.batch.recipients[tick.index];
    const message = claimed.enabled
      ? '🔧 سایت برای به‌روزرسانی موقتاً در دسترس نیست. به‌زودی برمی‌گردیم.'
      : '✅ به‌روزرسانی پایان یافت و سایت دوباره در دسترس است.';
    let result: { ok: boolean };
    try { result = await deps.send(target, message); }
    catch { result = { ok: false }; }
    await mutate((state) => {
      if (state?.lease?.token !== token) throw new Error('Maintenance notification lease was lost');
      const next = { ...state, lease: undefined, nextSendAt: now() + (result.ok ? 1000 : 5000) };
      if (state.batch?.id !== tick.batchId) return next;
      const batch = { ...state.batch, recipients: [...state.batch.recipients] };
      const item = { ...batch.recipients[tick.index], attempts: target.attempts + 1 };
      if (result.ok) { item.status = 'sent'; batch.sent += 1; batch.index += 1; }
      else if (item.attempts >= 3) { item.status = 'failed'; batch.failed += 1; batch.index += 1; }
      batch.recipients[tick.index] = item;
      return { ...next, batch };
    });
    await dispatch();
  };

  return { changeMode, dispatch, process, read: deps.read };
}
