export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  role: 'admin' | 'user';
  avatar?: string;
  createdAt: string;
}

export type ApiProvider = 
  | 'OpenAI (ChatGPT)'
  | 'Gemini AI'
  | 'Colorize AI'
  | 'Upscale Restoration'
  | 'Background Remover'
  | 'Stability AI'
  | 'Claude AI'
  | 'SMS Gateway'
  | 'Shaparak Pay'
  | 'Custom Webhook';

export interface ApiConnection {
  id: number; // 1 to 10
  name: string;
  provider: ApiProvider;
  endpoint: string;
  apiKey: string;
  model: string;
  status: 'connected' | 'disconnected' | 'testing' | 'error';
  lastPing?: string;
  requestsCount: number;
  quotaLimit: number;
  latencyMs?: number;
  isEnabled: boolean;
  description: string;
}

export type PrintTypeId = 'personnel' | 'bw_to_color' | 'memorial' | 'wedding';

export interface PrintTypeOption {
  id: PrintTypeId;
  title: string;
  subtitle: string;
  description: string;
  basePrice: number;
  features: string[];
  sampleImage: string;
  tag: string;
}

export interface PrintDimension {
  id: string;
  title: string;
  dimensionsCm: string;
  aspectRatio: string;
  basePrice: number;
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

export interface OrderDraft {
  printType: PrintTypeId;
  uploadedImage: string | null;
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
  paymentMethod: 'online' | 'card_to_card' | 'wallet';
  paymentReference?: string;
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
}
