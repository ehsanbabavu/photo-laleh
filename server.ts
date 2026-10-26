import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  readDb,
  writeDb,
  getDbStatus,
  clearDbConfig,
  testDbConnection,
  applyDbConfig,
  disconnectDb,
  DEFAULT_DB_NAME
} from './mongoStore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serverless platforms (Vercel) expose a read-only bundle.
const IS_SERVERLESS = Boolean(process.env.VERCEL);



// Initial Database Schema & Seed Data


const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- REST API ENDPOINTS ---

// Get all DB state
app.get('/api/db/all', async (_req, res) => {
  const db = await readDb();
  res.json(db);
});

// --- MongoDB connection settings (admin panel) ---
// Optional extra protection: set ADMIN_SETUP_KEY in the environment and the
// panel must send the same value in the x-setup-key header.
function checkSetupKey(req: any, res: any) {
  const expected = process.env.ADMIN_SETUP_KEY;
  if (expected && req.headers['x-setup-key'] !== expected) {
    res.status(401).json({ success: false, error: 'کلید تنظیمات ادمین نامعتبر است' });
    return false;
  }
  return true;
}

// Connection status of the MongoDB database
app.get('/api/db/status', async (_req, res) => {
  try {
    const status = await getDbStatus();
    res.json({ success: true, ...status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'خطا در بررسی وضعیت دیتابیس' });
  }
});

// Test a connection string without saving it
app.post('/api/db/test', async (req, res) => {
  if (!checkSetupKey(req, res)) return;
  const { uri, dbName } = req.body || {};
  if (!uri || !/^mongodb(\+srv)?:\/\//i.test(String(uri).trim())) {
    return res.status(400).json({ success: false, error: 'آدرس دیتابیس باید با mongodb:// یا mongodb+srv:// شروع شود' });
  }
  const result = await testDbConnection(String(uri).trim(), dbName || undefined);
  if (!result.ok) {
    return res.status(400).json({ success: false, error: result.error });
  }
  res.json({ success: true, message: 'اتصال با موفقیت برقرار شد', collections: result.collections });
});

// Save the connection string and connect to it
app.post('/api/db/config', async (req, res) => {
  if (!checkSetupKey(req, res)) return;
  const { uri, dbName } = req.body || {};
  if (!uri) {
    return res.status(400).json({ success: false, error: 'آدرس اتصال دیتابیس الزامی است' });
  }
  const result = await applyDbConfig(String(uri), String(dbName || DEFAULT_DB_NAME));
  if (!result.ok) {
    return res.status(400).json({ success: false, error: result.error });
  }
  const status = await getDbStatus();
  res.json({ success: true, message: 'دیتابیس متصل شد', status });
});

// Remove the saved connection string (falls back to the MONGODB_URI env var)
app.delete('/api/db/config', async (_req, res) => {
  clearDbConfig();
  await disconnectDb();
  const status = await getDbStatus();
  res.json({ success: true, status });
});

// Full state sync
app.post('/api/db/sync', async (req, res) => {
  const current = await readDb();
  const updated = {
    ...current,
    ...req.body
  };
  await writeDb(updated);
  res.json({ success: true, db: updated });
});

// Orders APIs
app.get('/api/orders', async (_req, res) => {
  const db = await readDb();
  res.json(db.orders || []);
});

app.post('/api/orders', async (req, res) => {
  const db = await readDb();
  const newOrder = req.body;
  const existingIdx = (db.orders || []).findIndex((o: any) => o.id === newOrder.id);
  if (existingIdx >= 0) {
    db.orders[existingIdx] = newOrder;
  } else {
    db.orders = [newOrder, ...(db.orders || [])];
  }
  await writeDb(db);
  res.json({ success: true, order: newOrder });
});

app.put('/api/orders/:id', async (req, res) => {
  const db = await readDb();
  const orderId = req.params.id;
  const updatedOrder = req.body;
  db.orders = (db.orders || []).map((o: any) => (o.id === orderId ? { ...o, ...updatedOrder } : o));
  await writeDb(db);
  res.json({ success: true });
});

app.delete('/api/orders/:id', async (req, res) => {
  const db = await readDb();
  const orderId = req.params.id;
  db.orders = (db.orders || []).filter((o: any) => o.id !== orderId);
  await writeDb(db);
  res.json({ success: true });
});

