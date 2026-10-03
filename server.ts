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
      trackingCode: 'NG-74920',
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
    avalaiModel: 'gpt-image-2.5-sunburst'
  }
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

// Telegram Send Order API
app.post('/api/telegram/send-order', async (req, res) => {
  try {
    const { botToken, chatId, order, dimensionTitle, materialName } = req.body;
    if (!botToken || !chatId || !order) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    async function sendDocumentFromDataUrl(dataUrl: string, caption: string, filename: string) {
      if (!dataUrl) return;
      try {
        const parts = dataUrl.split(';base64,');
        if (parts.length < 2) return;
        const contentType = parts[0].split(':')[1] || 'image/jpeg';
        const raw = Buffer.from(parts[1], 'base64');
        const blob = new Blob([raw], { type: contentType });

        const form = new FormData();
        form.append('chat_id', chatId);
        form.append('caption', caption);
        form.append('document', blob, filename);

        await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
          method: 'POST',
          body: form
        });
      } catch (err) {
        console.error('Error sending document to telegram:', err);
      }
    }

    // 1. Send 9-pack sheet image as document
    if (order.printSheetImage) {
      const captionSheet = `🎴 شیت ۹تایی چاپ\n📌 شماره سفارش: ${order.trackingCode}\n📐 اندازه: ${dimensionTitle || order.dimensionId}\n🔢 تعداد: ${order.quantity || 1} سری`;
      await sendDocumentFromDataUrl(order.printSheetImage, captionSheet, `sheet-9pack-${order.trackingCode}.jpg`);
    }

    // 2. Send commercial promotional image as document
    const commercialImg = order.commercialSheet10x15Image || order.commercialImage;
    if (commercialImg) {
      const captionComm = `🎨 عکس تبلیغاتی ۱۰×۱۵\n📌 شماره سفارش: ${order.trackingCode}\n📐 اندازه: ${dimensionTitle || order.dimensionId}\n🔢 تعداد: ${order.quantity || 1} سری`;
      await sendDocumentFromDataUrl(commercialImg, captionComm, `commercial-10x15-${order.trackingCode}.jpg`);
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('Telegram send order error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error' });
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
