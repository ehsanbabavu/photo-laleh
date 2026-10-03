/**
 * AI Sequential Queue Manager with 1-Minute Rate-Limit Protection
 * 
 * - Processes AI photo orders sequentially (one by one - FIFO)
 * - Imposes a strict 1-minute (60 seconds) cooldown interval between orders to prevent AI rate-limits
 * - Automatically generates the 9-pack (10x15cm portrait) print sheet right after AI completion
 * - Emits real-time state updates and queue positions to listeners
 */

import { Order } from '../types';
import { processOrderInBackend } from './aiBackend';
import { generateNinePackSheet, generateSingle10x15Sheet } from './sheetGenerator';

export interface QueueJob {
  order: Order;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  prompt: string;
  commercialPrompt?: string;
  queuedAt: number;
}

export interface QueueStateInfo {
  isProcessing: boolean;
  currentOrderId: string | null;
  currentOrderTrackingCode: string | null;
  pendingCount: number;
  cooldownRemainingSeconds: number;
  queueList: { orderId: string; trackingCode: string; userName: string }[];
}

type OrderUpdateCallback = (updatedOrder: Order, toastMsg?: string) => void;
type QueueStateCallback = (info: QueueStateInfo) => void;

class AiQueueManager {
  private queue: QueueJob[] = [];
  private isProcessing = false;
  private currentJob: QueueJob | null = null;
  private cooldownRemaining = 0;
  private cooldownTimer: any = null;

  private orderUpdateListeners: OrderUpdateCallback[] = [];
  private queueStateListeners: QueueStateCallback[] = [];

  /**
   * Subscribe to order updates
   */
  public onOrderUpdate(cb: OrderUpdateCallback): () => void {
    this.orderUpdateListeners.push(cb);
    return () => {
      this.orderUpdateListeners = this.orderUpdateListeners.filter((l) => l !== cb);
    };
  }

  /**
   * Subscribe to queue state changes
   */
  public onQueueStateChange(cb: QueueStateCallback): () => void {
    this.queueStateListeners.push(cb);
    // Send immediate initial state
    cb(this.getQueueInfo());
    return () => {
      this.queueStateListeners = this.queueStateListeners.filter((l) => l !== cb);
    };
  }

  private notifyOrderUpdate(order: Order, toastMsg?: string) {
    for (const listener of this.orderUpdateListeners) {
      try {
        listener(order, toastMsg);
      } catch (err) {
        console.error('Error in order update listener:', err);
      }
    }
  }

  private notifyQueueState() {
    const info = this.getQueueInfo();
    for (const listener of this.queueStateListeners) {
      try {
        listener(info);
      } catch (err) {
        console.error('Error in queue state listener:', err);
      }
    }
  }

  public getQueueInfo(): QueueStateInfo {
    return {
      isProcessing: this.isProcessing,
      currentOrderId: this.currentJob ? this.currentJob.order.id : null,
      currentOrderTrackingCode: this.currentJob ? this.currentJob.order.trackingCode : null,
      pendingCount: this.queue.length,
      cooldownRemainingSeconds: this.cooldownRemaining,
      queueList: this.queue.map((j) => ({
        orderId: j.order.id,
        trackingCode: j.order.trackingCode,
        userName: j.order.userName
      }))
    };
  }

  /**
   * Enqueue a new order for AI processing
   */
  public enqueue(job: QueueJob) {
    // Check if already queued or currently processing
    if (this.currentJob?.order.id === job.order.id) {
      return;
    }
    if (this.queue.some((j) => j.order.id === job.order.id)) {
      return;
    }

    // Set order status to in-queue
    const position = this.queue.length + (this.isProcessing ? 1 : 0) + 1;
    const queuedOrder: Order = {
      ...job.order,
      status: 'pending_review',
      aiStatus: 'in_queue'
    };

    this.queue.push({
      ...job,
      order: queuedOrder
    });

    this.notifyOrderUpdate(
      queuedOrder,
      `سفارش #${job.order.trackingCode} در نوبت ${position} صف هوش مصنوعی قرار گرفت.`
    );
    this.notifyQueueState();

    // If not processing and not in cooldown, start processing
    if (!this.isProcessing && this.cooldownRemaining === 0) {
      this.processNext();
    }
  }

