import assert from 'node:assert/strict';
import test from 'node:test';
import { getPaidBluPalTransactions } from '../src/utils/bluPalTransactions';

const paidInvoice = (overrides: Record<string, unknown> = {}) => ({
  id: 'BLU-LOCAL-1',
  invoiceId: '501',
  provider: 'blupal',
  mode: 'live',
  isRemote: true,
  status: 'paid',
  amount: 125000,
  amountRial: 1250123,
  finalAmountRial: 1250123,
  referenceCode: 'TX-9001',
  ...overrides
});

test('shows only confirmed BluPal payments, including legacy invoices without a provider', () => {
  const result = getPaidBluPalTransactions({ invoices: [
    paidInvoice(),
    paidInvoice({ id: 'legacy', invoiceId: 502, provider: undefined, mode: undefined, status: 'PAID' }),
    paidInvoice({ id: 'pending', status: 'pending', success: true }),
    paidInvoice({ id: 'failed', status: 'failed' }),
    paidInvoice({ id: 'expired', status: 'expired' }),
    paidInvoice({ id: 'other', provider: 'other-gateway' })
  ] });
  assert.deepEqual(result.map((transaction) => transaction.invoiceId), ['501', '502']);
});

test('excludes free orders and simulated invoices from gateway revenue', () => {
  const result = getPaidBluPalTransactions({ invoices: [
    paidInvoice({ id: 'gift', amount: 0, amountRial: 0, finalAmountRial: 0 }),
    paidInvoice({ id: 'local', isRemote: false }),
    paidInvoice({ id: 'sandbox', mode: 'sandbox' }),
    paidInvoice({ id: 'demo', mode: 'demo' })
  ] });
  assert.deepEqual(result, []);
});

test('preserves the exact paid Rial amount and supports older amount fields', () => {
  const result = getPaidBluPalTransactions({ invoices: [
    paidInvoice({ amountRial: 1250000, finalAmount: 125012 }),
    paidInvoice({ id: 'old-rial', finalAmountRial: undefined, amountRial: '1500789' }),
    paidInvoice({ id: 'old-toman', finalAmountRial: undefined, amountRial: undefined, amount: 80000 })
  ] });
  assert.deepEqual(result.map((transaction) => transaction.amountRial), [1250123, 1500789, 800000]);
});

test('links invoices issued for a draft to the completed order tracking code', () => {
  const result = getPaidBluPalTransactions({
    invoices: [paidInvoice({ orderId: 'draft-1', customerName: 'مشتری فاکتور' })],
    orders: [{ id: 'ord-1', sourceDraftId: 'draft-1', trackingCode: 'Laleh-12345', userName: 'نام سفارش' }]
  });
  assert.equal(result[0].orderId, 'ord-1');
  assert.equal(result[0].orderTrackingCode, 'Laleh-12345');
  assert.equal(result[0].customerName, 'مشتری فاکتور');
});

test('links older orders by invoice ID and fills missing customer details from the user', () => {
  const result = getPaidBluPalTransactions({
    invoices: [paidInvoice()],
    orders: [{ id: 'ord-old', paymentInvoiceId: '501', userId: 'user-1', trackingCode: 'Laleh-54321' }],
    users: [{ id: 'user-1', name: 'مشتری قدیمی', phone: '09120000000' }]
  });
  assert.equal(result[0].orderTrackingCode, 'Laleh-54321');
  assert.equal(result[0].customerName, 'مشتری قدیمی');
  assert.equal(result[0].customerPhone, '09120000000');
});

test('shows a successful payment even when the customer never completed their order', () => {
  const result = getPaidBluPalTransactions({
    invoices: [paidInvoice({ orderId: 'unfinished-draft', userId: 'user-1', paidAt: '۱۴۰۵/۰۸/۱۶, ۱۲:۳۴' })],
    orders: [],
    users: [{ id: 'user-1', name: 'مشتری' }]
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].orderId, 'unfinished-draft');
  assert.equal(result[0].paidAt, '۱۴۰۵/۰۸/۱۶, ۱۲:۳۴');
});

test('does not infer gateway success from an order payment flag', () => {
  const result = getPaidBluPalTransactions({
    invoices: [paidInvoice({ status: 'pending' })],
    orders: [{ id: 'ord-1', paymentInvoiceId: '501', paymentStatus: 'paid' }]
  });
  assert.deepEqual(result, []);
});

test('ignores invalid records and returns only transaction fields', () => {
  assert.deepEqual(getPaidBluPalTransactions({}), []);
  const result = getPaidBluPalTransactions({ invoices: [
    null,
    paidInvoice({ finalAmountRial: 'invalid' }),
    paidInvoice({ finalAmountRial: -1 }),
    paidInvoice({ id: undefined, invoiceId: undefined }),
    paidInvoice({ privateToken: 'never-return', invoiceDetails: { customerAddress: 'private-address' } })
  ] });
  assert.equal(result.length, 1);
  assert.equal('privateToken' in result[0], false);
  assert.equal('invoiceDetails' in result[0], false);
});
