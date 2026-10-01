import React, { useState } from 'react';
import {
  Network,
  RefreshCw,
  Search,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  Edit2,
  X
} from 'lucide-react';
import { ApiConnection, ApiProvider } from '../../types';
import { formatNumber } from '../../utils/formatters';

interface ApiManagerProps {
  apis: ApiConnection[];
  onUpdateApi: (updated: ApiConnection) => void;
}

export const ApiManager: React.FC<ApiManagerProps> = ({ apis, onUpdateApi }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [testingId, setTestingId] = useState<number | null>(null);
  const [visibleKeyId, setVisibleKeyId] = useState<number | null>(null);
  const [editingApi, setEditingApi] = useState<ApiConnection | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filteredApis = apis.filter((api) => {
    const matchesSearch =
      api.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.model.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterStatus === 'active') return matchesSearch && api.isEnabled;
    if (filterStatus === 'inactive') return matchesSearch && !api.isEnabled;
    return matchesSearch;
  });

  const handleTestConnection = (api: ApiConnection) => {
    setTestingId(api.id);

    setTimeout(() => {
      const simulatedLatency = Math.floor(Math.random() * 250) + 90;
      onUpdateApi({
        ...api,
        status: 'connected',
        latencyMs: simulatedLatency,
        lastPing: 'هم‌اکنون'
      });
      setTestingId(null);
    }, 800);
  };

  const handleToggleEnable = (api: ApiConnection) => {
    onUpdateApi({
      ...api,
      isEnabled: !api.isEnabled,
      status: !api.isEnabled ? 'connected' : 'disconnected'
    });
  };

  const handleCopyKey = (id: number, key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApi) return;
    onUpdateApi(editingApi);
    setEditingApi(null);
  };

  const activeCount = apis.filter((a) => a.isEnabled).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600 rounded-2xl sm:rounded-3xl p-4 sm:p-7 relative overflow-hidden shadow-lg shadow-sky-600/15 text-white">
        <div className="absolute top-0 left-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 border border-white/20 text-white flex items-center justify-center flex-shrink-0 backdrop-blur-xs">
              <Network className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl lg:text-2xl font-black text-white">
                  مدیریت ۱۰ API مجزای سیستم
                </h1>
                <span className="text-[11px] sm:text-xs font-mono px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold border border-white/30 backdrop-blur-xs">
                  {activeCount}/۱۰ فعال
                </span>
              </div>
              <p className="text-xs sm:text-sm text-sky-100 mt-0.5 leading-relaxed">
                مانیتورینگ و اتصال همزمان سرویس‌های هوش مصنوعی، پرداخت و پیامک
              </p>
            </div>
          </div>

          {/* Stats pills */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white/15 border border-white/20 text-right backdrop-blur-xs">
              <span className="text-sky-100 block text-[10px]">درخواست‌های ماه:</span>
              <span className="font-mono font-bold text-white text-xs sm:text-sm">
                {formatNumber(apis.reduce((acc, a) => acc + a.requestsCount, 0))}
              </span>
            </div>
            <div className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white/15 border border-white/20 text-right backdrop-blur-xs">
              <span className="text-sky-100 block text-[10px]">میانگین پینگ:</span>
              <span className="font-mono font-bold text-emerald-200 text-xs sm:text-sm">
                ۲۱۰ ms
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="جستجو در میان ۱۰ API..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 pr-9 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            همه ({apis.length})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterStatus === 'active'
                ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            فعال ({activeCount})
          </button>
          <button
            onClick={() => setFilterStatus('inactive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterStatus === 'inactive'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            غیرفعال
          </button>
        </div>
      </div>

      {/* 10 APIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
        {filteredApis.map((api) => {
          const isTesting = testingId === api.id;
          const isKeyVisible = visibleKeyId === api.id;
          const percentUsed = Math.min(100, Math.round((api.requestsCount / api.quotaLimit) * 100));

          return (
            <div
              key={api.id}
              className={`bg-white border rounded-2xl p-4 sm:p-5 transition-all flex flex-col justify-between shadow-xs ${
                api.isEnabled
                  ? 'border-slate-200 hover:border-sky-300 hover:shadow-md'
                  : 'border-slate-200/60 opacity-60 bg-slate-50/50'
              }`}
            >
              <div>
                {/* Top line: Slot # & Status */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 font-mono text-xs font-black flex items-center justify-center flex-shrink-0 border border-sky-100">
                      #{api.id}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{api.name}</h3>
                  </div>

                  {/* Toggle enable switch */}
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={api.isEnabled}
                      onChange={() => handleToggleEnable(api)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-sky-500 peer-checked:to-emerald-500" />
                  </label>
                </div>

                <p className="text-[11px] sm:text-xs text-slate-600 mb-3 leading-relaxed line-clamp-2">
                  {api.description}
                </p>

                {/* API Details Box */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 mb-3 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[11px] text-slate-500 font-sans font-medium">پرووایدر:</span>
                    <span className="text-slate-800 text-[11px] font-bold">{api.provider}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[11px] text-slate-500 font-sans font-medium">مدل / سرویس:</span>
                    <span className="text-sky-700 font-bold text-[11px]">{api.model}</span>
                  </div>

                  {/* Endpoint */}
                  <div className="flex items-center justify-between text-slate-600 gap-2">
                    <span className="text-[11px] text-slate-500 font-sans font-medium flex-shrink-0">Endpoint:</span>
                    <span className="text-slate-600 text-[10px] truncate max-w-[130px] sm:max-w-[200px] dir-ltr text-left font-sans">
                      {api.endpoint}
                    </span>
                  </div>

                  {/* Masked API Key */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                    <span className="text-[11px] text-slate-500 font-sans font-medium">کلید API:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-700 text-[10px] sm:text-[11px] font-mono font-bold">
                        {isKeyVisible
                          ? api.apiKey
                          : api.apiKey.slice(0, 4) + '••••' + api.apiKey.slice(-3)}
                      </span>
                      <button
                        onClick={() => setVisibleKeyId(isKeyVisible ? null : api.id)}
                        className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                        title={isKeyVisible ? 'مخفی کردن' : 'نمایش'}
                      >
                        {isKeyVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleCopyKey(api.id, api.apiKey)}
                        className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                        title="کپی"
                      >
                        {copiedId === api.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quota Progress */}
                <div className="space-y-1 mb-3">
                  <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
                    <span className="text-slate-500 font-medium">مصرف سهمیه:</span>
                    <span className="font-mono text-slate-700 font-bold">
                      {formatNumber(api.requestsCount)} / {formatNumber(api.quotaLimit)} ({percentUsed}٪)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        percentUsed > 80
                          ? 'bg-red-500'
                          : percentUsed > 50
                          ? 'bg-amber-500'
                          : 'bg-gradient-to-r from-sky-500 to-emerald-500'
                      }`}
                      style={{ width: `${percentUsed}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Actions: Ping, Status & Edit */}
              <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs min-w-0">
                  {api.isEnabled ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px] truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                      <span>{api.latencyMs ? `${api.latencyMs}ms` : 'آنلاین'}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-400 text-[11px] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                      <span>غیرفعال</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setEditingApi(api)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="ویرایش"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleTestConnection(api)}
                    disabled={isTesting || !api.isEnabled}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 disabled:opacity-40 text-[11px] font-bold text-slate-800 transition-all flex items-center gap-1 cursor-pointer border border-slate-200"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin text-sky-600' : ''}`} />
                    <span>{isTesting ? 'پینگ...' : 'تست'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit API Modal */}
      {editingApi && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sky-600 text-xs sm:text-sm font-black">#{editingApi.id}</span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">ویرایش {editingApi.name}</h3>
              </div>
              <button
                onClick={() => setEditingApi(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">نام سرویس / برچسب</label>
                <input
                  type="text"
                  value={editingApi.name}
                  onChange={(e) => setEditingApi({ ...editingApi, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">پرووایدر</label>
                <input
                  type="text"
                  value={editingApi.provider}
                  onChange={(e) => setEditingApi({ ...editingApi, provider: e.target.value as ApiProvider })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">مدل یا شناسه سرویس</label>
                <input
                  type="text"
                  value={editingApi.model}
                  onChange={(e) => setEditingApi({ ...editingApi, model: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">آدرس Endpoint</label>
                <input
                  type="text"
                  value={editingApi.endpoint}
                  onChange={(e) => setEditingApi({ ...editingApi, endpoint: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono dir-ltr text-left focus:bg-white focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">کلید دسترسی (API Key)</label>
                <input
                  type="text"
                  value={editingApi.apiKey}
                  onChange={(e) => setEditingApi({ ...editingApi, apiKey: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:border-sky-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingApi(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-bold cursor-pointer shadow-xs"
                >
                  ذخیره
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
