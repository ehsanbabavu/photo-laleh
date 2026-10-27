import { PrintDimension, PaperMaterial, PrintTypeOption, Order, SupportTicket, Announcement } from '../types';

export const PRINT_TYPES: PrintTypeOption[] = [
  {
    id: 'personnel',
    dimensionIds: ['personnel_6x3x4', 'personnel_12x3x4'],
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
    dimensionIds: ['size_10x15', 'size_13x18', 'size_16x21', 'size_20x30', 'size_30x40', 'size_50x70'],
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
    dimensionIds: ['size_10x15', 'size_13x18', 'size_16x21', 'size_20x30', 'size_30x40', 'size_50x70'],
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
    dimensionIds: ['size_10x15', 'size_13x18', 'size_16x21', 'size_20x30', 'size_30x40', 'size_50x70'],
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
    dimensionIds: ['size_10x15', 'size_13x18', 'size_16x21', 'size_20x30', 'size_30x40', 'size_50x70'],
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
    title: '۹ عدد عکس ۳×۴ و یک عدد عکس تبلیغاتی',
    dimensionsCm: '9x (3×4 cm) + 1x تبلیغاتی',
    aspectRatio: '3:4',
    basePrice: 0,
    description: 'شامل ۹ قطعه عکس استاندارد ۳×۴ به همراه یک قطعه عکس هدیه تبلیغاتی استودیو',
    popular: true
  },
  {
    id: 'personnel_12x3x4',
    title: '۱۸ عدد عکس ۳×۴ و یک عدد عکس تبلیغاتی',
    dimensionsCm: '18x (3×4 cm) + 1x تبلیغاتی',
    aspectRatio: '3:4',
    basePrice: 40000,
    description: 'شامل ۱۸ قطعه عکس استاندارد ۳×۴ به همراه یک قطعه عکس هدیه تبلیغاتی استودیو',
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
];

export const INITIAL_TICKETS: SupportTicket[] = [
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
  },
  {
    id: 't-102',
    trackingNumber: 'TCK-8920',
    userId: 'u-1',
    userName: 'احسان باباگلی',
    userPhone: '09123456789',
    subject: 'استعلام چاپ روی بوم کنواس برای عکس نامزدی',
    category: 'print_quality',
    priority: 'medium',
    status: 'in_progress',
    createdAt: '۱۴۰۵/۰۱/۱۳ - ۱۶:۴۵',
    updatedAt: '۱۴۰۵/۰۱/۱۳ - ۱۷:۰۰',
    messages: [
      {
        id: 'm-3',
        sender: 'user',
        senderName: 'احسان باباگلی',
        message: 'سلام، قصد دارم عکس مراسم نامزدی را در سایز ۵۰×۷۰ روی بوم کنواس با کلاف چوبی سفارش دهم. آیا روی بوم، روتوش چهره با رزولوشن بالا انجام می‌شود که بافت پارچه افت کیفیت نداشته باشد؟',
        createdAt: '۱۴۰۵/۰۱/۱۳ - ۱۶:۴۵'
      },
      {
        id: 'm-4',
        sender: 'support',
        senderName: 'کارشناس آتلیه لاله',
        message: 'سلام و تبریک فراوان، بله دقیقاً؛ تمامی فایل‌های چاپ کنواس ابتدا از الگوریتم ارتقای رزولوشن ۴ برابری عبور داده می‌شوند و سپس با جوهر ۱۲ رنگ پیگمنت ضدآب روی بوم ایتالیایی چاپ می‌شوند. همکاران طراحی در حال بررسی کادر شما هستند.',
        createdAt: '۱۴۰۵/۰۱/۱۳ - ۱۷:۰۰'
      }
    ]
  }
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
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
  },
  {
    id: 'ann-3',
    title: 'ساعات کاری و ارسال سریع سفارش‌های حضوری و پیکی در روزهای تعطیل',
    content: 'بخش چاپ و لابراتوار تخصصی آتلیه دیجیتال لاله در تمام روزهای هفته فعال بوده و سفارشات فوری با پیک موتوری در کمتر از ۲ ساعت تحویل می‌گردند.',
    priority: 'normal',
    createdAt: '۱۴۰۳/۰۷/۰۵',
    isActive: true,
    readBy: []
  }
];

