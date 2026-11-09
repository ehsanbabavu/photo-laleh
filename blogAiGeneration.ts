import { BlogError } from './blogService';
import { safeBlogUrl } from './src/utils/blogContent';

const modelName = /^[\w./:-]{1,100}$/;
export function normalizeAvalAiSettingsPatch(value: Record<string, any>) {
  const patch = { ...value };
  for (const key of ['avalaiApiKey', 'avalaiBaseUrl', 'avalaiModel', 'avalaiTextModel']) {
    if (patch[key] === undefined) continue;
    if (typeof patch[key] !== 'string') throw new BlogError(400, 'تنظیمات اتصال به هوش مصنوعی معتبر نیست.');
    patch[key] = patch[key].trim();
    if (key === 'avalaiBaseUrl') patch[key] = patch[key].replace(/\/+$/, '');
    if ((key === 'avalaiModel' || key === 'avalaiTextModel') && !modelName.test(patch[key])) {
      throw new BlogError(400, 'نام مدل متن و تصویر را در تنظیمات هوش مصنوعی بررسی کنید.');
    }
  }
  if (patch.aiEnabled !== undefined && typeof patch.aiEnabled !== 'boolean') throw new BlogError(400, 'وضعیت سرویس هوش مصنوعی معتبر نیست.');
  return patch;
}

// Model selection belongs to the saved administrator settings, never to env
// overrides or the request body. Read it again for every generation request.
export function resolveAvalAiBlogSettings(settings: Record<string, any>) {
  const config = normalizeAvalAiSettingsPatch(settings);
  if (config.aiEnabled === false) throw new BlogError(400, 'سرویس هوش مصنوعی در تنظیمات خاموش است.');
  for (const [key, label] of [['avalaiTextModel', 'متن'], ['avalaiModel', 'تصویر']]) {
    if (!config[key]) throw new BlogError(400, `مدل تولید ${label} را در تنظیمات هوش مصنوعی ثبت و ذخیره کنید.`);
  }
  const apiKey = String(config.avalaiApiKey || process.env.AVALAI_API_KEY || '').trim();
  if (!apiKey) throw new BlogError(400, 'کلید AvalAI را در تنظیمات هوش مصنوعی ثبت و ذخیره کنید.');
  const baseUrl = String(config.avalaiBaseUrl || process.env.AVALAI_BASE_URL || 'https://api.avalai.ir/v1').trim().replace(/\/+$/, '');
  return { apiKey, baseUrl, textModel: config.avalaiTextModel as string, imageModel: config.avalaiModel as string };
}
type AiConfig = ReturnType<typeof resolveAvalAiBlogSettings>;

export async function requestAvalAi(config: AiConfig, endpoint: string, payload: Record<string, any>, stage: 'متن' | 'تصویر', request = fetch) {
  const model = String(payload.model);
  let response: Response;
  try {
    response = await request(`${config.baseUrl}${endpoint}`, {
      method: 'POST', headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(stage === 'تصویر' ? 120_000 : 55_000)
    });
  } catch {
    throw new BlogError(504, `پاسخ تولید ${stage} از AvalAI دریافت نشد (مدل: ${model}). دوباره تلاش کنید.`);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const error = body?.error;
    let detail = String(error?.message || body?.message || error?.code || (typeof error === 'string' ? error : '') || '');
    detail = detail.split(config.apiKey).join('[کلید حذف شد]')
      .replace(/Bearer\s+[^\s"<>]+/gi, 'Bearer [حذف شد]')
      .replace(/\b(?:aa|sk)-[\w-]+/g, '[کلید حذف شد]')
      .replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 500);
    throw new BlogError(502, `تولید ${stage} AvalAI انجام نشد (مدل: ${model}، HTTP ${response.status})${detail ? `: ${detail}` : '.'}`);
  }
  try { return await response.json(); }
  catch { throw new BlogError(502, `پاسخ تولید ${stage} AvalAI قابل خواندن نبود (مدل: ${model}).`); }
}

async function uploadBlogImage(bytes: Buffer, contentType: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new BlogError(503, 'تصویر تولید شد، اما ذخیره‌سازی تصویر در Vercel Blob تنظیم نشده است.');
  const extension = contentType === 'image/jpeg' ? 'jpg' : contentType === 'image/webp' ? 'webp' : 'png';
  try {
    const { put } = await import('@vercel/blob');
    const blob = await put(`blog/ai/cover.${extension}`, bytes, { access: 'public', contentType, addRandomSuffix: true });
    return blob.url;
  } catch { throw new BlogError(503, 'تصویر تولید شد، اما ذخیره‌سازی آن ناموفق بود. اتصال فضای تصاویر را بررسی کنید.'); }
}

export async function generateAvalAiBlogCover(config: AiConfig, prompt: string, deps: {
  fetch?: typeof fetch; upload?: (bytes: Buffer, contentType: string) => Promise<string>;
} = {}) {
  const gemini = /^gemini-/i.test(config.imageModel);
  const payload = gemini ? {
    model: config.imageModel, messages: [{ role: 'user', content: prompt }], modalities: ['image', 'text'],
    generationConfig: { imageConfig: { aspectRatio: '1:1', ...(/gemini-(?:3|nano)/i.test(config.imageModel) ? { imageSize: '1K' } : {}) } }
  } : { model: config.imageModel, prompt, n: 1, size: '1024x1024' };
  const data = await requestAvalAi(config, gemini ? '/chat/completions' : '/images/generations', payload, 'تصویر', deps.fetch);
  const message = data.choices?.[0]?.message;
  const item = data.data?.[0];
  const parts = Array.isArray(message?.content) ? message.content : [];
  const value = item?.url || message?.images?.[0]?.image_url?.url || parts.find((part: any) => part.type === 'image_url')?.image_url?.url;
  const encoded = typeof value === 'string' ? value.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/) : null;
  const base64 = encoded?.[2] || item?.b64_json;
  if (typeof base64 === 'string') {
    if (base64.length > 16_000_000 || !/^[A-Za-z0-9+/=\s]+$/.test(base64)) throw new BlogError(502, 'داده تصویر تولیدشده معتبر نیست.');
    const bytes = Buffer.from(base64, 'base64');
    const contentType = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png'
      : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'image/jpeg'
      : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp' : '';
    if (!contentType || bytes.length > 12_000_000) throw new BlogError(502, 'فرمت یا اندازه تصویر تولیدشده معتبر نیست.');
    const url = safeBlogUrl(await (deps.upload || uploadBlogImage)(bytes, contentType));
    if (!url) throw new BlogError(502, 'آدرس تصویر ذخیره‌شده معتبر نیست.');
    return url;
  }
  const url = safeBlogUrl(value);
  if (!url) throw new BlogError(502, `مدل تصویر خروجی قابل استفاده برنگرداند (مدل: ${config.imageModel}).`);
  return url;
}
