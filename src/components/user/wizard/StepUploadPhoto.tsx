import React, { useRef, useState } from 'react';
import {
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye
} from 'lucide-react';
import { OrderDraft } from '../../../types';
import { PRINT_TYPES } from '../../../data/mockData';

interface StepUploadPhotoProps {
  draft: OrderDraft;
  onUpdateDraft: (updated: Partial<OrderDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepUploadPhoto: React.FC<StepUploadPhotoProps> = ({
  draft,
  onUpdateDraft,
  onNext,
  onBack
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentPrintType = PRINT_TYPES.find((t) => t.id === draft.printType) || PRINT_TYPES[0];

  const handleFileProcess = (file: File) => {
    setErrorMessage(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrorMessage('لطفاً فقط فایل تصویری (JPG, PNG, WebP) انتخاب کنید.');
      return;
    }

    // Validate file size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('حجم فایل نباید بیشتر از ۲۵ مگابایت باشد.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onUpdateDraft({
        uploadedImage: result,
        originalImageName: file.name
      });
    };
    reader.onerror = () => {
      setErrorMessage('خطا در خواندن فایل. لطفاً مجدداً امتحان کنید.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
    // Reset file input value so re-uploading the same file works
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDeletePhoto = () => {
    onUpdateDraft({
      uploadedImage: '',
      originalImageName: ''
    });
    setErrorMessage(null);
  };

  const handleProceed = () => {
    if (!draft.uploadedImage) {
      setErrorMessage('لطفاً ابتدا یک عکس آپلود کنید.');
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-5">
      {/* Hidden single file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/jpeg,image/png,image/webp,image/jpg"
        multiple={false}
        className="hidden"
      />

      {/* Main Upload / Preview Container */}
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xs">
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {!draft.uploadedImage ? (
          /* STATE 1: UPLOAD DROPZONE (No photo uploaded yet) */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-14 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
              isDragging
                ? 'border-sky-500 bg-sky-50/70 scale-[1.01]'
                : 'border-slate-300 hover:border-sky-400 hover:bg-slate-50/70 bg-slate-50/40'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-sky-100 to-emerald-100 text-sky-600 flex items-center justify-center mb-4 shadow-inner">
              <Upload className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse" />
            </div>

            <h3 className="text-sm sm:text-base font-black text-slate-900 mb-1">
              عکس مورد نظر برای چاپ ({currentPrintType.title}) را اینجا رها کنید
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-5 leading-relaxed font-medium">
              یا برای انتخاب فایل از گالری، حافظه دستگاه یا دوربین کلیک کنید. (فقط ۱ عکس، فرمت‌های JPG, PNG)
            </p>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 active:scale-95 text-white font-bold px-6 py-3 rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-sky-500/20 cursor-pointer flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>انتخاب و آپلود فایل عکس</span>
            </button>
          </div>
        ) : (
          /* STATE 2: PHOTO PREVIEW WITH ACTION BUTTONS DIRECTLY ON TOP */
          <div className="flex flex-col items-center justify-center">
            {/* Preview Box with Buttons directly on top */}
            <div className="relative max-w-sm w-full aspect-[3/4] sm:aspect-auto sm:max-h-[380px] bg-slate-100 rounded-2xl overflow-hidden shadow-lg border border-slate-300 flex items-center justify-center group">
              {/* Top-Right Button: Change Photo (روی پیش‌نمایش بالا راست) */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute top-3 right-3 z-20 bg-slate-900/85 hover:bg-slate-900 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-md transition-all cursor-pointer flex items-center gap-1.5 border border-white/20"
                title="تغییر و انتخاب عکس جدید"
              >
                <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                <span>تغییر عکس</span>
              </button>

              {/* Top-Left Button: Delete Photo (روی پیش‌نمایش بالا چپ) */}
              <button
                type="button"
                onClick={handleDeletePhoto}
                className="absolute top-3 left-3 z-20 bg-red-600/90 hover:bg-red-600 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-md transition-all cursor-pointer flex items-center gap-1.5 border border-white/20"
                title="حذف عکس و آپلود مجدد"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف</span>
              </button>

              {/* Image Render */}
              <img
                src={draft.uploadedImage}
                alt="پیش‌نمایش عکس آپلود شده"
                className="w-full h-full object-contain max-h-[380px] p-2"
              />

              {/* Bottom Image Info Badge */}
              <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-none">
                <div className="bg-black/70 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                  <span className="truncate max-w-[140px] sm:max-w-[180px]">
                    {draft.originalImageName || 'تصویر ۱'}
                  </span>
                </div>

                <div className="bg-emerald-600/90 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>آپلود شد</span>
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>تصویر با موفقیت بارگذاری شد و آماده چاپ است.</span>
            </p>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-3 pt-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 sm:flex-none sm:w-44 h-12 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-700 hover:to-sky-700 active:scale-98 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-teal-600/20 cursor-pointer flex items-center justify-center gap-2"
        >
          <ChevronRight className="w-4 h-4" />
          <span>مرحله قبل</span>
        </button>

        <button
          type="button"
          onClick={handleProceed}
          disabled={!draft.uploadedImage}
          className="flex-1 sm:flex-none sm:w-44 h-12 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-700 hover:to-sky-700 active:scale-98 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-teal-600/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>مرحله بعد</span>
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
