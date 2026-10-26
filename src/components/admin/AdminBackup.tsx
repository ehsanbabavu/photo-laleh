import React, { useState } from 'react';
import {
  Download,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HardDriveDownload,
  HardDriveUpload
} from 'lucide-react';

interface AdminBackupProps {
  showToast: (msg: string) => void;
}

export const AdminBackup: React.FC<AdminBackupProps> = ({ showToast }) => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleBackup = async () => {
    setError(null);
    setSuccess(null);
    setIsBackingUp(true);
    try {
      const res = await fetch('/api/backup');
      if (!res.ok) throw new Error('backup failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      link.href = url;
      link.download = `laleh-backup-${stamp}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setSuccess('فایل پشتیبان دانلود شد.');
      showToast('پشتیبان دانلود شد.');
    } catch {
      setError('دریافت پشتیبان ناموفق بود.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedFile) {
      setError('فایل پشتیبان را انتخاب کنید.');
      return;
    }
    if (!window.confirm('داده‌های فعلی با فایل پشتیبان جایگزین شوند؟')) return;

    setError(null);
    setSuccess(null);
    setIsRestoring(true);
    try {
      const text = await selectedFile.text();
      const parsed = JSON.parse(text);
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        setError(data?.error || 'بازیابی ناموفق بود.');
        return;
      }
      setSuccess('بازیابی انجام شد.');
      showToast('بازیابی انجام شد.');
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      setError('فایل پشتیبان معتبر نیست.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
        {/* Backup */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center flex-shrink-0">
              <HardDriveDownload className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-slate-900">پشتیبان‌گیری</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                دریافت یک نسخه کامل از داده‌های دیتابیس در قالب فایل JSON
              </p>
            </div>
          </div>
          <button
            onClick={handleBackup}
            disabled={isBackingUp}
            className="mt-auto w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer transition-colors"
          >
            {isBackingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>دانلود پشتیبان</span>
          </button>
        </div>

        {/* Restore */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center flex-shrink-0">
              <HardDriveUpload className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-slate-900">بازیابی</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                بازگردانی داده‌ها از یک فایل پشتیبان ذخیره‌شده
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200 cursor-pointer flex-shrink-0">
              <Upload className="w-3.5 h-3.5" />
              <span>انتخاب فایل</span>
              <input
                type="file"
                accept="application/json,.json"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
            <span className="text-[11px] text-slate-500 truncate" dir="ltr">
              {selectedFile ? selectedFile.name : ''}
            </span>
          </div>

          <button
            onClick={handleRestore}
            disabled={isRestoring || !selectedFile}
            className="mt-auto w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors"
          >
            {isRestoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>بازیابی</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <p className="text-[11px] text-rose-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-[11px] text-emerald-700">{success}</p>
        </div>
      )}
    </div>
  );
};
