// Hero gallery images for the landing page.
// The pictures live in Vercel Blob (public CDN URLs, immutable + long cache),
// so the bundle stays tiny and the gallery can be updated without a redeploy.
export interface HeroSlide {
  src: string;
  alt: string;
}

const BLOB = 'https://p6rt5frbosoaqkcy.public.blob.vercel-storage.com/gallery';

export const HERO_SLIDES: HeroSlide[] = [
  {
    src: `${BLOB}/hero-1-xp2MxGKRGehgdpNYtsym6GmB92TKPa.jpg`,
    alt: 'چاپ عکس عروسی در آتلیه لاله'
  },
  {
    src: `${BLOB}/hero-2-UkgVomZ8mHCMkhqGfQbvmWmDSyIwLD.jpg`,
    alt: 'بازسازی و رنگی‌کردن عکس قدیمی'
  },
  {
    src: `${BLOB}/hero-3-4vK4QsaFqF9kK4J0u1jLgh0xTK9XGl.jpg`,
    alt: 'عکاسی بارداری و چاپ آلبوم خانوادگی'
  },
  {
    src: `${BLOB}/hero-4-IaU9Noa2WOqHEqpbBaIG5figcB0zp9.jpg`,
    alt: 'چاپ عکس پرتره و تبلیغاتی'
  },
  {
    src: `${BLOB}/hero-5-L2xVMtUEyOYHUdqYUjpBbGsM0HUoYy.jpg`,
    alt: 'عکاسی کودک و چاپ عکس کودکانه در آتلیه لاله'
  },
  {
    src: `${BLOB}/hero-6-O6B1hwsUO9HEZiY1dgLQsK2jwkvhyD.jpg`,
    alt: 'چاپ عکس کودک با تم کلاس و اتوبوس مدرسه'
  }
];

/** Public service images (Vercel Blob), keyed by print-type id. */export const SERVICE_IMAGE_BLOB: Record<string, string> = {
  personnel: `${BLOB}/service_card_portrait-xF3ueXpYrmkkyvxXQWrRni4p4J6Q3D.jpg`,
  commercial: `${BLOB}/service_commercial-i4THWdCfMq2S83WFHqcGvd3rvo7vIE.jpg`,
  bw_to_color: `${BLOB}/service_bw_to_color-Q28fz9e4AZsw1Y2WDkXxRlBnjanjwi.jpg`,
  memorial: `${BLOB}/service_memorial-PwPxvzpIH951y23l0QKCyz9Yl8mKoP.jpg`,
  wedding: `${BLOB}/service_wedding-zs4aFRDD2zNX4XKCJLgI3ndVM2fCvJ.jpg`
};

/** Official licence QR code (سامانه ملی مجوزها) and its verification page. */
export const LEGAL_QR_URL = `${BLOB}/legal-qr-EJJINUPKrVZHBDYHa2yv1Uu6ZYsgwo.png`;
export const LEGAL_TRACK_URL = 'https://qr.mojavez.ir/track/8678392';

/** Business licence (پروانه کسب): thumbnail next to the QR + full size for the lightbox. */
export const LICENSE_THUMB_URL = '/license-thumb.svg';
export const LICENSE_IMAGE_URL = '/license.svg';
