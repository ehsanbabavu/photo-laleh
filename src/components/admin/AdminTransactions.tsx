import { CreditCard } from 'lucide-react';

export const AdminTransactions = () => (
  <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 min-h-[200px]" aria-labelledby="transactions-title">
    <div className="flex items-center gap-2">
      <CreditCard className="w-4 h-4 text-sky-600 flex-shrink-0" aria-hidden="true" />
      <h2 id="transactions-title" className="text-sm font-black text-slate-900">تراکنش‌ها</h2>
    </div>
  </section>
);
