import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial Database Schema & Seed Data
const INITIAL_DB = {
  users: [
    {
      id: 'u-1',
      name: 'احسان باباگلی',
      username: 'ehsan',
      email: 'ehsanbabagoli71@gmail.com',
      phone: '09123456789',
      role: 'admin',
      createdAt: '۱۴۰۳/۰۱/۰۱',
      walletBalance: 250000,
      hasUsedFirstOrderGift: false
    },
    {
      id: 'u-2',
      name: 'سارا رضایی',
      username: 'sara',
      email: 'sara@example.com',
      phone: '09123456788',
      role: 'user',
      createdAt: '۱۴۰۳/۰۱/۰۵',
      walletBalance: 100000,
      hasUsedFirstOrderGift: false
    }
  ],
  printTypes: [
    {
      id: 'personnel',
      title: 'عکس پرسنلی',
      subtitle: 'سازمانی، گذرنامه، گواهینامه و مدارک اداری',
      description: 'چاپ باکیفیت و استاندارد با زمینه سفید یا آبی، تنظیم خودکار زاویه چهره، روتوش ملایم جای لک و ارائه در پک‌های ۶ و ۱۲ تایی.',
      basePrice: 600000,
      tag: 'تحویل فوری',
      sampleImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
      features: [
        'تنظیم دقیق ابعاد ۳×۴ یا ۶×۴ میلی‌متری',
        'تعویض پس‌زمینه به سفید یا آبی پرسنلی',
        'صاف‌کردن و روتوش پوست به سبک استاندارد اداری',
        'امکان چاپ پک ۶ عددی روی کاغذ سیلک مات'
      ]
    },
    {
      id: 'commercial',
      title: 'عکس تبلیغاتی و تجاری',
      subtitle: 'معرفی محصول، برندینگ شخصی، تبلیغات و کاتالوگ',
      description: 'عکاسی و پردازش حرفه‌ای هوش مصنوعی جهت معرفی محصولات، مدلینگ، خدمات و پوسترهای تبلیغاتی با نورپردازی صنعتی.',
      basePrice: 250000,
      tag: 'تبلیغات و برندینگ',
      sampleImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
      features: [
        'نورپردازی متمرکز صنعتی و های‌لایت استودیویی',
        'تعویض پس‌زمینه به دکورهای لوکس تبلیغاتی',
        'افزایش شفافیت و جلا در جزئیات کالا و مدلینگ',
        'مناسب پوستر، اینستاگرام، کاتالوگ و بیلبورد'
      ]
    },
    {
      id: 'bw_to_color',
      title: 'تبدیل سیاه سفید به رنگی',
      subtitle: 'زنده‌سازی خاطرات قدیمی و تصاویر نوستالژیک',
      description: 'بازسازی دیجیتال و رنگ‌آمیزی هوشمندانه عکس‌های قدیمی با حفظ بافت اصیل چهره، بازیابی نور طبیعی و حذف لکه‌ها و پارگی‌ها.',
      basePrice: 160000,
      tag: 'هوش مصنوعی عمیق',
      sampleImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
      features: [
        'رنگ‌آمیزی واقع‌گرایانه رنگ چشم، مو و البسه',
        'حذف خط و تاخوردگی‌های فیزیکی کاغذ عکس',
        'افزایش وضوح و شارپنس بدون حالت مصنوعی',
        'امکان چاپ روی شاسی ضخیم یا بوم نقاشی'
      ]
    },
    {
      id: 'memorial',
      title: 'عکس برای مراسم ختم',
      subtitle: 'طراحی فاخر یادبود، اعلامیه و قاب رومیزی مجلس',
      description: 'آماده‌سازی تصویر با شأن و وقار، اضافه کردن نوار مشکی مات یا حاشیه اسلیمی، روتوش آرامش‌بخش چهره و چاپ فوری با قاب یا شاسی.',
      basePrice: 140000,
      tag: 'چاپ با احترام و فوری',
      sampleImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
      features: [
        'قابلیت افزودن روبان مشکی یادبود در گوشه',
        'حاشیه‌های اسلیمی و سنتی با کیفیت بالا',
        'تنظیم آرام و معنوی نور و کنتراست تصویر',
        'تحویل اولویت‌دار جهت هماهنگی با مراسم'
      ]
    },
    {
      id: 'wedding',
      title: 'عکس برای نامزدی یا عروسی',
      subtitle: 'ثبت شکوه زیباترین روز زندگی با کیفیت استودیویی',
      description: 'ترمیم نورپردازی، اصلاح حرفه‌ای پوست و لباس عروس و داماد، اعمال جلوه رمانتیک و گرم و چاپ روی شاسی‌های لوکس و بوم نقاشی.',
      basePrice: 210000,
      tag: 'کیفیت فوق‌العاده گالری',
      sampleImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80',
      features: [
        'روتوش تخصصی پوست صورت، مو و لباس',
        'افکت‌های نوری رمانتیک (Golden Glow و Cinematic)',
        'چاپ روی کاغذ متالیک کریستالی یا بوم کنواس',
        'شاسی ضخیم ۱۶ میلی‌متری با نوار لبه اختصاصی'
      ]
    }
  ],
  prompts: {
    personnel: 'پرتره پرسنلی رسمی و اداری، زمینه سفید یکدست، عکس ۳در۴ گذرنامه، نورپردازی آتلیه‌ای پرتره، کیفیت فوق‌العاده بالا، بدون عینک، نگاه روبرو',
    commercial: 'عکاسی تبلیغاتی و تجاری فاخر، نورپردازی متمرکز استودیویی روی محصول و مدل، بوکه نرم پس‌زمینه لوکس، کیفیت فوق‌العاده وضوح و رنگ عالی',
    bw_to_color: 'پرتره عکاسی رنگی زنده و بازیابی شده، عکس پرتره خانوادگی قدیمی رنگ‌آمیزی شده با وضوح بالا و حذف نویز و لکه',
    memorial: 'پرتره یادبود باوقار و احترام، پس‌زمینه محو ملایم، روشنایی یکنواخت، کیفیت استودیویی رتوش چهره',
    wedding: 'عکس دونفره عروس و داماد شیک و رمانتیک در عمارت باغ لوکس، نورپردازی بوکه رویایی غروب آفتاب، کیفیت ۳۲کی سینمایی'
  },
  orders: [
    {
      id: 'ord-sample-01',
      trackingCode: 'Laleh-74920',
      userId: 'u-sara',
      userName: 'سارا رضایی',
      date: '۱۴۰۵/۰۱/۱۲',
      status: 'printing',
      totalPrice: 125000,
      paymentStatus: 'paid',
      paymentReference: 'SHP-849102841',
      printType: 'personnel',
      uploadedImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
      aiProcessedImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80',
      aiPromptUsed: 'پرتره پرسنلی رسمی و اداری، زمینه سفید یکدست، عکس ۳در۴ گذرنامه، نورپردازی آتلیه‌ای پرتره، کیفیت فوق‌العاده بالا',
      commercialImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
      commercialPromptUsed: 'عکاسی تبلیغاتی و تجاری فاخر، نورپردازی متمرکز استودیویی روی محصول و مدل، بوکه نرم پس‌زمینه لوکس، کیفیت فوق‌العاده وضوح و رنگ عالی',
      aiStatus: 'completed',
      aiCompletedAt: '۱۴:۳۵',
      originalImageName: 'sample_portrait.jpg',
      aiEffects: {
        colorized: false,
        bgMode: 'white',
        memorialRibbon: false,
        weddingFilter: 'natural',
        autoEnhance: true
      },
      dimensionId: 'personnel_6x3x4',
      materialId: 'silk_paper',
      quantity: 1,
      hasLamination: false,
      designerRetouch: true,
      deliveryMethod: 'peyk',
      customerInfo: {
        fullName: 'سارا رضایی',
        phoneNumber: '09123456789',
        province: 'تهران',
        city: 'تهران',
        address: 'خیابان ولیعصر، نرسیده به میدان ونک، برج نگار، طبقه ۵',
        postalCode: '1969754321',
        notes: 'کیفیت چاپ مات سیلک باشد و برش‌ها دقیق انجام شود.'
      },
      discountAmount: 0,
      paymentMethod: 'online'
    }
  ],
  tickets: [
    {
      id: 't-101',
      trackingNumber: 'TCK-9482',
      userId: 'u-1',
      userName: 'احسان باباگلی',
      userPhone: '09123456789',
      subject: 'درخواست ارسال فوری عکس پرسنلی با پیک اختصاصی',
      category: 'order_tracking',
      orderTrackingCode: 'ORD-98214',
      priority: 'high',
      status: 'answered',
      createdAt: '۱۴۰۵/۰۱/۱۴ - ۱۰:۳۰',
      updatedAt: '۱۴۰۵/۰۱/۱۴ - ۱۱:۱۵',
      messages: [
        {
          id: 'm-1',
          sender: 'user',
          senderName: 'احسان باباگلی',
          message: 'سلام وقت بخیر، سفارش عکس پرسنلی من برای تمدید گذرنامه فوری نیاز است. آیا امکان دارد تا ظهر امروز با پیک ارسال فرمایید؟ متشکرم.',
          createdAt: '۱۴۰۵/۰۱/۱۴ - ۱۰:۳۰'
        },
        {
          id: 'm-2',
          sender: 'support',
          senderName: 'پشتیبانی آتلیه دیجیتال لاله (محمدیان)',
          message: 'درود بر شما آقای باباگلی عزیز، سفارش شما با اولویت چاپ ویژه در لابراتوار قرار گرفت. به محض خشک‌شدن و برش لیزری (حدود ساعت ۱۲:۱۵)، تحویل سفیر پیک فوری خواهد شد و پیامک حاوی شماره تماس راننده برایتان ارسال می‌گردد.',
          createdAt: '۱۴۰۵/۰۱/۱۴ - ۱۱:۱۵'
        }
      ]
    }
  ],
  announcements: [
    {
      id: 'ann-1',
      title: 'تخفیف ویژه ۱۰۰ هزار تومانی برای ثبت اولین سفارش چاپ و رتوش',
      content: 'تمامی اعضای جدید استودیو می‌توانند در اولین سفارش خود از اعتبار ۱۰۰ هزار تومانی کیف پول بهره‌مند شوند. این تخفیف به‌صورت خودکار در فاکتور شما اعمال می‌گردد.',
      priority: 'important',
      createdAt: '۱۴۰۳/۰۷/۱۰',
      isActive: true,
      readBy: []
    },
    {
      id: 'ann-2',
      title: 'راه‌اندازی سیستم هوش مصنوعی نسل جدید برای تبدیل عکس‌های قدیمی به رنگی',
      content: 'از این پس تمامی سفارش‌های تبدیل سیاه و سفید به رنگی با مدل اختصاصی هوش مصنوعی و احیای بافت طبیعی چهره پردازش می‌شوند.',
      priority: 'normal',
      createdAt: '۱۴۰۳/۰۷/۰۸',
      isActive: true,
      readBy: []
    }
  ],
  settings: {
    avalaiApiKey: '',
    avalaiBaseUrl: 'https://api.avalai.ir/v1',
    avalaiModel: 'gpt-image-2.5-sunburst',
    aiEnabled: true,
    blupalToken: '',
    blupalBaseUrl: 'https://blupal.top',
    blupalMerchantId: '',
    blupalCardNumber: '6219 8619 4528 7193',
    blupalAccountHolder: 'آتلیه تخصصی لاله',
    blupalIban: 'IR720560086190004528719301',
    blupalEnabled: true,
    blupalSandboxMode: true,
    blupalAutoPollInterval: 3,
    blupalCustomEndpoint: '/api/v1/invoices/create'
  },
  invoices: []
};

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), 'utf-8');
      return INITIAL_DB;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading DB, restoring initial seed:', err);
    return INITIAL_DB;
  }
}

