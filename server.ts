import express from 'express';
import cors from 'cors';
import axios from 'axios';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// =====================================================================
// CONSTANTS (exactly as specified)
// =====================================================================
const ADMIN_PHONE = '+254715185037';
const ADMIN_EMAIL = 'info@nestlist.com';
const MPESA_PAYBILL = '247247';
const MPESA_ACCOUNT = '0715185037';
const APP_URL = 'https://nestlist.com';

const LISTING_FEES: Record<string, number> = {
  single_room: 100,
  bedsitter:   200,
  studio:      250,
  '1br':       500,
  '2br':       700,
  '3br':       1000,
  '4br':       1200,
  '5br_plus':  1500,
};

const AT_API_KEY = 'atsk_6d9fc62e535d5f7de498116c8a9786631be1f4e03974989ca5e14bc4407b60926e22536c';
const AT_USERNAME = 'sandbox';
const AT_BASE = 'https://api.sandbox.africastalking.com';

// M-Pesa STK Push Config
const MPESA_KEY = process.env.MPESA_KEY || 'Krt8pu4qFzcfbdsibP2GGPflwcSOqKFWNdMXDXyYkmR1Z1Lk';
const MPESA_SECRET = process.env.MPESA_SECRET || 'EPlOqQvGl4TTH3bvN1AScB8G16XOuPJLBDMy3f4Dnl8frc4v4NwVl1YJZlClvgTS';
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE || '174379';
const MPESA_PASSKEY = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158695eded2925d4da9a5745fa54a3bbc5c893fdea4d612';
const MPESA_ENV = process.env.MPESA_ENV || 'sandbox';
const MPESA_BASE = MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';
const CALLBACK_URL = process.env.CALLBACK_URL || 'https://nestlist.com/api/mpesa/callback';

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://nestlist.com',
    'https://www.nestlist.com'
  ],
  credentials: true
}));

// M-Pesa Helper Functions
function formatPhone(phone: string): string {
  let p = String(phone).replace(/\s+/g, '').replace(/[^0-9+]/g, '');
  if (p.startsWith('0')) p = '254' + p.slice(1);
  if (p.startsWith('+254')) p = p.slice(1);
  if (p.startsWith('+')) p = p.slice(1);
  if (!p.startsWith('254')) p = '254' + p;
  return p;
}

function mpesaTimestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[^0-9]/g, '')
    .slice(0, 14);
}

function mpesaPassword(ts: string): string {
  const str = MPESA_SHORTCODE + MPESA_PASSKEY + ts;
  return Buffer.from(str).toString('base64');
}

async function getMpesaToken(): Promise<string> {
  const creds = Buffer.from(`${MPESA_KEY}:${MPESA_SECRET}`).toString('base64');
  const res = await axios.get(
    `${MPESA_BASE}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${creds}` } }
  );
  if (!res.data.access_token) {
    throw new Error('Failed to get M-Pesa token');
  }
  return res.data.access_token;
}

// =====================================================================
// SUPABASE REAL DATABASE SETUP
// =====================================================================
const sanitizeUrl = (url: string): string => {
  let clean = (url || "").trim();
  if (clean.endsWith("/rest/v1/")) {
    clean = clean.slice(0, -9);
  } else if (clean.endsWith("/rest/v1")) {
    clean = clean.slice(0, -8);
  }
  if (clean.endsWith("/")) {
    clean = clean.slice(0, -1);
  }
  return clean;
};

const supabaseUrl = sanitizeUrl(process.env.VITE_SUPABASE_URL || "");
const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || "").trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey).trim();

const isPlaceholder = (val: string) => {
  if (!val) return true;
  const clean = val.toLowerCase();
  return (
    clean === "" ||
    clean === "null" ||
    clean === "undefined" ||
    clean.includes("placeholder") ||
    clean.includes("your_")
  );
};

const useRealSupabase = !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey);
let supabaseClient: any = null;

if (useRealSupabase) {
  console.log("Backend connecting to real Supabase database via Service Key...");
  supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
} else {
  console.log("Backend running in simulated mock mode (file-based persistence)...");
}

// =====================================================================
// SIMULATED DATABASE FILE (db.json)
// =====================================================================
const DB_FILE = path.join(process.cwd(), "db.json");

interface MockDb {
  properties: any[];
  profiles: any[];
  listing_payments: any[];
  inquiries: any[];
  saved_properties: any[];
  search_alerts: any[];
  sms_logs: any[];
  listing_boosts: any[];
  lead_unlocks: any[];
}

function getMockDb(): MockDb {
  if (!fs.existsSync(DB_FILE)) {
    const initialDb: MockDb = {
      properties: [],
      profiles: [],
      listing_payments: [],
      inquiries: [],
      saved_properties: [],
      search_alerts: [],
      sms_logs: [],
      listing_boosts: [],
      lead_unlocks: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2));
    return initialDb;
  }
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    if (!db.properties) db.properties = [];
    if (!db.profiles) db.profiles = [];
    if (!db.listing_payments) db.listing_payments = [];
    if (!db.inquiries) db.inquiries = [];
    if (!db.saved_properties) db.saved_properties = [];
    if (!db.search_alerts) db.search_alerts = [];
    if (!db.sms_logs) db.sms_logs = [];
    if (!db.listing_boosts) db.listing_boosts = [];
    if (!db.lead_unlocks) db.lead_unlocks = [];
    return db;
  } catch (err) {
    return {
      properties: [],
      profiles: [],
      listing_payments: [],
      inquiries: [],
      saved_properties: [],
      search_alerts: [],
      sms_logs: []
    };
  }
}

function saveMockDb(db: MockDb) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// =====================================================================
// NOTIFICATION HELPERS (SMS & EMAIL)
// =====================================================================
async function sendSMS(phone: string, message: string, type: string): Promise<void> {
  try {
    let tel = phone.replace(/\s/g, '');
    if (tel.startsWith('0')) tel = '+254' + tel.slice(1);
    if (!tel.startsWith('+')) tel = '+' + tel;

    const params = new URLSearchParams({
      username: AT_USERNAME,
      to: tel,
      message,
      from: 'NestList',
    });

    const res = await axios.post(
      AT_BASE + '/version1/messaging',
      params.toString(),
      {
        headers: {
          apiKey: AT_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      }
    );

    // Log to DB
    if (useRealSupabase) {
      await supabaseClient.from('sms_logs').insert({
        recipient_phone: tel,
        message,
        type,
        status: 'sent',
        at_response: res.data,
      });
    } else {
      const db = getMockDb();
      db.sms_logs.push({
        id: `sms-${Date.now()}`,
        recipient_phone: tel,
        message,
        type,
        status: 'sent',
        at_response: res.data,
        created_at: new Date().toISOString()
      });
      saveMockDb(db);
    }

    console.log('SMS sent to', tel, ':', message.slice(0, 40) + '...');
  } catch (err: any) {
    console.error('SMS failed (non-critical):', err.message);
    // Log failure
    try {
      if (useRealSupabase) {
        await supabaseClient.from('sms_logs').insert({
          recipient_phone: phone,
          message,
          type,
          status: 'failed',
        });
      } else {
        const db = getMockDb();
        db.sms_logs.push({
          id: `sms-${Date.now()}`,
          recipient_phone: phone,
          message,
          type,
          status: 'failed',
          created_at: new Date().toISOString()
        });
        saveMockDb(db);
      }
    } catch (_) {}
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'gardisonkirui11@gmail.com',
        pass: 'nlwzpdajfaxbcfja',
      },
    });

    await transporter.sendMail({
      from: '"NestList Support" <support@nestlist.com>',
      to,
      subject,
      html,
    });

    console.log('Email sent to', to);
  } catch (err: any) {
    console.error('Email failed (non-critical):', err.message);
  }
}

// =====================================================================
// API ROUTES
// =====================================================================

// ── HEALTH CHECK ─────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    version: "1.0.0",
    platform: "NestList Kenya",
    timestamp: new Date().toISOString(),
    supabase: useRealSupabase ? "connected" : "mock mode"
  });
});

// ── LISTINGS ─────────────────────────────────────────────────────────

