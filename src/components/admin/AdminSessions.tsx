import React, { useEffect, useState } from 'react';
import { ShieldCheck, Loader2, LogOut, Monitor } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

interface AdminSessionsProps {
  showToast: (msg: string) => void;
}

interface SessionInfo {
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export const AdminSessions: React.FC<AdminSessionsProps> = ({ showToast }) => {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevoking, setIsRevoking] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/sessions');
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const revokeAll = async () => {
    if (!window.confirm('همه نشست‌های فعال بسته شوند؟')) return;
    setIsRevoking(true);
    try {
      await fetch('/api/auth/sessions', { method: 'DELETE' });
      showToast('همه نشست‌ها بسته شد.');
      window.location.href = '/';
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="w-full max-w-2xl lg:max-w-none mx-auto space-y-3">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <h2 className="text-sm font-black text-slate-900">دستگاه‌های فعال</h2>
          </div>
          <button
            onClick={revokeAll}
            disabled={isRevoking || sessions.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
          >
            {isRevoking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
            بستن همه
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">نشستی یافت نشد.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {sessions.map((session, index) => (
              <div key={index} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
                    <Monitor className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-800">
                      ورود: {new Date(session.createdAt).toLocaleString('fa-IR')}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      انقضا: {new Date(session.expiresAt).toLocaleDateString('fa-IR')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