app.delete('/api/orders', async (_req, res) => {
  const db = await readDb();
  db.orders = [];
  await writeDb(db);
  res.json({ success: true });
});

// Support Tickets APIs
app.get('/api/tickets', async (_req, res) => {
  const db = await readDb();
  res.json(db.tickets || []);
});

app.post('/api/tickets', async (req, res) => {
  const db = await readDb();
  const newTicket = req.body;
  const existingIdx = (db.tickets || []).findIndex((t: any) => t.id === newTicket.id);
  if (existingIdx >= 0) {
    db.tickets[existingIdx] = newTicket;
  } else {
    db.tickets = [newTicket, ...(db.tickets || [])];
  }
  await writeDb(db);
  res.json({ success: true, ticket: newTicket });
});

app.put('/api/tickets/:id', async (req, res) => {
  const db = await readDb();
  const ticketId = req.params.id;
  const updatedTicket = req.body;
  db.tickets = (db.tickets || []).map((t: any) => (t.id === ticketId ? { ...t, ...updatedTicket } : t));
  await writeDb(db);
  res.json({ success: true });
});

app.delete('/api/tickets/:id', async (req, res) => {
  const db = await readDb();
  const ticketId = req.params.id;
  db.tickets = (db.tickets || []).filter((t: any) => t.id !== ticketId);
  await writeDb(db);
  res.json({ success: true });
});

// Prompts APIs
app.get('/api/prompts', async (_req, res) => {
  const db = await readDb();
  res.json(db.prompts || {});
});

app.post('/api/prompts', async (req, res) => {
  const db = await readDb();
  db.prompts = { ...(db.prompts || {}), ...req.body };
  await writeDb(db);
  res.json({ success: true, prompts: db.prompts });
});

// Print Types APIs
app.get('/api/print-types', async (_req, res) => {
  const db = await readDb();
  res.json(db.printTypes || []);
});

app.post('/api/print-types', async (req, res) => {
  const db = await readDb();
  const newPrintType = req.body;
  const existingIdx = (db.printTypes || []).findIndex((pt: any) => pt.id === newPrintType.id);
  if (existingIdx >= 0) {
    db.printTypes[existingIdx] = newPrintType;
  } else {
    db.printTypes.push(newPrintType);
  }
  await writeDb(db);
  res.json({ success: true, printType: newPrintType });
});

app.put('/api/print-types/:id', async (req, res) => {
  const db = await readDb();
  const ptId = req.params.id;
  db.printTypes = (db.printTypes || []).map((pt: any) => (pt.id === ptId ? { ...pt, ...req.body } : pt));
  await writeDb(db);
  res.json({ success: true });
});

app.delete('/api/print-types/:id', async (req, res) => {
  const db = await readDb();
  const ptId = req.params.id;
  db.printTypes = (db.printTypes || []).filter((pt: any) => pt.id !== ptId);
  await writeDb(db);
  res.json({ success: true });
});

// Users APIs
app.get('/api/users', async (_req, res) => {
  const db = await readDb();
  res.json(db.users || []);
});

app.post('/api/users', async (req, res) => {
  const db = await readDb();
  const newUser = req.body;
  const existingIdx = (db.users || []).findIndex((u: any) => u.id === newUser.id || (newUser.phone && u.phone === newUser.phone));
  if (existingIdx >= 0) {
    db.users[existingIdx] = { ...db.users[existingIdx], ...newUser };
  } else {
    db.users.push(newUser);
  }
  await writeDb(db);
  res.json({ success: true, user: newUser });
});

app.put('/api/users/:id', async (req, res) => {
  const db = await readDb();
  const userId = req.params.id;
  db.users = (db.users || []).map((u: any) => (u.id === userId ? { ...u, ...req.body } : u));
  await writeDb(db);
  res.json({ success: true });
});

app.delete('/api/users/:id', async (req, res) => {
  const db = await readDb();
  const userId = req.params.id;
  db.users = (db.users || []).filter((u: any) => u.id !== userId);
  await writeDb(db);
  res.json({ success: true });
});

