import { OrderDraft } from '../types';
import { saveOrderDraft } from './orderDraftStorage';

/**
 * Pre-fills the order wizard from a link such as
 *   /user/wizard?o_service=personnel&o_size=personnel_12x3x4&o_qty=1
 *                 &o_delivery=peyk&o_name=...&o_phone=...
 *
 * Used by the ChatGPT connector: instead of writing to the database (which some
 * ChatGPT plans block) the model returns a ready-made link, and the customer
 * finishes the order on the site.
 */

export interface OrderPrefill {
  service?: string;
  size?: string;
  qty?: number;
  delivery?: string;
  name?: string;
  phone?: string;
  notes?: string;
}

const PREFS_KEY = 'laleh:order-prefill';

function parseFromSearch(search: string): OrderPrefill | null {
  const params = new URLSearchParams(search);
  const prefill: OrderPrefill = {
    service: params.get('o_service') || params.get('service') || undefined,
    size: params.get('o_size') || params.get('size') || undefined,
    delivery: params.get('o_delivery') || params.get('delivery') || undefined,
    name: params.get('o_name') || undefined,
    phone: params.get('o_phone') || undefined,
    notes: params.get('o_notes') || undefined
  };
  const qtyRaw = params.get('o_qty') || params.get('qty');
  if (qtyRaw) {
    const qty = Math.min(Math.max(Number(qtyRaw) || 1, 1), 100);
    prefill.qty = qty;
  }

  const hasAny =
    prefill.service || prefill.size || prefill.delivery || prefill.name || prefill.phone || prefill.qty;
  return hasAny ? prefill : null;
}

/** Reads the prefill parameters from the current URL (does not clear them). */
export function readOrderPrefill(): OrderPrefill | null {
  if (typeof window === 'undefined') return null;
  return parseFromSearch(window.location.search);
}

/** Stores the prefill so it survives a login redirect. */
export function stashOrderPrefill(prefill: OrderPrefill) {
  try {
    window.sessionStorage.setItem(PREFS_KEY, JSON.stringify(prefill));
  } catch {
    /* ignore */
  }
}

/** Removes prefill parameters from the address bar (keeps the path). */
export function clearOrderPrefillFromUrl() {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    let changed = false;
    [...url.searchParams.keys()].forEach((key) => {
      url.searchParams.delete(key);
      changed = true;
    });
    if (changed) window.history.replaceState({}, '', `${url.pathname}${url.hash}`);
  } catch {
    /* ignore */
  }
}

/** Builds a wizard draft from the prefill values (sensible defaults + overrides). */
export function buildDraftFromPrefill(prefill: OrderPrefill, fallback: { name?: string; phone?: string }): OrderDraft {
  const draft: OrderDraft = {
    printType: (prefill.service as OrderDraft['printType']) || 'personnel',
    uploadedImage: '',
    originalImageName: '',
    aiEffects: {
      colorized: false,
      bgMode: 'original',
      memorialRibbon: false,
      weddingFilter: 'natural',
      autoEnhance: true
    },
    dimensionId: prefill.size || 'personnel_6x3x4',
    materialId: 'silk_paper',
    quantity: prefill.qty || 1,
    hasLamination: false,
    designerRetouch: false,
    deliveryMethod: prefill.delivery || 'peyk',
    customerInfo: {
      fullName: (prefill.name || fallback.name || '').trim(),
      phoneNumber: (prefill.phone || fallback.phone || '').trim(),
      province: '',
      city: '',
      address: '',
      postalCode: '',
      notes: (prefill.notes || '').trim()
    },
    discountAmount: 0,
    paymentMethod: 'online'
  };
  return draft;
}

/** Writes the prefill into the wizard draft storage for this user. */
export function applyOrderPrefill(userId: string, prefill: OrderPrefill, fallback: { name?: string; phone?: string }) {
  const draft = buildDraftFromPrefill(prefill, fallback);
  saveOrderDraft(userId, 1, draft);
}

/** Takes a pending prefill (stored before login) and removes it. */
export function takeStashedOrderPrefill(): OrderPrefill | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(PREFS_KEY);
    return JSON.parse(raw) as OrderPrefill;
  } catch {
    return null;
  }
}
