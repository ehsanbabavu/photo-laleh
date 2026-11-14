import assert from 'node:assert/strict';
import test from 'node:test';
import { getIssuedInvoices } from '../src/utils/issuedInvoices';
import { parseRoute, routeToPath } from '../src/utils/router';

const now = Date.parse('2026-11-14T12:00:00Z');
const invoice = (overrides: Record<string, unknown> = {}) => ({
  id: 'local-1', invoiceId: '101', status: 'pending', amountRial: 1250123, expiresAt: now + 60_000,
  ...overrides
});

test('includes every issued status, free invoices and invoices without a completed order', () => {
  const result = getIssuedInvoices({ invoices: [
    invoice(), invoice({ status: 'PAID', expiresAt: now - 1 }), invoice({ status: 'expired' }),
    invoice({ status: 'FAILED' }), invoice({ status: 'CANCELED' }), invoice({ status: 'new-status' }),
    invoice({ status: 'paid', amountRial: 0, isRemote: false }), invoice({ mode: 'sandbox' })
  ] }, now);
  assert.deepEqual(result.map(item => item.status), ['pending', 'paid', 'expired', 'failed', 'canceled', 'unknown', 'paid', 'pending']);
  assert.equal(result[6].amountRial, 0);
});

test('displays elapsed pending invoices as expired without mutating the stored records', () => {
  const db = { invoices: [
    invoice({ expiresAt: now - 1 }), invoice({ expiresAt: (now - 1000) / 1000 }),
    invoice({ expiresAt: new Date(now - 1).toISOString() }), invoice({ expiresAt: 'invalid' }),
    invoice({ expiresAt: null }), invoice({ status: 'paid', expiresAt: now - 1 })
  ] };
  const before = structuredClone(db);
  assert.deepEqual(getIssuedInvoices(db, now).map(item => item.status), ['expired', 'expired', 'expired', 'pending', 'pending', 'paid']);
  assert.deepEqual(db, before);
});

test('preserves exact Rial amounts and retains records with missing or invalid amounts', () => {
  const result = getIssuedInvoices({ invoices: [
    invoice({ finalAmountRial: 1250456 }), invoice({ amountRial: undefined, finalAmount: 12345 }),
    invoice({ amountRial: 'invalid' }), invoice({ amountRial: undefined }), invoice({ amountRial: -1 })
  ] }, now);
  assert.deepEqual(result.map(item => item.amountRial), [1250456, 123450, null, null, null]);
});

test('fills customer and order details from both draft IDs and legacy invoice links', () => {
  const result = getIssuedInvoices({
    invoices: [invoice({ orderId: 'draft-1' }), invoice({ invoiceId: '102', userId: 'user-1' })],
    orders: [
      { id: 'order-1', sourceDraftId: 'draft-1', trackingCode: 'Laleh-1', userId: 'user-1' },
      { id: 'order-2', paymentInvoiceId: '102', trackingCode: 'Laleh-2' }
    ],
    users: [{ id: 'user-1', name: 'کاربر نمونه', phone: '09120000001' }]
  }, now);
  assert.deepEqual(result.map(item => item.orderId), ['order-1', 'order-2']);
  assert.deepEqual(result.map(item => item.customerName), ['کاربر نمونه', 'کاربر نمونه']);
  assert.equal(result[0].orderTrackingCode, 'Laleh-1');
  assert.equal(result[1].customerPhone, '09120000001');
});

test('returns only display fields and supports empty or malformed invoice records', () => {
  assert.deepEqual(getIssuedInvoices({}, now), []);
  const [result] = getIssuedInvoices({ invoices: [null, 'invalid', [], invoice({
    privateToken: 'secret', cardNumber: 'private', invoiceDetails: { customerFullName: 'نام فاکتور', customerAddress: 'private' }
  })] }, now);
  assert.equal(result.customerName, 'نام فاکتور');
  assert.equal('privateToken' in result, false);
  assert.equal('cardNumber' in result, false);
  assert.equal('invoiceDetails' in result, false);
});

test('the invoices page has an independent route that survives a reload', () => {
  assert.equal(routeToPath('admin', 'invoices'), '/admin/invoices');
  assert.deepEqual(parseRoute('/admin/invoices'), { view: 'admin', tab: 'invoices' });
  assert.deepEqual(parseRoute('/admin/invoices/'), { view: 'admin', tab: 'invoices' });
});