// Announcements APIs
app.get('/api/announcements', async (_req, res) => {
  const db = await readDb();
  res.json(db.announcements || []);
});

app.post('/api/announcements', async (req, res) => {
  const db = await readDb();
  const newAnn = req.body;
  const existingIdx = (db.announcements || []).findIndex((a: any) => a.id === newAnn.id);
  if (existingIdx >= 0) {
    db.announcements[existingIdx] = newAnn;
  } else {
    db.announcements = [newAnn, ...(db.announcements || [])];
  }
  await writeDb(db);
  res.json({ success: true, announcement: newAnn });
});

app.put('/api/announcements/:id', async (req, res) => {
  const db = await readDb();
  const annId = req.params.id;
  db.announcements = (db.announcements || []).map((a: any) => (a.id === annId ? { ...a, ...req.body } : a));
  await writeDb(db);
  res.json({ success: true });
});

app.delete('/api/announcements/:id', async (req, res) => {
  const db = await readDb();
  const annId = req.params.id;
  db.announcements = (db.announcements || []).filter((a: any) => a.id !== annId);
  await writeDb(db);
  res.json({ success: true });
});

// Settings APIs
app.get('/api/settings', async (_req, res) => {
  const db = await readDb();
  res.json(db.settings || {});
});

app.post('/api/settings', async (req, res) => {
  const db = await readDb();
  db.settings = { ...(db.settings || {}), ...req.body };
  await writeDb(db);
  res.json({ success: true, settings: db.settings });
});

// Helper function to generate candidate BluPal endpoints
function getBluPalEndpoints(baseUrl: string, customEndpoint?: string): string[] {
  const host = (baseUrl || 'https://blupal.top').trim().replace(/\/+$/, '');
  const bases = Array.from(new Set([
    host,
    host.replace('://blupal.top', '://api.blupal.top'),
    host.replace('://blupal.net', '://api.blupal.net'),
    host.replace('://blupal.ir', '://api.blupal.ir'),
    'https://blupal.top',
    'https://api.blupal.top',
    'https://blupal.net',
    'https://api.blupal.net'
  ]));

  const customEp = (customEndpoint || '').trim();
  const paths = [
    ...(customEp ? [customEp.startsWith('/') ? customEp : '/' + customEp] : []),
    '/api/v1/invoices/create',
    '/api/v1/invoices',
    '/api/v1/invoice/create',
    '/api/v1/invoice',
    '/api/v1/create-invoice',
    '/api/v1/create',
    '/api/v1/factor',
    '/api/v1/factors',
    '/api/v1/pay',
    '/api/v1/payment',
    '/api/invoice/create',
    '/api/invoices',
    '/api/invoice',
    '/api/create-invoice',
    '/api/factor',
    '/api/pay'
  ];

  const result: string[] = [];
  for (const base of bases) {
    for (const path of paths) {
      const fullUrl = `${base}${path}`;
      if (!result.includes(fullUrl)) {
        result.push(fullUrl);
      }
    }
  }
  return result;
}

