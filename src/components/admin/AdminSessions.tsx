import React, { useEffect, useState } from 'react';
import { ShieldCheck, Loader2, LogOut, Monitor, Smartphone, Tablet, Trash2 } from 'lucide-react';

interface AdminSessionsProps {
  showToast: (msg: string) => void;
}

interface DeviceInfo {
  deviceId: string;
  userAgent: string;
  ip: string;
  firstLogin: number;
  lastSeen: number;
  sessions: number;
}

function describeDevice(userAgent: string): { label: string; icon: 'mobile' | 'tablet' | 'desktop' } {
  const ua = (userAgent || '').toLowerCase();
  if (!ua) return { label: 'دستگاه نامشخص', icon: 'desktop' };
  const browser = ua.includes('edg/')
    ? 'Edge'
    : ua.includes('chrome') && !ua.includes('opr')
      ? 'Chrome'
      : ua.includes('firefox')
        ? 'Firefox'
        : ua.includes('safari')
          ? 'Safari'
          : 'مرورگر';

  const os = ua.includes('android')
    ? 'اندروید'
    : /iphone|ipod/.test(ua)
      ? 'iPhone'
      : ua.includes('ipad')
        ? 'iPad'
        : ua.includes('windows')
          ? 'ویندوز'
          : ua.includes('mac os')
            ? 'مک'
            : ua.includes('linux')
              ? 'لینوکس'
              : '';

  const icon = /ipad|tablet/.test(ua) ? 'tablet' : /android|iphone|ipod|mobile/.test(ua) ? 'mobile' : 'desktop';
  return { label: os ? `${os} · ${browser}` : browser, icon };
}

export const AdminSessions: React.FC<AdminSessionsProps> = ({ showToast }) => {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/sessions');
      const data = await res.json();
      setDevices(Array.isArray(data) ? data : []);
    } catch {
      setDevices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const revokeDevice = async (deviceId: string) => {
    if (!window.confirm('این دستگاه از حساب خارج شود؟')) return;
    setBusyId(deviceId);
    try {
      await fetch(`/api/auth/sessions/${encodeURIComponent(deviceId)}`, { method: 'DELETE' });
      setDevices((prev) => prev.filter((d) => d.deviceId !== deviceId));
      showToast('دستگاه بسته شد.');
    } finally {
      setBusyId(null);
    }
  };

  const revokeAll = async () => {
    if (!window.confirm('همه دستگاه‌ها بسته شوند؟')) return;
    setBusyId('all');
    try {
      await fetch('/api/auth/sessions', { method: 'DELETE' });
      showToast('همه نشست‌ها بسته شد.');
      window.location.href = '/';
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="w-full max-w-2xl lg:max-w-none mx-auto space-y-3">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <h2 className="text-sm font-black text-slate-900">دستگاه‌های فعال</h2>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-lg bg-slate-100 text-slate-600">
              {devices.length}
            </span>
          </div>
          <button
            onClick={revokeAll}
            disabled={busyId !== null || devices.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
          >
            {busyId === 'all' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
            بستن همه
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : devices.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">دستگاهی یافت نشد.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {devices.map((device) => {
              const { label, icon } = describeDevice(device.userAgent);
              const Icon = icon === 'mobile' ? Smartphone : icon === 'tablet' ? Tablet : Monitor;
              return (
                <div key={device.deviceId} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{label}</p>
                      <p className="text-[10px] text-slate-500 truncate" dir="ltr">
                        {device.ip || '—'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        آخرین فعالیت: {new Date(device.lastSeen).toLocaleString('fa-IR')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => revokeDevice(device.deviceId)}
                    disabled={busyId !== null}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 disabled:opacity-50 cursor-pointer flex-shrink-0"
                  >
                    {busyId === device.deviceId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    بستن
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
