import type { IncomingMessage, ServerResponse } from 'http';
import app from '../server.bundle.mjs';

// Keep the ordinary Express administrator/session checks on the longer-running
// function, including when its internal URL is requested directly.
export default function handler(req: IncomingMessage, res: ServerResponse) {
  req.url = '/api/admin/blog/ai-generate';
  return app(req, res);
}
