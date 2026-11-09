import { useState } from 'react';
import { Sparkles, LoaderCircle } from 'lucide-react';
import { blogRequest } from '../../services/blogClient';
import type { BlogState, BlogPost } from '../../types/blog';

type GeneratedArticle = { title: string; slug: string; excerpt: string; content: string; seoTitle: string; seoDescription: string; category: string; tags: string[]; imageUrl: string; imageAlt: string };
export function AiBlogGenerator({ state, busy, onPublished }: { state: BlogState; busy: boolean; onPublished: (post: BlogPost) => void }) {
  const [kind, setKind] = useState<'guide' | 'news'>('guide');
  const [source, setSource] = useState('');
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const generate = async () => {
    if (kind === 'news' && !source.trim()) { setMessage('برای خبر، نشانی منبع معتبر را وارد کنید.'); return; }
    setWorking(true); setMessage('');
    try {
      const article = await blogRequest<GeneratedArticle>('/ai-generate', 'POST', { kind, source: source.trim() });
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
    finally { setWorking(false); }
  };
  return <section className="rounded-2xl border border-violet-200 bg-violet-50 p-5 space-y-3">
    <h3 className="font-black flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-700" />تولید خودکار توسط هوش مصنوعی</h3>
    <p className="text-xs leading-6 text-slate-600">موضوع مرتبط با عکاسی، چاپ عکس و نگهداری خاطره‌ها انتخاب می‌شود؛ دسته‌بندی، برچسب، تصویر و انتشار نیز خودکار انجام می‌شود.</p>
    <label className="block text-xs font-bold">نوع مطلب<select className="w-full mt-1.5 rounded-xl border bg-white p-3" value={kind} onChange={e => setKind(e.target.value as 'guide' | 'news')}><option value="guide">راهنما و آموزش</option><option value="news">خبر از منبع مشخص</option></select></label>
    {kind === 'news' && <label className="block text-xs font-bold">نشانی منبع خبر<input className="w-full mt-1.5 rounded-xl border bg-white p-3" dir="ltr" type="url" value={source} onChange={e => setSource(e.target.value)} placeholder="https://…" /></label>}
    <button type="button" disabled={working || busy} onClick={() => void generate()} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold bg-violet-700 text-white disabled:opacity-50">{working ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}{working ? 'در حال تولید و انتشار…' : 'تولید و انتشار مطلب'}</button>
    {message && <p role="status" className="text-xs leading-6 text-slate-700">{message}</p>}
  </section>;
}
