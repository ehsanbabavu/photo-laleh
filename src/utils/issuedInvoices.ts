import type { IssuedInvoice, IssuedInvoiceStatus, Order, User } from '../types';

const text = (value: unknown): string => String(value ?? '').trim();

function expiryTimestamp(value: unknown): number | null {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  const timestamp = Number.isFinite(numeric)
    ? numeric > 1e12 ? numeric : numeric * 1000
    : Date.parse(text(value));
  return timestamp > 0 && !Number.isNaN(new Date(timestamp).getTime()) ? timestamp : null;
}

function invoiceStatus(value: unknown, expiresAt: number | null, now: number): IssuedInvoiceStatus {
  const status = text(value).toLowerCase();
  if (['paid', 'completed', 'successful', 'success'].includes(status)) return 'paid';
  if (status === 'expired') return 'expired';
  if (['canceled', 'cancelled'].includes(status)) return 'canceled';
  if (status === 'failed') return 'failed';
  if (status === 'pending') return expiresAt !== null && expiresAt <= now ? 'expired' : 'pending';
  return 'unknown';
}

/** All issued invoices, with display fields only; reading never changes payment state. */
export function getIssuedInvoices(db: {
  invoices?: any[];
  orders?: Partial<Order>[];
  users?: Partial<User>[];
}, now = Date.now()): IssuedInvoice[] {
  const ordersById = new Map<string, Partial<Order>>();
  const ordersByInvoice = new Map<string, Partial<Order>>();
  for (const order of db.orders || []) {
    if (!order) continue;
    for (const id of [order.id, order.sourceDraftId].map(text).filter(Boolean)) ordersById.set(id, order);
    for (const id of [order.paymentInvoiceId, order.paymentInvoice?.invoiceId, order.paymentInvoice?.remoteInvoiceId].map(text).filter(Boolean)) {
      ordersByInvoice.set(id, order);
    }
  }
  const usersById = new Map((db.users || []).filter(Boolean).map(user => [text(user.id), user]));

  return (Array.isArray(db.invoices) ? db.invoices : []).flatMap((invoice, index): IssuedInvoice[] => {
    if (!invoice || typeof invoice !== 'object' || Array.isArray(invoice)) return [];
    const invoiceIds = [invoice.remoteInvoiceId, invoice.invoiceId, invoice.localInvoiceId, invoice.id].map(text).filter(Boolean);
    const order = ordersById.get(text(invoice.orderId)) || invoiceIds.map(id => ordersByInvoice.get(id)).find(Boolean);
    const userId = text(invoice.userId || order?.userId);
    const user = usersById.get(userId);
    const expiresAt = expiryTimestamp(invoice.expiresAt);
    const rawAmount = invoice.finalAmountRial ?? invoice.amountRial ?? (invoice.finalAmount ?? invoice.amount);
    const amountRial = rawAmount == null || rawAmount === '' ? NaN : Number(rawAmount) * (
      invoice.finalAmountRial != null || invoice.amountRial != null ? 1 : 10
    );

    return [{
      id: text(invoice.id || invoice.localInvoiceId || invoiceIds[0]) || `invoice-${index}`,
      invoiceId: invoiceIds[0] || '',
      userId,
      customerName: text(invoice.customerName || invoice.invoiceDetails?.customerFullName || order?.userName || order?.customerInfo?.fullName || user?.name),
      customerPhone: text(invoice.customerPhone || invoice.invoiceDetails?.customerPhone || order?.customerInfo?.phoneNumber || user?.phone),
      orderId: text(order?.id || invoice.orderId),
      orderTrackingCode: text(order?.trackingCode),
      amountRial: Number.isFinite(amountRial) && amountRial >= 0 ? amountRial : null,
      status: invoiceStatus(invoice.status, expiresAt, now),
      createdAt: text(invoice.createdAt),
      expiresAt: expiresAt === null ? '' : new Date(expiresAt).toISOString(),
      paidAt: text(invoice.paidAt),
      referenceCode: text(invoice.referenceCode)
    }];
  });
}
