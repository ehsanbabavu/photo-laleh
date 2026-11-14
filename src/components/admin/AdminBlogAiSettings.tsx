import { useEffect, useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import type { AvalAiSettings } from '../../types';
import type { BlogPost, BlogState } from '../../types/blog';
import { blogRequest } from '../../services/blogClient';
import { ChatGPTConnect } from './ChatGPTConnect';
import { AiBlogGenerator } from './AiBlogGenerator';

export default function AdminBlogAiSettings({ settings, onSaveSettings, onPublished, onBack, onNavigationGuardChange }: {
  settings: AvalAiSettings;
  onSaveSettings: (settings: Partial<AvalAiSettings>) => Promise<void>;
  onPublished: (post: BlogPost) => void;
  onBack: () => void;
  onNavigationGuardChange: (guard: (() => boolean) | null) => void;
}) {
  const [state, setState] = useState<BlogState | null>(null);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setError('');
    blogRequest<BlogState>().then(next => { if (active) setState(next); })
      .catch(error => { if (active) setError(error instanceof Error ? error.message : 'دریافت تنظیمات وبلاگ ناموفق بود.'); });
    return () => { active = false; };
  }, [reload]);
  useEffect(() => {
    onNavigationGuardChange(generating ? () => {
      window.alert('تولید مطلب در حال انجام است؛ تا پایان آن در این صفحه بمانید.');
      return false;
    } : null);
    return () => onNavigationGuardChange(null);
  }, [generating, onNavigationGuardChange]);

  return <section aria-labelledby="blog-ai-title" data-blog-section="ai-settings" className="min-w-0 space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 id="blog-ai-title" className="flex items-center gap-2 text-xl font-black"><Sparkles className="h-6 w-6 text-violet-600" />تنظیمات هوش مصنوعی نوشته‌ها</h1>
        <p className="mt-2 text-xs leading-6 text-slate-500">تنظیم مدل‌ها، انتخاب موضوع و تولید مطلب همراه با تصویر شاخص</p></div>
      <button type="button" onClick={onBack} disabled={generating || savingSettings} className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs disabled:opacity-50"><ArrowRight className="h-4 w-4" />همه نوشته‌ها</button>
    </header>
    <div className={generating ? 'pointer-events-none opacity-60' : undefined} inert={generating}>
      <ChatGPTConnect purpose="blog"
        model={settings.avalaiModel} textModel={settings.avalaiTextModel} aiEnabled={settings.aiEnabled}
        onSaveSettings={onSaveSettings} onBusyChange={setSavingSettings} />
    </div>
    {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
      <p>{error}</p><button type="button" onClick={() => setReload(value => value + 1)} className="mt-3 rounded-lg border bg-white px-3 py-2 text-xs">تلاش دوباره</button>
    </div> : state ? <AiBlogGenerator state={state} busy={!settings.aiEnabled || savingSettings}
      onPublished={post => { onNavigationGuardChange(null); onPublished(post); }} onWorkingChange={setGenerating} />
      : <p role="status" className="rounded-xl border bg-white p-5 text-sm text-slate-500">در حال دریافت اطلاعات تولید مطلب…</p>}
  </section>;
}