// Create Invoice
app.post('/api/blupal/create-invoice', async (req, res) => {
  try {
    const db = await readDb();
    const settings = db.settings || {};
    const { amount, orderId, customerName, customerPhone, description, invoiceDetails } = req.body;

    const numAmount = typeof amount === 'number' ? amount : (Number(amount) || 0);
    if (numAmount < 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    const invoiceId = 'BLU-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
    // Amount in Rials (Minimum 100,000 Rials as required by BluPal API doc)
    const amountRial = Math.max(100000, numAmount * 10);
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins
    const isFree = numAmount === 0;

    let externalPaymentUrl = '';
    let remoteCardNumber = '';
    let remoteInvoiceId = '';
    let remoteFinalAmount = 0;

    // If real token is configured and sandbox is disabled, call BluPal API (only if amount > 0)
    if (numAmount > 0 && settings.blupalToken && !settings.blupalSandboxMode) {
      try {
        const baseUrl = (settings.blupalBaseUrl || 'https://blupal.top').replace(/\/+$/, '');

        const requestBody = {
          amount: amountRial,
          card_number: settings.blupalCardNumber || undefined
        };

        const endpoints = getBluPalEndpoints(baseUrl, settings.blupalCustomEndpoint);

        for (const endpoint of endpoints) {
          try {
            const blupalRes = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-API-Key': settings.blupalToken,
                'Authorization': `Bearer ${settings.blupalToken}`
              },
              body: JSON.stringify(requestBody)
            });

            if (blupalRes.ok) {
              const resData: any = await blupalRes.json();
              const obj = resData.data || resData.result || resData.invoice || resData;

              if (obj && (obj.success || resData.success || obj.payment_link || obj.invoice_id)) {
                externalPaymentUrl = obj.payment_link || obj.payment_url || obj.url || obj.link || externalPaymentUrl;
                remoteCardNumber = obj.card_number || obj.cardNumber || remoteCardNumber;
                remoteInvoiceId = String(obj.invoice_id || obj.id || '');
                if (obj.final_amount) {
                  const rawFinal = Number(obj.final_amount) || 0;
                  remoteFinalAmount = rawFinal > 10000 ? Math.round(rawFinal / 10) : rawFinal;
                }
                if (externalPaymentUrl || remoteInvoiceId) break; // Successfully retrieved invoice details!
              }
            }
          } catch (endpointErr) {
            // Try next endpoint fallback
          }
        }
      } catch (e) {
        console.warn('BluPal real API call failed, falling back to local invoice:', e);
      }
    }

    const payableToman = remoteFinalAmount || numAmount;

    const newInvoice = {
      invoiceId: remoteInvoiceId || invoiceId,
      localInvoiceId: invoiceId,
      amount: numAmount,
      finalAmount: payableToman,
      amountRial: payableToman * 10,
      orderId: orderId || '',
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      description: description || 'پرداخت سفارش آتلیه دیجیتال لاله',
      status: isFree ? 'paid' : 'pending',
      referenceCode: isFree ? ('GIFT-FREE-' + Math.floor(10000000 + Math.random() * 90000000)) : undefined,
      paidAt: isFree ? new Date().toLocaleDateString('fa-IR') : undefined,
      cardNumber: remoteCardNumber || settings.blupalCardNumber || '6219 8619 4528 7193',
      accountHolder: settings.blupalAccountHolder || 'آتلیه تخصصی لاله',
      iban: settings.blupalIban || 'IR720560086190004528719301',
      qrData: `blupal://pay?invoice=${remoteInvoiceId || invoiceId}&amount=${payableToman}&to=${encodeURIComponent(settings.blupalAccountHolder || 'آتلیه لاله')}`,
      paymentUrl: externalPaymentUrl || `https://blupal.top/pay/${remoteInvoiceId || invoiceId}`,
      createdAt: new Date().toLocaleDateString('fa-IR'),
      expiresAt,
      invoiceDetails: invoiceDetails || null
    };

    db.invoices = [newInvoice, ...(db.invoices || []).slice(0, 99)];
    await writeDb(db);

    res.json({ success: true, invoice: newInvoice });
  } catch (err: any) {
    console.error('Error creating BluPal invoice:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal error' });
  }
});

