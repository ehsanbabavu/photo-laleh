import type { IncomingMessage, ServerResponse } from 'http';
import app from '../server.bundle.mjs';
export default function handler(req: IncomingMessage, res: ServerResponse) {
  req.url = '/sitemap.xml';
  return app(req, res);
}
