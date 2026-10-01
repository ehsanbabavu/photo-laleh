import { ApiConnection, PrintDimension, PaperMaterial, PrintTypeOption, Order } from '../types';

export const INITIAL_APIS: ApiConnection[] = [
  {
    id: 1,
    name: 'OpenAI ChatGPT (GPT-4o)',
    provider: 'OpenAI (ChatGPT)',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey: 'sk-proj-994827103847592837492817349182749',
    model: 'gpt-4o',
    status: 'connected',
    lastPing: '۲ دقیقه پیش',
    requestsCount: 1420,
    quotaLimit: 5000,
    latencyMs: 310,
    isEnabled: true,
    description: 'تحلیل پرامپت هوشمند، تولید توضیحات محصول و پردازش درخواست‌های روتوش چهره'
  },
  {
    id: 2,
    name: 'ChatGPT Vision & Inspector',
    provider: 'OpenAI (ChatGPT)',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey: 'sk-proj-vis-8472910482719284729104827109283',
    model: 'gpt-4o-mini',
    status: 'connected',
    lastPing: '۵ دقیقه پیش',
    requestsCount: 890,
    quotaLimit: 3000,
    latencyMs: 240,
    isEnabled: true,
    description: 'بررسی کیفیت وضوح تصویر ارسالی و تشخیص نویز قبل از تایید چاپ'
  },
  {
    id: 3,
    name: 'API بازسازی و رنگ‌آمیزی هوشمند',
    provider: 'Colorize AI',
    endpoint: 'https://api.deepcolor.ai/v2/colorize',
    apiKey: 'col_live_948201948201948201948',
    model: 'deepcolor-v3-artistic',
    status: 'connected',
    lastPing: '۱۲ دقیقه پیش',
    requestsCount: 420,
    quotaLimit: 1000,
    latencyMs: 650,
    isEnabled: true,
    description: 'تبدیل عکس‌های قدیمی سیاه و سفید به رنگی طبیعی بر اساس تن پوست و بافت لباس'
  },
  {
    id: 4,
    name: 'API حذف و تغییر پس‌زمینه پرسنلی',
    provider: 'Background Remover',
    endpoint: 'https://api.rmbg.io/v1/segment',
    apiKey: 'rmbg_sec_8471029481029384710',
    model: 'rmbg-birefnet-portrait',
    status: 'connected',
    lastPing: '۱۸ دقیقه پیش',
    requestsCount: 680,
    quotaLimit: 2000,
    latencyMs: 180,
    isEnabled: true,
    description: 'جداسازی مو و پیرایش دقیق برای تعویض بک‌گراند به سفید اداری یا آبی رسمی'
  },
  {
    id: 5,
    name: 'API افزایش کیفیت و سوپر رزولوشن',
    provider: 'Upscale Restoration',
    endpoint: 'https://api.esrgan.cloud/v1/upscale',
    apiKey: 'esr_token_39481029481029384',
    model: 'gfpgan-real-esrgan-4x',
    status: 'connected',
    lastPing: '۲۵ دقیقه پیش',
    requestsCount: 310,
    quotaLimit: 1500,
    latencyMs: 820,
    isEnabled: true,
    description: 'ترمیم شکستگی‌ها و افزایش وضوح تا ۴ برابر بدون افت کیفیت برای چاپ سایز بزرگ'
  },
  {
    id: 6,
    name: 'Google Gemini 2.5 Flash',
    provider: 'Gemini AI',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: 'AIzaSyA839482019482019384729104829104',
    model: 'gemini-2.5-flash',
    status: 'connected',
    lastPing: '۱ ساعت پیش',
    requestsCount: 2150,
    quotaLimit: 10000,
    latencyMs: 195,
    isEnabled: true,
    description: 'پردازش همزمان دستورات ویرایش کاربر و دسته‌بندی خودکار سفارشات ورودی'
  },
  {
    id: 7,
    name: 'Claude 3.5 Sonnet API',
    provider: 'Claude AI',
    endpoint: 'https://api.anthropic.com/v1/messages',
    apiKey: 'sk-ant-api03-93847102948102938471029384',
    model: 'claude-3-5-sonnet',
    status: 'disconnected',
    lastPing: 'دیروز',
    requestsCount: 120,
    quotaLimit: 500,
    latencyMs: 410,
    isEnabled: false,
    description: 'سیستم پشتیبان نگارش متن تسلیت و متون کتیبه‌ای یادبود مراسم ختم'
  },
  {
    id: 8,
    name: 'Stability AI - SDXL Fine Art',
    provider: 'Stability AI',
    endpoint: 'https://api.stability.ai/v1/generation',
    apiKey: 'sk-stab-49102948102938471029384',
    model: 'stable-diffusion-xl-1024',
    status: 'connected',
    lastPing: '۳ ساعت پیش',
    requestsCount: 195,
    quotaLimit: 1000,
    latencyMs: 1200,
    isEnabled: true,
    description: 'تولید بوکه، نورپردازی رمانتیک و پس‌زمینه‌های لوکس عمارت برای عکس‌های عروسی'
  },
  {
    id: 9,
    name: 'درگاه پرداخت شاپرک (سامان کیش / زرین‌پال)',
    provider: 'Shaparak Pay',
    endpoint: 'https://api.sep.ir/v1/paymentGate',
    apiKey: 'sep_mid_994820194820_terminal_44',
    model: 'shaparak-v2-direct',
    status: 'connected',
    lastPing: 'هم‌اکنون',
    requestsCount: 540,
    quotaLimit: 20000,
    latencyMs: 85,
    isEnabled: true,
    description: 'تراکنش‌های ریالی درگاه شاپرک با بازگشت آنی و تاییدیه پیامکی بانکی'
  },
  {
    id: 10,
    name: 'سامانه پیامک کاوه‌نگار (اطلاع‌رسانی چاپ)',
    provider: 'SMS Gateway',
    endpoint: 'https://api.kavenegar.com/v1/sms/send',
    apiKey: 'kav_key_8492019482019482019482019',
    model: 'kav-pattern-fast-otp',
    status: 'connected',
    lastPing: '۱۰ دقیقه پیش',
    requestsCount: 1820,
    quotaLimit: 50000,
    latencyMs: 120,
    isEnabled: true,
    description: 'ارسال خودکار پیامک تغییر وضعیت سفارش، فاکتور و کد رهگیری پستی به مشتری'
  }
];

