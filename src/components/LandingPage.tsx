import React, { useEffect, useMemo, useState } from 'react';
import {
  Sparkles,
  ArrowLeft,
  Wand2,
  Printer,
  Truck,
  ShieldCheck,
  Palette,
  Clock,
  CheckCircle2,
  ChevronDown,
  Ruler,
  Users,
  PhoneCall,
  MapPin,
  Send,
  MessageCircle,
  Layers,
  ScanFace,
  Crop
} from 'lucide-react';
import { PrintDimension, PrintTypeOption } from '../types';
import { PRINT_TYPES, PRINT_DIMENSIONS } from '../data/mockData';
import { formatNumber, formatPrice } from '../utils/formatters';
import { TulipIcon } from './TulipIcon';
import { HERO_SLIDES } from '../data/heroSlides';
import { EitaaIcon, TelegramIcon } from './BrandIcons';

interface LandingPageProps {
  onLogin: () => void;
}


/** Converts ASCII digits to Persian digits and normalises «x» to «×» in size labels. */
const toFaDigits = (value: string): string =>
  String(value || '')
    .replace(/[0-9]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)])
    .replace(/([۰-۹])\s*[xX]\s*([۰-۹])/g, '$1 × $2');

const SERVICE_IMAGE: Record<string, string> = {
  personnel: '/service_card_portrait.jpg',
  commercial: '/service_commercial.jpg',
  bw_to_color: '/service_bw_to_color.jpg',
  memorial: '/service_memorial.jpg',
  wedding: '/service_wedding.jpg'
};

const FEATURES = [
  {
    icon: Wand2,
    title: 'روتوش هوشمند با هوش مصنوعی',
    text: 'بازسازی، رنگی‌کردن و افزایش کیفیت عکس‌های قدیمی با مدل‌های پیشرفته تصویر، بدون از دست رفتن بافت واقعی چهره.'
  },
  {
    icon: Printer,
    title: 'چاپ استودیویی با رنگ واقعی',
    text: 'چاپ روی کاغذ سیلک مات و متالیک با کالیبراسیون رنگ و کنترل کیفیت تک‌به‌تک سفارش‌ها.'
  },
  {
    icon: Ruler,
    title: 'انتخاب آزاد سایز',
    text: 'از عکس پرسنلی ۳×۴ تا تابلو ۵۰×۷۰؛ سایز و جنس چاپ را خودتان در چند کلیک انتخاب می‌کنید.'
  },
  {
    icon: Truck,
    title: 'ارسال سریع و مطمئن',
    text: 'پیک اکسپرس برای تحویل فوری در شهر و پست پیشتاز با بسته‌بندی ضدضربه برای سراسر کشور.'
  },
  {
    icon: ShieldCheck,
    title: 'پرداخت امن و شفاف',
    text: 'پیش‌فاکتور دقیق قبل از پرداخت، درگاه بانکی معتبر و پیگیری خودکار وضعیت واریز.'
  },
  {
    icon: Clock,
    title: 'تحویل در کمترین زمان',
    text: 'پردازش و آماده‌سازی فوری برای سفارش‌های پرسنلی و یادبود؛ زمان‌بندی مشخص برای هر سرویس.'
  }
];

const STEPS = [
  {
    title: 'نوع چاپ را انتخاب کنید',
    text: 'پرسنلی، تبلیغاتی، یادبود، عروسی یا تبدیل عکس قدیمی به رنگی.'
  },
  {
    title: 'عکس خود را آپلود کنید',
    text: 'کیفیت اصلی عکس حفظ می‌شود؛ امکان ارسال چند عکس هم وجود دارد.'
  },
  {
    title: 'سایز و متریال را انتخاب کنید',
    text: 'ابعاد، جنس کاغذ یا شاسی، لمینت و روتوش دستی را مشخص کنید.'
  },
  {
    title: 'پیش‌فاکتور و پرداخت',
    text: 'مبلغ نهایی را ببینید و با درگاه امن پرداخت کنید.'
  },
  {
    title: 'چاپ و ارسال',
    text: 'سفارش شما در استودیو چاپ و با پیک یا پست برایتان ارسال می‌شود.'
  }
];

