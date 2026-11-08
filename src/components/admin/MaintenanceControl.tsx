import { Activity } from 'lucide-react';
import type { MaintenanceNotificationSummary } from '../../types';

export interface MaintenanceControlProps {
  maintenanceMode?: boolean;
  maintenanceNotifications?: MaintenanceNotificationSummary | null;
  isTogglingMaintenance?: boolean;
  maintenanceError?: string;
  onToggleMaintenance?: (enabled: boolean) => void;
}

export function MaintenanceControl({ maintenanceMode = false, maintenanceNotifications,
  isTogglingMaintenance = false, maintenanceError = '', onToggleMaintenance }: MaintenanceControlProps) {
  return <>
    <button type="button" role="switch" aria-checked={maintenanceMode} aria-label="حالت به‌روزرسانی"
      aria-busy={isTogglingMaintenance} disabled={isTogglingMaintenance}
      onClick={() => onToggleMaintenance?.(!maintenanceMode)}
      className={`admin-maintenance-toggle w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl border bg-gradient-to-r text-xs font-bold shadow-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-wait ${maintenanceMode
        ? 'from-red-100 via-red-200 to-red-100 border-red-200 text-red-900 hover:border-red-300 focus-visible:ring-red-500'
        : 'from-green-100 via-green-200 to-green-100 border-green-200 text-green-900 hover:border-green-300 focus-visible:ring-green-500'}`}>
      <span className="flex items-center gap-2"><Activity className="w-3.5 h-3.5" />
        <span>{isTogglingMaintenance ? 'در حال ذخیره…' : 'حالت به‌روزرسانی'}</span></span>
      <span aria-hidden="true" className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${maintenanceMode ? 'bg-red-500' : 'bg-green-500'}`}>
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${maintenanceMode ? '-translate-x-4' : '-translate-x-0.5'}`} />
      </span>
    </button>
    {maintenanceNotifications && maintenanceNotifications.status !== 'idle' && (
      <p role="status" aria-label="وضعیت صف اعلان‌های به‌روزرسانی" className="px-3 py-1 text-[10px] leading-5 text-slate-500">
        {maintenanceNotifications.status === 'pending'
          ? `ارسال ترتیبی اعلان‌ها: ${maintenanceNotifications.sent + maintenanceNotifications.failed} از ${maintenanceNotifications.total}`
          : `ارسال اعلان‌ها پایان یافت: ${maintenanceNotifications.sent} موفق`}
        {maintenanceNotifications.failed > 0 && ` · ${maintenanceNotifications.failed} ناموفق`}
      </p>
    )}
    {maintenanceError && <p role="alert" className="px-3 text-[10px] leading-5 text-rose-600">{maintenanceError}</p>}
  </>;
}
