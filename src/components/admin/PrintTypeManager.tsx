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
  Sparkles,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { PrintDimension, PrintTypeOption } from '../../types';
import { formatPrice } from '../../utils/formatters';

interface PrintTypeManagerProps {
  printTypes: PrintTypeOption[];
  dimensions?: PrintDimension[];
  onAddPrintType: (item: PrintTypeOption) => void;
  onUpdatePrintType: (item: PrintTypeOption) => void;
  onDeletePrintType: (id: string) => void;
  onResetPrintTypes: () => void;
}

export const PrintTypeManager: React.FC<PrintTypeManagerProps> = ({
  printTypes,
  dimensions = [],
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
  const [basePrice, setBasePrice] = useState(100000);
  const [serviceFee, setServiceFee] = useState(0);
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState<string[]>(['']);
  const [cardBgImage, setCardBgImage] = useState<string | null>(null);
  const [dimensionIds, setDimensionIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation modal state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCreateModal = () => {
    setTitle('');
    setSubtitle('');
    setBasePrice(100000);
    setServiceFee(0);
    setDescription('');
    setFeatures(['کیفیت استاندارد چاپ آتلیه', 'امکان تحویل فوری و بسته‌بندی ویژه']);
    setCardBgImage(null);
    setDimensionIds(dimensions.length > 0 ? dimensions.map((d) => d.id) : []);
    setFormError(null);
    setEditingItem(null);
    setModalMode('create');
  };

  const openEditModal = (item: PrintTypeOption) => {
    setEditingItem(item);
    setTitle(item.title);
    setSubtitle(item.subtitle);
    setBasePrice(Math.max(0, Number(item.basePrice) || 0));
    setServiceFee(Math.max(0, Number(item.serviceFee) || 0));
    setDescription(item.description);
    setFeatures(item.features && item.features.length > 0 ? [...item.features] : ['']);
    setCardBgImage(item.cardBgImage || null);
    setDimensionIds(
      Array.isArray(item.dimensionIds)
        ? [...item.dimensionIds]
        : dimensions.map((d) => d.id)
    );
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setFormError('حجم تصویر نباید بیشتر از ۸ مگابایت باشد.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCardBgImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
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

    const cleanFeatures = features.map((f) => f.trim()).filter(Boolean);
    if (cleanFeatures.length === 0) {
      cleanFeatures.push('چاپ باکیفیت و استاندارد استودیویی');
    }

    if (modalMode === 'create') {
      const newItem: PrintTypeOption = {
        id: 'pt_' + Date.now(),
        title: title.trim(),
        subtitle: subtitle.trim(),
        basePrice: Math.max(0, Number(basePrice) || 0),
        serviceFee: Math.max(0, Number(serviceFee) || 0),
        serviceFeeEnabled: false,
        description: description.trim() || 'ارائه خدمات تخصصی چاپ با بالاترین کیفیت رنگ و ماندگاری در استودیو.',
        features: cleanFeatures,
        sampleImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
        tag: 'خدمت تخصصی',
        cardBgImage: cardBgImage || undefined,
        dimensionIds
      };
      onAddPrintType(newItem);
    } else if (modalMode === 'edit' && editingItem) {
      const updatedItem: PrintTypeOption = {
        ...editingItem,
        title: title.trim(),
        subtitle: subtitle.trim(),
        basePrice: Math.max(0, Number(basePrice) || 0),
        serviceFee: Math.max(0, Number(serviceFee) || 0),
        description: description.trim(),
        features: cleanFeatures,
        cardBgImage: cardBgImage || undefined,
        dimensionIds
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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


              {/* Assigned print sizes (managed in «مدیریت سایز») */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 mb-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-bold text-[11px]">سایزهای این نوع چاپ:</span>
                  <span className="text-[10px] font-bold font-mono text-sky-700 bg-white border border-sky-200 rounded-md px-1.5 py-0.5">
                    {(item.dimensionIds || []).length} سایز
                  </span>
                </div>
                {(item.dimensionIds || []).length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {(item.dimensionIds || []).map((dimId) => {
                      const dim = dimensions.find((d) => d.id === dimId);
                      return (
                        <span
                          key={dimId}
                          className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded-md px-1.5 py-0.5"
                        >
                          {dim ? dim.dimensionsCm : 'سایز حذف‌شده'}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-amber-700">
                    هیچ سایزی انتخاب نشده — در این کارت مرحله ابعاد خالی می‌شود
                  </span>
                )}
              </div>

              <div className="mb-3 p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="block text-[11px] font-bold text-slate-700">هزینه خدمات · یک‌بار برای هر سفارش</span>
                  <span className={`text-[10px] font-bold ${item.serviceFeeEnabled === true ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {item.serviceFeeEnabled === true
                      ? Number(item.serviceFee) > 0
                        ? formatPrice(item.serviceFee || 0)
                        : 'مبلغ را وارد کنید'
                      : Number(item.serviceFee) > 0
                        ? `${formatPrice(item.serviceFee || 0)} · غیرفعال`
                        : 'غیرفعال'}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={item.serviceFeeEnabled === true}
                  aria-label={`هزینه خدمات ${item.title}`}
                  onClick={() => onUpdatePrintType({ ...item, serviceFeeEnabled: item.serviceFeeEnabled !== true })}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                    item.serviceFeeEnabled === true ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ${
                      item.serviceFeeEnabled === true ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
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

            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-bold">چند عکس</span>
                <button
                  type="button"
                  onClick={() => onUpdatePrintType({ ...item, allowMultiplePhotos: !item.allowMultiplePhotos })}
                  className={`relative inline-flex h-5.5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    item.allowMultiplePhotos ? 'bg-sky-500' : 'bg-slate-300'
                  }`}
                  title={item.allowMultiplePhotos ? 'انتخاب چند عکس فعال است' : 'فقط یک عکس'}
                >
                  <span
                    className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      item.allowMultiplePhotos ? '-translate-x-4.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center gap-2">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">قیمت پایه نوع چاپ (تومان)</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={basePrice}
                    onChange={(e) => setBasePrice(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">هزینه خدمات (تومان، یک‌بار برای هر سفارش)</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={serviceFee}
                    onChange={(e) => setServiceFee(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-sky-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">برای دریافت این مبلغ، کلید هزینه خدمات را روی کارت فعال کنید.</p>
                </div>
              </div>

              {/* Card Background Image Upload */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <label className="block text-slate-700 font-bold">
                  تصویر پس‌زمینه کارت خدمت
                </label>
                <p className="text-[10px] text-slate-500">
                  یک عکس با پس‌زمینه سفیدِ خالص آپلود کنید تا در کارت‌های کاربری سمت چپ نمایش داده شود. (در صورت خالی بودن، از پیش‌فرض مناسبِ این کارت استفاده خواهد شد).
                </p>
                <div className="flex items-center gap-3">
                  <label className="flex-1 border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all bg-white hover:bg-sky-50/20">
                    <Upload className="w-4 h-4 text-slate-400 mb-1" />
                    <span className="text-[11px] font-bold text-slate-600">انتخاب تصویر جدید</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>

                  {cardBgImage && (
                    <div className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center">
                      <img
                        src={cardBgImage}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setCardBgImage(null)}
                        className="absolute top-0.5 right-0.5 bg-red-600 hover:bg-red-700 text-white p-0.5 rounded-md active:scale-90 transition-all shadow-md"
                        title="حذف تصویر"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
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

              {/* Print sizes assigned to this print type */}
              <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-black text-slate-800 block">سایزهای این نوع چاپ</span>
                    <span className="text-[10px] text-slate-500">
                      سایزها در منوی «مدیریت سایز» ساخته و ویرایش می‌شوند.
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setDimensionIds(dimensions.map((d) => d.id))}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 cursor-pointer"
                    >
                      انتخاب همه
                    </button>
                    <button
                      type="button"
                      onClick={() => setDimensionIds([])}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      هیچ‌کدام
                    </button>
                  </div>
                </div>

                {dimensions.length === 0 ? (
                  <p className="text-[11px] text-amber-700 font-bold">
                    هنوز سایزی تعریف نشده است؛ ابتدا از منوی «مدیریت سایز» یک سایز بسازید.
                  </p>
                ) : (
                  <div className="max-h-44 overflow-y-auto space-y-1 pr-0.5">
                    {dimensions.map((dim) => {
                      const checked = dimensionIds.includes(dim.id);
                      return (
                        <label
                          key={dim.id}
                          className={`flex items-center justify-between gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                            checked
                              ? 'bg-white border-sky-300'
                              : 'bg-white/60 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setDimensionIds((prev) =>
                                  e.target.checked
                                    ? [...prev, dim.id]
                                    : prev.filter((id) => id !== dim.id)
                                )
                              }
                              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 cursor-pointer flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold text-slate-800 block truncate">
                                {dim.title}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 block">
                                {dim.dimensionsCm}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-600 flex-shrink-0">
                            {dim.basePrice === 0 ? 'رایگان' : `${formatPrice(dim.basePrice)}`}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
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
