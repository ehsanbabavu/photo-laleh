/**
 * API Client for interacting with real internal database server (/api/*)
 */

import { Order, SupportTicket, Announcement, PrintTypeOption, PrintDimension, User } from '../types';

export const apiClient = {
  async getAllDb() {
    try {
      const res = await fetch('/api/db/all');
      if (!res.ok) throw new Error('API fetch failed');
      return await res.json();
    } catch (err) {
      console.warn('API client fetch warning:', err);
      return null;
    }
  },

  async getOrders(): Promise<Order[] | null> {
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async syncOrders(orders: Order[]) {
    try {
      await fetch('/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders })
      });
    } catch (err) {
      console.warn('API syncOrders error:', err);
    }
  },

  async saveOrder(order: Order) {
    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });
    } catch (err) {
      console.warn('API saveOrder error:', err);
    }
  },

  async updateOrder(order: Order) {
    try {
      await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });
    } catch (err) {
      console.warn('API updateOrder error:', err);
    }
  },

  async deleteOrder(orderId: string) {
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('API deleteOrder error:', err);
    }
  },

  async saveTicket(ticket: SupportTicket) {
    try {
      await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticket)
      });
    } catch (err) {
      console.warn('API saveTicket error:', err);
    }
  },

  async savePrompts(prompts: Record<string, string>) {
    try {
      await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompts)
      });
    } catch (err) {
      console.warn('API savePrompts error:', err);
    }
  },

  async savePrintTypes(printTypes: PrintTypeOption[]) {
    try {
      await fetch('/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printTypes })
      });
    } catch (err) {
      console.warn('API savePrintTypes error:', err);
    }
  },

  async saveRemovedPrintTypes(ids: string[]) {
    try {
      await fetch('/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removedPrintTypes: ids })
      });
    } catch (err) {
      console.warn('API saveRemovedPrintTypes error:', err);
    }
  },

  async saveDimensions(dimensions: PrintDimension[]) {
    try {
      await fetch('/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dimensions })
      });
    } catch (err) {
      console.warn('API saveDimensions error:', err);
    }
  },

  async saveAnnouncements(announcements: Announcement[]) {
    try {
      await fetch('/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcements })
      });
    } catch (err) {
      console.warn('API saveAnnouncements error:', err);
    }
  },

  async deleteTicket(ticketId: string) {
    try {
      await fetch(`/api/tickets/${ticketId}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('API deleteTicket error:', err);
    }
  },

  async getUsers(): Promise<User[] | null> {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async createUser(user: User) {
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
    } catch (err) {
      console.warn('API createUser error:', err);
    }
  },

  async updateUser(userId: string, patch: Partial<User>) {
    try {
      await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
    } catch (err) {
      console.warn('API updateUser error:', err);
    }
  },

  async deleteUser(userId: string) {
    try {
      await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('API deleteUser error:', err);
    }
  },

  async saveSettings(settings: Record<string, any>) {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
    } catch (err) {
      console.warn('API saveSettings error:', err);
    }
  },

  async createBluPalInvoice(data: {
    amount: number;
    orderId?: string;
    customerName?: string;
    customerPhone?: string;
    description?: string;
    invoiceDetails?: any;
  }) {
    try {
      const res = await fetch('/api/blupal/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      // Read the JSON body even for error statuses so the UI can show the
      // exact BluPal error (amount_too_low, unauthorized, ...).
      let payload: any = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }
      if (payload) return payload;
      return {
        success: false,
        message: res.ok ? 'پاسخ نامعتبر از سرور صدور فاکتور' : `خطای سرور در صدور فاکتور (${res.status})`
      };
    } catch (err: any) {
      console.warn('createBluPalInvoice error:', err);
      return { success: false, message: err?.message || 'خطا در ارتباط با سرور صدور فاکتور' };
    }
  },

  async checkBluPalInvoiceStatus(invoiceId: string) {
    try {
      const res = await fetch(`/api/blupal/status/${invoiceId}`);
      let payload: any = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }
      if (!res.ok) return payload || null;
      return payload;
    } catch {
      return null;
    }
  },

  async testBluPalConnection(token: string, baseUrl?: string, customEndpoint?: string) {
    try {
      const res = await fetch('/api/blupal/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, baseUrl, customEndpoint })
      });
      if (!res.ok) return { success: false, message: 'خطا در ارتباط با سرور' };
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'خطا در شبکه' };
    }
  },

  async getBluPalWebhookLogs() {
    try {
      const res = await fetch('/api/blupal/webhook-logs');
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

};
