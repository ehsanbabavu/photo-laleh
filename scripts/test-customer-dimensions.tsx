import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StepDimensions } from '../src/components/user/wizard/StepDimensions';
import { StepInvoice } from '../src/components/user/wizard/StepInvoice';
import { formatPrice } from '../src/utils/formatters';
import type { OrderDraft, PrintDimension, PrintTypeOption } from '../src/types';

const framedSize: PrintDimension = {
  id: 'framed', title: 'سایز ۲۰×۳۰', dimensionsCm: '20 × 30 cm', aspectRatio: '2:3',
  description: '', basePrice: 165000, costPrice: 93111,
  frameEnabled: true, frameCustomerPrice: 120000, frameCostPrice: 70333
};
const plainSize: PrintDimension = {
  ...framedSize, id: 'plain', title: 'سایز ۱۰×۱۵', dimensionsCm: '10 × 15 cm',
  basePrice: 55000, costPrice: 21333, frameEnabled: false
};
const makeDraft = (patch: Partial<OrderDraft> = {}): OrderDraft => ({
  printType: 'personnel', uploadedImage: null,
  aiEffects: { colorized: false, bgMode: 'original', memorialRibbon: false, weddingFilter: 'natural', autoEnhance: false },
  dimensionId: '', materialId: '', quantity: 1, hasLamination: false, designerRetouch: false,
  deliveryMethod: 'pickup', customerInfo: { fullName: '', phoneNumber: '', province: '', city: '', address: '', postalCode: '', notes: '' },
  discountAmount: 0, paymentMethod: 'online', ...patch
});
const makePrintType = (dimensions: PrintDimension[]): PrintTypeOption => ({
  id: 'personnel', title: 'چاپ عکس', subtitle: '', description: '', features: [],
  basePrice: 999000, serviceFeeEnabled: false, dimensionIds: dimensions.map(size => size.id)
});
const compact = (text: string) => text.replace(/\s+/g, '');
const renderedText = (html: string) => compact(html.replace(/<[^>]*>/g, ''));
function dimensionsText(draft: OrderDraft, dimensions = [framedSize]) {
  return renderedText(renderToStaticMarkup(<StepDimensions draft={draft} dimensions={dimensions}
    printTypes={[makePrintType(dimensions)]} onUpdateDraft={() => {}} onNext={() => {}} onBack={() => {}} />));
}
function expectPrice(text: string, withFrame: boolean, amount: number) {
  const suffix = withFrame ? 'با تخته شاسی' : 'بدون تخته شاسی';
  const opposite = withFrame ? 'بدون تخته شاسی' : 'با تخته شاسی';
  assert.ok(text.includes(compact('قیمت ' + suffix + ':' + formatPrice(amount))), 'the visible customer price must match the frame choice');
  assert.ok(!text.includes(compact('قیمت ' + opposite + ':')), 'the opposite price must be hidden');
  assert.equal((text.match(/قیمت(?:با|بدون)تختهشاسی:/g) || []).length, 1);
}
function expectPrivateCostsHidden(text: string, dimension = framedSize) {
  assert.ok(!text.includes('تمام‌شده'), 'internal costs must never be labeled on a customer card');
  for (const value of [dimension.costPrice, dimension.frameCostPrice, Number(dimension.costPrice) + Number(dimension.frameCostPrice)]) {
    if (Number(value) > 0) assert.ok(!text.includes(compact(formatPrice(Number(value)))), 'internal cost amounts must not be rendered');
  }
}

test('an unselected framed size previews the same framed price offered on selection', () => {
  const text = dimensionsText(makeDraft({ hasFrame: false }));
  expectPrice(text, true, 285000);
  expectPrivateCostsHidden(text);
});
test('a framed size with no saved frame choice initially shows the framed customer price', () => {
  const text = dimensionsText(makeDraft({ dimensionId: framedSize.id }));
  expectPrice(text, true, 285000);
  expectPrivateCostsHidden(text);
});
for (const withFrame of [true, false]) {
  test('a selected size shows only its ' + (withFrame ? 'framed' : 'unframed') + ' customer price', () => {
    const draft = makeDraft({ dimensionId: framedSize.id, hasFrame: withFrame });
    const text = dimensionsText(draft);
    expectPrice(text, withFrame, withFrame ? 285000 : 165000);
    expectPrivateCostsHidden(text);
  });
  test('the selected ' + (withFrame ? 'framed' : 'unframed') + ' price agrees with the invoice before extras', () => {
    const draft = makeDraft({ dimensionId: framedSize.id, hasFrame: withFrame });
    const expected = withFrame ? 285000 : 165000;
    const invoice = renderedText(renderToStaticMarkup(<StepInvoice draft={draft} dimensions={[framedSize]}
      printTypes={[makePrintType([framedSize])]} deliveryMethods={[{ id: 'pickup', title: 'تحویل حضوری', price: 0, isEnabled: true }]}
      onUpdateDraft={() => {}} onNext={() => {}} onBack={() => {}} />));
    expectPrice(dimensionsText(draft), withFrame, expected);
    assert.ok(invoice.includes(compact(formatPrice(expected))));
    expectPrivateCostsHidden(invoice);
  });
}
test('a disabled frame is not charged even when the draft requests it', () => {
  const text = dimensionsText(makeDraft({ dimensionId: plainSize.id, hasFrame: true }), [plainSize]);
  expectPrice(text, false, 55000);
  expectPrivateCostsHidden(text, plainSize);
});
test('a zero-priced frame is unavailable and cannot affect a free size price', () => {
  const size = { ...framedSize, basePrice: 0, frameCustomerPrice: 0 };
  const text = dimensionsText(makeDraft({ dimensionId: size.id, hasFrame: true }), [size]);
  expectPrice(text, false, 0);
  expectPrivateCostsHidden(text, size);
});
test('unselected previews do not inherit the other size’s unframed choice', () => {
  const text = dimensionsText(makeDraft({ dimensionId: plainSize.id, hasFrame: false }), [plainSize, framedSize]);
  assert.ok(text.includes(compact('قیمت با تخته شاسی:' + formatPrice(285000))));
  assert.ok(text.includes(compact('قیمت بدون تخته شاسی:' + formatPrice(55000))));
  expectPrivateCostsHidden(text, framedSize);
  expectPrivateCostsHidden(text, plainSize);
});