  /**
   * Process the next job in the queue
   */
  private async processNext() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      this.currentJob = null;
      this.notifyQueueState();
      return;
    }

    this.isProcessing = true;
    this.currentJob = this.queue.shift() || null;
    if (!this.currentJob) return;

    const { order, apiKey, baseUrl, model, prompt } = this.currentJob;

    // 1. Update order status to active processing
    const processingOrder: Order = {
      ...order,
      status: 'ai_processing',
      aiStatus: 'processing'
    };
    this.notifyOrderUpdate(
      processingOrder,
      `پردازش هوش مصنوعی سفارش #${order.trackingCode} آغاز گردید...`
    );
    this.notifyQueueState();

    try {
      // 2. Execute AI generation in backend
      const result = await processOrderInBackend({
        uploadedImage: order.uploadedImage,
        originalImageName: order.originalImageName,
        printType: order.printType,
        prompt: prompt || order.aiPromptUsed || 'پرتره باکیفیت و رتوش شده آتلیه',
        apiKey,
        baseUrl,
        model
      });

      // 3. Automatically generate 9-photo vertical 10x15cm sheet
      let autoSheetDataUrl: string | undefined = undefined;
      try {
        autoSheetDataUrl = await generateNinePackSheet(result.imageUrl, {
          paperSize: '10x15'
        });
      } catch (sheetErr) {
        console.warn('Auto 9-pack sheet generation warning:', sheetErr);
      }

      // 3.5. If printType is personnel, automatically send secondary AI request for commercial photo
      let commercialImageResult: string | undefined = undefined;
      let commercial10x15SheetResult: string | undefined = undefined;
      const commercialPromptToUse = this.currentJob.commercialPrompt || 'عکاسی تبلیغاتی و تجاری فاخر، نورپردازی متمرکز استودیویی روی محصول و مدل، بوکه نرم پس‌زمینه لوکس، کیفیت فوق‌العاده وضوح و رنگ عالی';

      if (order.printType === 'personnel' && order.uploadedImage) {
        try {
          this.notifyOrderUpdate(
            { ...order, status: 'ai_processing', aiStatus: 'processing', aiProcessedImage: result.imageUrl },
            `عکس پرسنلی سفارش #${order.trackingCode} اماده شد. در حال ارسال درخواست دوم به صف برای عکس تبلیغاتی...`
          );

          const commResult = await processOrderInBackend({
            uploadedImage: order.uploadedImage,
            originalImageName: order.originalImageName,
            printType: 'commercial',
            prompt: commercialPromptToUse,
            apiKey,
            baseUrl,
            model
          });

          commercialImageResult = commResult.imageUrl;

          // Automatically size to 10x15 cm sheet
          try {
            commercial10x15SheetResult = await generateSingle10x15Sheet(commResult.imageUrl);
          } catch (commSheetErr) {
            console.warn('Auto 10x15 commercial sheet generation warning:', commSheetErr);
          }
        } catch (commErr) {
          console.warn('Auto commercial generation warning:', commErr);
        }
      }

      const formattedNow = new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date());

      // 4. Update order to completed state
      const completedOrder: Order = {
        ...order,
        status: 'printing',
        aiStatus: 'completed',
        aiProcessedImage: result.imageUrl,
        aiCompletedAt: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        printSheetImage: autoSheetDataUrl,
        printSheetCreatedAt: autoSheetDataUrl ? formattedNow : undefined,
        commercialImage: commercialImageResult,
        commercialPromptUsed: commercialPromptToUse,
        commercialSheet10x15Image: commercial10x15SheetResult
      };

      const hasCommercial = Boolean(commercialImageResult);
      this.notifyOrderUpdate(
        completedOrder,
        hasCommercial
          ? `عکس پرسنلی، شیت ۹تایی و عکس تبلیغاتی ۱۰×۱۵ سفارش #${order.trackingCode} با موفقیت آماده شد!`
          : `خروجی رتوش و شیت ۹ تایی سفارش #${order.trackingCode} با موفقیت آماده شد!`
      );
    } catch (error) {
      console.error('Error processing order in queue:', error);
      const fallbackOrder: Order = {
        ...order,
        status: 'printing',
        aiStatus: 'completed'
      };
      this.notifyOrderUpdate(fallbackOrder);
    } finally {
      this.currentJob = null;
      this.notifyQueueState();

      // If there are more orders in the queue, wait 60 seconds (1 minute cooldown) before the next one
      if (this.queue.length > 0) {
        this.startCooldown(60);
      } else {
        this.isProcessing = false;
        this.notifyQueueState();
      }
    }
  }

  /**
   * Start 60-second cooldown timer between requests to prevent AI rate limits
   */
  private startCooldown(seconds = 60) {
    this.cooldownRemaining = seconds;
    this.notifyQueueState();

    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
    }

    this.cooldownTimer = setInterval(() => {
      this.cooldownRemaining -= 1;
      this.notifyQueueState();

      if (this.cooldownRemaining <= 0) {
        clearInterval(this.cooldownTimer);
        this.cooldownTimer = null;
        this.cooldownRemaining = 0;
        // Proceed to next order in queue
        this.processNext();
      }
    }, 1000);
  }
}

// Export singleton instance
export const aiQueueManager = new AiQueueManager();
