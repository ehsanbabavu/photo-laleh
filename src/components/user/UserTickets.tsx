import React, { useState } from 'react';
import {
  LifeBuoy,
  Plus,
  Search,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronLeft,
  Send,
  X,
  User,
  ShieldCheck,
  Tag,
  Paperclip,
  Check,
  ArrowRight
} from 'lucide-react';
import { SupportTicket, TicketMessage, TicketCategory, TicketPriority, TicketStatus, User as UserType, Order } from '../../types';

interface UserTicketsProps {
  user: UserType;
  tickets: SupportTicket[];
  onUpdateTickets: (tickets: SupportTicket[]) => void;
  orders: Order[];
  onTicketRead?: (ticketId: string, updatedAt: string) => void;
}

export const UserTickets: React.FC<UserTicketsProps> = ({
  user,
  tickets,
  onUpdateTickets,
  orders,
  onTicketRead
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'answered' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || null;
  const lastReadTicketRef = React.useRef<string>('');

  // Notify parent once per ticket update when viewed
  React.useEffect(() => {
    if (selectedTicket && lastReadTicketRef.current !== `${selectedTicket.id}_${selectedTicket.updatedAt}`) {
      lastReadTicketRef.current = `${selectedTicket.id}_${selectedTicket.updatedAt}`;
      onTicketRead?.(selectedTicket.id, selectedTicket.updatedAt);
    }
  }, [selectedTicket?.id, selectedTicket?.updatedAt, onTicketRead]);

  // New ticket form state
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('order_tracking');
  const [orderTrackingCode, setOrderTrackingCode] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [initialMessage, setInitialMessage] = useState('');
  const [formError, setFormError] = useState('');

  // Reply message in detailed view
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // User's own orders for linking
  const userOrders = orders.filter((o) => o.userId === user.id);

  // Filter user tickets (for current user)
  const userTickets = tickets.filter(
    (t) => t.userId === user.id || t.userName === user.name
  );

  const filteredTickets = userTickets.filter((ticket) => {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ticket.orderTrackingCode && ticket.orderTrackingCode.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === 'all') return true;
    if (activeTab === 'open') return ticket.status === 'open' || ticket.status === 'in_progress';
    if (activeTab === 'answered') return ticket.status === 'answered';
    if (activeTab === 'closed') return ticket.status === 'closed';
    return true;
  });

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'answered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            پاسخ داده شده
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <Clock className="w-3.5 h-3.5" />
            در حال بررسی
          </span>
        );
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            در انتظار بررسی
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            بسته شده
          </span>
        );
    }
  };

  const getPriorityBadge = (p: TicketPriority) => {
    switch (p) {
      case 'urgent':
        return <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">فوری</span>;
      case 'high':
        return <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">بالا</span>;
      case 'medium':
        return <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">متوسط</span>;
      case 'low':
        return <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">عادی</span>;
    }
  };

  const getCategoryLabel = (c: TicketCategory) => {
    switch (c) {
      case 'order_tracking':
        return 'پیگیری وضعیت سفارش';
      case 'print_quality':
        return 'کیفیت چاپ، کاغذ و متریال';
      case 'delivery_address':
        return 'تغییر آدرس و نحوه ارسال';
      case 'invoice_payment':
        return 'سوالات فاکتور و امور مالی';
      case 'custom_retouch':
        return 'درخواست روتوش و ادیت ویژه';
      case 'general':
        return 'سایر موارد و پشتیبانی عمومی';
    }
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setFormError('لطفاً عنوان تیکت را وارد نمایید.');
      return;
    }
    if (!initialMessage.trim()) {
      setFormError('لطفاً شرح پیام خود را بنویسید.');
      return;
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('fa-IR')} - ${now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`;

    const newTicket: SupportTicket = {
      id: `t-${Date.now()}`,
      trackingNumber: `TCK-${randomNum}`,
      userId: user.id,
      userName: user.name,
      userPhone: user.phone || '09123456789',
      subject: subject.trim(),
      category,
      orderTrackingCode: orderTrackingCode ? orderTrackingCode : undefined,
      priority,
      status: 'open',
      createdAt: formattedDate,
      updatedAt: formattedDate,
      messages: [
        {
          id: `m-${Date.now()}`,
          sender: 'user',
          senderName: user.name,
          message: initialMessage.trim(),
          createdAt: formattedDate
        }
      ]
    };

    const updated = [newTicket, ...tickets];
    onUpdateTickets(updated);

    // Reset and close
    setSubject('');
    setCategory('order_tracking');
    setOrderTrackingCode('');
    setPriority('medium');
    setInitialMessage('');
    setFormError('');
    setIsCreateModalOpen(false);
    setSelectedTicketId(newTicket.id);
  };

  const handleSendReply = () => {
    if (!selectedTicket || !replyMessage.trim()) return;

    setIsSendingReply(true);
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('fa-IR')} - ${now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`;

    const userMsg: TicketMessage = {
      id: `m-${Date.now()}`,
      sender: 'user',
      senderName: user.name,
      message: replyMessage.trim(),
      createdAt: formattedDate
    };

    const updatedTicket: SupportTicket = {
      ...selectedTicket,
      status: 'in_progress',
      updatedAt: formattedDate,
      messages: [...selectedTicket.messages, userMsg]
    };

    const updatedTickets = tickets.map((t) => (t.id === selectedTicket.id ? updatedTicket : t));
    onUpdateTickets(updatedTickets);
    setReplyMessage('');
    setIsSendingReply(false);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Ticket List Section */}
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
        {/* Top Header: Title & New Ticket Button */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <h2 className="text-sm sm:text-base font-black text-slate-900">
            تیکت‌ها و پیام‌های پشتیبانی
          </h2>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت تیکت جدید</span>
          </button>
        </div>

        {/* Controls: Search and Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              همه ({userTickets.length})
            </button>
            <button
              onClick={() => setActiveTab('open')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'open'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              در حال بررسی ({userTickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length})
            </button>
            <button
              onClick={() => setActiveTab('answered')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'answered'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              پاسخ داده شده ({userTickets.filter((t) => t.status === 'answered').length})
            </button>
            <button
              onClick={() => setActiveTab('closed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'closed'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              بسته شده ({userTickets.filter((t) => t.status === 'closed').length})
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="جستجو در موضوع یا کد تیکت..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Tickets Cards Grid */}
        {filteredTickets.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">تیکتی یافت نشد</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              در صورت داشتن هرگونه سوال در خصوص ثبت سفارش، استعلام تحویل یا ابعاد، تیکت جدید ارسال نمایید.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-teal-600/20 cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>ارسال اولین تیکت</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredTickets.map((ticket) => {
              const lastMessage = ticket.messages[ticket.messages.length - 1];
              return (
                <div
                  key={ticket.id}
                  onClick={() => {
                    setSelectedTicketId(ticket.id);
                    onTicketRead?.(ticket.id, ticket.updatedAt);
                  }}
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer bg-white group space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200">
                        {ticket.trackingNumber}
                      </span>
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                      <span className="text-[11px] text-slate-500 font-medium">
                        {getCategoryLabel(ticket.category)}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400 font-mono">
                      {ticket.createdAt}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                      {ticket.subject}
                    </h3>
                    {ticket.orderTrackingCode && (
                      <p className="text-[11px] text-sky-700 mt-0.5 font-mono">
                        کد رهگیری سفارش مرتبط: {ticket.orderTrackingCode}
                      </p>
                    )}
                    {lastMessage && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        <span className="font-bold text-slate-700">{lastMessage.senderName}: </span>
                        {lastMessage.message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      <span>{ticket.messages.length} پیام تبادل شده</span>
                    </div>

                    <span className="text-teal-600 font-bold group-hover:translate-x-[-3px] transition-transform inline-flex items-center gap-1 text-[11px]">
                      مشاهده گفتگو و ارسال پاسخ
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE TICKET MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">ثبت تیکت پشتیبانی جدید</h3>
                  <p className="text-[11px] text-slate-500">پاسخگویی سریع توسط کارشناسان آتلیه</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTicket} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">موضوع تیکت *</label>
                <input
                  type="text"
                  placeholder="مثال: هماهنگی تحویل فوری، سوال درباره کاغذ چاپ و..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-teal-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">دسته‌بندی موضوع</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TicketCategory)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500 text-xs"
                  >
                    <option value="order_tracking">پیگیری وضعیت سفارش</option>
                    <option value="print_quality">کیفیت چاپ، کاغذ و متریال</option>
                    <option value="delivery_address">تغییر آدرس و نحوه ارسال</option>
                    <option value="invoice_payment">سوالات فاکتور و امور مالی</option>
                    <option value="custom_retouch">درخواست روتوش و ادیت ویژه</option>
                    <option value="general">سایر موارد و پشتیبانی عمومی</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">اولویت رسیدگی</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TicketPriority)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500 text-xs"
                  >
                    <option value="low">عادی</option>
                    <option value="medium">متوسط</option>
                    <option value="high">بالا (نیازمند رسیدگی امروز)</option>
                    <option value="urgent">فوری و اضطراری</option>
                  </select>
                </div>
              </div>

              {/* Order selector (optional) */}
              {userOrders.length > 0 && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">انتخاب سفارش مرتبط (اختیاری)</label>
                  <select
                    value={orderTrackingCode}
                    onChange={(e) => setOrderTrackingCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-teal-500 text-xs font-mono"
                  >
                    <option value="">بدون انتخاب سفارش مرتبط</option>
                    {userOrders.map((ord) => (
                      <option key={ord.id} value={ord.trackingCode}>
                        {ord.trackingCode} - {ord.customerInfo.fullName || 'سفارش'} ({ord.date})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">متن و شرح درخواست *</label>
                <textarea
                  rows={4}
                  placeholder="لطفاً جزییات درخواست یا سوال خود را با دقت مطرح فرمایید..."
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-teal-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-700 hover:to-sky-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-teal-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ارسال تیکت</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED TICKET VIEW MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-6 space-y-4 max-h-[92vh] flex flex-col shadow-2xl animate-fade-in">
            {/* Ticket Modal Header - Only Ticket Number */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-bold">شماره تیکت:</span>
                <span className="font-mono text-xs sm:text-sm font-black text-teal-800 bg-teal-50 px-3 py-1 rounded-xl border border-teal-200">
                  {selectedTicket.trackingNumber}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTicketId(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                title="بستن"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ticket Info Strip */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs flex-shrink-0">
              <div className="flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-600 font-bold">{getCategoryLabel(selectedTicket.category)}</span>
              </div>
              {selectedTicket.orderTrackingCode && (
                <div className="text-sky-700 font-mono text-[11px]">
                  سفارش: {selectedTicket.orderTrackingCode}
                </div>
              )}
              <div className="text-slate-400 text-[11px] font-mono">
                تاریخ ایجاد: {selectedTicket.createdAt}
              </div>
            </div>

            {/* Messages Thread (Scrollable) */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 pl-1 py-1 max-h-[45vh]">
              {selectedTicket.messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-start' : 'items-end'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 space-y-1.5 shadow-xs ${
                        isUser
                          ? 'bg-slate-100 border border-slate-200 text-slate-900 rounded-tr-xs'
                          : 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-tl-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[10px] pb-1 border-b border-black/10">
                        <span className={`font-bold ${isUser ? 'text-slate-700' : 'text-emerald-100'}`}>
                          {msg.senderName}
                        </span>
                        <span className={`font-mono ${isUser ? 'text-slate-400' : 'text-emerald-200'}`}>
                          {msg.createdAt}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed whitespace-pre-wrap font-medium">
                        {msg.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Input Box */}
            <div className="pt-2 border-t border-slate-200 space-y-2 flex-shrink-0">
              <div className="flex gap-2">
                <textarea
                  rows={2}
                  placeholder="پاسخ خود را اینجا بنویسید..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-teal-500"
                />
                <button
                  type="button"
                  onClick={handleSendReply}
                  disabled={!replyMessage.trim() || isSendingReply}
                  className="bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-700 hover:to-sky-700 disabled:opacity-50 text-white font-bold px-4 rounded-xl text-xs transition-all shadow-md shadow-teal-600/20 cursor-pointer flex flex-col items-center justify-center gap-1"
                >
                  <Send className="w-4 h-4" />
                  <span>ارسال</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                پشتیبانی آتلیه دیجیتال لاله معمولاً ظرف چند دقیقه تا نهایتاً ۲ ساعت کاری به پیام‌های شما پاسخ می‌دهد.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
