const form = document.getElementById('blog-comment-form');
if (form) form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  const status = document.getElementById('blog-comment-status');
  if (button.disabled) return;
  button.disabled = true; status.textContent = 'در حال ارسال…';
  try {
    const response = await fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'ارسال دیدگاه ناموفق بود.');
    status.textContent = data.message || 'دیدگاه ثبت شد و پس از بررسی منتشر می‌شود.'; form.reset();
  } catch (error) { status.textContent = error.message || 'اتصال برقرار نشد. دوباره تلاش کنید.'; }
  finally { button.disabled = false; }
});
document.querySelectorAll('[data-copy-url]').forEach(button => button.addEventListener('click', async event => {
  const target = event.currentTarget;
  const status = target.closest('.blog-card-actions, .blog-share')?.querySelector('[data-copy-status], #blog-copy-status') || document.getElementById('blog-copy-status');
  try { await navigator.clipboard.writeText(target.dataset.copyUrl); if (status) status.textContent = 'پیوند کپی شد.'; }
  catch { if (status) status.textContent = 'پیوند را از نوار آدرس کپی کنید.'; }
}));
