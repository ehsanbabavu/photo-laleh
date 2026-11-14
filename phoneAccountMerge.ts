import { toAsciiDigits } from './src/utils/phone';

const messengerId = (value: unknown) => toAsciiDigits(value).trim();

/** Only a messenger user account may be linked to a non-admin phone owner. */
export function canMergeEitaaAccount(source: any, target: any): boolean {
  if (source?.role !== 'user' || target?.role !== 'user' || !/^\d{4,20}$/.test(messengerId(source.eitaaId))) return false;
  return ['eitaaId', 'telegramId'].every((field) =>
    !messengerId(source[field]) || !messengerId(target[field]) || messengerId(source[field]) === messengerId(target[field])
  );
}

/** Keep the phone owner's profile, credentials and credit; do not add a second signup gift. */
export function mergeEitaaAccount(db: any, source: any, target: any, phone: string) {
  const user = {
    ...target,
    eitaaId: messengerId(source.eitaaId),
    ...(source.telegramId && !target.telegramId ? { telegramId: messengerId(source.telegramId) } : {}),
    phone,
    phoneVerifiedAt: new Date().toISOString(),
    hasUsedFirstOrderGift: Boolean(target.hasUsedFirstOrderGift || source.hasUsedFirstOrderGift)
  };
  const next = { ...db };
  next.users = (db.users || []).filter((item: any) => item.id !== source.id)
    .map((item: any) => item.id === target.id ? user : item);

  for (const [collection, fields] of Object.entries({
    orders: ['userId', 'partnerId'], lostOrders: ['userId'], tickets: ['userId'],
    invoices: ['userId'], partnerInvoices: ['partnerId'], costRequests: ['requestedBy']
  })) {
    if (!Array.isArray(db[collection])) continue;
    next[collection] = db[collection].map((item: any) => {
      const patch: any = {};
      for (const field of fields) if (item[field] === source.id) patch[field] = target.id;
      return Object.keys(patch).length ? { ...item, ...patch } : item;
    });
  }
  if (Array.isArray(db.announcements)) {
    next.announcements = db.announcements.map((item: any) => Array.isArray(item.readBy) && item.readBy.includes(source.id)
      ? { ...item, readBy: [...new Set(item.readBy.map((id: string) => id === source.id ? target.id : id))] } : item);
  }
  return { db: next, user };
}
