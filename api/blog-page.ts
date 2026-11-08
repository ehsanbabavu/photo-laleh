import type { IncomingMessage, ServerResponse } from 'http';
import app from '../server.bundle.mjs';
export default function handler(req: IncomingMessage, res: ServerResponse) {
  const params = new URLSearchParams((req.url || '').split('?').slice(1).join('?'));
  const blogPath = params.get('__blogpath') || '';
  params.delete('__blogpath');
  req.url = `/blog/${blogPath}${params.size ? `?${params}` : ''}`;
  return app(req, res);
}
