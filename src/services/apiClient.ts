/**
 * API Client for interacting with real internal database server (/api/*)
 */

import { Order, SupportTicket, Announcement, PrintTypeOption, User } from '../types';

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

  async saveUsers(users: User[]) {
    try {
      await fetch('/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users })
      });
    } catch (err) {
      console.warn('API saveUsers error:', err);
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
  }
};
