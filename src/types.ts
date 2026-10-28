export interface User {
  id: string;
  name: string;
  username?: string;
  password?: string;
  email?: string;
  phone?: string;
  role: 'admin' | 'user';
  avatar?: string;
  createdAt: string;
  walletBalance?: number; // In Tomans (تومان)
  hasUsedFirstOrderGift?: boolean;
}

export type PrintTypeId = 'personnel' | 'bw_to_color' | 'memorial' | 'wedding' | string;

export interface PrintTypeOption {
  id: PrintTypeId;
  title: string;
  subtitle: string;
  description: string;
  basePrice: number;
  features: string[];
  sampleImage?: string;
  tag?: string;
  isEnabled?: boolean;
  allowMultiplePhotos?: boolean;
  cardBgImage?: string;
  /** Sizes (PrintDimension ids) offered for this print type — managed in «مدیریت سایز» */
  dimensionIds?: string[];
}

export interface PrintDimension {
  id: string;
  title: string;
  dimensionsCm: string;
  aspectRatio: string;
  basePrice: number;
  /** Internal cost of this size — admin only, never exposed to customers */
  costPrice?: number;
  description: string;
  popular?: boolean;
}

export interface PaperMaterial {
  id: string;
  name: string;
  description: string;
  extraPrice: number;
  badge: string;
  spec: string;
}

export interface OrderInvoiceDetails {
  printTypeTitle: string;
  dimensionTitle: string;
  materialTitle: string;
  quantity: number;
  unitBasePrice: number;
  extrasPrice: number;
  subtotal: number;
  shippingCost: number;
  deliveryMethod: string;
  discountAmount: number;
  discountCode?: string;
  walletCreditUsed: number;
  finalTotal: number;
  finalTotalRial?: number;
  customerFullName: string;
  customerPhone: string;
  customerAddress: string;
  createdAtFa: string;
}

export interface OrderDraft {
  id?: string;
  printType: PrintTypeId;
  uploadedImage: string | null;
  uploadedImages?: string[];
  originalImageName?: string;
  aiEffects: {
    colorized: boolean;
    bgMode: 'original' | 'white' | 'blue' | 'light_grey';
    memorialRibbon: boolean;
    weddingFilter: 'natural' | 'warm' | 'soft_glow';
    autoEnhance: boolean;
  };
  dimensionId: string;
  materialId: string;
  quantity: number;
  hasLamination: boolean;
  designerRetouch: boolean;
  deliveryMethod: 'peyk' | 'pishtaz';
  customerInfo: {
    fullName: string;
    phoneNumber: string;
    province: string;
    city: string;
    address: string;
    postalCode: string;
    notes: string;
  };
  discountCode?: string;
  discountAmount: number;
  walletCreditUsed?: number; // 100,000 Tomans gift deduction from first invoice
  totalPrice?: number;
  paymentMethod: 'online' | 'card_to_card' | 'wallet';
  paymentReference?: string;
  paymentInvoiceId?: string;
  paymentInvoice?: BluPalInvoice | null; // reusable pending invoice while resuming the wizard
  paymentAmountRial?: number; // exact Rial amount issued/paid by BluPal
  paymentAmountToman?: number;
  invoiceDetails?: OrderInvoiceDetails;
}

export interface Order extends OrderDraft {
  id: string;
  trackingCode: string;
  userId: string;
  userName: string;
  date: string;
  status: 'pending_review' | 'ai_processing' | 'printing' | 'ready_to_ship' | 'delivered';
  totalPrice: number;
  paymentStatus: 'paid' | 'pending';
  aiProcessedImage?: string;
  aiPromptUsed?: string;
  aiStatus?: 'pending' | 'in_queue' | 'processing' | 'completed' | 'failed';
  aiCompletedAt?: string;
  printSheetImage?: string;
  printSheetCreatedAt?: string;
  commercialImage?: string;
  commercialPromptUsed?: string;
  commercialSheet10x15Image?: string;
  sentMessageIds?: number[]; // To track messages for deletion
}

export type TicketCategory =
  | 'order_tracking'
  | 'print_quality'
  | 'delivery_address'
  | 'invoice_payment'
  | 'custom_retouch'
  | 'general';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'answered' | 'closed';

export interface TicketMessage {
  id: string;
  sender: 'user' | 'support';
  senderName: string;
  message: string;
  createdAt: string;
  attachments?: string[];
}

export interface SupportTicket {
  id: string;
  trackingNumber: string;
  userId: string;
  userName: string;
  userPhone?: string;
  subject: string;
  category: TicketCategory;
  orderId?: string;
  orderTrackingCode?: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority?: 'normal' | 'important' | 'urgent';
  createdAt: string;
  isActive: boolean;
  readBy?: string[];
}

export interface BluPalSettings {
  blupalToken: string;
  blupalBaseUrl: string;
  blupalMerchantId: string;
  blupalCardNumber: string;
  blupalAccountHolder: string;
  blupalIban: string;
  blupalEnabled: boolean;
  blupalAutoPollInterval: number;
  blupalWebhookSecret?: string;
  blupalCustomWebhookUrl?: string;
  blupalCustomEndpoint?: string;
}

export interface BluPalInvoice {
  invoiceId: string;
  localInvoiceId?: string;
  remoteInvoiceId?: string;
  provider?: string;
  mode?: 'live';
  isRemote?: boolean;
  amount: number; // requested amount in Tomans
  requestedAmountRial?: number;
  finalAmount?: number; // payable amount in Tomans (rounded, display only)
  finalAmountRial?: number; // exact payable amount in Rial (incl. tracking digits)
  amountRial: number; // exact payable amount in Rial
  orderId?: string;
  customerName?: string;
  customerPhone?: string;
  description?: string;
  status: 'pending' | 'paid' | 'expired' | 'failed';
  cardNumber: string;
  accountHolder: string;
  iban?: string;
  qrData?: string;
  paymentUrl?: string;
  referenceCode?: string;
  createdAt: string;
  expiresAt: number; // timestamp in ms
  invoiceDetails?: OrderInvoiceDetails;
  warning?: string;
  payerName?: string;
  payerCard?: string;
  payerBankName?: string;
}
