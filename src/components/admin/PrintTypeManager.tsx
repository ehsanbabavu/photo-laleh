import React, { useState } from 'react';
import {
  Palette,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  X,
  Layers,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { PrintTypeOption } from '../../types';
import { formatPrice } from '../../utils/formatters';

interface PrintTypeManagerProps {
  printTypes: PrintTypeOption[];
  onAddPrintType: (item: PrintTypeOption) => void;
  onUpdatePrintType: (item: PrintTypeOption) => void;
  onDeletePrintType: (id: string) => void;
  onResetPrintTypes: () => void;
}

export const PrintTypeManager: React.FC<PrintTypeManagerProps> = ({
  printTypes,
  onAddPrintType,
  onUpdatePrintType,
  onDeletePrintType,
  onResetPrintTypes
}) => {
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingItem, setEditingItem] = useState<PrintTypeOption | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [basePrice, setBasePrice] = useState<number>(85000);
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState<string[]>(['']);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation modal state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCreateModal = () => {
    setTitle('');
    setSubtitle('');
    setBasePrice(100000);
    setDescription('');
    setFeatures(['کیفیت استاندارد چاپ آتلیه', 'امکان تحویل فوری و بسته‌بندی ویژه']);
    setFormError(null);
    setEditingItem(null);
    setModalMode('create');
  };

  const openEditModal = (item: PrintTypeOption) => {
    setEditingItem(item);
    setTitle(item.title);
    setSubtitle(item.subtitle);
    setBasePrice(item.basePrice);
    setDescription(item.description);
    setFeatures(item.features && item.features.length > 0 ? [...item.features] : ['']);
    setFormError(null);
    setModalMode('edit');
  };

  const handleAddFeature = () => {
    setFeatures((prev) => [...prev, '']);
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleFeatureChange = (index: number, val: string) => {
    setFeatures((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('لطفاً عنوان خدمت را وارد کنید.');
      return;
    }

    if (!subtitle.trim()) {
      setFormError('لطفاً زیرعنوان کاربرد را وارد کنید.');
      return;
    }

    if (!basePrice || basePrice < 0) {
      setFormError('لطفاً مبلغ معتبر به تومان وارد کنید.');
      return;
    }

    const cleanFeatures = features.map((f) => f.trim()).filter(Boolean);
    if (cleanFeatures.length === 0) {
      cleanFeatures.push('چاپ باکیفیت و استاندارد استودیویی');
    }

    if (modalMode === 'create') {
      const newItem: PrintTypeOption = {
        id: 'pt_' + Date.now(),
        title: title.trim(),
        subtitle: subtitle.trim(),
        basePrice: Number(basePrice),
        description: description.trim() || 'ارائه خدمات تخصصی چاپ با بالاترین کیفیت رنگ و ماندگاری در استودیو.',
        features: cleanFeatures,
        sampleImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
        tag: 'خدمت تخصصی'
      };
      onAddPrintType(newItem);
    } else if (modalMode === 'edit' && editingItem) {
      const updatedItem: PrintTypeOption = {
        ...editingItem,
        title: title.trim(),
        subtitle: subtitle.trim(),
        basePrice: Number(basePrice),
        description: description.trim(),
        features: cleanFeatures
      };
      onUpdatePrintType(updatedItem);
    }

    setModalMode(null);
  };

  const confirmDelete = () => {
    if (deletingId) {
      onDeletePrintType(deletingId);
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-400 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-sky-500/20 flex-shrink-0">
              <Palette className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-black text-slate-900 leading-tight">
                مدیریت کارت‌های نوع چاپ (مرحله اول)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                تعریف، ویرایش عناوین، قیمت‌ها، توضیحات و حذف خدمات نمایش‌داده‌شده به مشتری
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onResetPrintTypes}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              title="بازنشانی کارت‌ها به ۴ حالت پیش‌فرض"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>بازنشانی پیش‌فرض</span>
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 active:scale-95 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-sky-500/20 cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن نوع چاپ جدید</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Print Type Cards (Live Preview & Management) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {printTypes.map((item, index) => (
          <div
            key={item.id}
            className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs hover:border-sky-300 transition-all flex flex-col justify-between relative group"
          >
            <div>
              {/* Header: Title and Action Buttons */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 font-mono text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    {item.title}
                  </h3>
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-sky-100 text-slate-600 hover:text-sky-700 active:scale-90 transition-all cursor-pointer"
                    title="ویرایش این کارت"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingId(item.id)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-700 active:scale-90 transition-all cursor-pointer"
                    title="حذف این کارت"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Subtitle */}
              <p className="text-xs text-sky-700 font-bold mb-2.5 mr-8">{item.subtitle}</p>

              {/* Price Box */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-between text-xs mb-3">
                <span className="text-slate-600 font-medium text-xs">قیمت پایه:</span>
                <span className="font-black text-slate-900 font-mono text-xs sm:text-sm bg-gradient-to-l from-sky-700 to-emerald-700 bg-clip-text text-transparent">
                  {formatPrice(item.basePrice)}
                </span>
              </div>

              {/* Description preview */}
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 text-xs space-y-2 mb-3">
                <p className="text-slate-600 text-[11px] sm:text-xs leading-relaxed font-medium">
                  {item.description}
                </p>

                {item.features && item.features.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/70">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">
                      ویژگی‌ها و جزئیات (منوی بازشونده):
                    </span>
                    <ul className="space-y-1">
                      {item.features.map((f, fIdx) => (
                        <li key={fIdx} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">شناسه: {item.id}</span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] sm:text-[11px] font-bold ${item.isEnabled !== false ? 'text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md' : 'text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md'}`}>
                  {item.isEnabled !== false ? 'فعال در فرم کاربر' : 'غیرفعال / مخفی'}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdatePrintType({ ...item, isEnabled: item.isEnabled === false ? true : false })}
                  className={`relative inline-flex h-5.5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    item.isEnabled !== false ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                  title={item.isEnabled !== false ? 'غیرفعال کردن این کارت' : 'فعال کردن این کارت'}
                >
                  <span
                    className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      item.isEnabled !== false ? '-translate-x-4.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE / EDIT MODAL */}
      {modalMode && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl space-y-4 my-8 animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  {modalMode === 'create' ? <Plus className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  {modalMode === 'create' ? 'افزودن نوع چاپ جدید' : 'ویرایش کارت نوع چاپ'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              {/* Title */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  عنوان خدمت * (مثال: عکس پرسنلی، چاپ روی شاسی، تبدیل عکس قدیمی)
                </label>
                <input
                  type="text"
                  required
                  placeholder="عنوان نوع چاپ"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 font-bold"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  زیرعنوان / کاربرد * (مثال: سازمانی، گذرنامه، گواهینامه و مدارک اداری)
                </label>
                <input
                  type="text"
                  required
                  placeholder="توضیح کوتاه زیر عنوان"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Base Price */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  مبلغ پایه چاپ (تومان) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step={1000}
                  placeholder="85000"
                  value={basePrice}
                  onChange={(e) => setBasePrice(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono font-bold placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 text-left dir-ltr"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  متن کامل توضیحات خدمت (در منوی بازشونده نمایش داده می‌شود)
                </label>
                <textarea
                  rows={2}
                  placeholder="توضیحات دقیق در مورد نحوه انجام چاپ، روتوش و استانداردها..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 leading-relaxed"
                />
              </div>

              {/* Features items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-700 font-bold">
                    ویژگی‌ها و نکات فنی (بالت‌پوینت‌های منو)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="text-[11px] text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>افزودن مورد</span>
                  </button>
                </div>

                {features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`ویژگی شماره ${idx + 1}`}
                      value={feat}
                      onChange={(e) => handleFeatureChange(idx, e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 text-xs"
                    />
                    {features.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(idx)}
                        className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center cursor-pointer transition-colors flex-shrink-0"
                        title="حذف این مورد"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  انصراف
                </button>

                <button
                  type="submit"
                  className="bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 active:scale-95 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-sky-500/20 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{modalMode === 'create' ? 'ثبت و انتشار نوع چاپ' : 'ذخیره تغییرات'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-fadeIn text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">آیا از حذف این نوع چاپ اطمینان دارید؟</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                این کارت از مرحله اول فرم ثبت سفارش کاربران حذف خواهد شد.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
              >
                انصراف
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md shadow-red-500/20 cursor-pointer"
              >
                بله، حذف شود
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
