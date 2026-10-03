/**
 * 9-Photo Print Sheet Generator (تولیدکننده شیت ۹ تایی چاپ آتلیه)
 * 
 * ابعاد دقیق فیزیکی لابراتوار چاپ در رزولوشن استاندارد ۳۰۰ DPI:
 * - اندازه کاغذ: دقیقا ۱۰ × ۱۵ سانتی‌متر عمودی (1181 × 1772 پیکسل در 300DPI)
 * - اندازه هر قطعه عکس: دقیقا ۳ × ۴ سانتی‌متر (354 × 472 پیکسل در 300DPI)
 * - چیدمان: ۳ ستون در ۳ ردیف (مجموعاً ۹ قطعه عکس پرسنلی استاندارد)
 * - فواصل و حاشیه‌های منظم بدون هیچ‌گونه متن، لوگو یا توضیحات اضافی
 * - کادر کم‌رنگ دور هر عکس جهت راهنمای برش آسان
 */

export interface SheetOptions {
  paperSize?: '10x15';
}

export async function generateNinePackSheet(
  imageUrl: string,
  _options: SheetOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context not available');
        }

        // Exact 10 x 15 cm paper dimensions at 300 DPI:
        // 10 cm / 2.54 * 300 = 1181.1 px -> 1181 px
        // 15 cm / 2.54 * 300 = 1771.65 px -> 1772 px
        const canvasWidth = 1181;
        const canvasHeight = 1772;

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // Pure clean white photo paper background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 9-Photo Grid: 3 rows x 3 columns
        const cols = 3;
        const rows = 3;

        // Exact 3 x 4 cm photo dimensions at 300 DPI:
        // 3 cm / 2.54 * 300 = 354.33 px -> 354 px
        // 4 cm / 2.54 * 300 = 472.44 px -> 472 px
        const photoWidth = 354;
        const photoHeight = 472;

        // Spacing between photos for easy trimming
        const spacingX = 30; // 0.25 cm horizontal gap between columns
        const spacingY = 50; // 0.42 cm vertical gap between rows

        // Calculate total grid dimensions
        const gridTotalWidth = cols * photoWidth + (cols - 1) * spacingX; // 3 * 354 + 2 * 30 = 1122 px
        const gridTotalHeight = rows * photoHeight + (rows - 1) * spacingY; // 3 * 472 + 2 * 50 = 1516 px

        // Exact centering coordinates on the 10x15 cm sheet
        const startX = Math.round((canvasWidth - gridTotalWidth) / 2); // (1181 - 1122) / 2 = 29.5 -> 30 px
        const startY = Math.round((canvasHeight - gridTotalHeight) / 2); // (1772 - 1516) / 2 = 128 px

        // Calculate source image crop (preserve 3:4 aspect ratio of source image without stretching)
        const srcW = img.naturalWidth || img.width;
        const srcH = img.naturalHeight || img.height;
        const targetAspect = 3 / 4;
        const srcAspect = srcW / srcH;

        let cropX = 0;
        let cropY = 0;
        let cropW = srcW;
        let cropH = srcH;

        if (srcAspect > targetAspect) {
          // Source is wider than 3:4 -> crop sides evenly
          cropW = Math.round(srcH * targetAspect);
          cropX = Math.round((srcW - cropW) / 2);
        } else {
          // Source is taller than 3:4 -> crop top/bottom evenly
          cropH = Math.round(srcW / targetAspect);
          cropY = Math.round((srcH - cropH) / 2);
        }

        // Draw 9 photos in the 3x3 grid
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const x = startX + c * (photoWidth + spacingX);
            const y = startY + r * (photoHeight + spacingY);

            ctx.save();

            // Draw image cropped cleanly
            ctx.drawImage(
              img,
              cropX,
              cropY,
              cropW,
              cropH,
              x,
              y,
              photoWidth,
              photoHeight
            );

            // Draw faint light border around each 3x4 photo
            ctx.strokeStyle = '#D1D5DB'; // faint light gray outline
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, photoWidth, photoHeight);

            ctx.restore();
          }
        }

        // Export as High-Quality JPEG (95%)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for sheet generation'));
    };

    img.src = imageUrl;
  });
}

// Backward compatibility alias
export const generateSixPackSheet = generateNinePackSheet;

/**
 * Triggers a direct browser download for a data URL or image source.
 */
export function downloadImage(dataUrl: string, fileName: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
