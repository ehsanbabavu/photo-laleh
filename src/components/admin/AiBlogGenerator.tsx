import { useId, useRef, useState } from 'react';
import { Sparkles, LoaderCircle } from 'lucide-react';
import { blogRequest } from '../../services/blogClient';
import type { BlogState, BlogPost } from '../../types/blog';
import { BLOG_ARTICLE_TYPES, BLOG_ARTICLE_TOPICS, type BlogArticleType, type BlogArticleTopic } from '../../utils/blogAiOptions';

type GeneratedArticle = { title: string; slug: string; excerpt: string; content: string; seoTitle: string; seoDescription: string; category: string; tags: string[]; imageUrl: string; imageAlt: string };
export function AiBlogGenerator({ state, busy, onPublished, onWorkingChange }: {
  state: BlogState; busy: boolean; onPublished: (post: BlogPost) => void; onWorkingChange?: (working: boolean) => void;
}) {
  const fieldId = useId();
  const [kind, setKind] = useState<BlogArticleType>('guide');
  const [topic, setTopic] = useState<BlogArticleTopic>('auto');
  const [source, setSource] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const workingRef = useRef(false);
  const generate = async () => {
    if (workingRef.current || busy) return;
    if (kind === 'news' && (!source.trim() || !sourceUrl.trim())) { setMessage('برای خبر، متن منبع و نشانی آن را وارد کنید.'); return; }
    workingRef.current = true; setWorking(true); onWorkingChange?.(true); setMessage('');
    try {
      const article = await blogRequest<GeneratedArticle>('/ai-generate', 'POST', { kind, topic: kind === 'news' ? 'auto' : topic, source: source.trim(), sourceUrl: sourceUrl.trim() });
      let category = state.categories.find(item => item.name === article.category);
      if (!category) category = await blogRequest('/categories', 'POST', { name: article.category, slug: '', description: '' });
      const tags = [];
      for (const name of [...new Set(article.tags)].slice(0, 6)) {
        let tag = state.tags.find(item => item.name.toLocaleLowerCase() === name.toLocaleLowerCase());
        if (!tag) tag = await blogRequest('/tags', 'POST', { name, slug: '', description: '' });
        tags.push(tag.id);
      }
      const post = await blogRequest<BlogPost>('/posts', 'POST', {
        title: article.title, slug: article.slug, excerpt: article.excerpt, content: article.content,
        coverImage: article.imageUrl, coverAlt: article.imageAlt, authorName: state.settings.defaultAuthor,
        categoryIds: [category.id], tagIds: tags, status: 'published', publishedAt: new Date().toISOString(),
        seoTitle: article.seoTitle, seoDescription: article.seoDescription, featured: false, allowComments: true, noIndex: false
      });
      onPublished(post);
      setMessage('مطلب تولید و منتشر شد؛ سایت‌مپ با انتشار به‌روز شده است.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'تولید مطلب انجام نشد.'); }
    finally { workingRef.current = false; setWorking(false); onWorkingChange?.(false); }
  };
  return <section className="rounded-2xl border border-violet-200 bg-violet-50 p-5 space-y-3">
    <h3 className="font-black flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-700" />تولید خودکار توسط هوش مصنوعی</h3>
    <p className="text-xs leading-6 text-slate-600">نوع و موضوع مطلب را انتخاب کنید. با زدن دکمهٔ تولید و انتشار، متن، دسته‌بندی، برچسب و تصویر ساخته می‌شود و مطلب در وبلاگ منتشر می‌شود.</p>
    <fieldset disabled={working || busy} className="space-y-3 disabled:opacity-60">
      <legend className="sr-only">تنظیمات تولید مطلب</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label htmlFor={`${fieldId}-kind`} className="block text-xs font-bold">نوع مطلب</label><select id={`${fieldId}-kind`} className="w-full mt-1.5 rounded-xl border bg-white p-3 text-xs font-bold" value={kind} onChange={e => setKind(e.target.value as BlogArticleType)}>{BLOG_ARTICLE_TYPES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
        {kind !== 'news' && <div><label htmlFor={`${fieldId}-topic`} className="block text-xs font-bold">موضوع تولید مطلب</label><select id={`${fieldId}-topic`} className="w-full mt-1.5 rounded-xl border bg-white p-3 text-xs font-bold" value={topic} onChange={e => setTopic(e.target.value as BlogArticleTopic)}>{BLOG_ARTICLE_TOPICS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>}
      </div>
      {kind === 'news' && <><label className="block text-xs font-bold">متن خبر یا نکته‌های منبع<textarea className="w-full mt-1.5 rounded-xl border bg-white p-3" rows={5} maxLength={12000} value={source} onChange={e => setSource(e.target.value)} placeholder="متن منبع را وارد کنید؛ مدل نباید جزئیات تأییدنشده اضافه کند." /></label><label className="block text-xs font-bold">نشانی منبع<input className="w-full mt-1.5 rounded-xl border bg-white p-3" dir="ltr" type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://…" /></label></>}
    </fieldset>
    <button type="button" disabled={working || busy} onClick={() => void generate()} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold bg-violet-700 text-white disabled:opacity-50">{working ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}{working ? 'در حال تولید و انتشار…' : 'تولید و انتشار مطلب'}</button>
    {message && <p role="status" className="text-xs leading-6 text-slate-700">{message}</p>}
  </section>;
}
