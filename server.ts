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
const ADMIN_EMAIL = 'gardisonkirui11@gmail.com';
const MPESA_PAYBILL = '247247';
const MPESA_ACCOUNT = '0715185037';
const APP_URL = 'https://nestlist-supabase.vercel.app';

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

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://nestlist-supabase.vercel.app'
  ],
  credentials: true
}));

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
      sms_logs: []
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
      from: '"NestList" <gardisonkirui11@gmail.com>',
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

      const totalListings = listings?.length || 0;
      const activeListings = listings?.filter((l: any) => l.is_active).length || 0;
      const pendingPayments = payments?.filter((p: any) => p.status === 'pending').length || 0;
      const totalUsers = users?.length || 0;

      const confirmedPayments = payments?.filter((p: any) => p.status === 'confirmed') || [];
      const totalRevenue = confirmedPayments.reduce((acc: number, cur: any) => acc + (cur.amount_paid || cur.amount || 0), 0);

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
    const totalRevenue = confirmedPayments.reduce((acc, p) => acc + (p.amount_paid || p.amount), 0);

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

// POST /api/inquiries
app.post('/api/inquiries', async (req, res) => {
  const { propertyId, landlordId, message, tenantName, tenantPhone, tenantEmail, tenantId } = req.body;

  if (!propertyId || !landlordId || !message || !tenantName || !tenantPhone) {
    return res.status(400).json({ error: "Missing required inquiry fields" });
  }

  let propertyTitle = 'property';

  if (useRealSupabase) {
    try {
      // Get title
      const { data: prop } = await supabaseClient.from('properties').select('title').eq('id', propertyId).single();
      if (prop) propertyTitle = prop.title;

      await supabaseClient.from('inquiries').insert({
        property_id: propertyId,
        landlord_id: landlordId,
        tenant_id: tenantId || null,
        message,
        tenant_name: tenantName,
        tenant_phone: tenantPhone,
        tenant_email: tenantEmail || null,
        status: 'pending'
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
    const inqMsg = `NestList: ${tenantName} is interested in your property '${propertyTitle}'. Phone: ${tenantPhone}. Login to reply: ${APP_URL}/dashboard`;
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
      return res.json({ success: true, inquiries: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const db = getMockDb();
    const filtered = db.inquiries.filter(i => i.landlord_id === landlordId);
    const mapped = filtered.map(i => {
      const property = db.properties.find(p => p.id === i.property_id);
      return {
        ...i,
        property
      };
    });
    return res.json({ success: true, inquiries: mapped });
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