const FAQS = [
  {
    q: 'برای ثبت سفارش باید از قبل عضو شوم؟',
    a: 'برای ثبت سفارش، پیگیری وضعیت و مشاهده پیش‌فاکتورها باید وارد حساب کاربری خود شوید. ثبت‌نام با شماره موبایل و کد تایید انجام می‌شود و کمتر از یک دقیقه زمان می‌برد.'
  },
  {
    q: 'کیفیت عکسی که آپلود می‌کنم چقدر مهم است؟',
    a: 'هرچه عکس با رزولوشن بالاتری آپلود شود، نتیجه چاپ و روتوش بهتر خواهد بود. تیم ما عکس‌های کم‌کیفیت را تا حد امکان بازیابی می‌کند، اما وضوح نهایی به کیفیت فایل ورودی بستگی دارد.'
  },
  {
    q: 'آیا عکس‌های قدیمی سیاه و سفید واقعاً رنگی می‌شوند؟',
    a: 'بله. سرویس رنگی‌کردن، با تحلیل ویژگی‌های چهره، مو، لباس و نوردهی، رنگ‌های واقع‌گرایانه را بازسازی می‌کند و سپس روی کاغذ چاپ می‌شود.'
  },
  {
    q: 'چه سایزهایی برای چاپ موجود است؟',
    a: 'لیست کامل سایزها به‌روزرسانی می‌شود و در بخش «سایزهای چاپ» همین صفحه قابل مشاهده است. برای هر سرویس، سایزهای مناسب در مرحله انتخاب ابعاد نمایش داده می‌شود.'
  },
  {
    q: 'من همکار چاپ هستم؛ چطور همکاری کنم؟',
    a: 'همکاران با حساب اختصاصی به پنل وارد می‌شوند، لیست سفارش‌های ارسالی و لیست قیمت‌ها را می‌بینند و می‌توانند قیمت تمام‌شده محصولات را پیشنهاد دهند. برای دریافت حساب همکاری با پشتیبانی در تماس باشید.'
  }
];

