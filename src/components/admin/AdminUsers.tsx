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
  UserPlus,
  Send,
  MessageCircle,
  UserCog,
  Building2,
  MapPin
} from 'lucide-react';
import { User, UserCategory } from '../../types';
import { formatNumber } from '../../utils/formatters';

interface AdminUsersProps {
  showToast: (msg: string) => void;
}

const emptyForm = {
  id: '',
  name: '',
  phone: '',
  password: '',
  role: 'user' as 'admin' | 'user',
  category: 'customer' as UserCategory,
  telegramId: '',
  eitaaId: '',
  guildName: '',
  address: '',
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
  const [categoryFilter, setCategoryFilter] = useState<'all' | UserCategory>('all');

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

  const userCategory = (u: User): UserCategory => (u.category === 'colleague' ? 'colleague' : 'customer');

  const counts = useMemo(() => {
    const customers = users.filter((u) => userCategory(u) === 'customer').length;
    return { all: users.length, customer: customers, colleague: users.length - customers };
  }, [users]);

  const filtered = useMemo(() => {
    const q = query.trim().replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    const byCategory = users.filter(
      (u) => categoryFilter === 'all' || userCategory(u) === categoryFilter
    );
    if (!q) return byCategory;
    return byCategory.filter(
      (u) =>
        (u.name || '').includes(query.trim()) ||
        String(u.phone || '').includes(q) ||
        String(u.telegramId || '').includes(q) ||
        String(u.eitaaId || '').includes(q)
    );
  }, [users, query, categoryFilter]);

  const openEdit = (user: User) => {
    setEditing({
      id: user.id,
      name: user.name || '',
      phone: user.phone || '',
      password: user.password || '',
      role: (user.role === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
      category: userCategory(user),
      telegramId: user.telegramId || '',
      eitaaId: user.eitaaId || '',
      guildName: user.guildName || '',
      address: user.address || '',
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
          role: editing.category === 'colleague' ? 'user' : editing.role,
          category: editing.category,
          telegramId: editing.category === 'colleague' ? editing.telegramId.trim() : '',
          eitaaId: editing.category === 'colleague' ? editing.eitaaId.trim() : '',
          guildName: editing.category === 'colleague' ? editing.guildName.trim() : '',
          address: editing.category === 'colleague' ? editing.address.trim() : '',
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
      const isColleague = creating.category === 'colleague';
      const newUser: User = {
        id: 'usr-' + Date.now(),
        name: creating.name.trim(),
        phone,
        password: creating.password,
        role: isColleague ? 'user' : creating.role,
        category: creating.category,
        telegramId: isColleague ? creating.telegramId.trim() : undefined,
        eitaaId: isColleague ? creating.eitaaId.trim() : undefined,
        guildName: isColleague ? creating.guildName.trim() : undefined,
        address: isColleague ? creating.address.trim() : undefined,
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
      showToast(isColleague ? 'همکار جدید اضافه شد.' : 'کاربر اضافه شد.');
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
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Users className="w-4 h-4 text-sky-600 flex-shrink-0" />
            <h2 className="text-sm font-black text-slate-900">مدیریت کاربران</h2>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-lg bg-slate-100 text-slate-600">
              {users.length}
            </span>
          </div>
          <button
            onClick={() =>
              setCreating({ ...emptyForm, id: '', role: 'user', category: 'customer', walletBalance: 0 })
            }
            title="افزودن کاربر یا همکار (انتخاب دسته در فرم)"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black text-white bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            افزودن کاربر
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all' as const, label: 'همه', count: counts.all, icon: Users },
              { id: 'customer' as const, label: 'مشتریان', count: counts.customer, icon: Users },
              { id: 'colleague' as const, label: 'همکاران', count: counts.colleague, icon: UserCog }
            ].map((tab) => {
              const TabIcon = tab.icon;
              const active = categoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                    active
                      ? 'bg-gradient-to-r from-sky-50 to-emerald-50 text-sky-800 border-sky-300 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span className="font-mono text-[10px] px-1.5 rounded-md bg-white/70 border border-slate-200">
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64 sm:mr-auto">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی نام، شماره، تلگرام یا ایتا"
              className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
          </div>
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
                <th className="px-4 py-3">دسته</th>
                <th className="px-4 py-3">تلگرام / ایتا</th>
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
                    <td className="px-4 py-3">
                      {userCategory(user) === 'colleague' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-lg">
                          <UserCog className="w-3 h-3" />
                          همکار
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                          مشتری
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(
                        <div className="space-y-1">
                          {user.telegramId ? (
                            <span className="flex items-center gap-1 text-[10px] font-mono text-sky-700" dir="ltr">
                              <Send className="w-3 h-3" />
                              {user.telegramId}
                            </span>
                          ) : null}
                          {user.eitaaId ? (
                            <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-700" dir="ltr">
                              <MessageCircle className="w-3 h-3" />
                              {user.eitaaId}
                            </span>
                          ) : null}
                          {!user.telegramId && !user.eitaaId && !user.guildName && !user.address && (
                            <span className="text-[10px] text-slate-400">ثبت نشده</span>
                          )}
                          {user.guildName && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-700 font-bold max-w-[180px] truncate">
                              <Building2 className="w-3 h-3 flex-shrink-0 text-amber-600" />
                              <span className="truncate">{user.guildName}</span>
                            </span>
                          )}
                          {user.address && (
                            <span
                              className="flex items-start gap-1 text-[10px] text-slate-500 max-w-[180px]"
                              title={user.address}
                            >
                              <MapPin className="w-3 h-3 flex-shrink-0 text-rose-500 mt-0.5" />
                              <span className="truncate">{user.address}</span>
                            </span>
                          )}
                          {user.registeredVia && !user.telegramId && !user.eitaaId && (
                            <span className="text-[10px] text-slate-500">
                              ثبت‌نام از {user.registeredVia === 'telegram' ? 'تلگرام' : 'ایتا'}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-700">
                      {formatNumber(user.walletBalance || 0)}
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
                        {!isAdmin && (
                          <button
                            onClick={() => setDeletingId(user.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            حذف
                          </button>
                        )}
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
                  {isAdmin ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded-lg">
                      <ShieldCheck className="w-3 h-3" />
                      ادمین
                    </span>
                  ) : userCategory(user) === 'colleague' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-lg">
                      <UserCog className="w-3 h-3" />
                      همکار
                    </span>
                  ) : null}
                </div>

                {(user.telegramId || user.eitaaId) && (
                  <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
                    {user.telegramId && (
                      <span className="inline-flex items-center gap-1 text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded-md" dir="ltr">
                        <Send className="w-3 h-3" />
                        {user.telegramId}
                      </span>
                    )}
                    {user.eitaaId && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md" dir="ltr">
                        <MessageCircle className="w-3 h-3" />
                        {user.eitaaId}
                      </span>
                    )}
                  </div>
                )}

                {!user.telegramId && !user.eitaaId && user.registeredVia && (
                  <p className="text-[10px] text-slate-500">
                    ثبت‌نام از {user.registeredVia === 'telegram' ? 'تلگرام' : 'ایتا'}
                  </p>
                )}

                {userCategory(user) === 'colleague' && (user.guildName || user.address) && (
                  <div className="space-y-1 text-[10px]">
                    {user.guildName && (
                      <p className="flex items-center gap-1 text-slate-700 font-bold">
                        <Building2 className="w-3 h-3 text-amber-600 flex-shrink-0" />
                        <span className="truncate">{user.guildName}</span>
                      </p>
                    )}
                    {user.address && (
                      <p className="flex items-start gap-1 text-slate-500">
                        <MapPin className="w-3 h-3 text-rose-500 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{user.address}</span>
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 text-[11px] text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-mono">
                      {formatNumber(user.walletBalance || 0)}
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
                  {!isAdmin ? (
                    <button
                      onClick={() => setDeletingId(user.id)}
                      className="inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      حذف
                    </button>
                  ) : (
                    <span className="inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold text-slate-400 bg-slate-50 border border-slate-200 cursor-not-allowed">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      ادمین
                    </span>
                  )}
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
                <label className="text-[11px] font-bold text-slate-700 block mb-1">دسته کاربر</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'customer' as const, label: 'مشتری', icon: Users },
                    { id: 'colleague' as const, label: 'همکار', icon: UserCog }
                  ].map((opt) => {
                    const OptIcon = opt.icon;
                    const active = editing.category === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setEditing({
                          ...editing,
                          category: opt.id,
                          role: opt.id === 'colleague' ? 'user' : editing.role
                        })}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                          active
                            ? 'bg-sky-50 border-sky-300 text-sky-800'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <OptIcon className="w-3.5 h-3.5" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {editing.category === 'colleague' && (
                <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 space-y-2.5">
                  <p className="text-[10px] font-bold text-teal-900">
                    شناسه‌های ارتباطی همکار (فقط برای مدیر نمایش داده می‌شود)
                  </p>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                      <Send className="w-3 h-3 text-sky-600" />
                      شناسه تلگرام
                    </label>
                    <input
                      value={editing.telegramId}
                      onChange={(e) => setEditing({ ...editing, telegramId: e.target.value })}
                      dir="ltr"
                      placeholder="@username یا 123456789"
                      className="w-full px-3 py-2 rounded-xl border border-teal-200 bg-white text-xs font-mono focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                      <MessageCircle className="w-3 h-3 text-emerald-600" />
                      شناسه ایتا
                    </label>
                    <input
                      value={editing.eitaaId}
                      onChange={(e) => setEditing({ ...editing, eitaaId: e.target.value })}
                      dir="ltr"
                      placeholder="eitaa id"
                      className="w-full px-3 py-2 rounded-xl border border-teal-200 bg-white text-xs font-mono focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-sky-600" />
                      نام صنف
                    </label>
                    <input
                      value={editing.guildName}
                      onChange={(e) => setEditing({ ...editing, guildName: e.target.value })}
                      placeholder="مثال: آتلیه عکاسی نگین"
                      className="w-full px-3 py-2 rounded-xl border border-teal-200 bg-white text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      آدرس
                    </label>
                    <textarea
                      rows={2}
                      value={editing.address}
                      onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                      placeholder="استان، شهر، خیابان، پلاک..."
                      className="w-full px-3 py-2 rounded-xl border border-teal-200 bg-white text-xs focus:outline-none focus:border-teal-500 resize-none"
                    />
                  </div>
                </div>
              )}

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
                    disabled={editing.category === 'colleague'}
                    onChange={(e) =>
                      setEditing({ ...editing, role: e.target.value as 'admin' | 'user' })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-sky-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="user">کاربر</option>
                    <option value="admin">ادمین</option>
                  </select>
                  {editing.category === 'colleague' && (
                    <p className="text-[10px] text-teal-700 font-bold mt-1">
                      همکار همیشه نقش «کاربر» دارد.
                    </p>
                  )}
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
                {creating.category === 'colleague' ? (
                  <UserCog className="w-4 h-4 text-teal-600" />
                ) : (
                  <UserPlus className="w-4 h-4 text-sky-600" />
                )}
                {creating.category === 'colleague' ? 'افزودن همکار جدید' : 'افزودن کاربر'}
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
                <label className="text-[11px] font-bold text-slate-700 block mb-1">دسته کاربر</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'customer' as const, label: 'مشتری', icon: Users },
                    { id: 'colleague' as const, label: 'همکار', icon: UserCog }
                  ].map((opt) => {
                    const OptIcon = opt.icon;
                    const active = creating.category === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setCreating({
                          ...creating,
                          category: opt.id,
                          role: opt.id === 'colleague' ? 'user' : creating.role
                        })}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                          active
                            ? 'bg-sky-50 border-sky-300 text-sky-800'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <OptIcon className="w-3.5 h-3.5" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {creating.category === 'colleague' && (
                <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 space-y-2.5">
                  <p className="text-[10px] font-bold text-teal-900">
                    شناسه‌های ارتباطی همکار (فقط برای مدیر نمایش داده می‌شود)
                  </p>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                      <Send className="w-3 h-3 text-sky-600" />
                      شناسه تلگرام
                    </label>
                    <input
                      value={creating.telegramId}
                      onChange={(e) => setCreating({ ...creating, telegramId: e.target.value })}
                      dir="ltr"
                      placeholder="@username یا 123456789"
                      className="w-full px-3 py-2 rounded-xl border border-teal-200 bg-white text-xs font-mono focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                      <MessageCircle className="w-3 h-3 text-emerald-600" />
                      شناسه ایتا
                    </label>
                    <input
                      value={creating.eitaaId}
                      onChange={(e) => setCreating({ ...creating, eitaaId: e.target.value })}
                      dir="ltr"
                      placeholder="eitaa id"
                      className="w-full px-3 py-2 rounded-xl border border-teal-200 bg-white text-xs font-mono focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-sky-600" />
                      نام صنف
                    </label>
                    <input
                      value={creating.guildName}
                      onChange={(e) => setCreating({ ...creating, guildName: e.target.value })}
                      placeholder="مثال: آتلیه عکاسی نگین"
                      className="w-full px-3 py-2 rounded-xl border border-teal-200 bg-white text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      آدرس
                    </label>
                    <textarea
                      rows={2}
                      value={creating.address}
                      onChange={(e) => setCreating({ ...creating, address: e.target.value })}
                      placeholder="استان، شهر، خیابان، پلاک..."
                      className="w-full px-3 py-2 rounded-xl border border-teal-200 bg-white text-xs focus:outline-none focus:border-teal-500 resize-none"
                    />
                  </div>
                </div>
              )}

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
                    disabled={creating.category === 'colleague'}
                    onChange={(e) =>
                      setCreating({ ...creating, role: e.target.value as 'admin' | 'user' })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-sky-500 disabled:opacity-60 disabled:cursor-not-allowed"
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
