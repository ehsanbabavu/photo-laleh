import { OrderDraft, BluPalInvoice } from '../types';

/**
 * Local persistence for an unfinished order wizard, so a user who accidentally
 * navigates away (or closes the tab) can come back and continue from the same
 * step with everything already filled in.
 */

const STORAGE_VERSION = 2;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // unfinished drafts expire after 7 days

export interface SavedOrderDraft {
  version: number;
  savedAt: number;
  step: number;
  draft: OrderDraft;
  imagesDropped?: boolean;
}

const keyFor = (userId: string) => `laleh:order-draft:v${STORAGE_VERSION}:${userId || 'guest'}`;

function safeParse(raw: string | null): SavedOrderDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SavedOrderDraft;
    if (!parsed || parsed.version !== STORAGE_VERSION) return null;
    if (!parsed.draft || typeof parsed.draft !== 'object') return null;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Reads the saved wizard state for this user (null when nothing usable is stored). */
export function loadOrderDraft(userId: string): SavedOrderDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    return safeParse(window.localStorage.getItem(keyFor(userId)));
  } catch {
    return null;
  }
}

/**
 * Persists the wizard state. Photos are base64 data URLs and can exceed the
 * localStorage quota, so on a quota error we retry without them and flag it so
 * the UI can ask the user to upload the photo again.
 */
export function saveOrderDraft(userId: string, step: number, draft: OrderDraft): boolean {
  if (typeof window === 'undefined') return false;

  const base: SavedOrderDraft = {
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    step: Math.min(6, Math.max(1, Math.round(step) || 1)),
    draft
  };

  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(base));
    return true;
  } catch {
    // Quota exceeded (usually the base64 photo) → save everything except the images
    try {
      const lightDraft: OrderDraft = {
        ...draft,
        uploadedImage: '',
        uploadedImages: []
      };
      window.localStorage.setItem(
        keyFor(userId),
        JSON.stringify({ ...base, draft: lightDraft, imagesDropped: true })
      );
      return true;
    } catch {
      return false;
    }
  }
}

export function clearOrderDraft(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(keyFor(userId));
  } catch {
    /* ignore */
  }
}

/** The saved invoice is only reusable while it is still payable for the same amount. */
export function isReusableInvoice(
  invoice: BluPalInvoice | null | undefined,
  expectedAmountToman: number
): invoice is BluPalInvoice {
  if (!invoice || !invoice.invoiceId) return false;
  if (invoice.status !== 'pending') return false;
  if (!invoice.expiresAt || Number(invoice.expiresAt) <= Date.now()) return false;

  const issuedRial =
    Number(invoice.requestedAmountRial) ||
    Number(invoice.amountRial) ||
    Math.round(Number(invoice.amount || 0) * 10);
  return issuedRial === Math.round(expectedAmountToman * 10);
}
