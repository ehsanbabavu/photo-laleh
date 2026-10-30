import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Bike,
  Package,
  MapPin,
  Clock,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { DeliveryMethod } from '../../types';
import { formatPrice } from '../../utils/formatters';

interface AdminTransportProps {
  deliveryMethods: DeliveryMethod[];
  onAdd: (method: DeliveryMethod) => void;
  onUpdate: (method: DeliveryMethod) => void;
  onDelete: (id: string) => void;
  showToast?: (msg: string) => void;
}

const emptyForm = {
  id: '',
  title: '',
  subtitle: '',
  price: 0,
  eta: '',
  requiresAddress: false,
  isEnabled: true
};

const ICON_BY_ID: Record<string, typeof Truck> = {
  peyk: Bike,
  pishtaz: Package
};

export const AdminTransport: React.FC<AdminTransportProps> = ({
  deliveryMethods,
  onAdd,
  onUpdate,
  onDelete,
  showToast
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState('');

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError('');
    setIsFormOpen(true);
  };

  const openEdit = (method: DeliveryMethod) => {
    setEditingId(method.id);
    setForm({
      id: method.id,
      title: method.title,
      subtitle: method.subtitle || '',
      price: Number(method.price) || 0,
      eta: method.eta || '',
      requiresAddress: method.requiresAddress === true,
      isEnabled: method.isEnabled !== false
    });
    setError('');
    setIsFormOpen(true);
  };

  const submit = () => {
    if (!form.title.trim()) {
      setError('عنوان روش تحویل را وارد کنید.');
      return;
    }
    if (!Number.isFinite(Number(form.price)) || Number(form.price) < 0) {
      setError('هزینه ارسال نامعتبر است.');
      return;
    }

    const payload: DeliveryMethod = {
      id: editingId || `ship-${Date.now()}`,
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      price: Math.max(0, Math.round(Number(form.price) || 0)),
      eta: form.eta.trim(),
      requiresAddress: form.requiresAddress,
      isEnabled: form.isEnabled
    };

    if (editingId) onUpdate(payload);
    else onAdd(payload);
    showToast?.(editingId ? 'روش تحویل ویرایش شد.' : 'روش تحویل جدید اضافه شد.');
    setIsFormOpen(false);
  };

  const toggleEnabled = (method: DeliveryMethod) => {
    onUpdate({ ...method, isEnabled: method.isEnabled === false });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center flex-shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900">ترابری و روش‌های تحویل</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              روش‌ها و هزینه‌هایی که در مرحله صدور فاکتور سفارش به مشتری نشان داده می‌شود
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors cursor-pointer flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>روش جدید</span>
        </button>
      </div>

      {deliveryMethods.length === 0 && (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center">
          <Truck className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="mt-2 text-xs text-slate-500">
            هنوز روش تحویلی ثبت نشده. با دکمه «روش جدید» اضافه کن.
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        {deliveryMethods.map((method) => {
          const Icon = ICON_BY_ID[method.id] || Truck;
          const enabled = method.isEnabled !== false;
          return (
            <div
              key={method.id}
              className={`bg-white border rounded-2xl p-3.5 sm:p-4 flex items-start gap-3 transition-colors ${
                enabled ? 'border-slate-200' : 'border-slate-200/70 opacity-70'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs sm:text-sm font-black text-slate-900">{method.title}</p>
                  <span className="text-[10px] font-mono text-slate-400" dir="ltr">
                    {method.id}
                  </span>
                  {!enabled && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      غیرفعال
                    </span>
                  )}
                </div>

                {method.subtitle && (
                  <p className="text-[11px] text-slate-500 mt-1 leading-6">{method.subtitle}</p>
                )}

                <div className="mt-1.5 flex items-center gap-3 flex-wrap text-[10px] sm:text-[11px]">
                  <span className="font-bold text-emerald-700">{formatPrice(method.price)}</span>
                  {method.eta && (
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Clock className="w-3 h-3" />
                      {method.eta}
                    </span>
                  )}
                  {method.requiresAddress && (
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <MapPin className="w-3 h-3" />
                      نیاز به آدرس گیرنده
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => toggleEnabled(method)}
                  title={enabled ? 'غیرفعال کردن' : 'فعال کردن'}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  {enabled ? (
                    <ToggleRight className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-5 h-5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(method)}
                  title="ویرایش"
                  className="p-2 rounded-lg text-sky-600 hover:bg-sky-50 cursor-pointer"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`روش تحویل «${method.title}» حذف شود؟`)) {
                      onDelete(method.id);
                      showToast?.('روش تحویل حذف شد.');
                    }
                  }}
                  title="حذف"
                  className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 space-y-3 max-h-[92vh] overflow-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">
                {editingId ? 'ویرایش روش تحویل' : 'افزودن روش تحویل'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-700">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">عنوان *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="مثال: پیک اکسپرس (تحویل فوری)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">توضیح کوتاه</label>
                <input
                  type="text"
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  placeholder="مثال: ارسال با پیک موتوری در همان روز"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    هزینه ارسال (تومان) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono focus:bg-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    زمان تحویل
                  </label>
                  <input
                    type="text"
                    value={form.eta}
                    onChange={(e) => setForm({ ...form, eta: e.target.value })}
                    placeholder="مثال: ۲ تا ۴ روز کاری"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <span className="text-[11px] font-bold text-slate-700">نیاز به آدرس گیرنده</span>
                  <input
                    type="checkbox"
                    checked={form.requiresAddress}
                    onChange={(e) => setForm({ ...form, requiresAddress: e.target.checked })}
                    className="w-4 h-4 rounded text-sky-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <span className="text-[11px] font-bold text-slate-700">فعال</span>
                  <input
                    type="checkbox"
                    checked={form.isEnabled}
                    onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={submit}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{editingId ? 'ذخیره تغییرات' : 'افزودن'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
