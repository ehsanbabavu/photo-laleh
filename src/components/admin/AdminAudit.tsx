import React, { useEffect, useState } from 'react';
import { Activity, Loader2 } from 'lucide-react';

interface AdminAuditProps {
  showToast: (msg: string) => void;
}

interface AuditEntry {
  userName?: string;
  phone?: string;
  method: string;
  path: string;
  status: number;
  ip?: string;
  createdAt: string;
}

export const AdminAudit: React.FC<AdminAuditProps> = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/audit?limit=100');
        const data = await res.json();
        setEntries(Array.isArray(data) ? data : []);
      } catch {
        setEntries([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <div className="w-full max-w-3xl lg:max-w-none mx-auto space-y-3">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-600 flex-shrink-0" />
          <h2 className="text-sm font-black text-slate-900">گزارش فعالیت‌ها</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">فعالیتی ثبت نشده است.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-[11px]">
              <thead className="text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2 font-bold">کاربر</th>
                  <th className="py-2 font-bold">عملیات</th>
                  <th className="py-2 font-bold">مسیر</th>
                  <th className="py-2 font-bold">وضعیت</th>
                  <th className="py-2 font-bold">IP</th>
                  <th className="py-2 font-bold">زمان</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr key={index} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 text-slate-800 font-bold">{entry.userName || '—'}</td>
                    <td className="py-2 font-mono text-slate-600">{entry.method}</td>
                    <td className="py-2 font-mono text-slate-600" dir="ltr">{entry.path}</td>
                    <td className={`py-2 font-mono ${entry.status < 400 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {entry.status}
                    </td>
                    <td className="py-2 font-mono text-slate-500" dir="ltr">{entry.ip || '—'}</td>
                    <td className="py-2 text-slate-500">
                      {new Date(entry.createdAt).toLocaleString('fa-IR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
