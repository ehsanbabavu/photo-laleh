import React, { useState } from 'react';
import {
  Bell,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  Eye,
  Check,
  X,
  Volume2
} from 'lucide-react';
import { Announcement } from '../../types';

interface AdminAnnouncementsProps {
  announcements: Announcement[];
  onAddAnnouncement: (ann: Omit<Announcement, 'id' | 'createdAt' | 'readBy'>) => void;
  onUpdateAnnouncement: (ann: Announcement) => void;
  onDeleteAnnouncement: (id: string) => void;
}

export const AdminAnnouncements: React.FC<AdminAnnouncementsProps> = ({
  announcements,
  onAddAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPriority, setFormPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [formIsActive, setFormIsActive] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingId(null);
    setFormTitle('');
    setFormContent('');
    setFormPriority('normal');
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (ann: Announcement) => {
    setEditingId(ann.id);
    setFormTitle(ann.title);
    setFormContent(ann.content);
    setFormPriority(ann.priority || 'normal');
    setFormIsActive(ann.isActive);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    if (editingId) {
      const existing = announcements.find((a) => a.id === editingId);
      if (existing) {
        onUpdateAnnouncement({
          ...existing,
          title: formTitle.trim(),
          content: formContent.trim(),
          priority: formPriority,
          isActive: formIsActive
        });
      }
    } else {
      onAddAnnouncement({
        title: formTitle.trim(),
        content: formContent.trim(),
        priority: formPriority,
        isActive: formIsActive
      });
    }

    setIsModalOpen(false);
  };

  const handleToggleStatus = (ann: Announcement) => {
    onUpdateAnnouncement({
      ...ann,
      isActive: !ann.isActive
    });
  };

  const filteredAnnouncements = announcements.filter((ann) => {
    const matchesSearch =
      ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? ann.isActive
        : !ann.isActive;
    return matchesSearch && matchesStatus;
  });

  const activeCount = announcements.filter((a) => a.isActive).length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Main List Section */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
        {/* Controls: Search, Tabs & Add Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              همه ({announcements.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              فعال ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'inactive'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              غیرفعال ({announcements.length - activeCount})
            </button>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full md:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="جستجو در عنوان یا متن اطلاعیه..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white transition-all"
              />
            </div>

            <button
              type="button"
              onClick={openAddModal}
              className="bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-black px-4 py-2 rounded-xl text-xs transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5 flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت اطلاعیه جدید</span>
            </button>
          </div>
        </div>

        {/* Announcements List */}
        {filteredAnnouncements.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Volume2 className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">اطلاعیه‌ای یافت نشد</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              می‌توانید با زدن دکمه «ثبت اطلاعیه جدید» اولین اعلان استودیو را منتشر نمایید.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAnnouncements.map((ann) => (
              <div
                key={ann.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  ann.isActive
                    ? 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
                    : 'bg-slate-50/70 border-slate-200/60 opacity-75'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-black text-slate-900 leading-snug">
                        {ann.title}
                      </h3>
                      {ann.priority === 'urgent' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                          فوری
                        </span>
                      )}
                      {ann.priority === 'important' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                          مهم
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          ann.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {ann.isActive ? 'فعال در پیشخوان' : 'غیرفعال'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {ann.content}
                    </p>

                    <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {ann.createdAt}
                      </span>
                      {ann.readBy && ann.readBy.length > 0 && (
                        <span className="text-slate-500">
                          مشاهده شده توسط {ann.readBy.length.toLocaleString('fa-IR')} کاربر
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-start flex-shrink-0 pt-2 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(ann)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                        ann.isActive
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                      title={ann.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                    >
                      {ann.isActive ? 'روشن' : 'خاموش'}
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(ann)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-sky-700 transition-colors cursor-pointer border border-slate-200"
                      title="ویرایش اطلاعیه"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(ann.id)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 transition-colors cursor-pointer border border-slate-200"
                      title="حذف اطلاعیه"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Delete confirmation inline */}
                {deleteConfirmId === ann.id && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 text-xs animate-fadeIn">
                    <span className="text-rose-800 font-bold">
                      آیا از حذف این اطلاعیه اطمینان دارید؟
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2.5 py-1 rounded-lg bg-white text-slate-700 border border-slate-200 font-bold hover:bg-slate-50 cursor-pointer"
                      >
                        انصراف
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteAnnouncement(ann.id);
                          setDeleteConfirmId(null);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 cursor-pointer shadow-2xs"
                      >
                        بله، حذف شود
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-base font-black text-slate-900">
                {editingId ? 'ویرایش اطلاعیه' : 'ثبت اطلاعیه جدید'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  عنوان اطلاعیه <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثلاً: تخفیف ویژه چاپ به مناسبت اعیاد..."
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-xs font-bold text-slate-900 outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  متن کامل اطلاعیه <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={4}
                  placeholder="متن کامل و توضیحات اطلاعیه برای کاربران استودیو..."
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-xs text-slate-900 outline-none transition-all resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">اولویت</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-rose-500 bg-white text-xs font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="normal">عادی (اطلاع‌رسانی)</option>
                    <option value="important">مهم (پیشنهاد ویژه / تخفیف)</option>
                    <option value="urgent">فوری (اطلاعیه اضطراری)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">وضعیت نمایش</label>
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer h-[38px]">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer w-4 h-4"
                    />
                    <span className="font-bold text-slate-800">فعال در پیشخوان</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-bold transition-all shadow-md shadow-rose-950/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingId ? 'ذخیره تغییرات' : 'انتشار اطلاعیه'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