function writeDb(dbData: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing DB file:', err);
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- REST API ENDPOINTS ---

// Get all DB state
app.get('/api/db/all', (_req, res) => {
  const db = readDb();
  res.json(db);
});

// Full state sync
app.post('/api/db/sync', (req, res) => {
  const current = readDb();
  const updated = {
    ...current,
    ...req.body
  };
  writeDb(updated);
  res.json({ success: true, db: updated });
});

// Orders APIs
app.get('/api/orders', (_req, res) => {
  const db = readDb();
  res.json(db.orders || []);
});

app.post('/api/orders', (req, res) => {
  const db = readDb();
  const newOrder = req.body;
  const existingIdx = (db.orders || []).findIndex((o: any) => o.id === newOrder.id);
  if (existingIdx >= 0) {
    db.orders[existingIdx] = newOrder;
  } else {
    db.orders = [newOrder, ...(db.orders || [])];
  }
  writeDb(db);
  res.json({ success: true, order: newOrder });
});

app.put('/api/orders/:id', (req, res) => {
  const db = readDb();
  const orderId = req.params.id;
  const updatedOrder = req.body;
  db.orders = (db.orders || []).map((o: any) => (o.id === orderId ? { ...o, ...updatedOrder } : o));
  writeDb(db);
  res.json({ success: true });
});

app.delete('/api/orders/:id', (req, res) => {
  const db = readDb();
  const orderId = req.params.id;
  db.orders = (db.orders || []).filter((o: any) => o.id !== orderId);
  writeDb(db);
  res.json({ success: true });
});

app.delete('/api/orders', (_req, res) => {
  const db = readDb();
  db.orders = [];
  writeDb(db);
  res.json({ success: true });
});

// Support Tickets APIs
app.get('/api/tickets', (_req, res) => {
  const db = readDb();
  res.json(db.tickets || []);
});

app.post('/api/tickets', (req, res) => {
  const db = readDb();
  const newTicket = req.body;
  const existingIdx = (db.tickets || []).findIndex((t: any) => t.id === newTicket.id);
  if (existingIdx >= 0) {
    db.tickets[existingIdx] = newTicket;
  } else {
    db.tickets = [newTicket, ...(db.tickets || [])];
  }
  writeDb(db);
  res.json({ success: true, ticket: newTicket });
});

app.put('/api/tickets/:id', (req, res) => {
  const db = readDb();
  const ticketId = req.params.id;
  const updatedTicket = req.body;
  db.tickets = (db.tickets || []).map((t: any) => (t.id === ticketId ? { ...t, ...updatedTicket } : t));
  writeDb(db);
  res.json({ success: true });
});

// Prompts APIs
app.get('/api/prompts', (_req, res) => {
  const db = readDb();
  res.json(db.prompts || {});
});

app.post('/api/prompts', (req, res) => {
  const db = readDb();
  db.prompts = { ...(db.prompts || {}), ...req.body };
  writeDb(db);
  res.json({ success: true, prompts: db.prompts });
});

// Print Types APIs
app.get('/api/print-types', (_req, res) => {
  const db = readDb();
  res.json(db.printTypes || []);
});

app.post('/api/print-types', (req, res) => {
  const db = readDb();
  const newPrintType = req.body;
  const existingIdx = (db.printTypes || []).findIndex((pt: any) => pt.id === newPrintType.id);
  if (existingIdx >= 0) {
    db.printTypes[existingIdx] = newPrintType;
  } else {
    db.printTypes.push(newPrintType);
  }
  writeDb(db);
  res.json({ success: true, printType: newPrintType });
});

app.put('/api/print-types/:id', (req, res) => {
  const db = readDb();
  const ptId = req.params.id;
  db.printTypes = (db.printTypes || []).map((pt: any) => (pt.id === ptId ? { ...pt, ...req.body } : pt));
  writeDb(db);
  res.json({ success: true });
});

app.delete('/api/print-types/:id', (req, res) => {
  const db = readDb();
  const ptId = req.params.id;
  db.printTypes = (db.printTypes || []).filter((pt: any) => pt.id !== ptId);
  writeDb(db);
  res.json({ success: true });
});

// Users APIs
app.get('/api/users', (_req, res) => {
  const db = readDb();
  res.json(db.users || []);
});

app.post('/api/users', (req, res) => {
  const db = readDb();
  const newUser = req.body;
  const existingIdx = (db.users || []).findIndex((u: any) => u.id === newUser.id || u.username === newUser.username);
  if (existingIdx >= 0) {
    db.users[existingIdx] = { ...db.users[existingIdx], ...newUser };
  } else {
    db.users.push(newUser);
  }
  writeDb(db);
  res.json({ success: true, user: newUser });
});

app.put('/api/users/:id', (req, res) => {
  const db = readDb();
  const userId = req.params.id;
  db.users = (db.users || []).map((u: any) => (u.id === userId ? { ...u, ...req.body } : u));
  writeDb(db);
  res.json({ success: true });
});

// Announcements APIs
app.get('/api/announcements', (_req, res) => {
  const db = readDb();
  res.json(db.announcements || []);
});

app.post('/api/announcements', (req, res) => {
  const db = readDb();
  const newAnn = req.body;
  const existingIdx = (db.announcements || []).findIndex((a: any) => a.id === newAnn.id);
  if (existingIdx >= 0) {
    db.announcements[existingIdx] = newAnn;
  } else {
    db.announcements = [newAnn, ...(db.announcements || [])];
  }
  writeDb(db);
  res.json({ success: true, announcement: newAnn });
});

app.put('/api/announcements/:id', (req, res) => {
  const db = readDb();
  const annId = req.params.id;
  db.announcements = (db.announcements || []).map((a: any) => (a.id === annId ? { ...a, ...req.body } : a));
  writeDb(db);
  res.json({ success: true });
});

app.delete('/api/announcements/:id', (req, res) => {
  const db = readDb();
  const annId = req.params.id;
  db.announcements = (db.announcements || []).filter((a: any) => a.id !== annId);
  writeDb(db);
  res.json({ success: true });
});

// Settings APIs
app.get('/api/settings', (_req, res) => {
  const db = readDb();
  res.json(db.settings || {});
});

app.post('/api/settings', (req, res) => {
  const db = readDb();
  db.settings = { ...(db.settings || {}), ...req.body };
  writeDb(db);
  res.json({ success: true, settings: db.settings });
});

// Helper function to generate candidate BluPal endpoints
function getBluPalEndpoints(baseUrl: string, customEndpoint?: string): string[] {
  const host = (baseUrl || 'https://blupal.top').trim().replace(/\/+$/, '');
  const bases = Array.from(new Set([
    host,
    host.replace('://blupal.top', '://api.blupal.top'),
    host.replace('://blupal.net', '://api.blupal.net'),
    host.replace('://blupal.ir', '://api.blupal.ir'),
    'https://blupal.top',
    'https://api.blupal.top',
    'https://blupal.net',
    'https://api.blupal.net'
  ]));

  const customEp = (customEndpoint || '').trim();
  const paths = [
    ...(customEp ? [customEp.startsWith('/') ? customEp : '/' + customEp] : []),
    '/api/v1/invoices/create',
    '/api/v1/invoices',
    '/api/v1/invoice/create',
    '/api/v1/invoice',
    '/api/v1/create-invoice',
    '/api/v1/create',
    '/api/v1/factor',
    '/api/v1/factors',
    '/api/v1/pay',
    '/api/v1/payment',
    '/api/invoice/create',
    '/api/invoices',
    '/api/invoice',
    '/api/create-invoice',
    '/api/factor',
    '/api/pay'
  ];

  const result: string[] = [];
  for (const base of bases) {
    for (const path of paths) {
      const fullUrl = `${base}${path}`;
      if (!result.includes(fullUrl)) {
        result.push(fullUrl);
      }
    }
  }
  return result;
}

// Create Invoice
app.post('/api/blupal/create-invoice', async (req, res) => {
  try {
    const db = readDb();
    const settings = db.settings || {};
    const { amount, orderId, customerName, customerPhone, description, invoiceDetails } = req.body;

    const numAmount = typeof amount === 'number' ? amount : (Number(amount) || 0);
    if (numAmount < 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    const invoiceId = 'BLU-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
    // Amount in Rials (Minimum 100,000 Rials as required by BluPal API doc)
    const amountRial = Math.max(100000, numAmount * 10);
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins
    const isFree = numAmount === 0;

    let externalPaymentUrl = '';
    let remoteCardNumber = '';
    let remoteInvoiceId = '';
    let remoteFinalAmount = 0;

    // If real token is configured and sandbox is disabled, call BluPal API (only if amount > 0)
    if (numAmount > 0 && settings.blupalToken && !settings.blupalSandboxMode) {
      try {
        const baseUrl = (settings.blupalBaseUrl || 'https://blupal.top').replace(/\/+$/, '');

        const requestBody = {
          amount: amountRial,
          card_number: settings.blupalCardNumber || undefined
        };

        const endpoints = getBluPalEndpoints(baseUrl, settings.blupalCustomEndpoint);

        for (const endpoint of endpoints) {
          try {
            const blupalRes = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-API-Key': settings.blupalToken,
                'Authorization': `Bearer ${settings.blupalToken}`
              },
              body: JSON.stringify(requestBody)
            });

            if (blupalRes.ok) {
              const resData: any = await blupalRes.json();
              const obj = resData.data || resData.result || resData.invoice || resData;

              if (obj && (obj.success || resData.success || obj.payment_link || obj.invoice_id)) {
                externalPaymentUrl = obj.payment_link || obj.payment_url || obj.url || obj.link || externalPaymentUrl;
                remoteCardNumber = obj.card_number || obj.cardNumber || remoteCardNumber;
                remoteInvoiceId = String(obj.invoice_id || obj.id || '');
                if (obj.final_amount) {
                  const rawFinal = Number(obj.final_amount) || 0;
                  remoteFinalAmount = rawFinal > 10000 ? Math.round(rawFinal / 10) : rawFinal;
                }
                if (externalPaymentUrl || remoteInvoiceId) break; // Successfully retrieved invoice details!
              }
            }
          } catch (endpointErr) {
            // Try next endpoint fallback
          }
        }
      } catch (e) {
        console.warn('BluPal real API call failed, falling back to local invoice:', e);
      }
    }

    const payableToman = remoteFinalAmount || numAmount;

    const newInvoice = {
      invoiceId: remoteInvoiceId || invoiceId,
      localInvoiceId: invoiceId,
      amount: numAmount,
      finalAmount: payableToman,
      amountRial: payableToman * 10,
      orderId: orderId || '',
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      description: description || 'پرداخت سفارش آتلیه دیجیتال لاله',
      status: isFree ? 'paid' : 'pending',
      referenceCode: isFree ? ('GIFT-FREE-' + Math.floor(10000000 + Math.random() * 90000000)) : undefined,
      paidAt: isFree ? new Date().toLocaleDateString('fa-IR') : undefined,
      cardNumber: remoteCardNumber || settings.blupalCardNumber || '6219 8619 4528 7193',
      accountHolder: settings.blupalAccountHolder || 'آتلیه تخصصی لاله',
      iban: settings.blupalIban || 'IR720560086190004528719301',
      qrData: `blupal://pay?invoice=${remoteInvoiceId || invoiceId}&amount=${payableToman}&to=${encodeURIComponent(settings.blupalAccountHolder || 'آتلیه لاله')}`,
      paymentUrl: externalPaymentUrl || `https://blupal.top/pay/${remoteInvoiceId || invoiceId}`,
      createdAt: new Date().toLocaleDateString('fa-IR'),
      expiresAt,
      invoiceDetails: invoiceDetails || null
    };

    db.invoices = [newInvoice, ...(db.invoices || []).slice(0, 99)];
    writeDb(db);

    res.json({ success: true, invoice: newInvoice });
  } catch (err: any) {
    console.error('Error creating BluPal invoice:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal error' });
  }
});