// GET /api/listings
app.get('/api/listings', async (req, res) => {
  const { county, type, maxPrice, search, page = '1', limit = '20' } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  if (useRealSupabase) {
    try {
      let query = supabaseClient
        .from('properties')
        .select('*', { count: 'exact' })
        .eq('is_active', true);

      if (county && county !== 'All Counties' && county !== 'all') {
        query = query.eq('county', county);
      }
      if (type && type !== 'all') {
        query = query.eq('type', type);
      }
      if (maxPrice) {
        query = query.lte('price', parseInt(maxPrice as string, 10));
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limitNum - 1);

      if (error) throw error;

      let filtered = data || [];
      if (search) {
        const term = (search as string).toLowerCase();
        filtered = filtered.filter((p: any) =>
          p.title.toLowerCase().includes(term) ||
          p.location.toLowerCase().includes(term) ||
          (p.description && p.description.toLowerCase().includes(term))
        );
      }

      return res.json({
        success: true,
        listings: filtered,
        total: count || filtered.length,
        page: pageNum,
        limit: limitNum
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    let filtered = db.properties.filter(p => p.is_active);

    if (county && county !== 'All Counties' && county !== 'all') {
      filtered = filtered.filter(p => p.county?.toLowerCase() === (county as string).toLowerCase());
    }
    if (type && type !== 'all') {
      filtered = filtered.filter(p => p.type === type);
    }
    if (maxPrice) {
      filtered = filtered.filter(p => p.price <= parseInt(maxPrice as string, 10));
    }
    if (search) {
      const term = (search as string).toLowerCase();
      filtered = filtered.filter(p =>
        p.title?.toLowerCase().includes(term) ||
        p.location?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
      );
    }

    // Sort
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = filtered.length;
    const listings = filtered.slice(offset, offset + limitNum);

    return res.json({
      success: true,
      listings,
      total,
      page: pageNum,
      limit: limitNum
    });
  }
});

// GET /api/listings/:id
app.get('/api/listings/:id', async (req, res) => {
  const { id } = req.params;

  if (useRealSupabase) {
    try {
      // Fetch property
      const { data: listing, error } = await supabaseClient
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !listing) {
        return res.status(404).json({ error: "Listing not found" });
      }

      // Fetch landlord
      const { data: landlord } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', listing.landlord_id)
        .single();

      // Increment view count via SQL RPC or Direct update
      await supabaseClient
        .from('properties')
        .update({ view_count: (listing.view_count || 0) + 1 })
        .eq('id', id);

      return res.json({
        success: true,
        listing: { ...listing, view_count: (listing.view_count || 0) + 1 },
        landlord
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const listing = db.properties.find(p => p.id === id);
    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    listing.view_count = (listing.view_count || 0) + 1;
    saveMockDb(db);

    const landlord = db.profiles.find(p => p.id === listing.landlord_id);

    return res.json({
      success: true,
      listing,
      landlord
    });
  }
});

// POST /api/listings
app.post('/api/listings', async (req, res) => {
  const { title, type, price, location, county, description, amenities, images, landlordId } = req.body;

  if (!title || !price || !landlordId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('properties')
        .insert({
          title,
          type,
          price: parseInt(price, 10),
          location,
          county,
          description,
          amenities: amenities || [],
          images: images || [],
          landlord_id: landlordId,
          is_active: false
        })
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, listing: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const listing = {
      id: `prop-${Date.now()}`,
      title,
      type,
      price: parseInt(price, 10),
      location,
      county,
      description,
      amenities: amenities || [],
      images: images || [],
      landlord_id: landlordId,
      is_active: false,
      view_count: 0,
      inquiry_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.properties.push(listing);
    saveMockDb(db);

    return res.json({ success: true, listing });
  }
});

// PUT /api/listings/:id
app.put('/api/listings/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('properties')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, listing: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const idx = db.properties.findIndex(p => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Listing not found" });
    }

    db.properties[idx] = {
      ...db.properties[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    saveMockDb(db);

    return res.json({ success: true, listing: db.properties[idx] });
  }
});

// DELETE /api/listings/:id
app.delete('/api/listings/:id', async (req, res) => {
  const { id } = req.params;

  if (useRealSupabase) {
    try {
      // Delete listing
      const { error } = await supabaseClient
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return res.json({ success: true, message: "Listing deleted" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    db.properties = db.properties.filter(p => p.id !== id);
    db.listing_payments = db.listing_payments.filter(p => p.property_id !== id);
    db.inquiries = db.inquiries.filter(i => i.property_id !== id);
    saveMockDb(db);

    return res.json({ success: true, message: "Listing deleted" });
  }
});

// GET /api/listings/:id/fee
app.get('/api/listings/:id/fee', async (req, res) => {
  const { id } = req.params;

  let type = 'bedsitter';

  if (useRealSupabase) {
    try {
      const { data } = await supabaseClient
        .from('properties')
        .select('type')
        .eq('id', id)
        .single();
      if (data) type = data.type;
    } catch (_) {}
  } else {
    const db = getMockDb();
    const property = db.properties.find(p => p.id === id);
    if (property) type = property.type;
  }

  const fee = LISTING_FEES[type] || 100;

  return res.json({
    fee,
    type,
    paybill: MPESA_PAYBILL,
    account: MPESA_ACCOUNT,
    instructions: `Send KES ${fee} to Paybill ${MPESA_PAYBILL}, Account: ${MPESA_ACCOUNT}`
  });
});

// POST /api/listings/:id/payment
app.post('/api/listings/:id/payment', async (req, res) => {
  const { id } = req.params;
  const { mpesaCode, payerPhone, amountPaid } = req.body;

  if (!mpesaCode || typeof mpesaCode !== 'string') {
    return res.status(400).json({ error: "M-Pesa reference code is required" });
  }

  const cleanCode = mpesaCode.trim().toUpperCase();
  const mpesaRegex = /^[A-Z0-9]{8,12}$/;
  if (!mpesaRegex.test(cleanCode)) {
    return res.status(400).json({ error: "Invalid M-Pesa code format. Must be 8-12 alphanumeric characters." });
  }

  const amount = parseFloat(amountPaid);
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: "Invalid payment amount" });
  }

  let property: any = null;
  let landlord: any = null;

  if (useRealSupabase) {
    try {
      // Get property
      const { data: prop, error: pErr } = await supabaseClient
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (pErr || !prop) return res.status(404).json({ error: "Property not found" });
      property = prop;

      // Get fee
      const fee = LISTING_FEES[property.type] || 100;
      if (amount < fee) {
        return res.status(400).json({ error: `Amount paid is less than the required fee of KES ${fee}` });
      }

      // Check duplicate payment
      const { data: existing } = await supabaseClient
        .from('listing_payments')
        .select('id')
        .eq('mpesa_code', cleanCode)
        .maybeSingle();

      if (existing) {
        return res.status(400).json({ error: "This M-Pesa code has already been submitted." });
      }

      // Insert payment
      const { error: insErr } = await supabaseClient
        .from('listing_payments')
        .insert({
          property_id: id,
          landlord_id: property.landlord_id,
          amount: fee,
          amount_paid: amount,
          property_type: property.type,
          mpesa_code: cleanCode,
          payer_phone: payerPhone || null,
          status: 'pending'
        });

      if (insErr) throw insErr;

      // Update property status is not needed since properties does not have payment_status, listing_payments tracks this
      // Get Landlord Profile
      const { data: prof } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', property.landlord_id)
        .single();
      landlord = prof;
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const prop = db.properties.find(p => p.id === id);
    if (!prop) return res.status(404).json({ error: "Property not found" });
    property = prop;

    const fee = LISTING_FEES[property.type] || 100;
    if (amount < fee) {
      return res.status(400).json({ error: `Amount paid is less than the required fee of KES ${fee}` });
    }

    const dup = db.listing_payments.find(p => p.mpesa_code === cleanCode);
    if (dup) return res.status(400).json({ error: "This M-Pesa code has already been submitted." });

    const newPayment = {
      id: `pay-${Date.now()}`,
      property_id: id,
      landlord_id: property.landlord_id,
      amount: fee,
      amount_paid: amount,
      property_type: property.type,
      mpesa_code: cleanCode,
      payer_phone: payerPhone || "N/A",
      status: 'pending',
      created_at: new Date().toISOString()
    };

    db.listing_payments.push(newPayment);
    saveMockDb(db);

    landlord = db.profiles.find(p => p.id === property.landlord_id) || { full_name: "Mock Landlord", phone: payerPhone };
  }

  // SEND NOTIFICATIONS
  const landlordName = landlord?.full_name || 'Landlord';
  const landlordPhone = landlord?.phone || payerPhone || 'N/A';

  // 1. SMS to Admin
  const adminMsg = `NestList: New payment pending verification. Property: ${property.title} (${property.type}). M-Pesa Code: ${cleanCode}. Amount: KES ${amount}. Landlord: ${landlordName} - ${landlordPhone}. Verify: ${APP_URL}/admin`;
  await sendSMS(ADMIN_PHONE, adminMsg, 'payment_submitted_admin');

  // 2. SMS to Landlord
  const landlordMsg = `NestList: Your M-Pesa code ${cleanCode} has been submitted. We will verify and activate your listing within minutes. Thank you.`;
  await sendSMS(landlordPhone, landlordMsg, 'payment_submitted_landlord');

  // 3. Email to Admin
  const emailHtml = `
    <h2>New Listing Payment Pending Verification</h2>
    <p><strong>Property:</strong> ${property.title}</p>
    <p><strong>Type:</strong> ${property.type}</p>
    <p><strong>Required Fee:</strong> KES ${LISTING_FEES[property.type] || 100}</p>
    <p><strong>Amount Submitted:</strong> KES ${amount}</p>
    <p><strong>M-Pesa Reference:</strong> ${cleanCode}</p>
    <p><strong>Sender Phone:</strong> ${landlordPhone}</p>
    <p><strong>Landlord Name:</strong> ${landlordName}</p>
    <br>
    <p><a href="${APP_URL}/admin" style="padding: 10px 20px; background-color: #15803d; color: white; text-decoration: none; border-radius: 5px;">Verify in Admin Portal</a></p>
  `;
  await sendEmail(ADMIN_EMAIL, `New Payment Pending - ${property.title}`, emailHtml);

  return res.json({ success: true, message: "Payment submitted for verification" });
});

// =====================================================================
// M-PESA STK PUSH ENDPOINTS
// =====================================================================

// GET /api/mpesa/token
// Get OAuth token (for testing)
app.get('/api/mpesa/token', async (req, res) => {
  try {
    const token = await getMpesaToken();
    res.json({ success: true, token });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// POST /api/mpesa/stk
// Initiate STK Push
app.post('/api/mpesa/stk', async (req, res) => {
  const { phone, amount, propertyId, propertyTitle, landlordId } = req.body;

  if (!phone || !amount || !propertyId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: phone, amount, propertyId'
    });
  }

  try {
    const token = await getMpesaToken();
    const ts = mpesaTimestamp();
    const pwd = mpesaPassword(ts);
    const tel = formatPhone(phone);

    const stkRes = await axios.post(
      `${MPESA_BASE}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: MPESA_SHORTCODE,
        Password: pwd,
        Timestamp: ts,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.ceil(amount),
        PartyA: tel,
        PartyB: MPESA_SHORTCODE,
        PhoneNumber: tel,
        CallBackURL: CALLBACK_URL,
        AccountReference: 'NESTLIST-' + propertyId.slice(0, 8).toUpperCase(),
        TransactionDesc: `NestList: ${(propertyTitle || 'Listing Fee').slice(0, 20)}`,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const d = stkRes.data;

    if (d.ResponseCode !== '0') {
      throw new Error(
        d.ResponseDescription ||
        d.errorMessage ||
        'STK Push failed'
      );
    }

    let paymentId = null;

    if (useRealSupabase) {
      // Save pending payment to Supabase
      const { data: payment, error: payErr } = await supabaseClient
        .from('listing_payments')
        .insert({
          property_id: propertyId,
          landlord_id: landlordId || null,
          amount: Math.ceil(amount),
          status: 'pending',
          mpesa_checkout_request_id: d.CheckoutRequestID,
          payment_method: 'stk_push',
        })
        .select()
        .single();

      if (payErr) {
        console.error('Supabase insert error:', payErr);
      } else {
        paymentId = payment?.id;
      }

      // Update property payment_status
      await supabaseClient
        .from('properties')
        .update({ payment_status: 'pending_verification' })
        .eq('id', propertyId);
    } else {
      const db = getMockDb();
      paymentId = `pay-${Date.now()}`;
      
      const mockPayment = {
        id: paymentId,
        property_id: propertyId,
        landlord_id: landlordId || null,
        amount: Math.ceil(amount),
        status: 'pending',
        mpesa_checkout_request_id: d.CheckoutRequestID,
        payment_method: 'stk_push',
        created_at: new Date().toISOString()
      };
      
      db.listing_payments.push(mockPayment);

      const prop = db.properties.find(p => p.id === propertyId);
      if (prop) {
        prop.payment_status = 'pending_verification';
      }
      saveMockDb(db);
    }

    res.json({
      success: true,
      checkoutId: d.CheckoutRequestID,
      paymentId: paymentId,
      message: 'STK Push sent! Check your phone.',
    });

  } catch (err: any) {
    console.error('STK Push error:', err.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// POST /api/mpesa/callback
// Safaricom webhook — called after user pays or cancels
app.post('/api/mpesa/callback', async (req, res) => {
  try {
    const cb = req.body?.Body?.stkCallback;
    const checkoutId = cb?.CheckoutRequestID;
    const resultCode = cb?.ResultCode;

    console.log('M-Pesa callback received:', JSON.stringify(cb));

    if (!checkoutId) {
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const statusVal = resultCode === 1032 ? 'cancelled' : 'failed';

    if (resultCode === 0) {
      // PAYMENT SUCCESS
      const items = cb?.CallbackMetadata?.Item || [];
      const getItem = (name: string) => items.find((i: any) => i.Name === name)?.Value;

      const mpesaCode = getItem('MpesaReceiptNumber');
      const amountPaid = getItem('Amount');
      const payerPhone = getItem('PhoneNumber');

      console.log(`✅ Webhook confirmed success! Code: ${mpesaCode}`);

      let processed = false;

      // 1. Process standard listing payment
      let payment: any = null;
      if (useRealSupabase) {
        const { data: updatedPayment } = await supabaseClient
          .from('listing_payments')
          .update({
            status: 'confirmed',
            mpesa_code: mpesaCode,
            amount_paid: amountPaid,
            payer_phone: String(payerPhone || ''),
            verified_at: new Date().toISOString(),
            verified_by: 'stk_auto',
          })
          .eq('mpesa_checkout_request_id', checkoutId)
          .select()
          .maybeSingle();
        payment = updatedPayment;
        if (payment) processed = true;
      } else {
        const db = getMockDb();
        const pIndex = db.listing_payments.findIndex(pay => pay.mpesa_checkout_request_id === checkoutId);
        if (pIndex !== -1) {
          db.listing_payments[pIndex] = {
            ...db.listing_payments[pIndex],
            status: 'confirmed',
            mpesa_code: mpesaCode,
            amount_paid: amountPaid,
            payer_phone: String(payerPhone || ''),
            verified_at: new Date().toISOString(),
            verified_by: 'stk_auto',
          };
          payment = db.listing_payments[pIndex];
          const prop = db.properties.find(p => p.id === payment.property_id);
          if (prop) {
            prop.is_active = true;
            prop.payment_status = 'verified';
            prop.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          }
          saveMockDb(db);
          processed = true;
        }
      }

      if (processed && payment) {
        if (useRealSupabase && payment.property_id) {
          await supabaseClient
            .from('properties')
            .update({
              is_active: true,
              payment_status: 'verified',
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq('id', payment.property_id);
        }

        console.log(`🏠 Listing ${payment.property_id} activated via STK`);

        let landlordProfile: any = null;
        if (payment.landlord_id) {
          if (useRealSupabase) {
            const { data: profile } = await supabaseClient
              .from('profiles')
              .select('phone, full_name, email')
              .eq('id', payment.landlord_id)
              .single();
            landlordProfile = profile;
          } else {
            const db = getMockDb();
            const profile = db.profiles.find(u => u.id === payment.landlord_id);
            landlordProfile = profile || { full_name: 'Landlord', phone: String(payerPhone || ''), email: '' };
          }

          if (landlordProfile?.phone) {
            await sendSMS(
              landlordProfile.phone,
              `NestList: ✅ Your listing is now LIVE! Receipt: ${mpesaCode}. Active for 30 days. View at nestlist.com`,
              'listing_confirmed_stk'
            );
          }

          if (landlordProfile?.email) {
            await sendEmail(
              landlordProfile.email,
              '✅ Your NestList listing is now LIVE!',
              `
                <h2>Your listing is live! 🎉</h2>
                <p>Hi ${landlordProfile.full_name},</p>
                <p>Your property listing is now visible to thousands of tenants on NestList.</p>
                <p><strong>M-Pesa Receipt:</strong> ${mpesaCode}</p>
                <p><strong>Amount Paid:</strong> KES ${amountPaid}</p>
                <p><strong>Active Until:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-KE', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}</p>
                <p><a href="https://nestlist.com/dashboard">View My Dashboard</a></p>
                <p>The NestList Team</p>
              `
            );
          }

          await sendSMS(
            ADMIN_PHONE,
            `NestList: New STK listing activated! Landlord: ${landlordProfile?.full_name}. Code: ${mpesaCode}. Amount: KES ${amountPaid}`,
            'admin_stk_notification'
          );
        }
      }

      // 2. Process listing boost
      if (!processed) {
        let boost: any = null;
        if (useRealSupabase) {
          const { data: updatedBoost } = await supabaseClient
            .from('listing_boosts')
            .update({
              status: 'active',
              mpesa_code: mpesaCode,
              starts_at: new Date().toISOString()
            })
            .eq('mpesa_checkout_request_id', checkoutId)
            .select('*, property:properties(title)')
            .maybeSingle();

          if (updatedBoost) {
            boost = updatedBoost;
            processed = true;
            const durationDays = boost.boost_tier === '3day' ? 3 : boost.boost_tier === '7day' ? 7 : boost.boost_tier === '14day' ? 14 : boost.boost_tier === '30day' ? 30 : 7;
            const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
            const badgeText = boost.boost_tier === '3day' ? '⚡ Featured' : boost.boost_tier === '7day' ? '⭐ Featured' : boost.boost_tier === '14day' ? '🔥 Hot Property' : '👑 Premium';

            await supabaseClient.from('listing_boosts').update({ expires_at: expiresAt }).eq('id', boost.id);

            await supabaseClient.from('properties').update({
              is_boosted: true,
              boost_tier: boost.boost_tier,
              boost_expires_at: expiresAt,
              boost_badge: badgeText
            }).eq('id', boost.property_id);

            const { data: profile } = await supabaseClient.from('profiles').select('phone').eq('id', boost.landlord_id).single();
            if (profile?.phone) {
              await sendSMS(
                profile.phone,
                `NestList: 🚀 Your listing '${boost.property?.title}' is now BOOSTED! It appears at the top of search results for ${durationDays} days. nestlist.com`,
                'boost_activated'
              );
            }
          }
        } else {
          const db = getMockDb();
          const bIndex = db.listing_boosts.findIndex(b => b.mpesa_checkout_request_id === checkoutId);
          if (bIndex !== -1) {
            boost = db.listing_boosts[bIndex];
            boost.status = 'active';
            boost.mpesa_code = mpesaCode;
            const durationDays = boost.boost_tier === '3day' ? 3 : boost.boost_tier === '7day' ? 7 : boost.boost_tier === '14day' ? 14 : boost.boost_tier === '30day' ? 30 : 7;
            const startsAt = new Date().toISOString();
            const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
            const badgeText = boost.boost_tier === '3day' ? '⚡ Featured' : boost.boost_tier === '7day' ? '⭐ Featured' : boost.boost_tier === '14day' ? '🔥 Hot Property' : '👑 Premium';

            boost.starts_at = startsAt;
            boost.expires_at = expiresAt;

            const prop = db.properties.find(p => p.id === boost.property_id);
            if (prop) {
              prop.is_boosted = true;
              prop.boost_tier = boost.boost_tier;
              prop.boost_expires_at = expiresAt;
              prop.boost_badge = badgeText;
            }

            const landlord = db.profiles.find(p => p.id === boost.landlord_id);
            if (landlord?.phone) {
              await sendSMS(
                landlord.phone,
                `NestList: 🚀 Your listing '${prop?.title || "Property"}' is now BOOSTED! It appears at the top of search results for ${durationDays} days. nestlist.com`,
                'boost_activated'
              );
            }
            saveMockDb(db);
            processed = true;
          }
        }
      }

      // 3. Process lead unlocks / bundles
      if (!processed) {
        let unlock: any = null;
        if (useRealSupabase) {
          const { data: updatedUnlock } = await supabaseClient
            .from('lead_unlocks')
            .update({
              status: 'confirmed',
              mpesa_code: mpesaCode,
              unlocked_at: new Date().toISOString()
            })
            .eq('mpesa_checkout_request_id', checkoutId)
            .select('*, property:properties(title, lead_credits)')
            .maybeSingle();

          if (updatedUnlock) {
            unlock = updatedUnlock;
            processed = true;

            if (unlock.bundle_size === 5) {
              const currentCredits = unlock.property?.lead_credits || 0;
              const newBalance = currentCredits + 5;
              await supabaseClient.from('properties').update({ lead_credits: newBalance }).eq('id', unlock.property_id);

              const { data: profile } = await supabaseClient.from('profiles').select('phone').eq('id', unlock.landlord_id).single();
              if (profile?.phone) {
                await sendSMS(
                  profile.phone,
                  `NestList: ✅ 5 lead credits added to '${unlock.property?.title}'. Credits: ${newBalance}. nestlist.com`,
                  'bundle_purchased'
                );
              }
            } else {
              if (unlock.inquiry_id) {
                await supabaseClient.from('inquiries').update({ is_locked: false }).eq('id', unlock.inquiry_id);
              }

              const { data: profile } = await supabaseClient.from('profiles').select('phone').eq('id', unlock.landlord_id).single();
              if (profile?.phone) {
                await sendSMS(
                  profile.phone,
                  `NestList: 🔓 Lead unlocked! View tenant contact at nestlist.com/dashboard`,
                  'lead_unlocked'
                );
              }
            }
          }
        } else {
          const db = getMockDb();
          const uIndex = db.lead_unlocks.findIndex(u => u.mpesa_checkout_request_id === checkoutId);
          if (uIndex !== -1) {
            unlock = db.lead_unlocks[uIndex];
            unlock.status = 'confirmed';
            unlock.mpesa_code = mpesaCode;
            unlock.unlocked_at = new Date().toISOString();

            const prop = db.properties.find(p => p.id === unlock.property_id);
            const landlord = db.profiles.find(p => p.id === unlock.landlord_id);

            if (unlock.bundle_size === 5) {
              const currentCredits = prop?.lead_credits || 0;
              const newBalance = currentCredits + 5;
              if (prop) prop.lead_credits = newBalance;

              if (landlord?.phone) {
                await sendSMS(
                  landlord.phone,
                  `NestList: ✅ 5 lead credits added to '${prop?.title || "Property"}'. Credits: ${newBalance}. nestlist.com`,
                  'bundle_purchased'
                );
              }
            } else {
              if (unlock.inquiry_id) {
                const inq = db.inquiries.find(i => i.id === unlock.inquiry_id);
                if (inq) inq.is_locked = false;
              }

              if (landlord?.phone) {
                await sendSMS(
                  landlord.phone,
                  `NestList: 🔓 Lead unlocked! View tenant contact at nestlist.com/dashboard`,
                  'lead_unlocked'
                );
              }
            }
            saveMockDb(db);
            processed = true;
          }
        }
      }

    } else {
      // PAYMENT FAILED OR CANCELLED
      const reason = cb?.ResultDesc || 'Payment was not completed';
      console.log(`❌ Payment failed: ${reason}`);

      if (useRealSupabase) {
        await supabaseClient.from('listing_payments').update({ status: statusVal, failure_reason: reason }).eq('mpesa_checkout_request_id', checkoutId);
        await supabaseClient.from('listing_boosts').update({ status: 'cancelled' }).eq('mpesa_checkout_request_id', checkoutId);
        await supabaseClient.from('lead_unlocks').update({ status: 'failed' }).eq('mpesa_checkout_request_id', checkoutId);
      } else {
        const db = getMockDb();
        const pIndex = db.listing_payments.findIndex(pay => pay.mpesa_checkout_request_id === checkoutId);
        if (pIndex !== -1) {
          db.listing_payments[pIndex].status = statusVal;
          db.listing_payments[pIndex].failure_reason = reason;
        }
        const bIndex = db.listing_boosts.findIndex(b => b.mpesa_checkout_request_id === checkoutId);
        if (bIndex !== -1) {
          db.listing_boosts[bIndex].status = 'cancelled';
        }
        const uIndex = db.lead_unlocks.findIndex(u => u.mpesa_checkout_request_id === checkoutId);
        if (uIndex !== -1) {
          db.lead_unlocks[uIndex].status = 'failed';
        }
        saveMockDb(db);
      }
    }

  } catch (err: any) {
    console.error('Callback error:', err.message);
  }

  // ALWAYS return 200 to Safaricom
  res.status(200).json({
    ResultCode: 0,
    ResultDesc: 'Accepted'
  });
});

// GET /api/mpesa/status
// Poll payment status
app.get('/api/mpesa/status', async (req, res) => {
  const { checkoutId, propertyId } = req.query;

  if (!checkoutId && !propertyId) {
    return res.status(400).json({
      error: 'Provide checkoutId or propertyId'
    });
  }

  try {
    let payment: any = null;

    if (useRealSupabase) {
      let query = supabaseClient
        .from('listing_payments')
        .select('status, mpesa_code, amount_paid, failure_reason');

      if (checkoutId) {
        query = query.eq('mpesa_checkout_request_id', checkoutId);
      } else {
        query = query.eq('property_id', propertyId)
          .order('created_at', { ascending: false })
          .limit(1);
      }

      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        payment = data;
      }
    } else {
      const db = getMockDb();
      if (checkoutId) {
        payment = db.listing_payments.find(pay => pay.mpesa_checkout_request_id === checkoutId);
      } else {
        const filtered = db.listing_payments.filter(pay => pay.property_id === propertyId);
        if (filtered.length > 0) {
          filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          payment = filtered[0];
        }
      }
    }

    if (!payment) {
      return res.json({ status: 'pending' });
    }

    res.json({
      status: payment.status,
      mpesaCode: payment.mpesa_code || payment.mpesaCode || null,
      amount: payment.amount_paid || payment.amount || null,
      failureReason: payment.failure_reason || payment.rejection_reason || null,
    });

  } catch (err: any) {
    res.json({ status: 'pending' });
  }
});

// ── ADMIN ENDPOINTS ──────────────────────────────────────────────────

// GET /api/admin/payments/pending
app.get('/api/admin/payments/pending', async (req, res) => {
  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('listing_payments')
        .select('*, landlord:profiles(full_name, phone), property:properties(title, type)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((p: any) => ({
        id: p.property_id,
        payment_id: p.id,
        title: p.property?.title || "Draft Listing",
        landlord: p.landlord || { full_name: "Unknown", phone: "N/A" },
        amount_paid: p.amount_paid || p.amount,
        mpesa_code: p.mpesa_code,
        mpesa_phone: p.payer_phone,
        payment_status: "pending_verification",
        submitted_at: p.created_at
      }));

      return res.json({ success: true, payments: mapped });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const pend = db.listing_payments.filter(p => p.status === 'pending');
    const mapped = pend.map(p => {
      const property = db.properties.find(prop => prop.id === p.property_id);
      const landlord = db.profiles.find(prof => prof.id === p.landlord_id) || { full_name: "Mock Landlord", phone: p.payer_phone || "N/A" };
      return {
        id: p.property_id,
        payment_id: p.id,
        title: property?.title || "Draft Listing",
        landlord,
        amount_paid: p.amount_paid || p.amount,
        mpesa_code: p.mpesa_code,
        mpesa_phone: p.payer_phone,
        payment_status: "pending_verification",
        submitted_at: p.created_at
      };
    });

    return res.json({ success: true, payments: mapped });
  }
});

// GET /api/admin/payments/all
app.get('/api/admin/payments/all', async (req, res) => {
  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('listing_payments')
        .select('*, landlord:profiles(full_name, phone), property:properties(title, type)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.json({ success: true, payments: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const mapped = db.listing_payments.map(p => {
      const property = db.properties.find(prop => prop.id === p.property_id);
      const landlord = db.profiles.find(prof => prof.id === p.landlord_id) || { full_name: "Mock Landlord", phone: p.payer_phone || "N/A" };
      return {
        ...p,
        property,
        landlord
      };
    });
    return res.json({ success: true, payments: mapped });
  }
});

// POST /api/admin/payments/:id/verify (here :id is property_id or payment property_id)
app.post('/api/admin/payments/:id/verify', async (req, res) => {
  const { id } = req.params;
  const { adminNote } = req.body;
  const verifiedAt = new Date().toISOString();

  let property: any = null;
  let landlord: any = null;

  if (useRealSupabase) {
    try {
      // Find property
      const { data: prop, error: pErr } = await supabaseClient
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();
      if (pErr || !prop) return res.status(404).json({ error: "Property not found" });
      property = prop;

      // Update listing payment
      const { error: lpErr } = await supabaseClient
        .from('listing_payments')
        .update({
          status: 'confirmed',
          verified_at: verifiedAt,
          verified_by: 'admin'
        })
        .eq('property_id', id)
        .eq('status', 'pending');

      // Update property
      const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error: prErr } = await supabaseClient
        .from('properties')
        .update({
          is_active: true,
          expires_at: expiry
        })
        .eq('id', id);

      if (prErr) throw prErr;

      // Get Landlord Profile
      const { data: prof } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', property.landlord_id)
        .single();
      landlord = prof;
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const prop = db.properties.find(p => p.id === id);
    if (!prop) return res.status(404).json({ error: "Property not found" });
    property = prop;

    const payment = db.listing_payments.find(p => p.property_id === id && p.status === 'pending');
    if (payment) {
      payment.status = 'confirmed';
      payment.verified_at = verifiedAt;
      payment.verified_by = 'admin';
    }

    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    prop.is_active = true;
    prop.expires_at = expiry;

    saveMockDb(db);

    landlord = db.profiles.find(p => p.id === property.landlord_id) || { full_name: "Mock Landlord", phone: "N/A" };
  }

  // NOTIFICATION
  const landlordPhone = landlord?.phone || '';
  const landlordEmail = landlord?.email || '';
  const expiryDateFormatted = new Date(property.expires_at || Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-KE', { dateStyle: 'long' });

  // 1. SMS to Landlord
  if (landlordPhone) {
    const landlordSMS = `NestList: ✅ Your listing '${property.title}' is now LIVE! Tenants across Kenya can now see your property. Active for 30 days until ${expiryDateFormatted}. View: ${APP_URL}`;
    await sendSMS(landlordPhone, landlordSMS, 'payment_confirmed');
  }

  // 2. Email to Landlord
  if (landlordEmail) {
    const emailHtml = `
      <h2>✅ Your NestList listing is now LIVE!</h2>
      <p>Dear ${landlord?.full_name || 'Landlord'},</p>
      <p>Congratulations! We have successfully verified your payment.</p>
      <p>Your listing <strong>"${property.title}"</strong> is now live on NestList and visible to thousands of tenants seeking rentals in Kenya.</p>
      <p><strong>Details:</strong></p>
      <ul>
        <li><strong>Property Type:</strong> ${property.type}</li>
        <li><strong>Location:</strong> ${property.location}, ${property.county}</li>
        <li><strong>Monthly Rent:</strong> KES ${property.price.toLocaleString()}</li>
        <li><strong>Expiry Date:</strong> ${expiryDateFormatted}</li>
      </ul>
      <p><a href="${APP_URL}/listings/${property.id}" style="padding: 10px 20px; background-color: #15803d; color: white; text-decoration: none; border-radius: 5px;">View Listing</a></p>
      <p>Thank you for choosing NestList!</p>
    `;
    await sendEmail(landlordEmail, `✅ Your NestList listing is now LIVE!`, emailHtml);
  }

  return res.json({ success: true, message: "Payment verified. Listing is now live." });
});

// POST /api/admin/payments/:id/reject
app.post('/api/admin/payments/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ error: "Rejection reason is required" });
  }

  let property: any = null;
  let landlord: any = null;

  if (useRealSupabase) {
    try {
      // Find property
      const { data: prop, error: pErr } = await supabaseClient
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();
      if (pErr || !prop) return res.status(404).json({ error: "Property not found" });
      property = prop;

      // Update payment status
      await supabaseClient
        .from('listing_payments')
        .update({
          status: 'failed',
          rejection_reason: reason
        })
        .eq('property_id', id)
        .eq('status', 'pending');

      // Update property status
      await supabaseClient
        .from('properties')
        .update({
          is_active: false
        })
        .eq('id', id);

      // Fetch landlord
      const { data: prof } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', property.landlord_id)
        .single();
      landlord = prof;
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const prop = db.properties.find(p => p.id === id);
    if (!prop) return res.status(404).json({ error: "Property not found" });
    property = prop;

    const payment = db.listing_payments.find(p => p.property_id === id && p.status === 'pending');
    if (payment) {
      payment.status = 'failed';
      payment.rejection_reason = reason;
    }

    prop.is_active = false;

    saveMockDb(db);

    landlord = db.profiles.find(p => p.id === property.landlord_id) || { full_name: "Mock Landlord", phone: "N/A" };
  }

  // NOTIFICATION
  const landlordPhone = landlord?.phone || '';
  const landlordEmail = landlord?.email || '';

  // 1. SMS to Landlord
  if (landlordPhone) {
    const landlordSMS = `NestList: ❌ Payment verification for '${property.title}' was unsuccessful. Reason: ${reason}. Please resubmit or contact: ${ADMIN_EMAIL}`;
    await sendSMS(landlordPhone, landlordSMS, 'payment_rejected');
  }

  // 2. Email to Landlord
  if (landlordEmail) {
    const emailHtml = `
      <h2>Payment Verification Issue - ${property.title}</h2>
      <p>Dear ${landlord?.full_name || 'Landlord'},</p>
      <p>Unfortunately, we could not verify your recent payment submission for your property <strong>"${property.title}"</strong>.</p>
      <p><strong>Reason provided:</strong> ${reason}</p>
      <p>Please double-check your payment reference code and submit again in the app, or reply directly to this email for manual assistance.</p>
      <p>Best regards,<br>NestList Admin Team</p>
    `;
    await sendEmail(landlordEmail, `Payment Verification Issue - ${property.title}`, emailHtml);
  }

  return res.json({ success: true, message: "Payment rejected." });
});

// GET /api/admin/stats
app.get('/api/admin/stats', async (req, res) => {
  if (useRealSupabase) {
    try {
      const { data: listings } = await supabaseClient.from('properties').select('*');
      const { data: payments } = await supabaseClient.from('listing_payments').select('*');
      const { data: users } = await supabaseClient.from('profiles').select('*');
      const { data: boosts } = await supabaseClient.from('listing_boosts').select('*');
      const { data: unlocks } = await supabaseClient.from('lead_unlocks').select('*');

      const totalListings = listings?.length || 0;
      const activeListings = listings?.filter((l: any) => l.is_active).length || 0;
      const pendingPayments = payments?.filter((p: any) => p.status === 'pending').length || 0;
      const totalUsers = users?.length || 0;

      const confirmedPayments = payments?.filter((p: any) => p.status === 'confirmed') || [];
      const listingRevenue = confirmedPayments.reduce((acc: number, cur: any) => acc + (cur.amount_paid || cur.amount || 0), 0);

      const confirmedBoosts = boosts?.filter((b: any) => b.status === 'active' || b.status === 'expired') || [];
      const boostRevenue = confirmedBoosts.reduce((acc: number, cur: any) => acc + (cur.amount_paid || 0), 0);

      const confirmedUnlocks = unlocks?.filter((u: any) => u.status === 'confirmed') || [];
      const leadRevenue = confirmedUnlocks.reduce((acc: number, cur: any) => acc + (cur.amount_paid || 0), 0);

      const totalRevenue = listingRevenue + boostRevenue + leadRevenue;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const monthlyPayments = confirmedPayments.filter((p: any) => new Date(p.created_at) >= thirtyDaysAgo);
      const monthlyRevenue = monthlyPayments.reduce((acc: number, cur: any) => acc + (cur.amount_paid || cur.amount || 0), 0);

      const recentPayments = payments?.slice(0, 10) || [];

      const listingsByType: Record<string, number> = {};
      const listingsByCounty: Record<string, number> = {};

      listings?.forEach((l: any) => {
        listingsByType[l.type] = (listingsByType[l.type] || 0) + 1;
        listingsByCounty[l.county] = (listingsByCounty[l.county] || 0) + 1;
      });

      return res.json({
        totalListings,
        activeListings,
        pendingPayments,
        totalUsers,
        totalRevenue,
        monthlyRevenue,
        listingRevenue,
        boostRevenue,
        leadRevenue,
        recentPayments,
        listingsByType,
        listingsByCounty
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const totalListings = db.properties.length;
    const activeListings = db.properties.filter(p => p.is_active).length;
    const pendingPayments = db.listing_payments.filter(p => p.status === 'pending').length;
    const totalUsers = db.profiles.length;

    const confirmedPayments = db.listing_payments.filter(p => p.status === 'confirmed');
    const listingRevenue = confirmedPayments.reduce((acc, p) => acc + (p.amount_paid || p.amount), 0);

    const confirmedBoosts = db.listing_boosts.filter(b => b.status === 'active' || b.status === 'expired');
    const boostRevenue = confirmedBoosts.reduce((acc, b) => acc + (b.amount_paid || 0), 0);

    const confirmedUnlocks = db.lead_unlocks.filter(u => u.status === 'confirmed');
    const leadRevenue = confirmedUnlocks.reduce((acc, u) => acc + (u.amount_paid || 0), 0);

    const totalRevenue = listingRevenue + boostRevenue + leadRevenue;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlyPayments = confirmedPayments.filter(p => new Date(p.created_at) >= thirtyDaysAgo);
    const monthlyRevenue = monthlyPayments.reduce((acc, p) => acc + (p.amount_paid || p.amount), 0);

    const recentPayments = db.listing_payments.slice().reverse().slice(0, 10);

    const listingsByType: Record<string, number> = {};
    const listingsByCounty: Record<string, number> = {};

    db.properties.forEach(l => {
      listingsByType[l.type] = (listingsByType[l.type] || 0) + 1;
      listingsByCounty[l.county] = (listingsByCounty[l.county] || 0) + 1;
    });

    return res.json({
      totalListings,
      activeListings,
      pendingPayments,
      totalUsers,
      totalRevenue,
      monthlyRevenue,
      listingRevenue,
      boostRevenue,
      leadRevenue,
      recentPayments,
      listingsByType,
      listingsByCounty
    });
  }
});

// GET /api/admin/listings
app.get('/api/admin/listings', async (req, res) => {
  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('properties')
        .select('*, landlord:profiles(full_name, phone, email)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.json({ success: true, listings: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const mapped = db.properties.map(p => {
      const landlord = db.profiles.find(prof => prof.id === p.landlord_id) || { full_name: "Mock Landlord", phone: "N/A" };
      return {
        ...p,
        landlord
      };
    });
    return res.json({ success: true, listings: mapped });
  }
});

// POST /api/admin/listings/:id/suspend
app.post('/api/admin/listings/:id/suspend', async (req, res) => {
  const { id } = req.params;

  let property: any = null;
  let landlord: any = null;

  if (useRealSupabase) {
    try {
      const { data: prop } = await supabaseClient.from('properties').update({ is_active: false }).eq('id', id).select().single();
      property = prop;
      const { data: prof } = await supabaseClient.from('profiles').select('*').eq('id', property.landlord_id).single();
      landlord = prof;
    } catch (_) {}
  } else {
    const db = getMockDb();
    const prop = db.properties.find(p => p.id === id);
    if (prop) {
      prop.is_active = false;
      property = prop;
      landlord = db.profiles.find(p => p.id === prop.landlord_id);
    }
    saveMockDb(db);
  }

  if (landlord?.phone) {
    await sendSMS(landlord.phone, `NestList: Your property listing '${property?.title || 'listing'}' has been suspended by our administration.`, 'listing_suspended');
  }

  return res.json({ success: true, message: "Listing has been suspended" });
});

// POST /api/admin/listings/:id/restore
app.post('/api/admin/listings/:id/restore', async (req, res) => {
  const { id } = req.params;

  let property: any = null;
  let landlord: any = null;

  if (useRealSupabase) {
    try {
      const { data: prop } = await supabaseClient.from('properties').update({ is_active: true }).eq('id', id).select().single();
      property = prop;
      const { data: prof } = await supabaseClient.from('profiles').select('*').eq('id', property.landlord_id).single();
      landlord = prof;
    } catch (_) {}
  } else {
    const db = getMockDb();
    const prop = db.properties.find(p => p.id === id);
    if (prop) {
      prop.is_active = true;
      property = prop;
      landlord = db.profiles.find(p => p.id === prop.landlord_id);
    }
    saveMockDb(db);
  }

  if (landlord?.phone) {
    await sendSMS(landlord.phone, `NestList: Your property listing '${property?.title || 'listing'}' has been restored and is now active.`, 'listing_restored');
  }

  return res.json({ success: true, message: "Listing has been restored" });
});

// GET /api/admin/users
app.get('/api/admin/users', async (req, res) => {
  if (useRealSupabase) {
    try {
      const { data: profiles, error } = await supabaseClient.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;

      const { data: properties } = await supabaseClient.from('properties').select('id, landlord_id');

      const mapped = (profiles || []).map((user: any) => {
        const count = properties?.filter((p: any) => p.landlord_id === user.id).length || 0;
        return {
          ...user,
          listing_count: count
        };
      });

      return res.json({ success: true, users: mapped });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const mapped = db.profiles.map(user => {
      const count = db.properties.filter(p => p.landlord_id === user.id).length;
      return {
        ...user,
        listing_count: count
      };
    });
    return res.json({ success: true, users: mapped });
  }
});

// POST /api/admin/users/:id/suspend
app.post('/api/admin/users/:id/suspend', async (req, res) => {
  const { id } = req.params;
  if (useRealSupabase) {
    await supabaseClient.from('profiles').update({ is_active: false }).eq('id', id);
  } else {
    const db = getMockDb();
    const u = db.profiles.find(p => p.id === id);
    if (u) u.is_active = false;
    saveMockDb(db);
  }
  return res.json({ success: true, message: "User profile suspended" });
});

// POST /api/admin/users/:id/restore
app.post('/api/admin/users/:id/restore', async (req, res) => {
  const { id } = req.params;
  if (useRealSupabase) {
    await supabaseClient.from('profiles').update({ is_active: true }).eq('id', id);
  } else {
    const db = getMockDb();
    const u = db.profiles.find(p => p.id === id);
    if (u) u.is_active = true;
    saveMockDb(db);
  }
  return res.json({ success: true, message: "User profile restored" });
});

// ── INQUIRIES ENDPOINTS ──────────────────────────────────────────────

const LEAD_PRICES: Record<string, number> = {
  single_room: 25,
  bedsitter:   50,
  studio:      60,
  '1br':       120,
  '2br':       160,
  '3br':       220,
  '4br':       260,
  '5br_plus':  300,
};

// POST /api/inquiries
app.post('/api/inquiries', async (req, res) => {
  const { propertyId, landlordId, message, tenantName, tenantPhone, tenantEmail, tenantId } = req.body;

  if (!propertyId || !landlordId || !message || !tenantName || !tenantPhone) {
    return res.status(400).json({ error: "Missing required inquiry fields" });
  }

  let propertyTitle = 'property';
  let isLocked = false;
  let unlockPrice = null;

  if (useRealSupabase) {
    try {
      // Get property details
      const { data: prop } = await supabaseClient.from('properties').select('title, type, listing_model').eq('id', propertyId).single();
      if (prop) {
        propertyTitle = prop.title;
        isLocked = prop.listing_model === 'pay_per_lead';
        unlockPrice = isLocked ? (LEAD_PRICES[prop.type] || 50) : null;
      }

      await supabaseClient.from('inquiries').insert({
        property_id: propertyId,
        landlord_id: landlordId,
        tenant_id: tenantId || null,
        message,
        tenant_name: tenantName,
        tenant_phone: tenantPhone,
        tenant_email: tenantEmail || null,
        status: 'pending',
        is_locked: isLocked,
        unlock_price: unlockPrice
      });

      // Update count on properties
      const { data: currentProp } = await supabaseClient.from('properties').select('inquiry_count').eq('id', propertyId).single();
      await supabaseClient.from('properties').update({ inquiry_count: (currentProp?.inquiry_count || 0) + 1 }).eq('id', propertyId);

    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const prop = db.properties.find(p => p.id === propertyId);
    if (prop) {
      propertyTitle = prop.title;
      prop.inquiry_count = (prop.inquiry_count || 0) + 1;
      isLocked = prop.listing_model === 'pay_per_lead';
      unlockPrice = isLocked ? (LEAD_PRICES[prop.type] || 50) : null;
    }

    const inquiry = {
      id: `inq-${Date.now()}`,
      property_id: propertyId,
      landlord_id: landlordId,
      tenant_id: tenantId || null,
      message,
      tenant_name: tenantName,
      tenant_phone: tenantPhone,
      tenant_email: tenantEmail || null,
      status: 'pending',
      is_locked: isLocked,
      unlock_price: unlockPrice,
      created_at: new Date().toISOString()
    };

    db.inquiries.push(inquiry);
    saveMockDb(db);
  }

  // SMS to landlord
  let landlordPhone = '';
  if (useRealSupabase) {
    const { data } = await supabaseClient.from('profiles').select('phone').eq('id', landlordId).single();
    if (data) landlordPhone = data.phone;
  } else {
    const db = getMockDb();
    const l = db.profiles.find(p => p.id === landlordId);
    if (l) landlordPhone = l.phone;
  }

  if (landlordPhone) {
    const inqMsg = isLocked
      ? `NestList: 🔒 New inquiry for '${propertyTitle}'! Unlock the tenant's contact for KES ${unlockPrice}. nestlist.com/dashboard`
      : `NestList: ${tenantName} is interested in your property '${propertyTitle}'. Phone: ${tenantPhone}. Login to reply: ${APP_URL}/dashboard`;
    await sendSMS(landlordPhone, inqMsg, 'inquiry_received');
  }

  return res.json({ success: true, message: "Inquiry sent successfully" });
});

// GET /api/inquiries/landlord/:landlordId
app.get('/api/inquiries/landlord/:landlordId', async (req, res) => {
  const { landlordId } = req.params;

  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('inquiries')
        .select('*, property:properties(title)')
        .eq('landlord_id', landlordId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Mask details for locked inquiries securely
      const mapped = (data || []).map((i: any) => {
        if (i.is_locked) {
          return {
            ...i,
            tenant_name: "●●●●● ●●●●●",
            tenant_phone: "+254 ●●● ●●● ●●●",
            tenant_email: "●●●@●●●.●●●",
            message: i.message ? i.message.slice(0, 20) + "..." : "I am interested in..."
          };
        }
        return i;
      });

      return res.json({ success: true, inquiries: mapped });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const filtered = db.inquiries.filter(i => i.landlord_id === landlordId);
    const mapped = filtered.map(i => {
      const property = db.properties.find(p => p.id === i.property_id);
      if (i.is_locked) {
        return {
          ...i,
          property,
          tenant_name: "●●●●● ●●●●●",
          tenant_phone: "+254 ●●● ●●● ●●●",
          tenant_email: "●●●@●●●.●●●",
          message: i.message ? i.message.slice(0, 20) + "..." : "I am interested in..."
        };
      }
      return {
        ...i,
        property
      };
    });
    return res.json({ success: true, inquiries: mapped.reverse() });
  }
});

// POST /api/inquiries/:id/reply
app.post('/api/inquiries/:id/reply', async (req, res) => {
  const { id } = req.params;
  const { reply } = req.body;

  if (!reply) {
    return res.status(400).json({ error: "Reply text is required" });
  }

  let inquiry: any = null;
  let propertyTitle = 'property';

  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('inquiries')
        .update({
          reply,
          replied_at: new Date().toISOString(),
          status: 'responded'
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      inquiry = data;

      const { data: prop } = await supabaseClient.from('properties').select('title').eq('id', inquiry.property_id).single();
      if (prop) propertyTitle = prop.title;
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const idx = db.inquiries.findIndex(i => i.id === id);
    if (idx === -1) return res.status(404).json({ error: "Inquiry not found" });

    db.inquiries[idx] = {
      ...db.inquiries[idx],
      reply,
      replied_at: new Date().toISOString(),
      status: 'responded'
    };
    inquiry = db.inquiries[idx];

    const prop = db.properties.find(p => p.id === inquiry.property_id);
    if (prop) propertyTitle = prop.title;

    saveMockDb(db);
  }

  // SMS to Tenant
  if (inquiry?.tenant_phone) {
    const replySMS = `NestList: The landlord has replied to your inquiry about '${propertyTitle}'. Login to view: ${APP_URL}`;
    await sendSMS(inquiry.tenant_phone, replySMS, 'inquiry_replied');
  }

  return res.json({ success: true, message: "Reply submitted" });
});

// ── PROFILES ENDPOINTS ───────────────────────────────────────────────

// GET /api/profiles/:id
app.get('/api/profiles/:id', async (req, res) => {
  const { id } = req.params;

  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return res.json({ success: true, profile: data || null });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const profile = db.profiles.find(p => p.id === id);
    return res.json({ success: true, profile: profile || null });
  }
});

// POST /api/profiles (Upsert)
app.post('/api/profiles', async (req, res) => {
  const { id, full_name, phone, email, role } = req.body;

  if (!id) return res.status(400).json({ error: "User ID is required" });

  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .upsert({
          id,
          full_name,
          phone,
          email,
          role: role || 'tenant',
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, profile: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const idx = db.profiles.findIndex(p => p.id === id);
    const profile = {
      id,
      full_name,
      phone,
      email,
      role: role || 'tenant',
      is_active: true,
      created_at: idx !== -1 ? db.profiles[idx].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (idx !== -1) {
      db.profiles[idx] = profile;
    } else {
      db.profiles.push(profile);
    }
    saveMockDb(db);

    // Send Welcome SMS
    const welcomeSMS = `Welcome to NestList! Your ${profile.role} profile is ready. Browse and discover rental properties in Kenya seamlessly.`;
    await sendSMS(phone || '', welcomeSMS, `welcome_${profile.role}`);

    return res.json({ success: true, profile });
  }
});

// PUT /api/profiles/:id
app.put('/api/profiles/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, profile: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const idx = db.profiles.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: "Profile not found" });

    db.profiles[idx] = {
      ...db.profiles[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    saveMockDb(db);

    return res.json({ success: true, profile: db.profiles[idx] });
  }
});

// ── SAVED PROPERTIES ENDPOINTS ───────────────────────────────────────

// GET /api/saved/:tenantId
app.get('/api/saved/:tenantId', async (req, res) => {
  const { tenantId } = req.params;

  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('saved_properties')
        .select('*, property:properties(*)')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      const listings = (data || []).map((d: any) => d.property).filter(Boolean);
      return res.json({ success: true, listings });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const saved = db.saved_properties.filter(s => s.tenant_id === tenantId);
    const listings = saved.map(s => db.properties.find(p => p.id === s.property_id)).filter(Boolean);
    return res.json({ success: true, listings });
  }
});

// POST /api/saved
app.post('/api/saved', async (req, res) => {
  const { tenantId, propertyId } = req.body;

  if (!tenantId || !propertyId) return res.status(400).json({ error: "Missing required fields" });

  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('saved_properties')
        .insert({ tenant_id: tenantId, property_id: propertyId })
        .select()
        .single();

      if (error && error.code !== '23505') throw error;
      return res.json({ success: true, saved: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const dup = db.saved_properties.find(s => s.tenant_id === tenantId && s.property_id === propertyId);
    if (dup) return res.json({ success: true, saved: dup });

    const saved = {
      id: `save-${Date.now()}`,
      tenant_id: tenantId,
      property_id: propertyId,
      created_at: new Date().toISOString()
    };
    db.saved_properties.push(saved);
    saveMockDb(db);

    return res.json({ success: true, saved });
  }
});

// ── MONETIZATION ENDPOINTS (BOOSTS & LEADS) ───────────────────────────

// POST /api/boost/pay
app.post('/api/boost/pay', async (req, res) => {
  const { propertyId, landlordId, boostTier, amount, paymentMethod, mpesaCode, phone } = req.body;

  if (!propertyId || !landlordId || !boostTier || !amount || !paymentMethod) {
    return res.status(400).json({ error: "Missing required fields for boost" });
  }

  const id = `bst-${Date.now()}`;

  if (paymentMethod === 'stk_push') {
    if (!phone) return res.status(400).json({ error: "Phone number required for STK push" });
    try {
      const token = await getMpesaToken();
      const ts = mpesaTimestamp();
      const pwd = mpesaPassword(ts);
      const tel = formatPhone(phone);

      const stkRes = await axios.post(
        `${MPESA_BASE}/mpesa/stkpush/v1/processrequest`,
        {
          BusinessShortCode: MPESA_SHORTCODE,
          Password: pwd,
          Timestamp: ts,
          TransactionType: 'CustomerPayBillOnline',
          Amount: Math.ceil(amount),
          PartyA: tel,
          PartyB: MPESA_SHORTCODE,
          PhoneNumber: tel,
          CallBackURL: CALLBACK_URL,
          AccountReference: 'BOOST-' + propertyId.slice(0, 8).toUpperCase(),
          TransactionDesc: `NestList Boost: ${boostTier}`,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const d = stkRes.data;
      if (d.ResponseCode !== '0') {
        throw new Error(d.ResponseDescription || d.errorMessage || 'STK Push failed');
      }

      if (useRealSupabase) {
        await supabaseClient.from('listing_boosts').insert({
          property_id: propertyId,
          landlord_id: landlordId,
          boost_tier: boostTier,
          amount_paid: amount,
          status: 'pending',
          mpesa_checkout_request_id: d.CheckoutRequestID,
          payment_method: 'stk_push'
        });
      } else {
        const db = getMockDb();
        db.listing_boosts.push({
          id,
          property_id: propertyId,
          landlord_id: landlordId,
          boost_tier: boostTier,
          amount_paid: amount,
          status: 'pending',
          mpesa_checkout_request_id: d.CheckoutRequestID,
          payment_method: 'stk_push',
          created_at: new Date().toISOString()
        });
        saveMockDb(db);
      }

      return res.json({ success: true, checkoutId: d.CheckoutRequestID, boostId: id, message: "STK Push sent!" });
    } catch (err: any) {
      console.error('Boost STK Push error:', err.response?.data || err.message);
      return res.status(500).json({ error: err.message });
    }
  } else {
    // Manual payment
    if (useRealSupabase) {
      try {
        const { data, error } = await supabaseClient.from('listing_boosts').insert({
          property_id: propertyId,
          landlord_id: landlordId,
          boost_tier: boostTier,
          amount_paid: amount,
          status: 'pending',
          mpesa_code: mpesaCode || null,
          payment_method: 'manual'
        }).select().single();
        if (error) throw error;
        return res.json({ success: true, boostId: data.id });
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    } else {
      const db = getMockDb();
      db.listing_boosts.push({
        id,
        property_id: propertyId,
        landlord_id: landlordId,
        boost_tier: boostTier,
        amount_paid: amount,
        status: 'pending',
        mpesa_code: mpesaCode || null,
        payment_method: 'manual',
        created_at: new Date().toISOString()
      });
      saveMockDb(db);
      return res.json({ success: true, boostId: id });
    }
  }
});

// POST /api/boost/:id/confirm
app.post('/api/boost/:id/confirm', async (req, res) => {
  const { id } = req.params;

  if (useRealSupabase) {
    try {
      const { data: boost, error: bErr } = await supabaseClient
        .from('listing_boosts')
        .select('*, property:properties(title)')
        .eq('id', id)
        .single();
      if (bErr || !boost) throw new Error("Boost not found");

      const durationDays = boost.boost_tier === '3day' ? 3 : boost.boost_tier === '7day' ? 7 : boost.boost_tier === '14day' ? 14 : boost.boost_tier === '30day' ? 30 : 7;
      const startsAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
      const badgeText = boost.boost_tier === '3day' ? '⚡ Featured' : boost.boost_tier === '7day' ? '⭐ Featured' : boost.boost_tier === '14day' ? '🔥 Hot Property' : '👑 Premium';

      await supabaseClient.from('listing_boosts').update({
        status: 'active',
        starts_at: startsAt,
        expires_at: expiresAt
      }).eq('id', id);

      await supabaseClient.from('properties').update({
        is_boosted: true,
        boost_tier: boost.boost_tier,
        boost_expires_at: expiresAt,
        boost_badge: badgeText
      }).eq('id', boost.property_id);

      // Fetch landlord phone to notify
      const { data: profile } = await supabaseClient.from('profiles').select('phone').eq('id', boost.landlord_id).single();
      if (profile?.phone) {
        await sendSMS(
          profile.phone,
          `NestList: 🚀 Your listing '${boost.property?.title}' is now BOOSTED! It appears at the top of search results for ${durationDays} days. nestlist.com`,
          'boost_activated'
        );
      }

      return res.json({ success: true, message: "Boost activated successfully" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const idx = db.listing_boosts.findIndex(b => b.id === id);
    if (idx === -1) return res.status(404).json({ error: "Boost not found" });

    const boost = db.listing_boosts[idx];
    const durationDays = boost.boost_tier === '3day' ? 3 : boost.boost_tier === '7day' ? 7 : boost.boost_tier === '14day' ? 14 : boost.boost_tier === '30day' ? 30 : 7;
    const startsAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    const badgeText = boost.boost_tier === '3day' ? '⚡ Featured' : boost.boost_tier === '7day' ? '⭐ Featured' : boost.boost_tier === '14day' ? '🔥 Hot Property' : '👑 Premium';

    boost.status = 'active';
    boost.starts_at = startsAt;
    boost.expires_at = expiresAt;

    const prop = db.properties.find(p => p.id === boost.property_id);
    if (prop) {
      prop.is_boosted = true;
      prop.boost_tier = boost.boost_tier;
      prop.boost_expires_at = expiresAt;
      prop.boost_badge = badgeText;
    }

    const landlord = db.profiles.find(p => p.id === boost.landlord_id);
    if (landlord?.phone) {
      await sendSMS(
        landlord.phone,
        `NestList: 🚀 Your listing '${prop?.title || "Property"}' is now BOOSTED! It appears at the top of search results for ${durationDays} days. nestlist.com`,
        'boost_activated'
      );
    }

    saveMockDb(db);
    return res.json({ success: true, message: "Boost activated successfully" });
  }
});

// POST /api/boost/:id/reject
app.post('/api/boost/:id/reject', async (req, res) => {
  const { id } = req.params;
  if (useRealSupabase) {
    try {
      await supabaseClient.from('listing_boosts').update({ status: 'cancelled' }).eq('id', id);
      return res.json({ success: true, message: "Boost rejected" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const b = db.listing_boosts.find(b => b.id === id);
    if (b) b.status = 'cancelled';
    saveMockDb(db);
    return res.json({ success: true, message: "Boost rejected" });
  }
});

// GET /api/boost/status
app.get('/api/boost/status', async (req, res) => {
  const { boostId } = req.query;
  if (!boostId) return res.status(400).json({ error: "Missing boostId" });

  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient.from('listing_boosts').select('*').eq('id', boostId).single();
      if (error) throw error;
      return res.json({ success: true, status: data.status, expiresAt: data.expires_at });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const boost = db.listing_boosts.find(b => b.id === boostId);
    if (!boost) return res.status(404).json({ error: "Boost not found" });
    return res.json({ success: true, status: boost.status, expiresAt: boost.expires_at });
  }
});

// POST /api/leads/unlock
app.post('/api/leads/unlock', async (req, res) => {
  const { inquiryId, propertyId, landlordId, amount, paymentMethod, mpesaCode, bundleSize, phone } = req.body;

  if (!propertyId || !landlordId || !paymentMethod) {
    return res.status(400).json({ error: "Missing required fields for unlock" });
  }

  const id = `unl-${Date.now()}`;
  const isBundle = bundleSize === 5;

  if (paymentMethod === 'credit') {
    // Deduct credit
    if (useRealSupabase) {
      try {
        const { data: prop, error: pErr } = await supabaseClient.from('properties').select('lead_credits, title').eq('id', propertyId).single();
        if (pErr || !prop) throw new Error("Property not found");

        if ((prop.lead_credits || 0) < 1) {
          return res.status(400).json({ error: "Insufficient lead credits available." });
        }

        const newCredits = prop.lead_credits - 1;
        await supabaseClient.from('properties').update({ lead_credits: newCredits }).eq('id', propertyId);

        // Update inquiry
        if (inquiryId) {
          await supabaseClient.from('inquiries').update({ is_locked: false }).eq('id', inquiryId);
        }

        // Create confirmed unlock record
        await supabaseClient.from('lead_unlocks').insert({
          property_id: propertyId,
          landlord_id: landlordId,
          inquiry_id: inquiryId || null,
          amount_paid: 0,
          status: 'confirmed',
          payment_method: 'credit',
          unlocked_at: new Date().toISOString()
        });

        // Send SMS confirmation
        const { data: profile } = await supabaseClient.from('profiles').select('phone').eq('id', landlordId).single();
        if (profile?.phone) {
          await sendSMS(
            profile.phone,
            `NestList: 🔓 Lead unlocked! View tenant contact at nestlist.com/dashboard`,
            'lead_unlocked'
          );
        }

        // Return newly unmasked inquiry
        let inquiryData = null;
        if (inquiryId) {
          const { data: inq } = await supabaseClient.from('inquiries').select('*').eq('id', inquiryId).single();
          inquiryData = inq;
        }

        return res.json({ success: true, message: "Lead unlocked with credits", inquiry: inquiryData });
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    } else {
      const db = getMockDb();
      const propIdx = db.properties.findIndex(p => p.id === propertyId);
      if (propIdx === -1) return res.status(404).json({ error: "Property not found" });

      const prop = db.properties[propIdx];
      if ((prop.lead_credits || 0) < 1) {
        return res.status(400).json({ error: "Insufficient lead credits available." });
      }

      prop.lead_credits = prop.lead_credits - 1;

      if (inquiryId) {
        const inq = db.inquiries.find(i => i.id === inquiryId);
        if (inq) inq.is_locked = false;
      }

      db.lead_unlocks.push({
        id,
        property_id: propertyId,
        landlord_id: landlordId,
        inquiry_id: inquiryId || null,
        amount_paid: 0,
        status: 'confirmed',
        payment_method: 'credit',
        unlocked_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      });

      const landlord = db.profiles.find(p => p.id === landlordId);
      if (landlord?.phone) {
        await sendSMS(
          landlord.phone,
          `NestList: 🔓 Lead unlocked! View tenant contact at nestlist.com/dashboard`,
          'lead_unlocked'
        );
      }

      saveMockDb(db);
      const inquiryData = inquiryId ? db.inquiries.find(i => i.id === inquiryId) : null;
      return res.json({ success: true, message: "Lead unlocked with credits", inquiry: inquiryData });
    }
  } else if (paymentMethod === 'stk_push') {
    if (!phone) return res.status(400).json({ error: "Phone number required for STK push" });
    try {
      const token = await getMpesaToken();
      const ts = mpesaTimestamp();
      const pwd = mpesaPassword(ts);
      const tel = formatPhone(phone);

      const stkRes = await axios.post(
        `${MPESA_BASE}/mpesa/stkpush/v1/processrequest`,
        {
          BusinessShortCode: MPESA_SHORTCODE,
          Password: pwd,
          Timestamp: ts,
          TransactionType: 'CustomerPayBillOnline',
          Amount: Math.ceil(amount),
          PartyA: tel,
          PartyB: MPESA_SHORTCODE,
          PhoneNumber: tel,
          CallBackURL: CALLBACK_URL,
          AccountReference: (isBundle ? 'BNDL-' : 'LEAD-') + propertyId.slice(0, 8).toUpperCase(),
          TransactionDesc: `NestList Lead Unlock`,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const d = stkRes.data;
      if (d.ResponseCode !== '0') {
        throw new Error(d.ResponseDescription || d.errorMessage || 'STK Push failed');
      }

      if (useRealSupabase) {
        await supabaseClient.from('lead_unlocks').insert({
          property_id: propertyId,
          landlord_id: landlordId,
          inquiry_id: inquiryId || null,
          amount_paid: amount,
          bundle_size: bundleSize || 1,
          status: 'pending',
          mpesa_checkout_request_id: d.CheckoutRequestID,
          payment_method: 'stk_push'
        });
      } else {
        const db = getMockDb();
        db.lead_unlocks.push({
          id,
          property_id: propertyId,
          landlord_id: landlordId,
          inquiry_id: inquiryId || null,
          amount_paid: amount,
          bundle_size: bundleSize || 1,
          status: 'pending',
          mpesa_checkout_request_id: d.CheckoutRequestID,
          payment_method: 'stk_push',
          created_at: new Date().toISOString()
        });
        saveMockDb(db);
      }

      return res.json({ success: true, checkoutId: d.CheckoutRequestID, unlockId: id, message: "STK Push sent!" });
    } catch (err: any) {
      console.error('Lead Unlock STK error:', err.response?.data || err.message);
      return res.status(500).json({ error: err.message });
    }
  } else {
    // Manual Payment
    if (useRealSupabase) {
      try {
        const { data, error } = await supabaseClient.from('lead_unlocks').insert({
          property_id: propertyId,
          landlord_id: landlordId,
          inquiry_id: inquiryId || null,
          amount_paid: amount,
          bundle_size: bundleSize || 1,
          status: 'pending',
          mpesa_code: mpesaCode || null,
          payment_method: 'manual'
        }).select().single();
        if (error) throw error;
        return res.json({ success: true, unlockId: data.id });
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    } else {
      const db = getMockDb();
      db.lead_unlocks.push({
        id,
        property_id: propertyId,
        landlord_id: landlordId,
        inquiry_id: inquiryId || null,
        amount_paid: amount,
        bundle_size: bundleSize || 1,
        status: 'pending',
        mpesa_code: mpesaCode || null,
        payment_method: 'manual',
        created_at: new Date().toISOString()
      });
      saveMockDb(db);
      return res.json({ success: true, unlockId: id });
    }
  }
});

// POST /api/leads/unlock/:id/confirm
app.post('/api/leads/unlock/:id/confirm', async (req, res) => {
  const { id } = req.params;

  if (useRealSupabase) {
    try {
      const { data: unlock, error: uErr } = await supabaseClient
        .from('lead_unlocks')
        .select('*, property:properties(title, lead_credits)')
        .eq('id', id)
        .single();
      if (uErr || !unlock) throw new Error("Unlock record not found");

      await supabaseClient.from('lead_unlocks').update({
        status: 'confirmed',
        unlocked_at: new Date().toISOString()
      }).eq('id', id);

      if (unlock.bundle_size === 5) {
        const currentCredits = unlock.property?.lead_credits || 0;
        const newBalance = currentCredits + 5;
        await supabaseClient.from('properties').update({ lead_credits: newBalance }).eq('id', unlock.property_id);

        const { data: profile } = await supabaseClient.from('profiles').select('phone').eq('id', unlock.landlord_id).single();
        if (profile?.phone) {
          await sendSMS(
            profile.phone,
            `NestList: ✅ 5 lead credits added to '${unlock.property?.title}'. Credits: ${newBalance}. nestlist.com`,
            'bundle_purchased'
          );
        }
      } else {
        if (unlock.inquiry_id) {
          await supabaseClient.from('inquiries').update({ is_locked: false }).eq('id', unlock.inquiry_id);
        }

        const { data: profile } = await supabaseClient.from('profiles').select('phone').eq('id', unlock.landlord_id).single();
        if (profile?.phone) {
          await sendSMS(
            profile.phone,
            `NestList: 🔓 Lead unlocked! View tenant contact at nestlist.com/dashboard`,
            'lead_unlocked'
          );
        }
      }

      return res.json({ success: true, message: "Lead/bundle confirmed successfully" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const idx = db.lead_unlocks.findIndex(u => u.id === id);
    if (idx === -1) return res.status(404).json({ error: "Unlock record not found" });

    const unlock = db.lead_unlocks[idx];
    unlock.status = 'confirmed';
    unlock.unlocked_at = new Date().toISOString();

    const prop = db.properties.find(p => p.id === unlock.property_id);
    const landlord = db.profiles.find(p => p.id === unlock.landlord_id);

    if (unlock.bundle_size === 5) {
      const currentCredits = prop?.lead_credits || 0;
      const newBalance = currentCredits + 5;
      if (prop) prop.lead_credits = newBalance;

      if (landlord?.phone) {
        await sendSMS(
          landlord.phone,
          `NestList: ✅ 5 lead credits added to '${prop?.title || "Property"}'. Credits: ${newBalance}. nestlist.com`,
          'bundle_purchased'
        );
      }
    } else {
      if (unlock.inquiry_id) {
        const inq = db.inquiries.find(i => i.id === unlock.inquiry_id);
        if (inq) inq.is_locked = false;
      }

      if (landlord?.phone) {
        await sendSMS(
          landlord.phone,
          `NestList: 🔓 Lead unlocked! View tenant contact at nestlist.com/dashboard`,
          'lead_unlocked'
        );
      }
    }

    saveMockDb(db);
    return res.json({ success: true, message: "Lead/bundle confirmed successfully" });
  }
});

// POST /api/leads/unlock/:id/reject
app.post('/api/leads/unlock/:id/reject', async (req, res) => {
  const { id } = req.params;
  if (useRealSupabase) {
    try {
      await supabaseClient.from('lead_unlocks').update({ status: 'failed' }).eq('id', id);
      return res.json({ success: true, message: "Unlock rejected" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const u = db.lead_unlocks.find(u => u.id === id);
    if (u) u.status = 'failed';
    saveMockDb(db);
    return res.json({ success: true, message: "Unlock rejected" });
  }
});

// GET /api/leads/unlock/status
app.get('/api/leads/unlock/status', async (req, res) => {
  const { unlockId } = req.query;
  if (!unlockId) return res.status(400).json({ error: "Missing unlockId" });

  if (useRealSupabase) {
    try {
      const { data: unlock, error: uErr } = await supabaseClient.from('lead_unlocks').select('*').eq('id', unlockId).single();
      if (uErr) throw uErr;

      let inquiry = null;
      if (unlock.status === 'confirmed' && unlock.inquiry_id) {
        const { data: inq } = await supabaseClient.from('inquiries').select('*').eq('id', unlock.inquiry_id).single();
        inquiry = inq;
      }

      return res.json({ success: true, status: unlock.status, inquiry });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const unlock = db.lead_unlocks.find(u => u.id === unlockId);
    if (!unlock) return res.status(404).json({ error: "Unlock not found" });

    let inquiry = null;
    if (unlock.status === 'confirmed' && unlock.inquiry_id) {
      inquiry = db.inquiries.find(i => i.id === unlock.inquiry_id);
    }

    return res.json({ success: true, status: unlock.status, inquiry });
  }
});

// GET /api/admin/boosts
app.get('/api/admin/boosts', async (req, res) => {
  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('listing_boosts')
        .select('*, property:properties(title), landlord:profiles(full_name, phone)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.json({ success: true, boosts: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const mapped = db.listing_boosts.map(b => {
      const property = db.properties.find(p => p.id === b.property_id);
      const landlord = db.profiles.find(p => p.id === b.landlord_id);
      return { ...b, property, landlord };
    });
    return res.json({ success: true, boosts: mapped.reverse() });
  }
});

// GET /api/admin/lead-unlocks
app.get('/api/admin/lead-unlocks', async (req, res) => {
  if (useRealSupabase) {
    try {
      const { data, error } = await supabaseClient
        .from('lead_unlocks')
        .select('*, property:properties(title, type), landlord:profiles(full_name, phone), inquiry:inquiries(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.json({ success: true, unlocks: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const mapped = db.lead_unlocks.map(u => {
      const property = db.properties.find(p => p.id === u.property_id);
      const landlord = db.profiles.find(p => p.id === u.landlord_id);
      const inquiry = db.inquiries.find(i => i.id === u.inquiry_id);
      return { ...u, property, landlord, inquiry };
    });
    return res.json({ success: true, unlocks: mapped.reverse() });
  }
});

// DELETE /api/saved/:tenantId/:propertyId
app.delete('/api/saved/:tenantId/:propertyId', async (req, res) => {
  const { tenantId, propertyId } = req.params;

  if (useRealSupabase) {
    try {
      const { error } = await supabaseClient
        .from('saved_properties')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('property_id', propertyId);

      if (error) throw error;
      return res.json({ success: true, message: "Listing unsaved" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    db.saved_properties = db.saved_properties.filter(s => !(s.tenant_id === tenantId && s.property_id === propertyId));
    saveMockDb(db);
    return res.json({ success: true, message: "Listing unsaved" });
  }
});

// ── SMS PROXY ENDPOINT ───────────────────────────────────────────────
app.post('/api/sms', async (req, res) => {
  const { phone, message, type } = req.body;
  if (!phone || !message) return res.status(400).json({ error: "Phone and message are required" });

  await sendSMS(phone, message, type || 'direct');
  return res.json({ success: true });
});

// ── AUTOMATED EXPIRY & WARNING CRON ─────────────────────────────────
app.post('/api/admin/expire-listings', async (req, res) => {
  const now = new Date();
  const warningBoundStr = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const nowStr = now.toISOString();

  let warningCount = 0;
  let expiredCount = 0;

  if (useRealSupabase) {
    try {
      // Expire listing boosts
      const { data: expiredBoosts } = await supabaseClient
        .from('listing_boosts')
        .select('*, property:properties(title), landlord:profiles(phone)')
        .eq('status', 'active')
        .lt('expires_at', nowStr);
      
      if (expiredBoosts && expiredBoosts.length > 0) {
        for (const b of expiredBoosts) {
          await supabaseClient.from('listing_boosts').update({ status: 'expired' }).eq('id', b.id);
          await supabaseClient.from('properties').update({
            is_boosted: false,
            boost_tier: null,
            boost_expires_at: null,
            boost_badge: null
          }).eq('id', b.property_id);

          if (b.landlord?.phone) {
            await sendSMS(
              b.landlord.phone,
              `NestList: Your listing boost has ended. Re-boost to get back to the top: nestlist.com`,
              'boost_expired'
            );
          }
        }
      }

      // Warm about expiring boosts (1 day before)
      const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { data: warningBoosts } = await supabaseClient
        .from('listing_boosts')
        .select('*, property:properties(title), landlord:profiles(phone)')
        .eq('status', 'active')
        .eq('warning_sent', false)
        .lte('expires_at', oneDayFromNow)
        .gt('expires_at', nowStr);
      
      if (warningBoosts && warningBoosts.length > 0) {
        for (const b of warningBoosts) {
          if (b.landlord?.phone) {
            await sendSMS(
              b.landlord.phone,
              `NestList: ⚠️ Your listing boost expires tomorrow. Renew at nestlist.com/dashboard to stay on top.`,
              'boost_expiring_soon'
            );
          }
          await supabaseClient.from('listing_boosts').update({ warning_sent: true }).eq('id', b.id);
        }
      }

      // 1. Process warnings (3 days until expiry)
      const { data: warnings } = await supabaseClient
        .from('properties')
        .select('*, landlord:profiles(phone, full_name)')
        .eq('is_active', true)
        .eq('expiry_sms_sent', false)
        .lte('expires_at', warningBoundStr)
        .gt('expires_at', nowStr);

      if (warnings && warnings.length > 0) {
        for (const p of warnings) {
          const phone = p.landlord?.phone;
          if (phone) {
            await sendSMS(phone, `NestList: Your property listing '${p.title}' is expiring in 3 days. Please renew to keep it visible to tenants.`, 'listing_expiring');
          }
          await supabaseClient.from('properties').update({ expiry_sms_sent: true }).eq('id', p.id);
          warningCount++;
        }
      }

      // 2. Process actually expired listings
      const { data: expired } = await supabaseClient
        .from('properties')
        .select('*, landlord:profiles(phone)')
        .eq('is_active', true)
        .lte('expires_at', nowStr);

      if (expired && expired.length > 0) {
        for (const p of expired) {
          const phone = p.landlord?.phone;
          if (phone) {
            await sendSMS(phone, `NestList: Your property listing '${p.title}' has expired. It is no longer visible to tenants. Pay to reactivate.`, 'listing_expired');
          }
          await supabaseClient.from('properties').update({ is_active: false }).eq('id', p.id);
          expiredCount++;
        }
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();

    // Expire listing boosts in mock
    const expiredBoosts = db.listing_boosts.filter(b => b.status === 'active' && b.expires_at && new Date(b.expires_at) < now);
    for (const b of expiredBoosts) {
      b.status = 'expired';
      const prop = db.properties.find(p => p.id === b.property_id);
      if (prop) {
        prop.is_boosted = false;
        prop.boost_tier = null;
        prop.boost_expires_at = null;
        prop.boost_badge = null;
      }
      const landlord = db.profiles.find(p => p.id === b.landlord_id);
      if (landlord?.phone) {
        await sendSMS(
          landlord.phone,
          `NestList: Your listing boost has ended. Re-boost to get back to the top: nestlist.com`,
          'boost_expired'
        );
      }
    }

    // Warm about expiring boosts in mock (1 day before)
    const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const warningBoosts = db.listing_boosts.filter(b => b.status === 'active' && !b.warning_sent && b.expires_at && new Date(b.expires_at) <= oneDayFromNow && new Date(b.expires_at) > now);
    for (const b of warningBoosts) {
      b.warning_sent = true;
      const landlord = db.profiles.find(p => p.id === b.landlord_id);
      if (landlord?.phone) {
        await sendSMS(
          landlord.phone,
          `NestList: ⚠️ Your listing boost expires tomorrow. Renew at nestlist.com/dashboard to stay on top.`,
          'boost_expiring_soon'
        );
      }
    }

    const warnings = db.properties.filter(p =>
      p.is_active &&
      !p.expiry_sms_sent &&
      p.expires_at &&
      new Date(p.expires_at) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) &&
      new Date(p.expires_at) > now
    );

    for (const p of warnings) {
      const landlord = db.profiles.find(prof => prof.id === p.landlord_id);
      if (landlord?.phone) {
        await sendSMS(landlord.phone, `NestList: Your property listing '${p.title}' is expiring in 3 days. Please renew to keep it visible to tenants.`, 'listing_expiring');
      }
      p.expiry_sms_sent = true;
      warningCount++;
    }

    const expired = db.properties.filter(p =>
      p.is_active &&
      p.expires_at &&
      new Date(p.expires_at) <= now
    );

    for (const p of expired) {
      const landlord = db.profiles.find(prof => prof.id === p.landlord_id);
      if (landlord?.phone) {
        await sendSMS(landlord.phone, `NestList: Your property listing '${p.title}' has expired. It is no longer visible to tenants. Pay to reactivate.`, 'listing_expired');
      }
      p.is_active = false;
      expiredCount++;
    }

    saveMockDb(db);
  }

  return res.json({
    success: true,
    processed_warnings: warningCount,
    processed_expiries: expiredCount
  });
});

// Sync endpoint for the simulator in mock mode
app.post("/api/mock/sync-property", (req, res) => {
  if (useRealSupabase) {
    return res.json({ success: true, note: "Ignored because running in real Supabase mode" });
  }
  const property = req.body;
  if (!property || !property.id) {
    return res.status(400).json({ error: "Invalid property schema." });
  }

  const db = getMockDb();
  const idx = db.properties.findIndex(p => p.id === property.id);
  if (idx !== -1) {
    db.properties[idx] = { ...db.properties[idx], ...property };
  } else {
    db.properties.push(property);
  }
  saveMockDb(db);

  return res.json({ success: true, message: "Property synced to backend mock db." });
});

// =====================================================================
// VITE DEV SERVER OR STATIC PRODUCTION BUILD MIDDLEWARE
// =====================================================================
async function mountViteMiddleware() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NestList App Server running on http://localhost:${PORT}`);
  });
}

mountViteMiddleware();
