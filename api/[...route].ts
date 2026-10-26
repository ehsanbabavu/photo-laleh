// Vercel serverless entrypoint.
// Every request under /api/* is handled by the Express app defined in server.ts.
import type { IncomingMessage, ServerResponse } from 'http';
import app from '../server.bundle.mjs';

function normalizeUrl(req: IncomingMessage) {
  const raw = req.url || '/';
  const qIndex = raw.indexOf('?');
  const pathname = qIndex === -1 ? raw : raw.slice(0, qIndex);
  const params = new URLSearchParams(qIndex === -1 ? '' : raw.slice(qIndex + 1));

  // The vercel.json rewrite forwards the captured path in __path (or route,
  // for the auto-generated catch-all route). Vercel functions do not support
  // multi-segment dynamic routes, so we rebuild the real URL here.
  let target = pathname;
  if (params.has('__path')) {
    target = `/api/${params.get('__path') || ''}`;
  } else if (params.has('route')) {
    target = `/api/${params.get('route') || ''}`;
  } else if (!pathname.startsWith('/api')) {
    target = pathname.startsWith('/') ? `/api${pathname}` : `/api/${pathname}`;
  }

  params.delete('__path');
  params.delete('route');
  const qs = params.toString();
  req.url = qs ? `${target}?${qs}` : target;
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  normalizeUrl(req);
  return (app as unknown as (r: IncomingMessage, s: ServerResponse) => void)(req, res);
}