// Check Invoice Status
app.get('/api/blupal/status/:invoiceId', async (req, res) => {
  try {
    const db = readDb();
    const reqId = String(req.params.invoiceId || '').trim();
    const invoice = (db.invoices || []).find((inv: any) =>
      String(inv.invoiceId || '').trim() === reqId ||
      String(inv.localInvoiceId || '').trim() === reqId ||
      String(inv.orderId || '').trim() === reqId
    );

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    // Check expiration
    if (invoice.status === 'pending' && Date.now() > invoice.expiresAt) {
      invoice.status = 'expired';
      writeDb(db);
    }

    // If real token and not paid yet, check with BluPal API
    const settings = db.settings || {};
    if (invoice.status === 'pending' && settings.blupalToken && !settings.blupalSandboxMode) {
      try {
        const baseUrl = (settings.blupalBaseUrl || 'https://blupal.top').replace(/\/+$/, '');
        const targetRemoteId = invoice.invoiceId || reqId;

        const blupalRes = await fetch(`${baseUrl}/api/v1/invoices/${targetRemoteId}`, {
          headers: {
            'Accept': 'application/json',
            'X-API-Key': settings.blupalToken,
            'Authorization': `Bearer ${settings.blupalToken}`
          }
        });

        if (blupalRes.ok) {
          const data: any = await blupalRes.json();
          const statusStr = String(data.status || data.event || '').toUpperCase();
          if (
            statusStr === 'PAID' ||
            statusStr === 'COMPLETED' ||
            statusStr === 'PAYMENT.COMPLETED' ||
            (data.success && statusStr === 'PAID')
          ) {
            invoice.status = 'paid';
            invoice.referenceCode = String(data.transaction_id || data.reference_id || ('BLU-' + Math.floor(10000000 + Math.random() * 90000000)));
            invoice.paidAt = new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
            writeDb(db);
          }
        }
      } catch (e) {
        // Ignore remote check failure
      }
    }

    res.json({ success: true, status: invoice.status, invoice });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Simulate / Trigger instant payment (Sandbox / Demo mode)
app.post('/api/blupal/simulate-pay/:invoiceId', (req, res) => {
  try {
    const db = readDb();
    const invoiceId = req.params.invoiceId;
    const invoice = (db.invoices || []).find((inv: any) => inv.invoiceId === invoiceId);

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    invoice.status = 'paid';
    invoice.referenceCode = 'BLU-' + Math.floor(100000000 + Math.random() * 900000000);
    invoice.paidAt = new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    writeDb(db);

    res.json({ success: true, status: 'paid', referenceCode: invoice.referenceCode, invoice });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test Connection with BluPal (Performs real invoice creation test and reports exact result or error)
app.post('/api/blupal/test-connection', async (req, res) => {
  try {
    const { token, baseUrl, customEndpoint } = req.body;
    const url = (baseUrl || 'https://blupal.top').replace(/\/+$/, '');

    if (!token) {
      return res.json({
        success: false,
        message: 'لطفاً ابتدا توکن دسترسی API بلوپال را در کادر مربوطه وارد نمایید.'
      });
    }

    const testOrderId = 'BLU-TEST-' + Date.now().toString(36).toUpperCase();

    // 100,000 Rials = 10,000 Tomans (Minimum allowed amount by BluPal API doc!)
    const requestBody = {
      amount: 100000
    };

    const endpoints = getBluPalEndpoints(url, customEndpoint);

    let lastError = '';
    let lastStatus = 0;
    let rawResponse: any = null;

    for (const endpoint of endpoints) {
      try {
        const blupalRes = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-Key': token,
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(requestBody)
        });

        lastStatus = blupalRes.status;
        const contentType = blupalRes.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          rawResponse = await blupalRes.json();
        } else {
          const rawText = await blupalRes.text();
          rawResponse = { text: rawText };
        }

        const obj = rawResponse?.data || rawResponse?.result || rawResponse?.invoice || rawResponse;
        const invoiceUrl = obj?.payment_link || obj?.payment_url || obj?.url || obj?.link || obj?.redirect_url;
        const invoiceId = String(obj?.invoice_id || obj?.id || testOrderId);

        if (blupalRes.ok && (rawResponse?.success || obj?.payment_link || obj?.invoice_id)) {
          return res.json({
            success: true,
            message: `فاکتور واقعی با موفقیت در وب‌سرویس بلوپال ایجاد شد! ✅ (شناسه فاکتور: ${invoiceId})`,
            invoiceUrl: invoiceUrl || '',
            invoiceId,
            details: rawResponse
          });
        } else {
          const msg =
            rawResponse?.message ||
            rawResponse?.error ||
            rawResponse?.errors ||
            rawResponse?.detail ||
            (typeof rawResponse?.text === 'string' ? rawResponse.text.slice(0, 150) : null) ||
            `HTTP Error ${blupalRes.status}`;
          lastError = typeof msg === 'object' ? JSON.stringify(msg) : String(msg);
        }
      } catch (endpointErr: any) {
        lastError = endpointErr.message || 'خطا در شبکه';
      }
    }

    // If all endpoints failed, report detailed error to admin
    return res.json({
      success: false,
      message: `خطا در صدور فاکتور توسط سرور بلوپال (کد ${lastStatus || 'شبکه'}): ${lastError}`,
      details: rawResponse
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: `خطای داخلی سرور هنگام تست اتصال: ${err.message}`
    });
  }
});

// BluPal Incoming Webhook Handler (POST /api/blupal/webhook)
app.post(['/api/blupal/webhook', '/api/webhook/blupal'], async (req, res) => {
  try {
    const payload = req.body || {};
    const db = readDb();

    const rawInvoiceId = payload.invoice_id ?? payload.invoiceId ?? payload.id ?? payload.order_id ?? payload.orderId;
    const strInvoiceId = String(rawInvoiceId || '').trim();

    const rawStatus = String(payload.status || payload.event || '').toUpperCase();
    const isPaid =
      rawStatus === 'PAID' ||
      rawStatus === 'COMPLETED' ||
      rawStatus === 'SUCCESSFUL' ||
      rawStatus === 'PAYMENT.COMPLETED' ||
      payload.event === 'payment.completed' ||
      payload.success === true;

    const referenceCode = String(
      payload.transaction_id ||
      payload.reference_id ||
      payload.tracking_code ||
      payload.referenceCode ||
      ('BLU-WH-' + Math.floor(10000000 + Math.random() * 90000000))
    );
    const amount = payload.amount || payload.amount_rial || payload.final_amount;

    const timeFa = new Date().toLocaleString('fa-IR', {
      timeZone: 'Asia/Tehran',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    // 1. Update matching invoice in DB
    let invoiceFound = false;
    db.invoices = (db.invoices || []).map((inv: any) => {
      const isMatch =
        (strInvoiceId && String(inv.invoiceId || '').trim() === strInvoiceId) ||
        (strInvoiceId && String(inv.localInvoiceId || '').trim() === strInvoiceId) ||
        (strInvoiceId && String(inv.orderId || '').trim() === strInvoiceId) ||
        (!strInvoiceId && inv.status === 'pending');

      if (isMatch) {
        invoiceFound = true;
        return {
          ...inv,
          status: isPaid ? 'paid' : inv.status,
          referenceCode,
          paidAt: isPaid ? timeFa : inv.paidAt
        };
      }
      return inv;
    });

    // 2. Update matching order in DB if any
    db.orders = (db.orders || []).map((ord: any) => {
      const isOrderMatch =
        (strInvoiceId && String(ord.id || '').trim() === strInvoiceId) ||
        (strInvoiceId && String(ord.trackingCode || '').trim() === strInvoiceId);
      if (isOrderMatch && isPaid) {
        return {
          ...ord,
          paymentStatus: 'paid',
          paymentReference: referenceCode
        };
      }
      return ord;
    });

    // 3. Record in webhook event logs
    const logEntry = {
      id: 'wh-' + Date.now(),
      receivedAt: timeFa,
      invoiceId: strInvoiceId || 'نامشخص',
      status: isPaid ? 'paid' : rawStatus,
      referenceCode,
      amount: amount || '—',
      rawPayload: payload,
      isMatched: invoiceFound
    };

    db.webhookLogs = [logEntry, ...(db.webhookLogs || []).slice(0, 19)];
    writeDb(db);

    console.log(`[BluPal Webhook] Received status for invoice ${strInvoiceId}: ${isPaid ? 'PAID' : rawStatus} (Ref: ${referenceCode}, Matched: ${invoiceFound})`);

    // Return HTTP 200 OK with received: true as specified in BluPal docs
    res.status(200).json({
      received: true,
      success: true,
      message: 'نتیجه تراکنش وب‌هوک با موفقیت پردازش شد',
      invoiceId: strInvoiceId,
      status: isPaid ? 'paid' : rawStatus
    });
  } catch (err: any) {
    console.error('Error handling BluPal webhook:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get recent Webhook Logs
app.get('/api/blupal/webhook-logs', (_req, res) => {
  const db = readDb();
  res.json(db.webhookLogs || []);
});

// Test/Simulate incoming Webhook trigger from admin
app.post('/api/blupal/test-webhook', async (req, res) => {
  try {
    const db = readDb();
    const { invoiceId, status = 'paid' } = req.body;
    const targetInvoice = (db.invoices || [])[0];
    const invId = invoiceId || targetInvoice?.invoiceId || ('BLU-DEMO-' + Date.now().toString(36).toUpperCase());

    const timeFa = new Date().toLocaleString('fa-IR', {
      timeZone: 'Asia/Tehran',
      hour: '2-digit',
      minute: '2-digit',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const refCode = 'BLU-TEST-' + Math.floor(10000000 + Math.random() * 90000000);

    // Update invoice
    db.invoices = (db.invoices || []).map((inv: any) => {
      if (inv.invoiceId === invId) {
        return { ...inv, status: 'paid', referenceCode: refCode, paidAt: timeFa };
      }
      return inv;
    });

    const logEntry = {
      id: 'wh-test-' + Date.now(),
      receivedAt: timeFa,
      invoiceId: invId,
      status: 'paid',
      referenceCode: refCode,
      amount: targetInvoice ? targetInvoice.amount : 125000,
      rawPayload: { invoice_id: invId, status: 'paid', reference_id: refCode, simulated: true },
      isMatched: true
    };

    db.webhookLogs = [logEntry, ...(db.webhookLogs || []).slice(0, 19)];
    writeDb(db);

    res.json({
      success: true,
      message: `تست وب‌هوک با موفقیت انجام شد و وضعیت فاکتور ${invId} به پرداخت شده تغییر یافت ✅`,
      log: logEntry
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Unified Telegram Callback Query Handler
async function handleTelegramCallbackQuery(cb: any, token: string) {
  if (!cb || !token) return;
  const data = cb.data || '';

  if (data.startsWith('mark_ready:')) {
    const orderIdOrCode = data.replace('mark_ready:', '');
    const db = readDb();
    const orders = db.orders || [];

    const targetOrderIndex = orders.findIndex(
      (o: any) => o.id === orderIdOrCode || o.trackingCode === orderIdOrCode
    );

    if (targetOrderIndex >= 0) {
      orders[targetOrderIndex].status = 'ready_to_ship';
      const messagesToDelete = orders[targetOrderIndex].sentMessageIds || [];
      
      // Update DB to clear tracking only
      orders[targetOrderIndex].sentMessageIds = [];
      db.orders = orders;
      writeDb(db);

      // 1. Popup alert
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: cb.id, text: `وضعیت ${orders[targetOrderIndex].trackingCode} به «آماده ارسال» تغییر یافت ✅`, show_alert: true })
      });

      // 2. Edit message text with automatic deletion countdown
      if (cb.message && cb.message.chat && cb.message.message_id) {
        await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: cb.message.chat.id,
            message_id: cb.message.message_id,
            text: `⏳ با تشکر از شما فایل‌های چاپ تا ۱۰ ثانیه دیگر حذف خواهند شد.`,
            parse_mode: 'Markdown'
          })
        });

        // 3. Schedule deletion of ALL tracked messages
        setTimeout(async () => {
          for (const msgId of messagesToDelete) {
            try {
              await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: cb.message.chat.id, message_id: msgId })
              });
            } catch (e) {
              console.error(`Error deleting message ${msgId}:`, e);
            }
          }
        }, 10000);
      }
    }
  } else if (data.startsWith('delete_files:')) {
    // This branch is now deprecated in favor of automatic cleanup
  }
}

let lastTelegramUpdateId = 0;
async function pollTelegramUpdates() {
  try {
    const db = readDb();
    const token = db.settings?.telegramToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;

    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${lastTelegramUpdateId + 1}&timeout=1`);
    if (!res.ok) {
      const errJson: any = await res.json().catch(() => ({}));
      if (errJson.error_code === 409) {
        await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
      }
      return;
    }

    const data = await res.json();
    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        lastTelegramUpdateId = Math.max(lastTelegramUpdateId, update.update_id);
        if (update.callback_query) {
          await handleTelegramCallbackQuery(update.callback_query, token);
        }
      }
    }
  } catch (err) {
    // Ignore polling errors
  }
}

setInterval(pollTelegramUpdates, 2000);

// Telegram Send Order API
app.post('/api/telegram/send-order', async (req, res) => {
  try {
    const { botToken, chatId, order, dimensionTitle, materialName } = req.body;
    if (!botToken || !chatId || !order) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    // Always update settings so polling has the latest botToken
    const dbSettings = readDb();
    dbSettings.settings = { ...(dbSettings.settings || {}), telegramToken: botToken, telegramChatId: chatId };
    writeDb(dbSettings);

    const sentMessageIds: number[] = [];

    const timeFa = new Date().toLocaleString('fa-IR', {
      timeZone: 'Asia/Tehran',
      hour: '2-digit',
      minute: '2-digit',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    async function sendDocumentFromDataUrl(dataUrl: string, caption: string, filename: string) {
      if (!dataUrl) return null;
      try {
        const parts = dataUrl.split(';base64,');
        if (parts.length < 2) return null;
        const contentType = parts[0].split(':')[1] || 'image/jpeg';
        const raw = Buffer.from(parts[1], 'base64');
        const blob = new Blob([raw], { type: contentType });

        const form = new FormData();
        form.append('chat_id', chatId);
        form.append('caption', caption);
        form.append('document', blob, filename);

        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
          method: 'POST',
          body: form
        });
        const result = await response.json();
        return result.ok ? result.result.message_id : null;
      } catch (err) {
        console.error('Error sending document to telegram:', err);
        return null;
      }
    }

    // 1. Send 9-pack sheet image
    if (order.printSheetImage) {
      let sheetCountText = `${order.quantity || 1} سری`;
      if (order.dimensionId === 'personnel_12x3x4') {
        sheetCountText = `${2 * (order.quantity || 1)} سری`;
      }
      const captionSheet = `🎴 شیت ۹تایی چاپ\n📌 شماره سفارش: ${order.trackingCode}\n📐 اندازه: 10*15\n🔢 تعداد: ${sheetCountText}\n📅 ثبت: ${timeFa}`;
      const msgId = await sendDocumentFromDataUrl(order.printSheetImage, captionSheet, `sheet-9pack-${order.trackingCode}.jpg`);
      if (msgId) sentMessageIds.push(msgId);
    }

    // 2. Send commercial promotional image
    const commercialImg = order.commercialSheet10x15Image || order.commercialImage;
    if (commercialImg) {
      const captionComm = `🎨 عکس تبلیغاتی ۱۰×۱۵\n📌 شماره سفارش: ${order.trackingCode}\n📐 اندازه: 10*15\n🔢 تعداد: ${order.quantity || 1} سری\n📅 ثبت: ${timeFa}`;
      const msgId = await sendDocumentFromDataUrl(commercialImg, captionComm, `commercial-10x15-${order.trackingCode}.jpg`);
      if (msgId) sentMessageIds.push(msgId);
    }

    // 3. Send inquiry message
    try {
      const confirmMsg = `آیا سفارش ${order.trackingCode} چاپ شده است؟`;
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: confirmMsg,
          reply_markup: {
            inline_keyboard: [[{ text: 'بله، چاپ شد (تغییر به آماده ارسال) ✅', callback_data: `mark_ready:${order.id}` }]]
          }
        })
      });
      const resData = await res.json();
      if (resData.ok) sentMessageIds.push(resData.result.message_id);
    } catch (err) {
      console.error('Error sending confirmation message:', err);
    }
    
    // Save sent message IDs to DB
    const db = readDb();
    const orderIdx = db.orders.findIndex((o: any) => o.id === order.id);
    if (orderIdx >= 0) {
      db.orders[orderIdx].sentMessageIds = sentMessageIds;
      writeDb(db);
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('Telegram send order error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});

// Telegram Webhook Handler for Inline Buttons & Callbacks
app.post('/api/telegram/webhook', async (req, res) => {
  try {
    const update = req.body;
    if (update && update.callback_query) {
      const db = readDb();
      const token = db.settings?.telegramToken || process.env.TELEGRAM_BOT_TOKEN;
      await handleTelegramCallbackQuery(update.callback_query, token);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Telegram webhook error:', err);
    res.json({ ok: true });
  }
});

// Start Express + Vite Server
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Real Database Server running on http://localhost:${PORT}`);
  });
}

startServer();
