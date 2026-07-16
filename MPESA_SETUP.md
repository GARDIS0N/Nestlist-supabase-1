# Safaricom M-Pesa Daraja Integration Setup Guide

This guide describes how to configure, test, and transition the **NestList M-Pesa STK Push** payment integration.

---

## 1. Architectural Overview

NestList supports two main M-Pesa payment flows to activate property listings:
1. **M-Pesa STK Push (Automated)**:
   - The user requests a payment prompt on their phone in the frontend.
   - The React client calls the backend Express route `/api/mpesa/stk`.
   - The backend requests an OAuth token from Safaricom and fires an STK Push trigger (Lipa Na M-Pesa Online API).
   - The user enters their PIN on their phone.
   - Safaricom sends an asynchronous HTTP POST webhook callback to our `/api/mpesa/callback` route.
   - The backend parses the success/failure state, registers the transaction in `listing_payments`, and updates the property status to `active`.
   - Meanwhile, the React client polls `/api/mpesa/status` every 3 seconds to update the UI on success.

2. **Manual Paybill Verification (Backup)**:
   - The user pays manually using Paybill **247247**, Account **0715185037**.
   - The user enters their 10-character confirmation code (e.g., QBG582Y78X).
   - Admins verify and activate the listing via the administrative oversight panel.

---

## 2. Setting Up Safaricom Daraja Sandbox

To test STK Push payments during development using Safaricom's free sandbox:
1. Register/Login on the [Safaricom Daraja Developer Portal](https://developer.safaricom.co.ke/).
2. Create a new test app and make sure to select the **Lipa Na M-Pesa Sandbox** product.
3. Obtain your Sandbox credentials:
   - **Consumer Key**: Copy to `MPESA_KEY`.
   - **Consumer Secret**: Copy to `MPESA_SECRET`.
   - **Business Shortcode**: The sandbox shortcode is usually `174379`.
   - **Passkey**: Located on the "M-Pesa Express Query/STK Push" API page in the Sandbox credentials panel.

---

## 3. Configuring Webhook Callback URLs

Safaricom webhooks require a publicly accessible domain name.
- **For Development**: Webhooks cannot hit `localhost:3000` directly. Use a reverse proxy like **ngrok** to expose your server:
  ```bash
  ngrok http 3000
  ```
  This returns a public URL like `https://a1b2-c3d4.ngrok-free.app`.
- **Set the Callback URL**: Set your `CALLBACK_URL` environment variable:
  ```env
  CALLBACK_URL=https://a1b2-c3d4.ngrok-free.app/api/mpesa/callback
  ```
- **For Production**: Set the callback URL to your custom domain:
  ```env
  CALLBACK_URL=https://nestlist.com/api/mpesa/callback
  ```

---

## 4. Setting Environment Variables

Verify that your `.env` file or hosting environment variables contain the following configuration parameters:

```env
MPESA_ENV=sandbox
MPESA_KEY=your_daraja_consumer_key
MPESA_SECRET=your_daraja_consumer_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_daraja_passkey
CALLBACK_URL=https://your-domain.com/api/mpesa/callback
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_secret
```

---

## 5. Testing the STK Push Flow

1. Log into NestList as a landlord and proceed to **List Property**.
2. Complete Steps 1-4. In **Step 5 (Payment Verification)**, choose **M-Pesa STK Push (Instant)**.
3. Enter your phone number in the standard format (e.g., `0715185037` or `254715185037`).
4. Click **Initiate Payment**.
5. Check your phone: Safaricom should immediately send a secure PIN input dialog.
6. Enter any PIN (sandbox will accept any PIN, but if you want to simulate success/failure, check the Safaricom Daraja test numbers table).
7. On successful entry, the transaction is processed, the webhook updates the Supabase tables, and your browser redirects to the Success screen.

---

## 6. Troubleshooting Common Issues

### Issue 1: "Bad Gateway" or Hook Timeout
- **Cause**: Safaricom could not contact your callback server.
- **Solution**: Check if your `CALLBACK_URL` is correct and accessible. Ensure your hosting firewall allows external inbound traffic.

### Issue 2: Invalid Phone Number format
- **Cause**: The phone number was not converted to `2547XXXXXXXX`.
- **Solution**: NestList automatically sanitizes phone inputs, but ensure you write standard Kenyan formats starting with `07...`, `01...`, `2547...`, or `2541...`.

### Issue 3: Polling returns "Pending" forever
- **Cause**: The server has not received the webhook callback from Safaricom yet, or database Row-Level Security prevented updating the listing.
- **Solution**:
  - Check the backend server logs for incoming requests at `/api/mpesa/callback`.
  - Confirm `SUPABASE_SERVICE_ROLE_KEY` is set correctly so the backend can bypass standard RLS policies.
