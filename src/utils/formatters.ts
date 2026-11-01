// Utility functions for Persian formatting
// All money values are grouped in 3-digit chunks and shown in Toman,
// except the customer payment step which shows the exact Rial amount.

const faNumber = new Intl.NumberFormat('fa-IR');

/** Groups any number in 3-digit chunks with Persian digits (e.g. ۱٬۲۵۰٬۰۰۰). */
export const formatNumber = (num: number | string | null | undefined): string => {
  const value = Number(num);
  return faNumber.format(Number.isFinite(value) ? value : 0);
};

/** Money in Toman with 3-digit grouping: «۱٬۲۵۰٬۰۰۰ تومان». */
export const formatPrice = (amount: number | string | null | undefined): string => {
  return `${formatNumber(amount)} تومان`;
};

/** Converts a Toman amount to grouped Rial: «۱۲٬۵۰۰٬۰۰۰ ریال». */
export const formatPriceRial = (amountInToman: number | string | null | undefined): string => {
  const toman = Number(amountInToman);
  return formatRialDirect((Number.isFinite(toman) ? toman : 0) * 10);
};

/** Already-Rial amount with 3-digit grouping: «۱۲٬۵۰۰٬۱۲۳ ریال». */
export const formatRialDirect = (amountInRial: number | string | null | undefined): string => {
  return `${formatNumber(amountInRial)} ریال`;
};

/**
 * Best-known creation timestamp of an order.
 * Older orders have no `createdAt`, but their id is `ord-<epoch ms>`, so the exact
 * moment they were placed can be recovered from it.
 */
export const deriveOrderCreatedAt = (order: {
  createdAt?: string | null;
  id?: string | null;
}): string | undefined => {
  if (order?.createdAt) return order.createdAt;
  const match = /^ord-(\d{10,})$/.exec(String(order?.id || ''));
  if (match) {
    const stamp = Number(match[1]);
    if (Number.isFinite(stamp)) {
      const d = new Date(stamp);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
  }
  return undefined;
};

/** تاریخ و ساعت کامل سفارش به شمسی: «۱۴۰۴/۰۸/۱۰ - ۱۵:۱۸» */
export const formatOrderDateTime = (
  iso?: string | null,
  fallbackDate?: string | null
): string => {
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      try {
        const datePart = new Intl.DateTimeFormat('fa-IR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(d);
        const timePart = new Intl.DateTimeFormat('fa-IR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(d);
        return `${datePart} - ${timePart}`;
      } catch {
        /* fall through to the plain date */
      }
    }
  }
  return fallbackDate || '';
};

export const getStatusBadge = (status: string): { label: string; color: string } => {
  switch (status) {
    case 'pending_review':
      return { label: 'در انتظار بررسی', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    case 'ai_processing':
      return { label: 'در حال آماده‌سازی و رتوش', color: 'text-sky-700 bg-sky-50 border-sky-200' };
    case 'printing':
      return { label: 'در حال چاپ در استودیو', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    case 'ready_to_ship':
      return { label: 'آماده تحویل / ارسال', color: 'text-teal-700 bg-teal-50 border-teal-200' };
    case 'delivered':
      return { label: 'تحویل داده شده', color: 'text-slate-600 bg-slate-100 border-slate-200' };
    default:
      return { label: 'نامشخص', color: 'text-slate-600 bg-slate-100 border-slate-200' };
  }
};
