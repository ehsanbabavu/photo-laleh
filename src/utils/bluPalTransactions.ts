import type { BluPalTransaction, Order, User } from '../types';

const text = (value: unknown): string => String(value ?? '').trim();

/** Read confirmed gateway payments from invoices, including unfinished orders. */
export function getPaidBluPalTransactions(db: {
  invoices?: any[];
  orders?: Partial<Order>[];
  users?: Partial<User>[];
}): BluPalTransaction[] {
  const invoices = Array.isArray(db.invoices) ? db.invoices : [];
  const orders = Array.isArray(db.orders) ? db.orders : [];
  const users = Array.isArray(db.users) ? db.users : [];

  return invoices.flatMap((invoice): BluPalTransaction[] => {
    if (
      !invoice ||
      text(invoice.status).toLowerCase() !== 'paid' ||
      (invoice.provider && text(invoice.provider).toLowerCase() !== 'blupal') ||
      (invoice.mode && text(invoice.mode).toLowerCase() !== 'live') ||
      invoice.isRemote === false
    ) {
      return [];
    }

    // Keep the gateway's exact Rial amount, including its tracking suffix.
    const amountRial = Number(
      invoice.finalAmountRial ?? invoice.amountRial ?? Number(invoice.finalAmount ?? invoice.amount) * 10
    );
    const invoiceId = text(invoice.remoteInvoiceId || invoice.invoiceId || invoice.localInvoiceId || invoice.id);
    if (!invoiceId || !Number.isFinite(amountRial) || amountRial <= 0) return [];

    const invoiceIds = [invoice.invoiceId, invoice.localInvoiceId, invoice.remoteInvoiceId, invoice.id]
      .map(text)
      .filter(Boolean);
    const draftId = text(invoice.orderId);
    const order = orders.find((candidate) =>
      candidate && (
        (draftId && [text(candidate.id), text(candidate.sourceDraftId)].includes(draftId)) ||
        [candidate.paymentInvoiceId, candidate.paymentInvoice?.invoiceId, candidate.paymentInvoice?.remoteInvoiceId]
          .some((id) => id != null && invoiceIds.includes(text(id)))
      )
    );
    const userId = text(invoice.userId || order?.userId);
    const user = userId ? users.find((candidate) => candidate && text(candidate.id) === userId) : undefined;

    return [{
      id: text(invoice.id || invoice.localInvoiceId || invoiceId),
      invoiceId,
      orderId: text(order?.id || invoice.orderId),
      orderTrackingCode: text(order?.trackingCode),
      customerName: text(invoice.customerName || invoice.invoiceDetails?.customerFullName || order?.userName || order?.customerInfo?.fullName || user?.name),
      customerPhone: text(invoice.customerPhone || invoice.invoiceDetails?.customerPhone || order?.customerInfo?.phoneNumber || user?.phone),
      amountRial,
      referenceCode: text(invoice.referenceCode),
      paidAt: text(invoice.paidAt),
      createdAt: text(invoice.createdAt),
      payerName: text(invoice.payerName),
      payerCard: text(invoice.payerCard),
      payerBankName: text(invoice.payerBankName)
    }];
  });
}
