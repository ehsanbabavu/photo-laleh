import React, { useState } from 'react';
import {
  Printer,
  Search,
  MapPin,
  Phone,
  Eye,
  X,
  Trash2,
  LayoutGrid,
  Download,
  Sparkles,
  CheckCircle2,
  FileImage,
  RefreshCw,
  Upload,
  Info,
  Send,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { LostOrder, Order } from '../../types';
import type { PrintImageKey } from '../../types';
import { formatPrice, getStatusBadge, formatOrderDateTime, deriveOrderCreatedAt } from '../../utils/formatters';
import { generateNinePackSheet, downloadImage } from '../../utils/sheetGenerator';
import { getOrderPrintAssets } from '../../utils/orderPrintAssets';
import { QueueStateInfo } from '../../utils/aiQueueManager';
import { PRINT_DIMENSIONS, PAPER_MATERIALS } from '../../data/mockData';
import type { PrintDimension, User } from '../../types';
import { SendToPartnerModal } from './SendToPartnerModal';
import { apiClient } from '../../services/apiClient';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';

interface AdminOrdersProps {
  orders: Order[];
  queueInfo?: QueueStateInfo;
  onUpdateOrderStatus: (orderId: string, newStatus: Order['status']) => void;
  onUpdateOrder?: (updatedOrder: Order) => void;
  onGenerateOrderImage?: (order: Order, asset: 'ai' | 'commercial') => void;
  onDeleteOrder?: (orderId: string) => void;
  onClearAllOrders?: () => void;
  telegramToken?: string;
  telegramChatId?: string;
  /** Admin-managed print sizes (fallback: built-in defaults) */
  dimensions?: PrintDimension[];
}

const formatLostOrderDateTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
};

