import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Search,
  Pencil,
  Trash2,
  ShieldCheck,
  X,
  Save,
  Loader2,
  Wallet,
  CalendarDays,
  Plus,
  UserPlus
} from 'lucide-react';
import { User } from '../../types';

interface AdminUsersProps {
  showToast: (msg: string) => void;
}

const emptyForm = {
  id: '',
  name: '',
  phone: '',
  password: '',
  role: 'user' as 'admin' | 'user',
  walletBalance: 0
};

export const AdminUsers: React.FC<AdminUsersProps> = ({ showToast }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<typeof emptyForm | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [creating, setCreating] = useState<typeof emptyForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    if (!q) return users;
    return users.filter(
      (u) => (u.name || '').includes(query.trim()) || String(u.phone || '').includes(q)
    );
  }, [users, query]);

  const openEdit = (user: User) => {
    setEditing({
      id: user.id,
      name: user.name || '',
      phone: user.phone || '',
      password: user.password || '',
      role: (user.role === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
      walletBalance: user.walletBalance || 0
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.phone.trim()) {
      showToast('نام و شماره موبایل الزامی است.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editing.name.trim(),
          phone: editing.phone.trim(),
          password: editing.password,
          role: editing.role,
          walletBalance: Number(editing.walletBalance) || 0
        })
      });
      if (!res.ok) throw new Error('save failed');
      setEditing(null);
      await load();
      showToast('کاربر ویرایش شد.');
    } catch {
      showToast('ویرایش کاربر ناموفق بود.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!creating) return;
    const phone = creating.phone.trim();
    if (!creating.name.trim() || !phone) {
      showToast('نام و شماره موبایل الزامی است.');
      return;
    }
    if (!/^09\d{9}$/.test(phone)) {
      showToast('شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.');
      return;
    }
    if (users.some((u) => String(u.phone || '') === phone)) {
      showToast('این شماره موبایل قبلاً ثبت شده است.');
      return;
    }
    setIsSaving(true);
    try {
      const newUser: User = {
        id: 'usr-' + Date.now(),
        name: creating.name.trim(),
        phone,
        password: creating.password,
        role: creating.role,
        createdAt: new Date().toLocaleDateString('fa-IR'),
        walletBalance: Number(creating.walletBalance) || 0,
        hasUsedFirstOrderGift: false
      };
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (!res.ok) throw new Error('create failed');
      setCreating(null);
      await load();
      showToast('کاربر اضافه شد.');
    } catch {
      showToast('افزودن کاربر ناموفق بود.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setDeletingId(null);
      showToast('کاربر حذف شد.');
    } catch {
      showToast('حذف کاربر ناموفق بود.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white border border-slate-200 rounded-2xl p-3 sm:p-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Users className="w-4 h-4 text-sky-600 flex-shrink-0" />
          <h2 className="text-sm font-black text-slate-900">مدیریت کاربران</h2>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-lg bg-slate-100 text-slate-600">
            {users.length}
          </span>
        </div>
        <button
          onClick={() =>
            setCreating({ ...emptyForm, id: '', role: 'user', walletBalance: 0 })
          }
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black text-white bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          افزودن کاربر
        </button>
        <div className="relative w-full sm:w-64">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی نام یا شماره"
            className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-xs text-slate-500">کاربری یافت نشد.</div>
      ) : (
        <>
        <div className="hidden lg:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[11px] font-black text-slate-600">
                <th className="px-4 py-3">نام</th>
                <th className="px-4 py-3">شماره موبایل</th>
                <th className="px-4 py-3">نقش</th>
                <th className="px-4 py-3">کیف پول (تومان)</th>
                <th className="px-4 py-3">تاریخ عضویت</th>
                <th className="px-4 py-3 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const isAdmin = user.role === 'admin';
                return (
                  <tr key={user.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${
                            isAdmin ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {(user.name || '?').trim().charAt(0)}
                        </div>
                        <span className="text-xs font-bold text-slate-900 truncate">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-600" dir="ltr">
                      {user.phone}
                    </td>
                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-lg">
                          <ShieldCheck className="w-3 h-3" />
                          ادمین
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
                          کاربر
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-700">
                      {Number(user.walletBalance || 0).toLocaleString('fa-IR')}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">{user.createdAt || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEdit(user)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          ویرایش
                        </button>
                        <button
                          onClick={() => setDeletingId(user.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 lg:hidden">
          {filtered.map((user) => {
            const isAdmin = user.role === 'admin';
            return (
              <div
                key={user.id}
                className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col gap-2.5"
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black ${
                      isAdmin ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {(user.name || '?').trim().charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-900 truncate">{user.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono" dir="ltr">
                      {user.phone}
                    </p>
                  </div>
                  {isAdmin && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded-lg">
                      <ShieldCheck className="w-3 h-3" />
                      ادمین
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-mono">
                      {Number(user.walletBalance || 0).toLocaleString('fa-IR')}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span dir="ltr">{user.createdAt || '—'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => openEdit(user)}
                    className="inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    ویرایش
                  </button>
                  <button
                    onClick={() => setDeletingId(user.id)}
                    className="inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="w-full sm:max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-black text-slate-900">ویرایش کاربر</h3>
              <button
                onClick={() => setEditing(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">نام</label>
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">شماره موبایل</label>
                <input
                  value={editing.phone}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  dir="ltr"
                  inputMode="numeric"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">رمز عبور</label>
                <input
                  value={editing.password}
                  onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                  dir="ltr"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">نقش</label>
                  <select
                    value={editing.role}
                    onChange={(e) =>
                      setEditing({ ...editing, role: e.target.value as 'admin' | 'user' })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-sky-500"
                  >
                    <option value="user">کاربر</option>
                    <option value="admin">ادمین</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">کیف پول</label>
                  <input
                    value={editing.walletBalance}
                    onChange={(e) =>
                      setEditing({ ...editing, walletBalance: Number(e.target.value) || 0 })
                    }
                    dir="ltr"
                    inputMode="numeric"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-200">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                ذخیره
              </button>
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="w-full sm:max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-sky-600" />
                افزودن کاربر
              </h3>
              <button
                onClick={() => setCreating(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">نام</label>
                <input
                  value={creating.name}
                  onChange={(e) => setCreating({ ...creating, name: e.target.value })}
                  placeholder="نام و نام خانوادگی"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">شماره موبایل</label>
                <input
                  value={creating.phone}
                  onChange={(e) => setCreating({ ...creating, phone: e.target.value })}
                  dir="ltr"
                  inputMode="numeric"
                  placeholder="09123456789"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">رمز عبور</label>
                <input
                  value={creating.password}
                  onChange={(e) => setCreating({ ...creating, password: e.target.value })}
                  dir="ltr"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">نقش</label>
                  <select
                    value={creating.role}
                    onChange={(e) =>
                      setCreating({ ...creating, role: e.target.value as 'admin' | 'user' })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-sky-500"
                  >
                    <option value="user">کاربر</option>
                    <option value="admin">ادمین</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">کیف پول</label>
                  <input
                    value={creating.walletBalance}
                    onChange={(e) =>
                      setCreating({ ...creating, walletBalance: Number(e.target.value) || 0 })
                    }
                    dir="ltr"
                    inputMode="numeric"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-200">
              <button
                onClick={handleCreate}
                disabled={isSaving}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 disabled:opacity-60 cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                افزودن
              </button>
              <button
                onClick={() => setCreating(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="w-full sm:max-w-sm bg-white rounded-2xl border border-slate-200 shadow-xl p-4 space-y-3">
            <p className="text-sm font-black text-slate-900">حذف کاربر؟</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDelete(deletingId)}
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 cursor-pointer"
              >
                حذف
              </button>
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
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
