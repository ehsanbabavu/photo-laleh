export async function blogRequest<T = any>(path = '', method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/admin/blog${path}`, { method, cache: 'no-store',
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || 'دریافت اطلاعات وبلاگ ناموفق بود.');
  return data;
}