export const PRINT_TYPES: PrintTypeOption[] = [
  {
    id: 'personnel',
    title: 'عکس پرسنلی',
    subtitle: 'سازمانی، گذرنامه، گواهینامه و مدارک اداری',
    description: 'چاپ باکیفیت و استاندارد با زمینه سفید یا آبی، تنظیم خودکار زاویه چهره، روتوش ملایم جای لک و ارائه در پک‌های ۶ و ۱۲ تایی.',
    basePrice: 85000,
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
];

export const PERSONNEL_DIMENSIONS: PrintDimension[] = [
  {
    id: 'personnel_6x3x4',
    title: '۶ عدد عکس ۳×۴ و یک عدد عکس تبلیغاتی',
    dimensionsCm: '6x (3×4 cm) + 1x تبلیغاتی',
    aspectRatio: '3:4',
    basePrice: 0,
    description: 'شامل ۶ قطعه عکس استاندارد ۳×۴ به همراه یک قطعه عکس هدیه تبلیغاتی استودیو',
    popular: true
  },
  {
    id: 'personnel_12x3x4',
    title: '۱۲ عدد عکس ۳×۴ و یک عدد عکس تبلیغاتی',
    dimensionsCm: '12x (3×4 cm) + 1x تبلیغاتی',
    aspectRatio: '3:4',
    basePrice: 40000,
    description: 'شامل ۱۲ قطعه عکس استاندارد ۳×۴ به همراه یک قطعه عکس هدیه تبلیغاتی استودیو',
    popular: false
  }
];

export const GENERAL_PRINT_DIMENSIONS: PrintDimension[] = [
  {
    id: 'size_10x15',
    title: 'سایز کارت‌پستالی ۱۰×۱۵',
    dimensionsCm: '10 x 15 cm',
    aspectRatio: '2:3',
    basePrice: 45000,
    description: 'مناسب آلبوم خاطرات و قاب‌های کوچک رومیزی',
    popular: false
  },
  {
    id: 'size_13x18',
    title: 'سایز محبوب رومیزی ۱۳×۱۸',
    dimensionsCm: '13 x 18 cm',
    aspectRatio: '5:7',
    basePrice: 75000,
    description: 'استانداردترین اندازه برای میز کار و استند خانگی',
    popular: true
  },
  {
    id: 'size_16x21',
    title: 'سایز قاب ۱۶×۲۱',
    dimensionsCm: '16 x 21 cm',
    aspectRatio: '3:4',
    basePrice: 110000,
    description: 'سایز متعادل برای شاسی دیواری و کادویی',
    popular: false
  },
  {
    id: 'size_20x30',
    title: 'سایز بزرگ A4 (۲۰×۳۰)',
    dimensionsCm: '20 x 30 cm',
    aspectRatio: '2:3',
    basePrice: 165000,
    description: 'وضوح فوق‌العاده برای تابلوهای خانگی و مراسم',
    popular: true
  },
  {
    id: 'size_30x40',
    title: 'سایز استودیویی A3 (۳۰×۴۰)',
    dimensionsCm: '30 x 40 cm',
    aspectRatio: '3:4',
    basePrice: 240000,
    description: 'ایده‌آل برای عکس‌های خانوادگی و نامزدی',
    popular: false
  },
  {
    id: 'size_50x70',
    title: 'سایز فاخر دیواری ۵۰×۷۰',
    dimensionsCm: '50 x 70 cm',
    aspectRatio: '5:7',
    basePrice: 420000,
    description: 'مناسب سالن پذیرایی، آتلیه و قاب‌بندی بزرگ',
    popular: false
  }
];

export const PRINT_DIMENSIONS: PrintDimension[] = [
  ...PERSONNEL_DIMENSIONS,
  ...GENERAL_PRINT_DIMENSIONS
];

export const PAPER_MATERIALS: PaperMaterial[] = [
  {
    id: 'chassis_8mm',
    name: 'تخته شاسی MDF (ضخامت ۸ میلی‌متر)',
    description: 'چوب فشرده با روکش لبه مشکی PVC، بدون نیاز به قاب، آماده آویزان کردن',
    extraPrice: 65000,
    badge: 'پرفروش‌ترین',
    spec: 'MDF ضدتاب خوردگی'
  },
  {
    id: 'chassis_16mm',
    name: 'تخته شاسی MDF لوکس (ضخامت ۱۶ میلی‌متر)',
    description: 'برجستگی چشم‌نواز روی دیوار با لبه ضخیم و نوار دور درجه یک',
    extraPrice: 120000,
    badge: 'ویژه عروسی و آتلیه',
    spec: 'فوق ضخیم و با وقار'
  },
  {
    id: 'silk_paper',
    name: 'کاغذ سیلک مات مخملی (Fuji Silk)',
    description: 'بافت ریز مخملی، ضد اثر انگشت، بازتاب نور صفر، ماندگاری ۱۰۰ ساله رنگ',
    extraPrice: 40000,
    badge: 'طبیعی و با اصالت',
    spec: 'Fuji Crystal Archive'
  },
  {
    id: 'metallic_paper',
    name: 'کاغذ متالیک براق کریستالی',
    description: 'درخشندگی نقره‌ای خیره‌کننده، عمق رنگ بالا و جلوه ۳ بعدی بی‌نظیر',
    extraPrice: 85000,
    badge: 'فوق‌العاده شفاف',
    spec: 'Metallic Pearl 260g'
  },
  {
    id: 'canvas_fineart',
    name: 'بوم نقاشی کنواس طبیعی (Canvas)',
    description: 'پارچه بافت‌دار هنری کتان با کشش روی کلاف چوبی عمیق',
    extraPrice: 195000,
    badge: 'شاهکار هنری',
    spec: 'کتان خالص ۱۰۰٪'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-101',
    trackingCode: 'NG-84920',
    userId: 'u-sara',
    userName: 'سارا رضایی',
    date: '۱۴۰۵/۰۱/۱۱',
    status: 'printing',
    totalPrice: 420000,
    paymentStatus: 'paid',
    paymentReference: 'SHP-993821034',
    printType: 'wedding',
    uploadedImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
    originalImageName: 'wedding_portrait_2026.jpg',
    aiEffects: {
      colorized: false,
      bgMode: 'original',
      memorialRibbon: false,
      weddingFilter: 'warm',
      autoEnhance: true
    },
    dimensionId: 'size_30x40',
    materialId: 'chassis_16mm',
    quantity: 1,
    hasLamination: true,
    designerRetouch: true,
    deliveryMethod: 'peyk',
    customerInfo: {
      fullName: 'سارا رضایی',
      phoneNumber: '09123456789',
      province: 'تهران',
      city: 'تهران',
      address: 'خیابان ولیعصر، بالاتر از توانیر، کوچه سرو، پلاک ۱۲، واحد ۴',
      postalCode: '1435678912',
      notes: 'لطفاً کناره‌های شاسی کاملاً تمیز و بی‌نقص باشد.'
    },
    discountCode: 'WELCOME',
    discountAmount: 40000,
    paymentMethod: 'online'
  },
  {
    id: 'ord-102',
    trackingCode: 'NG-84921',
    userId: 'u-ali',
    userName: 'علی حسینی',
    date: '۱۴۰۵/۰۱/۱۰',
    status: 'ready_to_ship',
    totalPrice: 195000,
    paymentStatus: 'paid',
    paymentReference: 'SHP-772918231',
    printType: 'bw_to_color',
    uploadedImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80',
    originalImageName: 'grandfather_old_pic.jpg',
    aiEffects: {
      colorized: true,
      bgMode: 'original',
      memorialRibbon: false,
      weddingFilter: 'natural',
      autoEnhance: true
    },
    dimensionId: 'size_20x30',
    materialId: 'chassis_8mm',
    quantity: 1,
    hasLamination: false,
    designerRetouch: true,
    deliveryMethod: 'pishtaz',
    customerInfo: {
      fullName: 'علی حسینی',
      phoneNumber: '09351234567',
      province: 'اصفهان',
      city: 'اصفهان',
      address: 'خیابان چهارباغ بالا، مجتمع تجاری کوثر',
      postalCode: '8174567890',
      notes: 'عکس قدیمی پدربزرگ بود، رنگ‌آمیزی عالی انجام شده ممنون.'
    },
    discountAmount: 0,
    paymentMethod: 'online'
  },
  {
    id: 'ord-103',
    trackingCode: 'NG-84922',
    userId: 'u-maryam',
    userName: 'مریم اکبری',
    date: '۱۴۰۵/۰۱/۰۹',
    status: 'ai_processing',
    totalPrice: 125000,
    paymentStatus: 'paid',
    paymentReference: 'SHP-661092834',
    printType: 'personnel',
    uploadedImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    originalImageName: 'passport_raw.jpg',
    aiEffects: {
      colorized: false,
      bgMode: 'white',
      memorialRibbon: false,
      weddingFilter: 'natural',
      autoEnhance: true
    },
    dimensionId: 'size_3x4',
    materialId: 'silk_paper',
    quantity: 2,
    hasLamination: false,
    designerRetouch: false,
    deliveryMethod: 'peyk',
    customerInfo: {
      fullName: 'مریم اکبری',
      phoneNumber: '09197654321',
      province: 'تهران',
      city: 'تهران',
      address: 'سعادت‌آباد، میدان کاج، خیابان سرو غربی',
      postalCode: '1998765432',
      notes: 'برای تمدید گذرنامه نیاز دارم، زمینه کاملاً سفید باشد.'
    },
    discountAmount: 0,
    paymentMethod: 'online'
  }
];