export const AdminOrders: React.FC<AdminOrdersProps> = ({
  orders,
  queueInfo,
  onUpdateOrderStatus,
  onUpdateOrder,
  onGenerateOrderImage,
  onDeleteOrder,
  onClearAllOrders,
  telegramToken,
  telegramChatId,
  dimensions
}) => {
  const allDimensions: PrintDimension[] =
    dimensions && dimensions.length > 0 ? dimensions : PRINT_DIMENSIONS;
  const resolveDimension = (id?: string) =>
    allDimensions.find((d) => d.id === id) || PRINT_DIMENSIONS.find((d) => d.id === id);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [lostOrders, setLostOrders] = useState<LostOrder[]>([]);
  const [lostOrdersLoading, setLostOrdersLoading] = useState(true);
  const [savingLostOrderIds, setSavingLostOrderIds] = useState<string[]>([]);
  const [lostOrderFollowUpErrors, setLostOrderFollowUpErrors] = useState<Record<string, string>>({});
  const pendingLostOrderUpdates = React.useRef(new Set<string>());
  const lostOrdersVersion = React.useRef(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [generatingSheetId, setGeneratingSheetId] = useState<string | null>(null);
  const [uploadingImageAsset, setUploadingImageAsset] = useState<PrintImageKey | null>(null);
  const imageInputRefs = React.useRef<Record<PrintImageKey, HTMLInputElement | null>>({
    sheet: null,
    ai: null,
    commercial: null
  });
  const [activeImageTab, setActiveImageTab] = useState<'sheet' | 'ai' | 'commercial' | 'original'>('sheet');
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [sentOrderIds, setSentOrderIds] = useState<Record<string, boolean>>({});
  const [partners, setPartners] = useState<User[]>([]);
  const [sendPartnerOrder, setSendPartnerOrder] = useState<Order | null>(null);
  const [partnerToast, setPartnerToast] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);

  const refreshLostOrders = React.useCallback(async (showLoading = false) => {
    if (pendingLostOrderUpdates.current.size > 0) return;
    const version = lostOrdersVersion.current;
    if (showLoading) setLostOrdersLoading(true);
    const data = await apiClient.getLostOrders();
    if (version === lostOrdersVersion.current) setLostOrders(data);
    setLostOrdersLoading(false);
  }, []);

  const updateLostOrderFollowUp = async (order: LostOrder, status: NonNullable<LostOrder['followUpStatus']>) => {
    if (pendingLostOrderUpdates.current.has(order.id) || (order.followUpStatus || 'untracked') === status) return;
    pendingLostOrderUpdates.current.add(order.id);
    lostOrdersVersion.current += 1;
    setSavingLostOrderIds([...pendingLostOrderUpdates.current]);
    setLostOrderFollowUpErrors((current) => ({ ...current, [order.id]: '' }));
    try {
      const response = await fetch(`/api/lost-orders/${encodeURIComponent(order.id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success || data?.lostOrder?.followUpStatus !== status) {
        throw new Error(data?.error || 'ذخیره وضعیت پیگیری ناموفق بود. دوباره تلاش کنید.');
      }
      setLostOrders((current) => current.map((item) => item.id === order.id ? { ...item, followUpStatus: status } : item));
      showToast('وضعیت پیگیری سفارش ذخیره شد.');
    } catch (error) {
      setLostOrderFollowUpErrors((current) => ({
        ...current,
        [order.id]: error instanceof Error && !(error instanceof TypeError)
          ? error.message
          : 'ذخیره وضعیت پیگیری ناموفق بود. اتصال اینترنت را بررسی و دوباره تلاش کنید.'
      }));
    } finally {
      lostOrdersVersion.current += 1;
      pendingLostOrderUpdates.current.delete(order.id);
      setSavingLostOrderIds([...pendingLostOrderUpdates.current]);
    }
  };

  React.useEffect(() => {
    if (statusFilter !== 'lost') return;
    void refreshLostOrders(true);
    const interval = window.setInterval(() => void refreshLostOrders(), 10_000);
    return () => window.clearInterval(interval);
  }, [refreshLostOrders, statusFilter]);

  React.useEffect(() => {
    if (!selectedOrder) return;
    const latestOrder = orders.find((order) => order.id === selectedOrder.id);
    if (latestOrder && latestOrder !== selectedOrder) {
      setSelectedOrder(latestOrder);
    }
  }, [orders, selectedOrder]);

  // Colleagues that can receive print jobs (admin-only endpoint)
  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/users');
        if (!res.ok) return;
        const data = await res.json();
        if (!active || !Array.isArray(data)) return;
        setPartners(
          data.filter((u: any) => u.category === 'colleague' && u.role !== 'admin')
        );
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSendToTelegramPrint = async () => {
    if (!selectedOrder) return;
    const selectedPrintImages =
      selectedOrder.selectedPrintImages ?? getOrderPrintAssets(selectedOrder).map((asset) => asset.key);
    if (selectedPrintImages.length === 0) {
      showToast('ابتدا دست‌کم یک عکس را برای چاپ انتخاب کنید.');
      return;
    }
    const token = telegramToken || '';
    const chatId = telegramChatId || '';

    if (!token || !chatId) {
      showToast?.('لطفاً ابتدا توکن ربات تلگرام و Chat ID را در بخش «اتصال به ربات تلگرام» تنظیم کنید.');
      return;
    }

    setIsSendingTelegram(true);
    try {
      const dimObj = resolveDimension(selectedOrder.dimensionId);
      const materialObj = PAPER_MATERIALS.find((m) => m.id === selectedOrder.materialId);

      const res = await fetch('/api/telegram/send-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: token,
          chatId: chatId,
          order: { ...selectedOrder, selectedPrintImages },
          dimensionTitle: dimObj?.title,
          materialName: materialObj?.name
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast?.('عکس‌های انتخاب‌شده برای چاپ با موفقیت به تلگرام ارسال شدند.');
        setSentOrderIds((prev) => {
          const next = { ...prev, [selectedOrder.id]: true };
          return next;
        });
      } else {
        showToast?.(`خطا در ارسال به تلگرام: ${data.error || 'ناشناخته'}`);
      }
    } catch (err) {
      console.error(err);
      showToast?.('خطا در ارتباط با سرور برای ارسال تلگرام.');
    } finally {
      setIsSendingTelegram(false);
    }
  };
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const requestDeleteOrder = (order: Order) => setDeleteTarget(order);

  const onOrderDeleted = () => {
    if (!deleteTarget) return;
    onDeleteOrder?.(deleteTarget.id);
    if (selectedOrder?.id === deleteTarget.id) setSelectedOrder(null);
    showToast('سفارش با موفقیت حذف شد.');
  };

  const handleMarkAsReadyToShip = (order: Order) => {
    onUpdateOrderStatus(order.id, 'ready_to_ship');
    setSelectedOrder((prev) => (prev ? { ...prev, status: 'ready_to_ship' } : null));
    showToast(`سفارش ${order.trackingCode} به وضعیت «آماده ارسال» تغییر یافت.`);
  };

  const PrintedGlassButton = ({ order }: { order: Order }) => {
    const isReady = order.status === 'ready_to_ship' || order.status === 'delivered';
    return (
      <button
        type="button"
        onClick={() => handleMarkAsReadyToShip(order)}
        className={`absolute bottom-4 left-4 z-20 px-4 py-2.5 rounded-2xl backdrop-blur-md border shadow-xl font-extrabold text-xs transition-all cursor-pointer flex items-center gap-2 ${
          isReady
            ? 'bg-emerald-600/90 text-white border-emerald-400/50 shadow-emerald-500/20'
            : 'bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-white border-white/60 hover:bg-white hover:scale-105'
        }`}
      >
        <CheckCircle2 className={`w-4 h-4 ${isReady ? 'text-white' : 'text-emerald-600'}`} />
        <span>{isReady ? 'چاپ شد (آماده ارسال) ✓' : 'چاپ شد'}</span>
      </button>
    );
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.trackingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerInfo?.phoneNumber?.includes(searchQuery);

    if (statusFilter === 'lost') return false;
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && order.status === statusFilter;
  });

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredLostOrders = lostOrders.filter((order) => {
    if (!normalizedSearch) return true;
    return [
      order.userName,
      order.userPhone,
      order.customerName,
      order.customerPhone,
      order.printTypeTitle,
      order.dimensionTitle,
      order.paymentInvoiceId
    ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
  });

  // Handle generating 9-pack sheet without AI using HTML5 Canvas
  const handleGenerateSheet = async (order: Order) => {
    const imageSource = order.aiProcessedImage || order.uploadedImage;
    if (!imageSource) {
      alert('تصویری برای چیدمان در شیت یافت نشد.');
      return;
    }

    try {
      setGeneratingSheetId(order.id);
      const sheetDataUrl = await generateNinePackSheet(imageSource, {
        paperSize: '10x15'
      });

      const updated: Order = {
        ...order,
        printSheetImage: sheetDataUrl,
        printSheetCreatedAt: new Intl.DateTimeFormat('fa-IR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }).format(new Date())
      };

      if (onUpdateOrder) {
        onUpdateOrder(updated);
      }

      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder(updated);
      }

      showToast(`شیت ۹ تایی عمودی سفارش #${order.trackingCode} با کیفیت ۳۰۰ DPI ایجاد گردید.`);
    } catch (err) {
      console.error('Error generating sheet:', err);
      alert('خطا در ایجاد شیت چاپی. لطفاً مجدداً تلاش نمایید.');
    } finally {
      setGeneratingSheetId(null);
    }
  };

  const handleReplaceImage = async (asset: PrintImageKey, file: File) => {
    if (!selectedOrder) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('فقط فایل JPEG، PNG یا WebP قابل استفاده است.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      showToast('حجم عکس نباید بیشتر از ۱۵ مگابایت باشد.');
      return;
    }

    setUploadingImageAsset(asset);
    try {
      const { upload } = await import('@vercel/blob/client');
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const uploaded = await upload(
        `orders/${selectedOrder.id}/${asset}-${Date.now()}-${safeName}`,
        file,
        {
          access: 'public',
          handleUploadUrl: '/api/uploads/blob',
          contentType: file.type
        }
      );
      const latestOrder = orders.find((order) => order.id === selectedOrder.id) || selectedOrder;
      const replacedAt = new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date());
      const updatedOrder: Order =
        asset === 'sheet'
          ? { ...latestOrder, printSheetImage: uploaded.url, printSheetCreatedAt: replacedAt }
          : asset === 'ai'
          ? {
              ...latestOrder,
              aiProcessedImage: uploaded.url,
              aiStatus: 'completed',
              aiCompletedAt: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
            }
          : {
              ...latestOrder,
              commercialImage: uploaded.url,
              commercialSheet10x15Image: uploaded.url
            };

      setSelectedOrder(updatedOrder);
      onUpdateOrder?.(updatedOrder);
      showToast(`عکس «${asset === 'sheet' ? 'شیت ۹تایی' : asset === 'ai' ? 'خروجی هوش مصنوعی' : 'تبلیغاتی'}» جایگزین شد.`);
    } catch (error) {
      console.error('Failed to replace order image:', error);
      showToast('جایگزینی عکس ناموفق بود. لطفاً دوباره تلاش کنید.');
    } finally {
      setUploadingImageAsset(null);
    }
  };

  const isSelectedOrderQueued = Boolean(
    selectedOrder &&
      (queueInfo?.currentOrderId === selectedOrder.id ||
        queueInfo?.queueList.some((item) => item.orderId === selectedOrder.id))
  );

  const renderOutputActions = (asset: PrintImageKey, imageUrl: string | undefined, fileName: string) => {
    const isGenerating =
      asset === 'sheet'
        ? generatingSheetId === selectedOrder?.id
        : isSelectedOrderQueued;
    const canGenerate =
      asset === 'sheet'
        ? Boolean(selectedOrder?.aiProcessedImage || selectedOrder?.uploadedImage)
        : Boolean(selectedOrder?.uploadedImage && onGenerateOrderImage);
    const generateLabel =
      asset === 'sheet'
        ? 'تولید شیت ۹تایی'
        : asset === 'ai'
        ? 'تولید خروجی هوش مصنوعی'
        : 'تولید عکس تبلیغاتی';

    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          ref={(element) => {
            imageInputRefs.current[asset] = element;
          }}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label={`انتخاب عکس جایگزین برای ${asset}`}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (file) void handleReplaceImage(asset, file);
          }}
        />
        <button
          type="button"
          onClick={() => imageInputRefs.current[asset]?.click()}
          disabled={Boolean(uploadingImageAsset) || isSelectedOrderQueued}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploadingImageAsset === asset ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          {uploadingImageAsset === asset ? 'در حال آپلود...' : 'جایگزین کردن عکس'}
        </button>
        <button
          type="button"
          onClick={() => imageUrl && void downloadImage(imageUrl, fileName)}
          disabled={!imageUrl}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          دانلود عکس
        </button>
        <button
          type="button"
          onClick={() => {
            if (!selectedOrder) return;
            if (asset === 'sheet') {
              void handleGenerateSheet(selectedOrder);
            } else {
              onGenerateOrderImage?.(selectedOrder, asset);
            }
          }}
          disabled={!canGenerate || isGenerating || Boolean(uploadingImageAsset)}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] font-bold text-violet-800 transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {isGenerating ? 'در حال تولید...' : generateLabel}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {deleteTarget && (
        <DeleteConfirmationDialog
          key={deleteTarget.id}
          kind="order"
          recordId={deleteTarget.id}
          onClose={() => setDeleteTarget(null)}
          onConfirmed={onOrderDeleted}
        >
          <p>کد پیگیری: <bdi dir="ltr" className="font-mono font-bold">{deleteTarget.trackingCode || deleteTarget.id}</bdi></p>
          <p>{deleteTarget.userName || '—'} · {formatPrice(deleteTarget.totalPrice)}</p>
        </DeleteConfirmationDialog>
      )}

      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-700 animate-fadeIn text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* AI Queue & Rate-Limit Cooldown Banner */}
      {queueInfo && (
        <div className={`border rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs transition-all ${
          queueInfo.isProcessing
            ? 'bg-sky-500/10 border-sky-300/80'
            : queueInfo.cooldownRemainingSeconds > 0
            ? 'bg-amber-500/10 border-amber-300/80'
            : 'bg-emerald-500/5 border-emerald-200/80'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  queueInfo.isProcessing
                    ? 'bg-sky-400'
                    : queueInfo.cooldownRemainingSeconds > 0
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${
                  queueInfo.isProcessing
                    ? 'bg-sky-500'
                    : queueInfo.cooldownRemainingSeconds > 0
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}></span>
              </span>
              <h3 className="text-xs sm:text-sm font-black text-slate-900">
                وضعیت زنده صف پردازش هوش مصنوعی (Queue Monitor)
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {queueInfo.isProcessing ? (
                <span className="px-2.5 py-1 rounded-xl bg-sky-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-2xs">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>در حال پردازش سفارش #{queueInfo.currentOrderTrackingCode}</span>
                </span>
              ) : queueInfo.cooldownRemainingSeconds > 0 ? (
                <span className="px-2.5 py-1 rounded-xl bg-amber-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-2xs animate-pulse">
                  <span>⏳ فاصله امن هوش مصنوعی: {queueInfo.cooldownRemainingSeconds} ثانیه دیگر</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300">
                  🟢 صف آماده دریافت سفارشات
                </span>
              )}

              <span className="px-2.5 py-1 rounded-xl bg-white text-slate-700 text-[11px] font-bold border border-slate-200 shadow-2xs">
                در انتظار در صف: {queueInfo.pendingCount} سفارش
              </span>
            </div>
          </div>

          {/* Queue Items List */}
          {queueInfo.queueList.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
              <span className="text-slate-600 font-bold">نوبت‌های بعدی در صف:</span>
              {queueInfo.queueList.map((item, idx) => (
                <div
                  key={item.orderId}
                  className="bg-white px-2.5 py-1 rounded-xl border border-slate-200 text-slate-700 font-medium flex items-center gap-1.5 shadow-2xs"
                >
                  <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black flex items-center justify-center font-mono">
                    {idx + 1}
                  </span>
                  <span className="font-bold">{item.userName}</span>
                  <span className="font-mono text-sky-600 text-[11px]">#{item.trackingCode}</span>
                </div>
              ))}
            </div>
          )}

          {queueInfo.cooldownRemainingSeconds > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-amber-800 font-bold">
                <span>فاصله زمانی ۱ دقیقه بین سفارش‌ها جهت عدم دریافت ارور از هوش مصنوعی</span>
                <span>{queueInfo.cooldownRemainingSeconds} ثانیه</span>
              </div>
              <div className="w-full h-1.5 bg-amber-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-1000"
                  style={{ width: `${((60 - queueInfo.cooldownRemainingSeconds) / 60) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            aria-label="جستجو در سفارشات چاپ عکس"
            placeholder="جستجو با نام مشتری، کد پیگیری یا شماره تماس..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 pr-9 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl overflow-x-auto no-scrollbar text-xs">
          {[
            { id: 'all', label: 'همه' },
            { id: 'ai_processing', label: 'پردازش AI' },
            { id: 'printing', label: 'در حال چاپ' },
            { id: 'ready_to_ship', label: 'آماده ارسال' },
            { id: 'delivered', label: 'تحویل شده' },
            {
              id: 'lost',
              label: `سفارشات از دست رفته${lostOrders.length > 0 ? ` (${lostOrders.length.toLocaleString('fa-IR')})` : ''}`
            }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer font-bold ${
                statusFilter === tab.id
                  ? tab.id === 'lost'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {statusFilter === 'lost' && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
              <div>
                <h3 className="text-xs font-black text-rose-900">سفارش‌های رسیده به پرداخت بدون تکمیل تراکنش</h3>
                <p className="mt-0.5 text-[10px] leading-5 text-rose-700 sm:text-[11px]">
                  زمان نمایش‌داده‌شده لحظهٔ اولین ورود کاربر به مرحله پرداخت و بر اساس ساعت سرور است.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void refreshLostOrders(true)}
              disabled={lostOrdersLoading || savingLostOrderIds.length > 0}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-[10px] font-black text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${lostOrdersLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              به‌روزرسانی
            </button>
          </div>

          {lostOrdersLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-10 text-xs font-bold text-slate-500">
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
              در حال دریافت سفارشات از دست رفته...
            </div>
          ) : filteredLostOrders.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs sm:p-12">
              <p className="text-xs text-slate-500 sm:text-sm">سفارش پرداخت‌نشده‌ای با این جستجو یافت نشد.</p>
            </div>
          ) : (
            filteredLostOrders.map((order) => (
              <article
                key={order.id}
                className="flex flex-col gap-4 rounded-2xl border border-rose-200 bg-white p-4 shadow-xs transition-colors hover:border-rose-300 sm:p-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600">
                    <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-xs font-black text-slate-900 sm:text-sm">
                        {order.customerName || order.userName}
                      </h3>
                      <span className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-0.5 text-[9px] font-black text-rose-700 sm:text-[10px]">پرداخت نشده</span>
                      <span className={`rounded-lg border px-2 py-0.5 text-[9px] font-black sm:text-[10px] ${order.followUpStatus === 'tracked' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                        {order.followUpStatus === 'tracked' ? 'پیگیری شده' : 'پیگیری نشده'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 sm:text-[11px]">
                      <span className="flex items-center gap-1" dir="ltr">
                        <Phone className="h-3 w-3 text-slate-400" aria-hidden="true" />
                        {order.customerPhone || order.userPhone || 'بدون شماره'}
                      </span>
                      <span className="font-bold text-slate-700">
                        {order.printTypeTitle || order.printType} · {order.dimensionTitle || order.dimensionId} · {order.quantity.toLocaleString('fa-IR')} عدد
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-slate-500 sm:text-[11px]">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-rose-500" aria-hidden="true" />
                        ورود به پرداخت: {formatLostOrderDateTime(order.reachedPaymentAt)}
                      </span>
                      {order.paymentInvoiceId && (
                        <span className="font-mono text-slate-400" dir="ltr">#{order.paymentInvoiceId}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 text-right lg:border-t-0 lg:pt-0 lg:text-left">
                  <p className="text-[10px] font-bold text-slate-400">مبلغ پرداخت‌نشده</p>
                  <p className="mt-1 text-sm font-black text-rose-700">{formatPrice(order.totalPrice)}</p>
                  <label className="mt-3 flex flex-col gap-1 text-right text-[10px] font-bold text-slate-600">
                    وضعیت پیگیری
                    <select
                      value={order.followUpStatus || 'untracked'}
                      onChange={(event) => void updateLostOrderFollowUp(order, event.target.value as NonNullable<LostOrder['followUpStatus']>)}
                      disabled={savingLostOrderIds.includes(order.id)}
                      aria-label={`وضعیت پیگیری سفارش ${order.customerName || order.userName}`}
                      aria-describedby={lostOrderFollowUpErrors[order.id] ? `follow-up-error-${order.id}` : undefined}
                      className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:cursor-wait disabled:opacity-50"
                    >
                      <option value="untracked">پیگیری نشده</option>
                      <option value="tracked">پیگیری شده</option>
                    </select>
                  </label>
                  {savingLostOrderIds.includes(order.id) && (
                    <p role="status" className="mt-1 flex items-center gap-1 text-[10px] font-bold text-sky-600">
                      <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
                      در حال ذخیره...
                    </p>
                  )}
                  {lostOrderFollowUpErrors[order.id] && (
                    <p id={`follow-up-error-${order.id}`} role="alert" className="mt-1 max-w-xs text-right text-[10px] leading-5 text-rose-700">
                      {lostOrderFollowUpErrors[order.id]}
                    </p>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {/* Orders List */}
      {statusFilter !== 'lost' && <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-xs">
            <p className="text-slate-500 text-xs sm:text-sm">سفارشی با این فیلتر یافت نشد.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isGenerating = generatingSheetId === order.id;
            return (
              <div
                key={order.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 hover:border-sky-300 hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs"
              >
                {/* Left/Main Info */}
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  {/* Photo Thumbnail */}
                  <div
                    onClick={() => {
                      setSelectedOrder(order);
                      setActiveImageTab(order.aiProcessedImage ? 'ai' : 'original');
                    }}
                    className="w-16 h-20 sm:w-20 sm:h-24 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 cursor-pointer group relative shadow-xs"
                  >
                    {order.uploadedImage ? (
                      <img
                        src={order.uploadedImage}
                        alt="عکس چاپ"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Printer className="w-6 h-6" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Eye className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{order.userName}</h3>
                      <span className="text-[10px] sm:text-xs font-mono text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                        #{order.trackingCode}
                      </span>
                    </div>

                    <p className="text-[11px] sm:text-xs text-slate-600">
                      چاپ:{' '}
                      <span className="font-bold text-slate-900">
                        {order.printType === 'personnel'
                          ? 'پرسنلی ۳×۴'
                          : order.printType === 'bw_to_color'
                          ? 'تبدیل سیاه سفید به رنگی'
                          : order.printType === 'memorial'
                          ? 'مراسم ختم'
                          : 'عروسی/نامزدی'}
                      </span>
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px] text-slate-500 pt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{order.customerInfo?.city}</span>
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span className="font-mono">{order.customerInfo?.phoneNumber}</span>
                      </span>
                    </div>

                    {/* Date + time the order was placed */}
                    <div className="flex items-center gap-1 pt-0.5 text-[10px] sm:text-[11px] font-bold text-slate-500">
                      <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span>{formatOrderDateTime(deriveOrderCreatedAt(order), order.date)}</span>
                    </div>

                    {/* Image status indicators */}
                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                          order.hasFrame
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {order.hasFrame ? 'با تخته شاسی' : 'بدون تخته شاسی'}
                      </span>
                      {order.uploadedImage && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium border border-slate-200">
                          عکس اصلی
                        </span>
                      )}
                      {order.aiProcessedImage && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold border border-emerald-200">
                          خروجی AI
                        </span>
                      )}
                      {order.printSheetImage && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold border border-indigo-200 flex items-center gap-1">
                          <LayoutGrid className="w-2.5 h-2.5" />
                          <span>شیت ۹ تایی آماده</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Actions & Status Control */}
                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2 sm:gap-3 border-t lg:border-t-0 pt-2.5 lg:pt-0 border-slate-100">
                  <div className="text-right">
                    <div className="text-xs sm:text-sm font-bold text-slate-900">
                      {formatPrice(order.totalPrice)}
                    </div>
                    <span className="text-[10px] text-emerald-600 font-bold">
                      پرداخت شده
                    </span>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center gap-1.5">
                    <select
                      value={order.status}
                      onChange={(e) => onUpdateOrderStatus(order.id, e.target.value as Order['status'])}
                      className="bg-slate-50 border border-slate-200 text-[11px] sm:text-xs text-slate-800 rounded-xl px-2.5 py-2 focus:outline-none focus:border-sky-500 cursor-pointer min-h-[38px] font-bold"
                    >
                      <option value="pending_review">در انتظار بررسی</option>
                      <option value="ai_processing">پردازش AI</option>
                      <option value="printing">در حال چاپ</option>
                      <option value="ready_to_ship">آماده ارسال</option>
                      <option value="delivered">تحویل داده شده</option>
                    </select>

                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setActiveImageTab(order.aiProcessedImage ? 'ai' : 'original');
                      }}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center border border-slate-200"
                      title="مشاهده جزئیات کامل و گالری تصاویر"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {onDeleteOrder && (
                      <button
                        type="button"
                        onClick={() => { void requestDeleteOrder(order); }}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center border border-rose-200"
                        title="حذف سفارش"
                        aria-label={`حذف سفارش ${order.trackingCode}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>}

      {/* Order Detail Modal with Multi-Image History & 6-Pack Sheet */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative space-y-4 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-sm sm:text-base font-black text-slate-900 truncate">
                  جزئیات و گالری تصاویر سفارش #{selectedOrder.trackingCode}
                </span>
                <span className={`text-[10px] sm:text-xs px-2.5 py-0.5 rounded-lg border font-bold ${getStatusBadge(selectedOrder.status).color}`}>
                  {getStatusBadge(selectedOrder.status).label}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image History Tabs & Viewer */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-5 space-y-3">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-3">
                <div className="grid grid-cols-2 md:flex md:flex-wrap items-stretch md:items-center gap-2 w-full">
                  {/* Tab 1: 9-Pack Sheet */}
                  <button
                    type="button"
                    onClick={() => setActiveImageTab('sheet')}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer text-center ${
                      activeImageTab === 'sheet'
                        ? 'bg-indigo-600 text-white shadow-xs font-black'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>شیت ۹ تایی (۱۰×۱۵)</span>
                    {selectedOrder.printSheetImage && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </button>

                  {/* Tab 2: AI Processed Image */}
                  <button
                    type="button"
                    onClick={() => setActiveImageTab('ai')}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer text-center ${
                      activeImageTab === 'ai'
                        ? 'bg-emerald-600 text-white shadow-xs font-black'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>خروجی هوش مصنوعی</span>
                    {selectedOrder.aiProcessedImage && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </button>

                  {/* Tab 3: Commercial AI Photo 10x15 */}
                  <button
                    type="button"
                    onClick={() => setActiveImageTab('commercial')}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer text-center ${
                      activeImageTab === 'commercial'
                        ? 'bg-purple-600 text-white shadow-xs font-black'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                    <span>عکس تبلیغاتی (۱۰×۱۵)</span>
                    {(selectedOrder.commercialSheet10x15Image || selectedOrder.commercialImage) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </button>

                  {/* Tab 4: Original Uploaded Image */}
                  <button
                    type="button"
                    onClick={() => setActiveImageTab('original')}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer text-center ${
                      activeImageTab === 'original'
                        ? 'bg-sky-600 text-white shadow-xs font-black'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <FileImage className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>عکس اصلی ارسالی</span>
                  </button>
                </div>


              </div>

              {/* Tab Content 1: 9-Pack Sheet */}
              {activeImageTab === 'sheet' && (
                <div className="space-y-3">
                  {selectedOrder.printSheetImage ? (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-800">
                        شیت ۹ عددی ۳×۴ روی کاغذ استاندارد ۱۰×۱۵ سانتی‌متر با کیفیت ۳۰۰ DPI:
                      </p>
                      <div className="bg-slate-900/5 p-3 rounded-2xl border border-slate-200 relative flex items-center justify-center">
                        <img
                          src={selectedOrder.printSheetImage}
                          alt="شیت ۹تایی چاپ"
                          className="max-h-[420px] w-auto object-contain rounded-lg shadow-md border border-white"
                        />
                        <PrintedGlassButton order={selectedOrder} />
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-white border border-slate-200 rounded-xl space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
                        <LayoutGrid className="w-6 h-6" />
                      </div>
                      <div className="max-w-md mx-auto">
                        <h4 className="text-sm font-black text-slate-900">شیت ۹تایی هنوز تولید نشده است</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          عکس خروجی به‌صورت خودکار ۹ بار روی کاغذ عمودی ۱۰×۱۵ چیده می‌شود.
                        </p>
                      </div>
                    </div>
                  )}
                  {renderOutputActions(
                    'sheet',
                    selectedOrder.printSheetImage,
                    `laleh-studio-9pack-sheet-${selectedOrder.trackingCode}.jpg`
                  )}
                </div>
              )}

              {/* Tab Content 2: AI Processed Image */}
              {activeImageTab === 'ai' && (
                <div className="space-y-3">
                  {selectedOrder.aiProcessedImage ? (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-800">
                        تصویر پرسنلی رتوش‌شده توسط هوش مصنوعی:
                      </p>
                      <div className="bg-slate-900/5 p-3 rounded-2xl border border-slate-200 relative flex items-center justify-center">
                        <img
                          src={selectedOrder.aiProcessedImage}
                          alt="خروجی هوش مصنوعی"
                          className="max-h-[380px] w-auto object-contain rounded-lg shadow-md border border-white"
                        />
                        <PrintedGlassButton order={selectedOrder} />
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-white border border-slate-200 rounded-xl">
                      <p className="text-xs text-slate-500">
                        تصویر پردازش‌شده با هوش مصنوعی برای این سفارش ثبت نشده است.
                      </p>
                    </div>
                  )}
                  {renderOutputActions(
                    'ai',
                    selectedOrder.aiProcessedImage,
                    `ai-processed-${selectedOrder.trackingCode}.jpg`
                  )}
                </div>
              )}

              {/* Tab Content 3: Commercial AI Photo 10x15 */}
              {activeImageTab === 'commercial' && (
                <div className="space-y-3">
                  {selectedOrder.commercialSheet10x15Image || selectedOrder.commercialImage ? (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-800">
                        عکس تبلیغاتی در قالب استاندارد ۱۰×۱۵ سانتی‌متر:
                      </p>
                      <div className="bg-slate-900/5 p-3 rounded-2xl border border-slate-200 relative flex items-center justify-center">
                        <img
                          src={selectedOrder.commercialSheet10x15Image || selectedOrder.commercialImage}
                          alt="عکس تبلیغاتی ۱۰×۱۵"
                          className="max-h-[420px] w-auto object-contain rounded-lg shadow-md border border-white"
                        />
                        <PrintedGlassButton order={selectedOrder} />
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-white border border-slate-200 rounded-xl space-y-2">
                      <Sparkles className="w-10 h-10 text-purple-400 mx-auto" />
                      <h4 className="text-xs font-bold text-slate-800">عکس تبلیغاتی این سفارش هنوز آماده نشده است</h4>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                        عکس تبلیغاتی پس از تولید در این بخش نمایش داده می‌شود.
                      </p>
                    </div>
                  )}
                  {renderOutputActions(
                    'commercial',
                    selectedOrder.commercialSheet10x15Image || selectedOrder.commercialImage,
                    `laleh-commercial-10x15-${selectedOrder.trackingCode}.jpg`
                  )}
                </div>
              )}

              {/* Tab Content 4: Original Uploaded Image */}
              {activeImageTab === 'original' && (
                <div className="space-y-3">
                  {selectedOrder.uploadedImage ? (
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                        <span className="font-bold text-slate-800">عکس اولیه ار��الی توسط مشتری:</span>
                        <button
                          type="button"
                          onClick={() =>
                            downloadImage(
                              selectedOrder.uploadedImage!,
                              `original-${selectedOrder.originalImageName || selectedOrder.trackingCode}.jpg`
                            )
                          }
                          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>دانلود عکس اصلی</span>
                        </button>
                      </div>

                      <div className="bg-slate-900/5 p-3 rounded-2xl border border-slate-200 relative flex items-center justify-center">
                        <img
                          src={selectedOrder.uploadedImage}
                          alt="عکس اصلی"
                          className="max-h-[380px] w-auto object-contain rounded-lg shadow-md border border-white"
                        />
                        <PrintedGlassButton order={selectedOrder} />
                      </div>

                      {/* Mobile-only download button under the photo */}
                      <div className="flex sm:hidden justify-center mt-3">
                        <button
                          type="button"
                          onClick={() =>
                            downloadImage(
                              selectedOrder.uploadedImage!,
                              `original-${selectedOrder.originalImageName || selectedOrder.trackingCode}.jpg`
                            )
                          }
                          className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          <span>دانلود عکس اصلی</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-white border border-slate-200 rounded-xl">
                      <p className="text-xs text-slate-500">تصویر اولیه‌ای برای این سفارش موجود نیست.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Technical & Customer Info */}
            {(() => {
              const dimObj = resolveDimension(selectedOrder.dimensionId);
              const materialObj = PAPER_MATERIALS.find((m) => m.id === selectedOrder.materialId);

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="text-sky-700 font-bold block mb-1">اطلاعات فنی و مشخصات سفارش</span>
                    <div className="flex justify-between text-slate-700">
                      <span className="text-slate-500">نوع چاپ:</span>
                      <span className="font-bold">
                        {selectedOrder.printType === 'personnel'
                          ? 'پرسنلی ۳×۴'
                          : selectedOrder.printType === 'bw_to_color'
                          ? 'تبدیل سیاه سفید به رنگی'
                          : selectedOrder.printType === 'memorial'
                          ? 'مراسم ختم'
                          : 'عروسی/نامزدی'}
                      </span>
                    </div>
                    {dimObj && (
                      <div className="flex justify-between text-slate-700">
                        <span className="text-slate-500">پکیج / ابعاد:</span>
                        <span className="font-bold text-slate-900">{dimObj.title}</span>
                      </div>
                    )}
                    {materialObj && (
                      <div className="flex justify-between text-slate-700">
                        <span className="text-slate-500">متریال / جنس:</span>
                        <span className="font-bold text-slate-900">{materialObj.name}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-700">
                      <span className="text-slate-500">تعداد:</span>
                      <span className="font-bold font-mono">{selectedOrder.quantity || 1} سری</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span className="text-slate-500">مجموع هزینه:</span>
                      <span className="font-bold text-slate-900 font-mono">{formatPrice(selectedOrder.totalPrice)}</span>
                    </div>
                  </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <span className="text-emerald-700 font-bold block mb-1">مشخصات گیرنده و آدرس</span>
                <div className="flex justify-between text-slate-700">
                  <span className="text-slate-500">نام:</span>
                  <span className="font-bold">{selectedOrder.customerInfo?.fullName || selectedOrder.userName}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span className="text-slate-500">تلفن:</span>
                  <span className="font-mono font-bold">{selectedOrder.customerInfo?.phoneNumber}</span>
                </div>
                <div className="text-slate-700 pt-1 border-t border-slate-200">
                  <span className="text-slate-500 block mb-0.5">آدرس پستی:</span>
                  <p className="leading-relaxed text-[11px]">{selectedOrder.customerInfo?.address || 'تحویل حضوری در استودیو'}</p>
                </div>
              </div>
            </div>
          );
        })()
      }

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>تمام تصاویر (اصلی، رتوش AI و شیت نهایی) در تاریخچه سفارش حفظ می‌گردند.</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {(() => {
                  const sentToPartner = Boolean(selectedOrder?.partnerId);
                  return (
                    <button
                      type="button"
                      onClick={() => selectedOrder && setSendPartnerOrder(selectedOrder)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 ${
                        sentToPartner
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-sky-600 hover:bg-sky-700 text-white'
                      }`}
                      title={sentToPartner ? 'ارسال مجدد / انتخاب همکار دیگر' : 'ارسال برای چاپ به همکار'}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {sentToPartner
                          ? `ارسال‌شده به ${selectedOrder?.partnerName || 'همکار'} ✅`
                          : 'ارسال برای چاپ'}
                      </span>
                    </button>
                  );
                })()}
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer border border-slate-200 transition-colors"
                >
                  بستن پنجره
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    
      {/* Send to colleague (2-step) */}
      {sendPartnerOrder && (
        <SendToPartnerModal
          order={sendPartnerOrder}
          partners={partners}
          dimensionTitle={
            resolveDimension(sendPartnerOrder.dimensionId)?.title ||
            sendPartnerOrder.invoiceDetails?.dimensionTitle ||
            '—'
          }
          quantity={sendPartnerOrder.quantity || 1}
          onClose={() => setSendPartnerOrder(null)}
          onSent={(updatedOrder, message) => {
            setSendPartnerOrder(null);
            setPartnerToast(message);
            setSentOrderIds((previous) => ({ ...previous, [updatedOrder.id]: true }));
            onUpdateOrder?.(updatedOrder);
            showToast?.(message);
            setTimeout(() => setPartnerToast(null), 5000);
          }}
        />
      )}

      {partnerToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] max-w-[92vw] px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-[11px] sm:text-xs font-bold shadow-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{partnerToast}</span>
        </div>
      )}

    </div>
  );
};

