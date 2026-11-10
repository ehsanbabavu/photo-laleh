import React, { useState } from 'react';
import { Maximize2, Plus, Pencil, Trash2, X, AlertCircle, Ruler, Star, Lock, Frame, LayoutGrid, Table2 } from 'lucide-react';
import { PrintDimension, PrintTypeOption } from '../../types';
import { formatPrice } from '../../utils/formatters';

interface AdminSizesManagerProps {
  dimensions: PrintDimension[];
  printTypes: PrintTypeOption[];
  onAddDimension: (item: PrintDimension) => void;
  onUpdateDimension: (item: PrintDimension) => void;
  onDeleteDimension: (id: string) => void;
}

const emptyForm = {
  title: '',
  dimensionsCm: '',
  aspectRatio: '',
  basePrice: 0,
  costPrice: 0,
  frameEnabled: false,
  frameCustomerPrice: 0,
  frameCostPrice: 0,
  description: '',
  popular: false
};

type SizesViewMode = 'cards' | 'table';
const sizesViewStorageKey = 'photo-laleh:admin:sizes:view';

export const AdminSizesManager: React.FC<AdminSizesManagerProps> = ({
  dimensions,
  printTypes,
  onAddDimension,
  onUpdateDimension,
  onDeleteDimension
}) => {
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<SizesViewMode>(() => {
    if (typeof window === 'undefined') return 'cards';
    try {
      const savedView = window.localStorage.getItem(sizesViewStorageKey);
      return savedView === 'list' || savedView === 'table' ? 'table' : 'cards';
    } catch {
      return 'cards';
    }
  });

  const selectViewMode = (mode: SizesViewMode) => {
    setViewMode(mode);
    try {
      window.localStorage.setItem(sizesViewStorageKey, mode);
    } catch {
      // The selected view remains available when browser storage is disabled.
    }
  };

  /** Print types that currently offer this size (managed from the print type card). */
  const usedBy = (dimensionId: string) =>
    printTypes.filter((pt) => (pt.dimensionIds || []).includes(dimensionId));

  const openCreate = () => {
    setForm({ ...emptyForm, basePrice: 50000 });
    setEditingId(null);
    setFormError(null);
    setModalMode('create');
  };

  const openEdit = (item: PrintDimension) => {
    setForm({
      title: item.title,
      dimensionsCm: item.dimensionsCm,
      aspectRatio: item.aspectRatio || '',
      basePrice: Number(item.basePrice) || 0,
      costPrice: Number(item.costPrice) || 0,
      frameEnabled: Boolean(item.frameEnabled),
      frameCustomerPrice: Number(item.frameCustomerPrice) || 0,
      frameCostPrice: Number(item.frameCostPrice) || 0,
      description: item.description || '',
      popular: Boolean(item.popular)
    });
    setEditingId(item.id);
    setFormError(null);
    setModalMode('edit');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const title = form.title.trim();
    const dimensionsCm = form.dimensionsCm.trim();
    if (!title) return setFormError('عنوان سایز را وارد کنید.');
    if (!dimensionsCm) return setFormError('اندازه سایز (مثلاً 20 x 30 cm) را وارد کنید.');
    if (!Number.isFinite(Number(form.basePrice)) || Number(form.basePrice) < 0) {
      return setFormError('مبلغ سایز نمی‌تواند منفی باشد.');
    }
    if (!Number.isFinite(Number(form.costPrice)) || Number(form.costPrice) < 0) {
      return setFormError('هزینه تمام‌شده نمی‌تواند منفی باشد.');
    }

    const duplicate = dimensions.some(
      (d) => d.id !== editingId && d.title.trim() === title
    );
    if (duplicate) return setFormError('سایزی با همین عنوان از قبل وجود دارد.');

    if (!Number.isFinite(Number(form.frameCustomerPrice)) || Number(form.frameCustomerPrice) < 0) {
      return setFormError('قیمت تخته شاسی (مشتری) نمی‌تواند منفی باشد.');
    }
    if (!Number.isFinite(Number(form.frameCostPrice)) || Number(form.frameCostPrice) < 0) {
      return setFormError('قیمت تمام‌شده تخته شاسی نمی‌تواند منفی باشد.');
    }
    if (form.frameEnabled && Number(form.frameCustomerPrice) <= 0) {
      return setFormError('برای فعال بودن تخته شاسی، قیمت مشتری تخته شاسی را وارد کنید.');
    }

    const payload: PrintDimension = {
      id: editingId || `size_${Date.now().toString(36)}`,
      title,
      dimensionsCm,
      aspectRatio: form.aspectRatio.trim() || '—',
      basePrice: Math.round(Number(form.basePrice) || 0),
      costPrice: Math.round(Number(form.costPrice) || 0),
      frameEnabled: form.frameEnabled,
      frameCustomerPrice: Math.round(Number(form.frameCustomerPrice) || 0),
      frameCostPrice: Math.round(Number(form.frameCostPrice) || 0),
      description: form.description.trim(),
      popular: form.popular
    };

    if (modalMode === 'create') {
      onAddDimension(payload);
    } else {
      onUpdateDimension(payload);
    }
    setModalMode(null);
    setEditingId(null);
  };

  const targetForDelete = dimensions.find((d) => d.id === deletingId) || null;
  const deleteUsage = deletingId ? usedBy(deletingId) : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <section aria-label="مدیریت سایزهای چاپ" className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-l from-sky-50/70 via-white to-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm shadow-sky-600/20 sm:h-11 sm:w-11">
              <Ruler className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-black text-slate-900 sm:text-lg">
                مدیریت سایزهای چاپ
                <span className="rounded-full border border-sky-200 bg-white px-2 py-0.5 text-[10px] font-bold text-sky-700">
                  {dimensions.length.toLocaleString('fa-IR')} سایز
                </span>
              </h1>
              <p className="mt-1 text-[11px] leading-5 text-slate-500 sm:text-xs">
                افزودن، ویرایش و قیمت‌گذاری سایزهای چاپ
              </p>
            </div>
          </div>

          <div className="flex sm:shrink-0">
            <button
              type="button"
              onClick={openCreate}
              aria-label="افزودن سایز جدید"
              className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm shadow-sky-600/20 transition-colors hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 cursor-pointer sm:w-auto sm:px-4"
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>افزودن سایز</span>
            </button>

          </div>
        </div>
      </section>

      {/* Sizes display */}
      <section aria-label="سایزها و قیمت‌ها" className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <h2 className="text-sm font-black text-slate-900">سایزها و قیمت‌ها</h2>
          <div role="group" aria-label="حالت نمایش سایزها" className="flex w-full gap-1 rounded-xl bg-slate-100 p-1 sm:w-auto">
            <button
              type="button"
              aria-label="نمایش کارتی"
              aria-pressed={viewMode === 'cards'}
              onClick={() => selectViewMode('cards')}
              className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 cursor-pointer ${viewMode === 'cards' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              کارتی
            </button>
            <button
              type="button"
              aria-label="نمایش جدولی"
              aria-pressed={viewMode === 'table'}
              onClick={() => selectViewMode('table')}
              className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 cursor-pointer ${viewMode === 'table' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <Table2 className="h-4 w-4" aria-hidden="true" />
              جدول
            </button>
          </div>
        </div>
      {dimensions.length === 0 ? (
        <div className="p-8 text-center space-y-3 sm:p-10">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Maximize2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-700">هیچ سایزی تعریف نشده است</p>
          <p className="text-xs text-slate-500">
            با دکمه «افزودن سایز جدید» اولین سایز چاپ را بسازید.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div role="region" aria-label="جدول سایزهای چاپ" tabIndex={0} className="max-w-full overflow-x-auto overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500">
          <table className="w-full min-w-[900px] text-right text-xs">
            <caption className="sr-only">سایزهای چاپ، قیمت‌ها و عملیات ویرایش و حذف</caption>
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600">
              <tr>
                <th scope="col" className="w-14 px-3 py-3">ردیف</th>
                <th scope="col" className="min-w-[190px] px-3 py-3">سایز</th>
                <th scope="col" className="whitespace-nowrap px-3 py-3">مبلغ سایز</th>
                <th scope="col" className="whitespace-nowrap px-3 py-3 text-rose-700">هزینه تمام‌شده</th>
                <th scope="col" className="whitespace-nowrap px-3 py-3">مبلغ شاسی</th>
                <th scope="col" className="whitespace-nowrap px-3 py-3 text-rose-700">هزینه شاسی</th>
                <th scope="col" className="sticky left-0 z-10 w-28 bg-slate-50 px-3 py-3 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dimensions.map((dim, index) => (
                <tr key={dim.id} data-dimension-id={dim.id} className="group transition-colors hover:bg-sky-50/40">
                  <td className="px-3 py-3 font-mono text-[11px] text-slate-400">{(index + 1).toLocaleString('fa-IR')}</td>
                  <th scope="row" className="px-3 py-3 font-normal">
                    <p className="break-words font-bold text-slate-900">{dim.title}</p>
                    <p dir="ltr" className="mt-1 text-right font-mono text-[11px] text-slate-500">{dim.dimensionsCm}</p>
                  </th>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-[11px] font-bold text-slate-900">
                    {dim.basePrice === 0 ? 'رایگان / هدیه' : formatPrice(dim.basePrice)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-[11px] font-bold text-rose-900">
                    {Number(dim.costPrice) > 0 ? formatPrice(Number(dim.costPrice)) : 'ثبت نشده'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-[11px] font-bold text-emerald-700">
                    {Number(dim.frameCustomerPrice) > 0 ? formatPrice(Number(dim.frameCustomerPrice)) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-[11px] font-bold text-rose-900">
                    {Number(dim.frameCostPrice) > 0 ? formatPrice(Number(dim.frameCostPrice)) : '—'}
                  </td>
                  <td className="sticky left-0 bg-white px-3 py-3 transition-colors group-hover:bg-sky-50">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        aria-label={`ویرایش سایز ${dim.title}`}
                        title="ویرایش سایز"
                        onClick={() => openEdit(dim)}
                        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-sky-50 text-sky-700 transition-colors hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`حذف سایز ${dim.title}`}
                        title="حذف سایز"
                        onClick={() => setDeletingId(dim.id)}
                        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-rose-50 text-rose-700 transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-3 sm:p-4">
          {dimensions.map((dim, index) => {
            return (
              <div
                key={dim.id}
                data-dimension-id={dim.id}
                className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 shadow-xs hover:border-sky-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </span>
                      <h3 className="text-sm font-black text-slate-900 truncate">{dim.title}</h3>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(dim)}
                        aria-label={`ویرایش سایز ${dim.title}`}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-sky-100 text-slate-600 hover:text-sky-700 active:scale-90 transition-all cursor-pointer"
                        title="ویرایش سایز"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(dim.id)}
                        aria-label={`حذف سایز ${dim.title}`}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-700 active:scale-90 transition-all cursor-pointer"
                        title="حذف سایز"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                    <span className="font-mono text-[11px] font-bold text-sky-800 bg-sky-50 border border-sky-200 rounded-lg px-2 py-0.5">
                      {dim.dimensionsCm}
                    </span>
                    {dim.aspectRatio && dim.aspectRatio !== '—' && (
                      <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5">
                        {dim.aspectRatio}
                      </span>
                    )}
                    {dim.popular && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 rounded-lg px-2 py-0.5 flex items-center gap-1">
                        <Star className="w-2.5 h-2.5" />
                        محبوب
                      </span>
                    )}
                  </div>

                  {/* Customer price and internal cost — admin only */}
                  <div className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 mb-2 space-y-1">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-slate-600 font-medium">مبلغ این سایز:</span>
                      <span className="font-black text-slate-900 font-mono text-xs whitespace-nowrap">
                        {dim.basePrice === 0 ? 'رایگان / هدیه' : formatPrice(dim.basePrice)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200 text-[11px]">
                      <span className="text-rose-800 font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        هزینه تمام‌شده (محرمانه)
                      </span>
                      <span className="font-black text-rose-900 font-mono text-xs whitespace-nowrap">
                        {Number(dim.costPrice) > 0 ? formatPrice(Number(dim.costPrice)) : 'ثبت نشده'}
                      </span>
                    </div>
                    {Number(dim.costPrice) > 0 && (
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-slate-600">سود ناخالص این سایز:</span>
                        <span
                          className={`font-mono ${
                            dim.basePrice - Number(dim.costPrice) >= 0
                              ? 'text-emerald-700'
                              : 'text-red-600'
                          }`}
                        >
                          {formatPrice(dim.basePrice - Number(dim.costPrice))}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Optional frame (تخته شاسی) */}
                  <div
                    className={`p-2 rounded-xl border mb-2 space-y-0.5 ${
                      dim.frameEnabled
                        ? 'bg-amber-50/70 border-amber-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold flex items-center gap-1 text-slate-700">
                        <Frame className="w-3 h-3" />
                        تخته شاسی
                      </span>
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${
                          dim.frameEnabled
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {dim.frameEnabled ? 'برای مشتری روشن' : 'خاموش'}
                      </span>
                    </div>
                    {Number(dim.frameCustomerPrice) > 0 || Number(dim.frameCostPrice) > 0 ? (
                      <div className="space-y-0.5 pt-0.5">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-slate-600">قیمت مشتری تخته شاسی:</span>
                          <span className="font-mono text-emerald-700">
                            {Number(dim.frameCustomerPrice) > 0
                              ? formatPrice(Number(dim.frameCustomerPrice))
                              : 'ثبت نشده'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-slate-600 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            قیمت تمام‌شده تخته شاسی:
                          </span>
                          <span className="font-mono text-rose-700">
                            {Number(dim.frameCostPrice) > 0
                              ? formatPrice(Number(dim.frameCostPrice))
                              : 'ثبت نشده'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-black pt-0.5 border-t border-slate-200/70">
                          <span className="text-slate-700">مشتری با تخته شاسی:</span>
                          <span className="font-mono text-slate-900">
                            {formatPrice(Number(dim.basePrice) + Number(dim.frameCustomerPrice))}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 font-bold">قیمتی برای تخته شاسی ثبت نشده است.</p>
                    )}
                  </div>

                  {dim.description && (
                    <p className="text-[11px] text-slate-600 leading-relaxed font-medium mb-2">
                      {dim.description}
                    </p>
                  )}
                </div>

                <div className="pt-1.5 mt-1.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">شناسه: {dim.id}</span>
                  <span className="text-[10px] font-bold text-slate-500">
                    مرحله ابعاد چاپ
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </section>

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
                  {modalMode === 'create' ? 'افزودن سایز چاپ جدید' : 'ویرایش سایز چاپ'}
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
              <div>
                <label className="block text-slate-700 font-bold mb-1">عنوان سایز *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: سایز بزرگ A4 (۲۰×۳۰)"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">اندازه (سانتی‌متر) *</label>
                  <input
                    type="text"
                    required
                    placeholder="20 x 30 cm"
                    value={form.dimensionsCm}
                    onChange={(e) => setForm({ ...form, dimensionsCm: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 font-mono dir-ltr text-left"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">نسبت ابعاد</label>
                  <input
                    type="text"
                    placeholder="2:3"
                    value={form.aspectRatio}
                    onChange={(e) => setForm({ ...form, aspectRatio: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 font-mono dir-ltr text-left"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">مبلغ این سایز (تومان) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  step={1000}
                  placeholder="165000"
                  value={form.basePrice}
                  onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono font-bold placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 text-left dir-ltr"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  این مبلغ به قیمت پایه نوع چاپ اضافه می‌شود. عدد ۰ یعنی رایگان/هدیه.
                </p>
              </div>

              {/* Internal cost — never shown to the customer */}
              <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200 space-y-1.5">
                <label className="block text-rose-900 font-black mb-0.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  هزینه تمام‌شده (تومان) — فقط مدیر
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  placeholder="93000"
                  value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })}
                  className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono font-bold placeholder-slate-400 focus:outline-none focus:border-rose-400 text-left dir-ltr"
                />
                <p className="text-[10px] text-rose-800 leading-relaxed">
                  این مبلغ صرفاً برای بررسی هزینه‌های داخلی است و در هیچ مرحله‌ای (مرحله ابعاد،
                  پیش‌فاکتور، فاکتور و پنل کاربر) به مشتری نمایش داده نمی‌شود.
                </p>
                {form.costPrice > 0 && (
                  <p className="text-[10px] font-bold text-emerald-700">
                    سود ناخالص این سایز: {formatPrice(form.basePrice - form.costPrice)}
                  </p>
                )}
              </div>

              {/* Optional frame (تخته شاسی) */}
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-1.5 text-amber-900 font-black">
                    <Frame className="w-3.5 h-3.5" />
                    تخته شاسی برای این سایز
                  </label>

                  {/* on/off toggle for the customer */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.frameEnabled}
                    onClick={() => setForm({ ...form, frameEnabled: !form.frameEnabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                      form.frameEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                    title={form.frameEnabled ? 'تخته شاسی برای مشتری نمایش داده می‌شود' : 'تخته شاسی برای مشتری خاموش است'}
                  >
                    <span
                      className={`inline-block h-4.5 w-4.5 h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform ${
                        form.frameEnabled ? '-translate-x-[22px]' : '-translate-x-[3px]'
                      }`}
                    />
                  </button>
                </div>

                <p className="text-[10px] text-amber-800 leading-relaxed">
                  وقتی روشن باشد، قیمت تخته شاسی به مشتری نشان داده می‌شود؛ وقتی خاموش باشد فقط برای
                  محاسبه داخلی ذخیره می‌شود.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">قیمت تخته شاسی (مشتری)</label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      placeholder="120000"
                      value={form.frameCustomerPrice}
                      onChange={(e) => setForm({ ...form, frameCustomerPrice: Number(e.target.value) })}
                      className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono font-bold placeholder-slate-400 focus:outline-none focus:border-amber-400 text-left dir-ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-rose-800 font-bold mb-1 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      قیمت تمام‌شده تخته شاسی
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      placeholder="70000"
                      value={form.frameCostPrice}
                      onChange={(e) => setForm({ ...form, frameCostPrice: Number(e.target.value) })}
                      className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono font-bold placeholder-slate-400 focus:outline-none focus:border-rose-400 text-left dir-ltr"
                    />
                  </div>
                </div>

                {form.frameCustomerPrice > 0 && (
                  <p className="text-[10px] font-bold text-slate-700">
                    مبلغ نهایی مشتری با تخته شاسی: {formatPrice(Number(form.basePrice) + Number(form.frameCustomerPrice))}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">توضیح کوتاه</label>
                <textarea
                  rows={2}
                  placeholder="مناسب آلبوم خاطرات و تخته شاسی‌های کوچک رومیزی"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 leading-relaxed"
                />
              </div>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.popular}
                  onChange={(e) => setForm({ ...form, popular: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700">
                  نمایش برچسب «محبوب» روی این سایز
                </span>
              </label>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 active:scale-95 text-white text-xs font-bold px-4 py-3 rounded-xl transition-all shadow-md shadow-sky-500/20 cursor-pointer"
                >
                  {modalMode === 'create' ? 'افزودن سایز' : 'ذخیره تغییرات'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {targetForDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-slate-900">حذف سایز «{targetForDelete.title}»</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              آیا از حذف این سایز مطمئن هستید؟ این عملیات قابل بازگشت نیست.
            </p>

            {deleteUsage.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                این سایز در {deleteUsage.length} نوع چاپ فعال است (
                {deleteUsage.map((pt) => pt.title).join('، ')}). با حذف، از آن کارت‌ها هم برداشته
                می‌شود.
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (deletingId) onDeleteDimension(deletingId);
                  setDeletingId(null);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold px-4 py-3 rounded-xl transition-all cursor-pointer"
              >
                بله، حذف کن
              </button>
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
