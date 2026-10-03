// Utility functions for Persian formatting

export const formatPrice = (amount: number): string => {
  return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('fa-IR').format(num);
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
