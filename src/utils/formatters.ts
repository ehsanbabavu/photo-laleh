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
