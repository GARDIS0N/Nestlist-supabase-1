# NestList Production Deployment Checklist

This document details the final checklist of tasks required to deploy **NestList** (`https://nestlist.com`) to production. Follow these steps to ensure a secure, reliable, and smooth transition.

---

## 1. Domain and DNS Settings (nestlist.com)
To route traffic correctly to the custom production domain:
- [ ] **DNS Records Update**: Point the custom domain `nestlist.com` and `www.nestlist.com` to the hosting environment using `A` records (for IPv4 IP addresses) or `CNAME` records as directed by your production hosting platform (e.g., Vercel, Cloud Run).
- [ ] **SSL/TLS Certificates**: Enable auto-renewing Let's Encrypt SSL/TLS certificates on your host to guarantee all connections are strictly served over secure `HTTPS`.
- [ ] **CORS Configuration**: Ensure the production Node/Express backend (`server.ts`) allows requests originating from `https://nestlist.com` and `https://www.nestlist.com`.

---

## 2. Professional Emails Configuration
NestList's legal documents and contact pages are configured to use two dedicated email addresses:
1. **`info@nestlist.com`**: Reserved for legal questions, privacy notices, regulatory reporting, and corporate issues.
2. **`support@nestlist.com`**: Reserved for customer service, landlord listing assistance, payment dispute tickets, and manual receipts.

- [ ] **Email Hosting**: Set up an MX-compatible business email hosting provider (e.g., Google Workspace, Zoho Mail, or Microsoft 365) for `nestlist.com`.
- [ ] **MX DNS Records**: Add the corresponding `MX` records to your domain registrar (e.g., Namecheap, GoDaddy, HostPinnacle).
- [ ] **SPF, DKIM, and DMARC**: Configure email authentication records to prevent emails sent from your system from being flagged as spam:
  - `SPF`: Add `v=spf1 include:your-email-provider.com ~all`.
  - `DKIM`: Create a TXT signature record provided by your email host.
  - `DMARC`: Add a TXT record `_dmarc.nestlist.com` with `v=DMARC1; p=reject; rua=mailto:info@nestlist.com`.
- [ ] **SMTP / Nodemailer Configuration**: Update backend variables so that automatic notifications are sent from `support@nestlist.com` securely.

---

## 3. Safaricom M-Pesa Daraja API Settings
Our M-Pesa integration supports both STK Push prompts and Manual Paybill confirmations.
- [ ] **Daraja Developer Account**: Create a commercial account on [Safaricom Daraja Portal](https://developer.safaricom.co.ke/).
- [ ] **Go Live Request**: Migrate your Sandbox app to Production to obtain live credentials.
- [ ] **Environment Variables Configuration**: Add real production values to the server hosting environment:
  - Set `MPESA_ENV=production`
  - Set `MPESA_KEY=your_production_consumer_key`
  - Set `MPESA_SECRET=your_production_consumer_secret`
  - Set `MPESA_SHORTCODE=your_production_shortcode_paybill`
  - Set `MPESA_PASSKEY=your_production_passkey_from_safaricom`
- [ ] **Webhook Web Access**: Ensure your `/api/mpesa/callback` server port is exposed to the public internet so Safaricom's webhook servers can securely send payment updates.

---

## 4. Supabase Database Hardening
Before launching publicly, review database access privileges and backend structure:
- [ ] **Row-Level Security (RLS)**: Verify that the `listing_payments` table has RLS rules allowing landlords to only select their own transactions, and admins to select all.
- [ ] **Webhook Service Permissions**: Ensure the API endpoint handles transaction updates under a secure service role (`SUPABASE_SERVICE_ROLE_KEY`) so webhook operations bypass user-level policies securely.
- [ ] **Storage Bucket Security**: Ensure that the `property-photos` storage bucket is set to *Public* for read access, but *Authenticated* for write/delete access. This guarantees anyone can see listings, but only registered listing creators can upload images.
- [ ] **Admin Verification triggers**: Double check that the admin dashboard endpoints operate behind authentic session verification to avoid unauthorized list activations.

---

## 5. Site-Wide Verification Check
- [ ] Run `npm run build` locally or on CI/CD to confirm there are no TypeScript syntax errors or React compile bugs.
- [ ] Browse the platform and verify:
  - All footer and contact references show `support@nestlist.com`.
  - Terms of Service reflect the new domain `nestlist.com` and email.
  - Privacy Policy includes terms covering Safaricom's payment webhook data collection.
