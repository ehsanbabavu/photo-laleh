import { QueueClient } from '@vercel/queue';
import { processMaintenanceNotifications } from '../server.bundle.mjs';

const queue = new QueueClient();
export default queue.handleNodeCallback(async (tick: { batchId: string; index: number; attempt: number }) => {
  await processMaintenanceNotifications(tick);
}, { retry: (error) => ({ afterSeconds: Math.min(60, Math.max(1, Number((error as Error & { afterSeconds?: number }).afterSeconds) || 5)) }) });
