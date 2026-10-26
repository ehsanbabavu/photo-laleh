import React, { useRef, useState } from 'react';
import { Download, Upload, Loader2, CheckCircle2, AlertCircle, HardDriveDownload, HardDriveUpload } from 'lucide-react';

interface AdminBackupProps {
  showToast: (msg: string) => void;
}

export const AdminBackup: React.FC<AdminBackupProps> = ({ showToast }) => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

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
    <div className="w-full max-w-2xl mx-auto space-y-3">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <HardDriveDownload className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-black text-slate-900">پشتیبان‌گیری</h2>
        </div>
        <button
          onClick={handleBackup}
          disabled={isBackingUp}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
        >
          {isBackingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span>دانلود پشتیبان</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <HardDriveUpload className="w-4 h-4 text-sky-600" />
          <h2 className="text-sm font-black text-slate-900">بازیابی</h2>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200 cursor-pointer flex-shrink-0">
            <Upload className="w-3.5 h-3.5" />
            <span>انتخاب فایل</span>
            <input
              ref={fileRef}
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
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
        >
          {isRestoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span>بازیابی</span>
        </button>
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
