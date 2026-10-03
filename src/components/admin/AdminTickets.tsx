import React, { useState, useRef, useEffect } from 'react';
import {
  LifeBuoy,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Flame,
  Send,
  User as UserIcon,
  Phone,
  Package,
  Calendar,
  MessageSquare,
  ChevronLeft,
  XCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  Copy,
  Trash2
} from 'lucide-react';
import { SupportTicket, TicketMessage, TicketCategory, TicketPriority, TicketStatus, Order } from '../../types';

interface AdminTicketsProps {
  tickets: SupportTicket[];
  onUpdateTickets: (tickets: SupportTicket[]) => void;
  orders: Order[];
}

export const AdminTickets: React.FC<AdminTicketsProps> = ({
  tickets,
  onUpdateTickets,
  orders
}) => {
  const [activeStatusTab, setActiveStatusTab] = useState<'all' | 'open' | 'in_progress' | 'answered' | 'closed'>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [autoAnswerStatus, setAutoAnswerStatus] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || null;

  // Auto-scroll chat to bottom when messages update
  useEffect(() => {
    if (selectedTicket) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedTicket?.messages]);

  // Canned quick responses for studio admin
  const cannedTemplates = [
    {
      title: 'وضعیت صف چاپ',
      text: 'درود، سفارش شما در حال حاضر در صف چاپ لابراتوار اختصاصی لاله قرار دارد و تا حداکثر ۲۴ ساعت آینده چاپ و آماده ارسال خواهد بود.'
    },
    {
      title: 'تایید رتوش و هوش مصنوعی',
      text: 'با سلام، فرآیند رتوش چهره، تنظیم نور و اصلاح رنگ هوشمند عکس با موفقیت تکمیل شد و تاییدیه کنترل کیفیت را دریافت کرد.'
    },
    {
      title: 'تحویل به پست/پیک',
      text: 'درود بر شما، مرسوله شما در بسته‌بندی ضدخش و مقاوم به مامور ارسال تحویل گردید و کد رهگیری مرسوله پستی به زودی پیامک خواهد شد.'
    },
    {
      title: 'درخواست تصویر باکیفیت‌تر',
      text: 'سلام و احترام، رزولوشن فایل ارسالی برای ابعاد درخواستی مقداری پایین است. لطفاً فایل با کیفیت اصلی را از طریق فرم سفارش یا همین تیکت ارسال بفرمایید.'
    },
    {
      title: 'رفع مشکل و پیگیری',
      text: 'با سلام و پوزش بابت تاخیر، مورد اعلامی بررسی و مرتفع شد. رضایت شما اولویت اصلی آتلیه دیجیتال لاله است.'
    }
  ];

  // Counters
  const totalCount = tickets.length;
  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const answeredCount = tickets.filter((t) => t.status === 'answered').length;
  const closedCount = tickets.filter((t) => t.status === 'closed').length;

  // Filtered tickets
  const filteredTickets = tickets.filter((ticket) => {
    // Search query
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ticket.userPhone && ticket.userPhone.includes(searchQuery)) ||
      (ticket.orderTrackingCode && ticket.orderTrackingCode.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Status tab
    if (activeStatusTab !== 'all' && ticket.status !== activeStatusTab) {
      return false;
    }

    // Priority filter
    if (selectedPriority !== 'all' && ticket.priority !== selectedPriority) {
      return false;
    }

    return true;
  });

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600 animate-pulse" />
            <span>جدید / باز</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <Clock className="w-3 h-3 text-sky-600" />
            <span>در حال بررسی</span>
          </span>
        );
      case 'answered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>پاسخ داده شده</span>
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <XCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>بسته شده</span>
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
            <Flame className="w-3 h-3 text-rose-500 animate-bounce" />
            <span>فوری</span>
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
            <span>بالا</span>
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <span>معمولی</span>
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
            <span>کم</span>
          </span>
        );
    }
  };

  const getCategoryTitle = (category: TicketCategory) => {
    switch (category) {
      case 'order_tracking':
        return 'پیگیری سفارش و زمان ارسال';
      case 'print_quality':
        return 'کیفیت چاپ و اصلاح رنگ';
      case 'delivery_address':
        return 'تغییر آدرس و نحوه تحویل';
      case 'invoice_payment':
        return 'پرداخت و امور مالی';
      case 'custom_retouch':
        return 'سفارش رتوش و ادیت اختصاصی';
      default:
        return 'پشتیبانی عمومی';
    }
  };

  // Admin Send Reply Handler
  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    const nowPersian = `${new Date().toLocaleDateString('fa-IR')} - ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`;

    const adminMsg: TicketMessage = {
      id: `msg-${Date.now()}`,
      sender: 'support',
      senderName: 'احسان محمدی (مدیریت آتلیه لاله)',
      message: replyText.trim(),
      createdAt: nowPersian
    };

    const updatedTicket: SupportTicket = {
      ...selectedTicket,
      status: autoAnswerStatus ? 'answered' : selectedTicket.status,
      updatedAt: nowPersian,
      messages: [...selectedTicket.messages, adminMsg]
    };

    const nextTickets = tickets.map((t) => (t.id === updatedTicket.id ? updatedTicket : t));
    onUpdateTickets(nextTickets);
    setReplyText('');

    try {
      localStorage.setItem('studio_tickets_list', JSON.stringify(nextTickets));
    } catch {}
  };

  // Change Ticket Status
  const handleStatusChange = (ticketId: string, newStatus: TicketStatus) => {
    const nowPersian = `${new Date().toLocaleDateString('fa-IR')} - ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`;
    const nextTickets = tickets.map((t) =>
      t.id === ticketId
        ? {
            ...t,
            status: newStatus,
            updatedAt: nowPersian
          }
        : t
    );
    onUpdateTickets(nextTickets);
    try {
      localStorage.setItem('studio_tickets_list', JSON.stringify(nextTickets));
    } catch {}
  };

  // Change Ticket Priority
  const handlePriorityChange = (ticketId: string, newPriority: TicketPriority) => {
    const nextTickets = tickets.map((t) =>
      t.id === ticketId ? { ...t, priority: newPriority } : t
    );
    onUpdateTickets(nextTickets);
    try {
      localStorage.setItem('studio_tickets_list', JSON.stringify(nextTickets));
    } catch {}
  };

  // Delete Ticket
  const handleDeleteTicket = (ticketId: string) => {
    if (!window.confirm('آیا از حذف این تیکت اطمینان دارید؟')) return;
    const nextTickets = tickets.filter((t) => t.id !== ticketId);
    onUpdateTickets(nextTickets);
    if (selectedTicketId === ticketId) {
      setSelectedTicketId(null);
    }
    try {
      localStorage.setItem('studio_tickets_list', JSON.stringify(nextTickets));
    } catch {}
  };

  return (
    <div className="space-y-5 animate-fadeIn pb-10">
      {/* Counters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setActiveStatusTab('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeStatusTab === 'all'
              ? 'bg-slate-900 text-white border-slate-800 shadow-md'
              : 'bg-white text-slate-900 border-slate-200/90 hover:bg-slate-50'
          }`}
        >
          <span className="text-[11px] block opacity-80">کل تیکت‌ها</span>
          <span className="text-2xl font-black font-mono block mt-1">
            {totalCount.toLocaleString('fa-IR')}
          </span>
        </div>

        <div
          onClick={() => setActiveStatusTab('open')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeStatusTab === 'open'
              ? 'bg-amber-600 text-white border-amber-700 shadow-md'
              : 'bg-white text-slate-900 border-slate-200/90 hover:bg-amber-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] block opacity-80">جدید / در انتظار پاسخ</span>
            {openCount > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>
          <span className="text-2xl font-black font-mono block mt-1 text-amber-600 group-hover:text-amber-700">
            {openCount.toLocaleString('fa-IR')}
          </span>
        </div>

        <div
          onClick={() => setActiveStatusTab('in_progress')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeStatusTab === 'in_progress'
              ? 'bg-sky-600 text-white border-sky-700 shadow-md'
              : 'bg-white text-slate-900 border-slate-200/90 hover:bg-sky-50/50'
          }`}
        >
          <span className="text-[11px] block opacity-80">در حال بررسی</span>
          <span className="text-2xl font-black font-mono block mt-1 text-sky-600">
            {inProgressCount.toLocaleString('fa-IR')}
          </span>
        </div>

        <div
          onClick={() => setActiveStatusTab('answered')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeStatusTab === 'answered'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
              : 'bg-white text-slate-900 border-slate-200/90 hover:bg-emerald-50/50'
          }`}
        >
          <span className="text-[11px] block opacity-80">پاسخ داده شده</span>
          <span className="text-2xl font-black font-mono block mt-1 text-emerald-600">
            {answeredCount.toLocaleString('fa-IR')}
          </span>
        </div>
      </div>

      {/* Main Container: Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* RIGHT COLUMN: Ticket List (Span 5 on Desktop, hidden on Mobile when ticket selected) */}
        <div className={`space-y-3 lg:col-span-5 ${selectedTicket ? 'hidden lg:block' : 'block'}`}>
          {/* Filter and Search Bar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در موضوع، نام مشتری، کد پیگیری..."
                className="w-full text-xs font-medium pr-9 pl-4 py-2.5 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none bg-slate-50 focus:bg-white transition-all"
              />
            </div>

            {/* Quick Priority & Status Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
              <span className="text-[11px] text-slate-400 font-bold whitespace-nowrap">
                اولویت:
              </span>
              <button
                type="button"
                onClick={() => setSelectedPriority('all')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs whitespace-nowrap transition-colors cursor-pointer ${
                  selectedPriority === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                همه
              </button>
              <button
                type="button"
                onClick={() => setSelectedPriority('urgent')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs whitespace-nowrap transition-colors cursor-pointer ${
                  selectedPriority === 'urgent'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                فوری
              </button>
              <button
                type="button"
                onClick={() => setSelectedPriority('high')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs whitespace-nowrap transition-colors cursor-pointer ${
                  selectedPriority === 'high'
                    ? 'bg-orange-600 text-white'
                    : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                }`}
              >
                بالا
              </button>
              <button
                type="button"
                onClick={() => setSelectedPriority('medium')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs whitespace-nowrap transition-colors cursor-pointer ${
                  selectedPriority === 'medium'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                معمولی
              </button>
            </div>
          </div>

          {/* Ticket Items List */}
          <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-0.5">
            {filteredTickets.length > 0 ? (
              filteredTickets.map((ticket) => {
                const isSelected = selectedTicket?.id === ticket.id;
                const lastMsg = ticket.messages[ticket.messages.length - 1];

                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-right relative ${
                      isSelected
                        ? 'bg-sky-50/70 border-sky-300 shadow-sm'
                        : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    {/* Top Row: User name & Status Badge */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {ticket.userName.slice(0, 1)}
                        </div>
                        <span className="text-xs font-black text-slate-900 truncate">
                          {ticket.userName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {getPriorityBadge(ticket.priority)}
                        {getStatusBadge(ticket.status)}
                      </div>
                    </div>

                    {/* Subject */}
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-snug line-clamp-1 mb-1">
                      {ticket.subject}
                    </h3>

                    {/* Last message preview */}
                    {lastMsg && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mb-2">
                        {lastMsg.sender === 'support' ? (
                          <span className="text-sky-700 font-bold ml-1">پاسخ ادمین:</span>
                        ) : (
                          <span className="text-slate-600 font-medium ml-1">مشتری:</span>
                        )}
                        {lastMsg.message}
                      </p>
                    )}

                    {/* Footer info */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                      <span>{ticket.trackingNumber}</span>
                      <div className="flex items-center gap-2">
                        <span>{ticket.messages.length} پیام</span>
                        <span>{ticket.updatedAt.split(' - ')[0]}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/90 space-y-2">
                <LifeBuoy className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">تیکتی با این مشخصات یافت نشد</p>
                <p className="text-[11px] text-slate-400">فیلترها را تغییر داده یا جستجو را پاک کنید</p>
              </div>
            )}
          </div>
        </div>

        {/* LEFT COLUMN: Ticket Detail & Live Chat (Span 7) */}
        {selectedTicket ? (
          <div className="lg:col-span-7 flex flex-col bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden min-h-[640px]">
            {/* Header of Chat */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                      {selectedTicket.trackingNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedTicket.trackingNumber)}
                      className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      title="کپی شماره تیکت"
                    >
                      {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <span className="text-[11px] text-slate-500 font-medium">
                      دسته‌بندی: {getCategoryTitle(selectedTicket.category)}
                    </span>
                  </div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 mt-1 leading-snug">
                    {selectedTicket.subject}
                  </h2>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Status Dropdown */}
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value as TicketStatus)}
                    className="text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none cursor-pointer shadow-2xs"
                  >
                    <option value="open">وضعیت: جدید / باز</option>
                    <option value="in_progress">وضعیت: در حال بررسی</option>
                    <option value="answered">وضعیت: پاسخ داده شده</option>
                    <option value="closed">وضعیت: بسته شده</option>
                  </select>

                  {/* Priority Dropdown */}
                  <select
                    value={selectedTicket.priority}
                    onChange={(e) => handlePriorityChange(selectedTicket.id, e.target.value as TicketPriority)}
                    className="text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none cursor-pointer shadow-2xs"
                  >
                    <option value="urgent">اولویت: فوری 🔥</option>
                    <option value="high">اولویت: بالا</option>
                    <option value="medium">اولویت: معمولی</option>
                    <option value="low">اولویت: کم</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleDeleteTicket(selectedTicket.id)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="حذف تیکت"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTicketId(null)}
                    className="lg:hidden px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4 rotate-180" />
                    <span>بازگشت به لیست</span>
                  </button>
                </div>
              </div>

              {/* Customer Contact & Linked Order Bar */}
              <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-slate-900">{selectedTicket.userName}</span>
                  </div>
                  {selectedTicket.userPhone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono dir-ltr">{selectedTicket.userPhone}</span>
                    </div>
                  )}
                </div>

                {selectedTicket.orderTrackingCode && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-bold">
                    <Package className="w-3.5 h-3.5 text-sky-600" />
                    <span>سفارش مرتبط: {selectedTicket.orderTrackingCode}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Conversation Messages Thread */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 max-h-[460px] bg-slate-50/40">
              {selectedTicket.messages.map((msg) => {
                const isAdmin = msg.sender === 'support';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      {isAdmin ? (
                        <>
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">
                            مدیریت آتلیه
                          </span>
                          <span className="text-xs font-bold text-slate-800">{msg.senderName}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs font-bold text-slate-800">{msg.senderName}</span>
                          <span className="text-[10px] font-medium text-slate-400">(مشتری)</span>
                        </>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono mr-1">
                        {msg.createdAt}
                      </span>
                    </div>

                    <div
                      className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                        isAdmin
                          ? 'bg-gradient-to-r from-sky-600 to-teal-600 text-white rounded-tr-none'
                          : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Admin Reply & Template Box */}
            <div className="p-4 border-t border-slate-200 bg-white space-y-3">
              {/* Quick Canned Response Templates */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                  پاسخ‌های سریع و الگوهای آماده استودیو:
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {cannedTemplates.map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReplyText(t.text)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 font-medium text-[11px] whitespace-nowrap transition-colors border border-slate-200 cursor-pointer"
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea & Send */}
              <form onSubmit={handleSendReply} className="space-y-2">
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="پاسخ خود به عنوان مدیریت آتلیه لاله را بنویسید..."
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none resize-none transition-all"
                  required
                />

                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoAnswerStatus}
                      onChange={(e) => setAutoAnswerStatus(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                    />
                    <span>تغییر خودکار وضعیت به «پاسخ داده شده»</span>
                  </label>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 text-white font-bold text-xs transition-all shadow-md shadow-sky-600/20 active:scale-95 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>ارسال پاسخ به کاربر</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* Empty selection placeholder on desktop */
          <div className="hidden lg:flex lg:col-span-7 flex-col items-center justify-center p-12 bg-white border border-slate-200/90 rounded-3xl text-center space-y-3 min-h-[500px]">
            <div className="w-16 h-16 rounded-3xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 shadow-sm">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                یک تیکت را برای مشاهده و پاسخ انتخاب کنید
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                با کلیک روی هر تیکت، می‌توانید تاریخچه مکالمات را بررسی کرده و پاسخ رسمی مدیریت را ارسال فرمایید.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