// Check Invoice Status
app.get('/api/blupal/status/:invoiceId', async (req, res) => {
  try {
    const db = await readDb();
    const reqId = String(req.params.invoiceId || '').trim();
    const invoice = (db.invoices || []).find((inv: any) =>
      String(inv.invoiceId || '').trim() === reqId ||
      String(inv.localInvoiceId || '').trim() === reqId ||
      String(inv.orderId || '').trim() === reqId
    );

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    // Check expiration
    if (invoice.status === 'pending' && Date.now() > invoice.expiresAt) {
      invoice.status = 'expired';
      await writeDb(db);
    }

    // If real token and not paid yet, check with BluPal API
    const settings = db.settings || {};
    if (invoice.status === 'pending' && settings.blupalToken && !settings.blupalSandboxMode) {
      try {
        const baseUrl = (settings.blupalBaseUrl || 'https://blupal.top').replace(/\/+$/, '');
        const targetRemoteId = invoice.invoiceId || reqId;

        const blupalRes = await fetch(`${baseUrl}/api/v1/invoices/${targetRemoteId}`, {
          headers: {
            'Accept': 'application/json',
            'X-API-Key': settings.blupalToken,
            'Authorization': `Bearer ${settings.blupalToken}`
          }
        });

        if (blupalRes.ok) {
          const data: any = await blupalRes.json();
          const statusStr = String(data.status || data.event || '').toUpperCase();
          if (
            statusStr === 'PAID' ||
            statusStr === 'COMPLETED' ||
            statusStr === 'PAYMENT.COMPLETED' ||
            (data.success && statusStr === 'PAID')
          ) {
            invoice.status = 'paid';
            invoice.referenceCode = String(data.transaction_id || data.reference_id || ('BLU-' + Math.floor(10000000 + Math.random() * 90000000)));
            invoice.paidAt = new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
            await writeDb(db);
          }
        }
      } catch (e) {
        // Ignore remote check failure
      }
    }

    res.json({ success: true, status: invoice.status, invoice });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Simulate / Trigger instant payment (Sandbox / Demo mode)
app.post('/api/blupal/simulate-pay/:invoiceId', async (req, res) => {
  try {
    const db = await readDb();
    const invoiceId = req.params.invoiceId;
    const invoice = (db.invoices || []).find((inv: any) => inv.invoiceId === invoiceId);

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    invoice.status = 'paid';
    invoice.referenceCode = 'BLU-' + Math.floor(100000000 + Math.random() * 900000000);
    invoice.paidAt = new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    await writeDb(db);

    res.json({ success: true, status: 'paid', referenceCode: invoice.referenceCode, invoice });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test Connection with BluPal (Performs real invoice creation test and reports exact result or error)
app.post('/api/blupal/test-connection', async (req, res) => {
  try {
    const { token, baseUrl, customEndpoint } = req.body;
    const url = (baseUrl || 'https://blupal.top').replace(/\/+$/, '');

    if (!token) {
      return res.json({
        success: false,
        message: 'لطفاً ابتدا توکن دسترسی API بلوپال را در کادر مربوطه وارد نمایید.'
      });
    }

    const testOrderId = 'BLU-TEST-' + Date.now().toString(36).toUpperCase();

    // 100,000 Rials = 10,000 Tomans (Minimum allowed amount by BluPal API doc!)
    const requestBody = {
      amount: 100000
    };

    const endpoints = getBluPalEndpoints(url, customEndpoint);

    let lastError = '';
    let lastStatus = 0;
    let rawResponse: any = null;

    for (const endpoint of endpoints) {
      try {
        const blupalRes = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-Key': token,
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(requestBody)
        });

        lastStatus = blupalRes.status;
        const contentType = blupalRes.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          rawResponse = await blupalRes.json();
        } else {
          const rawText = await blupalRes.text();
          rawResponse = { text: rawText };
        }

        const obj = rawResponse?.data || rawResponse?.result || rawResponse?.invoice || rawResponse;
        const invoiceUrl = obj?.payment_link || obj?.payment_url || obj?.url || obj?.link || obj?.redirect_url;
        const invoiceId = String(obj?.invoice_id || obj?.id || testOrderId);

        if (blupalRes.ok && (rawResponse?.success || obj?.payment_link || obj?.invoice_id)) {
          return res.json({
            success: true,
            message: `فاکتور واقعی با موفقیت در وب‌سرویس بلوپال ایجاد شد! ✅ (شناسه فاکتور: ${invoiceId})`,
            invoiceUrl: invoiceUrl || '',
            invoiceId,
            details: rawResponse
          });
        } else {
          const msg =
            rawResponse?.message ||
            rawResponse?.error ||
            rawResponse?.errors ||
            rawResponse?.detail ||
            (typeof rawResponse?.text === 'string' ? rawResponse.text.slice(0, 150) : null) ||
            `HTTP Error ${blupalRes.status}`;
          lastError = typeof msg === 'object' ? JSON.stringify(msg) : String(msg);
        }
      } catch (endpointErr: any) {
        lastError = endpointErr.message || 'خطا در شبکه';
      }
    }

    // If all endpoints failed, report detailed error to admin
    return res.json({
      success: false,
      message: `خطا در صدور فاکتور توسط سرور بلوپال (کد ${lastStatus || 'شبکه'}): ${lastError}`,
      details: rawResponse
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: `خطای داخلی سرور هنگام تست اتصال: ${err.message}`
    });
  }
});

// BluPal Incoming Webhook Handler (POST /api/blupal/webhook)
app.post(['/api/blupal/webhook', '/api/webhook/blupal'], async (req, res) => {
  try {
    const payload = req.body || {};
    const db = await readDb();

    const rawInvoiceId = payload.invoice_id ?? payload.invoiceId ?? payload.id ?? payload.order_id ?? payload.orderId;
    const strInvoiceId = String(rawInvoiceId || '').trim();

    const rawStatus = String(payload.status || payload.event || '').toUpperCase();
    const isPaid =
      rawStatus === 'PAID' ||
      rawStatus === 'COMPLETED' ||
      rawStatus === 'SUCCESSFUL' ||
      rawStatus === 'PAYMENT.COMPLETED' ||
      payload.event === 'payment.completed' ||
      payload.success === true;

    const referenceCode = String(
      payload.transaction_id ||
      payload.reference_id ||
      payload.tracking_code ||
      payload.referenceCode ||
      ('BLU-WH-' + Math.floor(10000000 + Math.random() * 90000000))
    );
    const amount = payload.amount || payload.amount_rial || payload.final_amount;

    const timeFa = new Date().toLocaleString('fa-IR', {
      timeZone: 'Asia/Tehran',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    // 1. Update matching invoice in DB
    let invoiceFound = false;
    db.invoices = (db.invoices || []).map((inv: any) => {
      const isMatch =
        (strInvoiceId && String(inv.invoiceId || '').trim() === strInvoiceId) ||
        (strInvoiceId && String(inv.localInvoiceId || '').trim() === strInvoiceId) ||
        (strInvoiceId && String(inv.orderId || '').trim() === strInvoiceId) ||
        (!strInvoiceId && inv.status === 'pending');

      if (isMatch) {
        invoiceFound = true;
        return {
          ...inv,
          status: isPaid ? 'paid' : inv.status,
          referenceCode,
          paidAt: isPaid ? timeFa : inv.paidAt
        };
      }
      return inv;
    });

    // 2. Update matching order in DB if any
    db.orders = (db.orders || []).map((ord: any) => {
      const isOrderMatch =
        (strInvoiceId && String(ord.id || '').trim() === strInvoiceId) ||
        (strInvoiceId && String(ord.trackingCode || '').trim() === strInvoiceId);
      if (isOrderMatch && isPaid) {
        return {
          ...ord,
          paymentStatus: 'paid',
          paymentReference: referenceCode
        };
      }
      return ord;
    });

    // 3. Record in webhook event logs
    const logEntry = {
      id: 'wh-' + Date.now(),
      receivedAt: timeFa,
      invoiceId: strInvoiceId || 'نامشخص',
      status: isPaid ? 'paid' : rawStatus,
      referenceCode,
      amount: amount || '—',
      rawPayload: payload,
      isMatched: invoiceFound
    };

    db.webhookLogs = [logEntry, ...(db.webhookLogs || []).slice(0, 19)];
    await writeDb(db);

    console.log(`[BluPal Webhook] Received status for invoice ${strInvoiceId}: ${isPaid ? 'PAID' : rawStatus} (Ref: ${referenceCode}, Matched: ${invoiceFound})`);

    // Return HTTP 200 OK with received: true as specified in BluPal docs
    res.status(200).json({
      received: true,
      success: true,
      message: 'نتیجه تراکنش وب‌هوک با موفقیت پردازش شد',
      invoiceId: strInvoiceId,
      status: isPaid ? 'paid' : rawStatus
    });
  } catch (err: any) {
    console.error('Error handling BluPal webhook:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get recent Webhook Logs
app.get('/api/blupal/webhook-logs', async (_req, res) => {
  const db = await readDb();
  res.json(db.webhookLogs || []);
});

// Test/Simulate incoming Webhook trigger from admin
app.post('/api/blupal/test-webhook', async (req, res) => {
  try {
    const db = await readDb();
    const { invoiceId, status = 'paid' } = req.body;
    const targetInvoice = (db.invoices || [])[0];
    const invId = invoiceId || targetInvoice?.invoiceId || ('BLU-DEMO-' + Date.now().toString(36).toUpperCase());

    const timeFa = new Date().toLocaleString('fa-IR', {
      timeZone: 'Asia/Tehran',
      hour: '2-digit',
      minute: '2-digit',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const refCode = 'BLU-TEST-' + Math.floor(10000000 + Math.random() * 90000000);

    // Update invoice
    db.invoices = (db.invoices || []).map((inv: any) => {
      if (inv.invoiceId === invId) {
        return { ...inv, status: 'paid', referenceCode: refCode, paidAt: timeFa };
      }
      return inv;
    });

    const logEntry = {
      id: 'wh-test-' + Date.now(),
      receivedAt: timeFa,
      invoiceId: invId,
      status: 'paid',
      referenceCode: refCode,
      amount: targetInvoice ? targetInvoice.amount : 125000,
      rawPayload: { invoice_id: invId, status: 'paid', reference_id: refCode, simulated: true },
      isMatched: true
    };

    db.webhookLogs = [logEntry, ...(db.webhookLogs || []).slice(0, 19)];
    await writeDb(db);

    res.json({
      success: true,
      message: `تست وب‌هوک با موفقیت انجام شد و وضعیت فاکتور ${invId} به پرداخت شده تغییر یافت ✅`,
      log: logEntry
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Unified Telegram Callback Query Handler
async function handleTelegramCallbackQuery(cb: any, token: string) {
  if (!cb || !token) return;
  const data = cb.data || '';

  if (data.startsWith('mark_ready:')) {
    const orderIdOrCode = data.replace('mark_ready:', '');
    const db = await readDb();
    const orders = db.orders || [];

    const targetOrderIndex = orders.findIndex(
      (o: any) => o.id === orderIdOrCode || o.trackingCode === orderIdOrCode
    );

    if (targetOrderIndex >= 0) {
      orders[targetOrderIndex].status = 'ready_to_ship';
      const messagesToDelete = orders[targetOrderIndex].sentMessageIds || [];
      
      // Update DB to clear tracking only
      orders[targetOrderIndex].sentMessageIds = [];
      db.orders = orders;
      await writeDb(db);

      // 1. Popup alert
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: cb.id, text: `وضعیت ${orders[targetOrderIndex].trackingCode} به «آماده ارسال» تغییر یافت ✅`, show_alert: true })
      });

      // 2. Edit message text with automatic deletion countdown
      if (cb.message && cb.message.chat && cb.message.message_id) {
        await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: cb.message.chat.id,
            message_id: cb.message.message_id,
            text: `⏳ با تشکر از شما فایل‌های چاپ تا ۱۰ ثانیه دیگر حذف خواهند شد.`,
            parse_mode: 'Markdown'
          })
        });

        // 3. Schedule deletion of ALL tracked messages
        setTimeout(async () => {
          for (const msgId of messagesToDelete) {
            try {
              await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: cb.message.chat.id, message_id: msgId })
              });
            } catch (e) {
              console.error(`Error deleting message ${msgId}:`, e);
            }
          }
        }, 10000);
      }
    }
  } else if (data.startsWith('delete_files:')) {
    // This branch is now deprecated in favor of automatic cleanup
  }
}

let lastTelegramUpdateId = 0;
async function pollTelegramUpdates() {
  try {
    const db = await readDb();
    const token = db.settings?.telegramToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;

    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${lastTelegramUpdateId + 1}&timeout=1`);
    if (!res.ok) {
      const errJson: any = await res.json().catch(() => ({}));
      if (errJson.error_code === 409) {
        await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
      }
      return;
    }

    const data = await res.json();
    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        lastTelegramUpdateId = Math.max(lastTelegramUpdateId, update.update_id);
        if (update.callback_query) {
          await handleTelegramCallbackQuery(update.callback_query, token);
        }
      }
    }
  } catch (err) {
    // Ignore polling errors
  }
}

setInterval(pollTelegramUpdates, 2000);

// Telegram Send Order API
app.post('/api/telegram/send-order', async (req, res) => {
  try {
    const { botToken, chatId, order, dimensionTitle, materialName } = req.body;
    if (!botToken || !chatId || !order) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    // Always update settings so polling has the latest botToken
    const dbSettings = await readDb();
    dbSettings.settings = { ...(dbSettings.settings || {}), telegramToken: botToken, telegramChatId: chatId };
    await writeDb(dbSettings);

    const sentMessageIds: number[] = [];

    const timeFa = new Date().toLocaleString('fa-IR', {
      timeZone: 'Asia/Tehran',
      hour: '2-digit',
      minute: '2-digit',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    async function sendDocumentFromDataUrl(dataUrl: string, caption: string, filename: string) {
      if (!dataUrl) return null;
      try {
        const parts = dataUrl.split(';base64,');
        if (parts.length < 2) return null;
        const contentType = parts[0].split(':')[1] || 'image/jpeg';
        const raw = Buffer.from(parts[1], 'base64');
        const blob = new Blob([raw], { type: contentType });

        const form = new FormData();
        form.append('chat_id', chatId);
        form.append('caption', caption);
        form.append('document', blob, filename);

        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
          method: 'POST',
          body: form
        });
        const result = await response.json();
        return result.ok ? result.result.message_id : null;
      } catch (err) {
        console.error('Error sending document to telegram:', err);
        return null;
      }
    }

    // 1. Send 9-pack sheet image
    if (order.printSheetImage) {
      let sheetCountText = `${order.quantity || 1} سری`;
      if (order.dimensionId === 'personnel_12x3x4') {
        sheetCountText = `${2 * (order.quantity || 1)} سری`;
      }
      const captionSheet = `🎴 شیت ۹تایی چاپ\n📌 شماره سفارش: ${order.trackingCode}\n📐 اندازه: 10*15\n🔢 تعداد: ${sheetCountText}\n📅 ثبت: ${timeFa}`;
      const msgId = await sendDocumentFromDataUrl(order.printSheetImage, captionSheet, `sheet-9pack-${order.trackingCode}.jpg`);
      if (msgId) sentMessageIds.push(msgId);
    }

    // 2. Send commercial promotional image
    const commercialImg = order.commercialSheet10x15Image || order.commercialImage;
    if (commercialImg) {
      const captionComm = `🎨 عکس تبلیغاتی ۱۰×۱۵\n📌 شماره سفارش: ${order.trackingCode}\n📐 اندازه: 10*15\n🔢 تعداد: ${order.quantity || 1} سری\n📅 ثبت: ${timeFa}`;
      const msgId = await sendDocumentFromDataUrl(commercialImg, captionComm, `commercial-10x15-${order.trackingCode}.jpg`);
      if (msgId) sentMessageIds.push(msgId);
    }

    // 3. Send inquiry message
    try {
      const confirmMsg = `آیا سفارش ${order.trackingCode} چاپ شده است؟`;
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: confirmMsg,
          reply_markup: {
            inline_keyboard: [[{ text: 'بله، چاپ شد (تغییر به آماده ارسال) ✅', callback_data: `mark_ready:${order.id}` }]]
          }
        })
      });
      const resData = await res.json();
      if (resData.ok) sentMessageIds.push(resData.result.message_id);
    } catch (err) {
      console.error('Error sending confirmation message:', err);
    }
    
    // Save sent message IDs to DB
    const db = await readDb();
    const orderIdx = db.orders.findIndex((o: any) => o.id === order.id);
    if (orderIdx >= 0) {
      db.orders[orderIdx].sentMessageIds = sentMessageIds;
      await writeDb(db);
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('Telegram send order error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});

// Telegram Webhook Handler for Inline Buttons & Callbacks
app.post('/api/telegram/webhook', async (req, res) => {
  try {
    const update = req.body;
    if (update && update.callback_query) {
      const db = await readDb();
      const token = db.settings?.telegramToken || process.env.TELEGRAM_BOT_TOKEN;
      await handleTelegramCallbackQuery(update.callback_query, token);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Telegram webhook error:', err);
    res.json({ ok: true });
  }
});

// Start Express + Vite Server
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else if (!IS_SERVERLESS) {
    // Self-hosted production: serve the built SPA from Express.
    // On Vercel the static files are served by the CDN instead.
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', async (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Real Database Server running on http://localhost:${PORT}`);
  });
}

if (!IS_SERVERLESS) {
  startServer();
}

export default app;
export { app };
