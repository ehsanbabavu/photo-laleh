// Seed data inserted into a fresh MongoDB database on first connection.
export const INITIAL_DB = {
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