const NAV_LINKS = [
  { href: '#services', label: 'خدمات' },
  { href: '#features', label: 'مزیت‌ها' },
  { href: '#steps', label: 'مراحل سفارش' },
  { href: '#sizes', label: 'سایزها' },
  { href: '#partners', label: 'همکاری' },
  { href: '#faq', label: 'سوالات' }
];

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [scrolled, setScrolled] = useState(false);
  const [printTypes, setPrintTypes] = useState<PrintTypeOption[]>([]);
  const [dimensions, setDimensions] = useState<PrintDimension[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  // Hero gallery: auto-advance every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((current) => (current + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/public/landing', { cache: 'no-store' });
        if (!res.ok) throw new Error(`landing ${res.status}`);
        const data = await res.json();
        if (!active) return;
        // The database is the single source of truth — including when it is empty
        setPrintTypes(Array.isArray(data.printTypes) ? data.printTypes : []);
        setDimensions(Array.isArray(data.dimensions) ? data.dimensions : []);
        setCatalogLoaded(true);
      } catch {
        // Offline / API failure: keep the page usable with the built-in catalog
        if (active && !catalogLoaded) {
          setPrintTypes(PRINT_TYPES);
          setDimensions(PRINT_DIMENSIONS);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const minPrice = useMemo(() => {
    const prices = printTypes
      .map((type) => Number(type.basePrice) || 0)
      .filter((price) => price > 0);
    return prices.length > 0 ? Math.min(...prices) : 0;
  }, [printTypes]);

  const goTo = (href: string) => {
    const target = document.querySelector(href);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-[100dvh] bg-[#f7fafc] text-slate-900 overflow-x-hidden">
      {/* ================= HEADER ================= */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/85 backdrop-blur-xl border-b border-slate-200/80 shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 sm:h-[72px] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center p-1.5 overflow-hidden">
                <TulipIcon className="w-full h-full object-contain" />
              </div>
              <div className="leading-tight">
                <p className="text-sm sm:text-base font-black">
                  <span className="text-slate-900">آتلیه دیجیتال </span>
                  <span className="text-red-600">لاله</span>
                </p>
              </div>
            </div>

            <nav className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.href}
                  onClick={() => goTo(link.href)}
                  className="px-3.5 py-2 rounded-xl text-[13px] font-bold text-slate-600 hover:text-sky-700 hover:bg-sky-50 transition-colors cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

      </header>

      {/* ================= HERO ================= */}
      <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-24 w-[26rem] h-[26rem] rounded-full bg-sky-400/20 blur-3xl" />
          <div className="absolute top-24 -left-24 w-[22rem] h-[22rem] rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-[18rem] h-[18rem] rounded-full bg-teal-300/20 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
              maskImage: 'radial-gradient(ellipse at 50% 0%, black 30%, transparent 75%)',
              WebkitMaskImage: 'radial-gradient(ellipse at 50% 0%, black 30%, transparent 75%)'
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Copy */}
            <div className="lg:col-span-6 animate-landing-up">
              <h1 className="text-3xl sm:text-4xl lg:text-[3.25rem] font-black leading-[1.25] tracking-tight">
                خاطره‌هایت را
                <span className="relative inline-block mx-1.5">
                  <span className="relative z-10 bg-gradient-to-l from-sky-600 via-teal-600 to-emerald-600 bg-clip-text text-transparent">
                    زنده
                  </span>
                  <span className="absolute inset-x-0 bottom-1 h-3 bg-emerald-200/60 rounded-full -z-0" />
                </span>
                کن،
                <br className="hidden sm:block" />
                روی کاغذ چاپش کن
              </h1>

              <p className="mt-4 sm:mt-5 text-sm sm:text-base text-slate-600 leading-8 max-w-xl">
                آتلیه دیجیتال لاله با نیم قرن تجربه، از گذشته تا به امروز شاهد ثبت لحظات
                خاطره‌انگیزی بوده است و با گذشت زمان از فناوری‌های به‌روز جهت چاپ با کیفیت عکس‌ها
                استفاده کرده است.
              </p>

              <p className="mt-3 text-sm sm:text-base font-black text-slate-900 leading-8 max-w-xl">
                ثبت خاطرات خود را به ما بسپارید
              </p>

              <div className="mt-7 flex items-center">
                <button
                  onClick={onLogin}
                  className="flex w-full sm:inline-flex sm:w-auto items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-black text-white bg-gradient-to-l from-sky-600 via-teal-600 to-emerald-600 hover:from-sky-700 hover:to-emerald-700 shadow-xl shadow-sky-600/25 active:scale-[0.98] transition-all cursor-pointer"
                >
                  ورود و ثبت نام
                </button>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
                {[
                  { value: formatNumber(printTypes.length), label: 'سرویس چاپ تخصصی' },
                  { value: formatNumber(dimensions.length), label: 'سایز آماده چاپ' },
                  { value: '۲۴ ساعته', label: 'ثبت سفارش آنلاین' }
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="p-3 rounded-2xl bg-white/70 backdrop-blur border border-slate-200 text-center shadow-xs"
                  >
                    <p className="text-base sm:text-lg font-black text-slate-900">{stat.value}</p>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual */}
            <div className="lg:col-span-6 relative animate-landing-up-delayed">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="absolute -inset-3 bg-gradient-to-tr from-sky-200/60 via-teal-200/40 to-emerald-200/60 rounded-[2.2rem] blur-xl" />

                <div className="relative rounded-[2rem] bg-white border border-slate-200 shadow-2xl shadow-slate-300/40 p-3 sm:p-4">
                  <div className="relative rounded-[1.5rem] overflow-hidden aspect-[4/3] bg-slate-900">
                    {HERO_SLIDES.map((slide, index) => (
                      <img
                        key={slide.src}
                        src={slide.src}
                        alt={slide.alt}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        onError={(event) => {
                          // Keep the slider graceful if an image has not been uploaded yet
                          event.currentTarget.style.visibility = 'hidden';
                        }}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out ${
                          index === activeSlide ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Slide navigation — below the image */}
                  <div className="mt-3 flex items-center justify-center gap-1.5">
                    {HERO_SLIDES.map((slide, index) => (
                      <button
                        key={`dot-${index}`}
                        onClick={() => setActiveSlide(index)}
                        aria-label={`نمایش تصویر ${index + 1}`}
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                          index === activeSlide
                            ? 'w-7 bg-gradient-to-l from-sky-600 to-emerald-500'
                            : 'w-2 bg-slate-300 hover:bg-slate-400'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      { icon: Wand2, title: 'روتوش AI', desc: 'بازسازی چهره' },
                      { icon: Crop, title: 'سایز دلخواه', desc: '۳×۴ تا ۵۰×۷۰' },
                      { icon: Truck, title: 'ارسال سریع', desc: 'پیک و پست' }
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.title}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 text-center"
                        >
                          <Icon className="w-4 h-4 text-sky-600 mx-auto" />
                          <p className="text-[10px] font-black text-slate-800 mt-1">{item.title}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">{item.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TRUST STRIP ================= */}
      <section className="relative border-y border-slate-200 bg-white/70 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: ScanFace, text: 'روتوش و بازسازی چهره' },
              { icon: Palette, text: 'چاپ رنگ کالیبره‌شده' },
              { icon: Layers, text: 'کاغذ و شاسی' },
              { icon: Users, text: 'پشتیبانی و همکاری' }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.text} className="flex items-center justify-center gap-2 text-slate-600">
                  <Icon className="w-4 h-4 text-sky-600 flex-shrink-0" />
                  <span className="text-[11px] sm:text-xs font-bold">{item.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= SERVICES ================= */}
      <section id="services" className="relative py-16 sm:py-24 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-[11px] font-black text-sky-700">
              <Palette className="w-3.5 h-3.5" />
              خدمات آتلیه
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-snug">
              هر عکس، یک سرویس اختصاصی
            </h2>
            <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-8">
              برای هر نیاز، یک مسیر حرفه‌ای آماده کرده‌ایم؛ از عکس پرسنلی اداری تا بازسازی
              خاطرات قدیمی و تابلوهای هنری.
            </p>
          </div>

          {printTypes.length === 0 ? (
            <div className="mt-9 p-8 rounded-3xl bg-white border border-dashed border-slate-300 text-center">
              <p className="text-sm font-bold text-slate-700">در حال آماده‌سازی سرویس‌های چاپ</p>
              <p className="text-xs text-slate-500 mt-1">به‌زودی خدمات آتلیه در این بخش نمایش داده می‌شود.</p>
            </div>
          ) : (
          <div className="mt-9 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {printTypes.map((service) => (
              <article
                key={service.id}
                className="group relative rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="relative h-40 sm:h-44 overflow-hidden bg-slate-100">
                  <img
                    src={SERVICE_IMAGE[service.id] || service.cardBgImage || service.sampleImage || '/logo.png'}
                    alt={service.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                  {service.tag && (
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur text-[10px] font-black text-slate-800 shadow-sm">
                      {service.tag}
                    </span>
                  )}
                  <h3 className="absolute bottom-3 right-3 left-3 text-white text-sm sm:text-base font-black">
                    {service.title}
                  </h3>
                </div>

                <div className="p-4 sm:p-5">
                  <p className="text-[11px] sm:text-xs text-sky-700 font-bold">{service.subtitle}</p>
                  <p className="mt-2 text-[11px] sm:text-xs text-slate-600 leading-7 line-clamp-3">
                    {service.description}
                  </p>

                  <ul className="mt-3 space-y-1.5">
                    {(service.features || []).slice(0, 3).map((feature) => (
                      <li key={feature} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="leading-6">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500">شروع قیمت از</p>
                      <p className="text-sm font-black text-slate-900 font-mono">
                        {formatPrice(service.basePrice)}
                      </p>
                    </div>
                    <button
                      onClick={onLogin}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors cursor-pointer"
                    >
                      ثبت سفارش
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          )}
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section id="features" className="relative py-16 sm:py-24 bg-white border-y border-slate-200 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-black text-emerald-700">
              <Sparkles className="w-3.5 h-3.5" />
              چرا آتلیه لاله
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-snug">
              کیفیت استودیویی، تجربه دیجیتال
            </h2>
            <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-8">
              ترکیبی از پردازش تصویر حرفه‌ای و چاپ دقیق، با فرآیندی ساده که تمام مراحلش آنلاین است.
            </p>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group p-5 rounded-3xl bg-slate-50/80 border border-slate-200 hover:bg-white hover:border-sky-200 hover:shadow-lg transition-all duration-300"
                >
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="mt-3.5 text-sm sm:text-base font-black text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-[11px] sm:text-xs text-slate-600 leading-7">{feature.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= STEPS ================= */}
      <section id="steps" className="relative py-16 sm:py-24 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5 lg:sticky lg:top-28">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-[11px] font-black text-teal-700">
                <Clock className="w-3.5 h-3.5" />
                فرآیند سفارش
              </span>
              <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-snug">
                از عکس تا قاب، در ۵ قدم
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 leading-8">
                همه‌چیز آنلاین و شفاف است؛ در هر مرحله می‌دانید چه اتفاقی می‌افتد و مبلغ نهایی چقدر
                است.
              </p>

              <div className="mt-6 p-4 rounded-2xl bg-gradient-to-l from-sky-50 to-emerald-50 border border-sky-200">
                <p className="text-[11px] sm:text-xs text-slate-700 leading-7 font-medium">
                  <span className="font-black text-slate-900">نکته:</span> اگر بین مراحل ثبت سفارش
                  از صفحه خارج شوید، اطلاعات شما ذخیره می‌شود و می‌توانید از همان‌جا ادامه دهید.
                </p>
              </div>

              <button
                onClick={onLogin}
                className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black text-white bg-gradient-to-l from-sky-600 to-emerald-600 shadow-lg shadow-sky-600/20 hover:from-sky-700 hover:to-emerald-700 transition-all cursor-pointer"
              >
                شروع کنید
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="lg:col-span-7">
              <div className="space-y-3">
                {STEPS.map((step, index) => (
                  <div
                    key={step.title}
                    className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-sky-200 hover:shadow-md transition-all"
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-500 text-white flex items-center justify-center font-black text-xs sm:text-sm flex-shrink-0 shadow-sm">
                      {formatNumber(index + 1)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-black text-slate-900">{step.title}</h3>
                      <p className="mt-1 text-[11px] sm:text-xs text-slate-600 leading-6">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SIZES ================= */}
      <section id="sizes" className="relative py-16 sm:py-24 bg-white border-y border-slate-200 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-black text-amber-700">
                <Ruler className="w-3.5 h-3.5" />
                سایزهای چاپ
              </span>
              <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black leading-snug">
                از کارت‌پستالی تا تابلو دیواری
              </h2>
              <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-8">
                سایزهای پرکاربرد آماده چاپ هستند و هزینه نهایی بر اساس نوع چاپ، سایز و متریال
                انتخابی در پیش‌فاکتور محاسبه می‌شود.
              </p>
            </div>
            {minPrice > 0 && (
              <div className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 self-start sm:self-auto">
                <p className="text-[10px] text-slate-500">شروع قیمت خدمات</p>
                <p className="text-sm font-black text-slate-900 font-mono">{formatPrice(minPrice)}</p>
              </div>
            )}
          </div>

          {dimensions.length === 0 ? (
            <div className="mt-8 p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-500">
              سایزهای چاپ به‌زودی از پنل مدیریت اضافه می‌شوند.
            </div>
          ) : (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {dimensions.map((dimension) => (
              <div
                key={dimension.id}
                className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:bg-white hover:border-sky-200 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-sky-700 bg-white border border-sky-200 rounded-md px-1.5 py-0.5">
                    {toFaDigits(dimension.dimensionsCm)}
                  </span>
                  {dimension.popular && (
                    <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-1.5 py-0.5">
                      محبوب
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[11px] sm:text-xs font-black text-slate-900 leading-6">
                  {dimension.title}
                </p>
                {dimension.aspectRatio && dimension.aspectRatio !== '—' && (
                  <p className="mt-1 text-[10px] text-slate-500 font-mono">{toFaDigits(dimension.aspectRatio)}</p>
                )}
              </div>
            ))}
          </div>
          )}
        </div>
      </section>

      {/* ================= PARTNERS ================= */}
      <section id="partners" className="relative py-16 sm:py-24 scroll-mt-24 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -bottom-24 right-1/4 w-80 h-80 rounded-full bg-emerald-300/20 blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] bg-gradient-to-l from-sky-700 via-teal-700 to-emerald-700 text-white p-6 sm:p-10 shadow-2xl shadow-teal-900/20">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-[11px] font-black text-white">
                  <Users className="w-3.5 h-3.5" />
                  باشگاه همکاران لاله
                </span>
                <h2 className="mt-3 text-2xl sm:text-3xl font-black leading-snug">
                  همکار چاپ هستید؟ با ما همکاری کنید
                </h2>
                <p className="mt-3 text-xs sm:text-sm text-emerald-50/90 leading-7">
                  همکاران ما در پنل اختصاصی خود لیست سفارش‌های ارسالی و لیست قیمت‌ها را می‌بینند،
                  سفارش‌ها با جزئیات کامل چاپ (سایز و تعداد) در تلگرام یا ایتا دریافت می‌کنند و
                  فاکتور همکاری به‌صورت خودکار صادر و قابل تسویه است.
                </p>

                <ul className="mt-4 grid sm:grid-cols-2 gap-2">
                  {[
                    'دریافت سفارش در تلگرام یا ایتا',
                    'لیست قیمت اختصاصی',
                    'فاکتور و تسویه شفاف',
                    'پشتیبانی اختصاصی همکاران'
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-1.5 text-[11px] sm:text-xs text-white/90">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={onLogin}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white text-slate-900 text-sm font-black hover:bg-slate-50 active:scale-[0.99] transition-all cursor-pointer"
                >
                  ورود همکاران
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <p className="text-[10px] sm:text-[11px] text-emerald-50/80 text-center leading-6">
                  حساب همکاری توسط مدیر آتلیه ساخته می‌شود. برای دریافت حساب با پشتیبانی در تماس
                  باشید.
                </p>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  {[
                    { icon: Send, label: 'تلگرام' },
                    { icon: MessageCircle, label: 'ایتا' },
                    { icon: PhoneCall, label: 'تلفن' }
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/10 border border-white/20 text-[10px] font-bold"
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {item.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section id="faq" className="relative py-16 sm:py-24 bg-white border-t border-slate-200 scroll-mt-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-[11px] font-black text-sky-700">
              <MessageCircle className="w-3.5 h-3.5" />
              سوالات متداول
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-black">هر آنچه باید بدانید</h2>
          </div>

          <div className="mt-8 space-y-2.5">
            {FAQS.map((faq, index) => {
              const open = openFaq === index;
              return (
                <div
                  key={faq.q}
                  className={`rounded-2xl border transition-all ${
                    open ? 'bg-sky-50/60 border-sky-300' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(open ? null : index)}
                    className="w-full flex items-center justify-between gap-3 p-4 text-right cursor-pointer"
                  >
                    <span className="text-xs sm:text-sm font-black text-slate-900">{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform ${
                        open ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {open && (
                    <p className="px-4 pb-4 text-[11px] sm:text-xs text-slate-600 leading-7 animate-landing-fade">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="bg-slate-900 text-slate-300 pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mx-auto text-center">
            <div>
              <div className="flex items-center justify-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center p-1.5 overflow-hidden">
                  <TulipIcon className="w-full h-full object-contain" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">
                    آتلیه دیجیتال <span className="text-red-400">لاله</span>
                  </p>
                  <p className="text-[11px] text-slate-400">چاپ عکس و روتوش هوش مصنوعی</p>
                </div>
              </div>
              <p className="mt-4 text-[11px] sm:text-xs leading-7 text-slate-400 max-w-md mx-auto">
                سامانه سفارش آنلاین چاپ عکس با پردازش هوشمند تصویر؛ از عکس پرسنلی و تبلیغاتی تا
                بازسازی خاطرات قدیمی و تابلوهای هنری، با تحویل سریع در سراسر کشور.
              </p>

              {/* Messenger bots */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-2xl mx-auto text-right">
                <a
                  href="https://t.me/photo_laleh_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-sky-400/40 transition-all"
                >
                  <span className="w-9 h-9 rounded-xl bg-[#229ED9] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <TelegramIcon className="w-5 h-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-black text-white">ربات تلگرام</span>
                    <span className="block text-[10px] font-mono text-slate-400 truncate" dir="ltr">
                      @photo_laleh_bot
                    </span>
                  </span>
                </a>

                <a
                  href="https://eitaa.com/photo_laleh_app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-emerald-400/40 transition-all"
                >
                  <span className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm bg-white/10">
                    <EitaaIcon className="w-full h-full object-cover" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-black text-white">ربات ایتا</span>
                    <span className="block text-[10px] font-mono text-slate-400 truncate" dir="ltr">
                      eitaa.com/photo_laleh_app
                    </span>
                  </span>
                </a>

                <a
                  href="tel:+989135621232"
                  className="group flex items-center gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-amber-400/40 transition-all"
                >
                  <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <PhoneCall className="w-5 h-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-black text-white">تماس با ما</span>
                    <span className="block text-[10px] font-mono text-slate-400 truncate" dir="ltr">
                      09135621232
                    </span>
                  </span>
                </a>
              </div>

              {/* Address */}
              <div className="mt-2.5 max-w-2xl mx-auto">
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10 text-right">
                  <span className="w-9 h-9 rounded-xl bg-white/10 text-emerald-300 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-black text-white">آدرس آتلیه</span>
                    <span className="block text-[11px] sm:text-xs leading-6 text-slate-300">
                      اصفهان، خانه اصفهان، خیابان شهید اسماعیلی
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-9 pt-5 border-t border-white/10 flex items-center justify-center">
            <p className="text-[10px] sm:text-[11px] text-slate-500 text-center">
              © {new Date().toLocaleDateString('fa-IR', { year: 'numeric' })} آتلیه دیجیتال لاله —
              تمامی حقوق محفوظ است.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
