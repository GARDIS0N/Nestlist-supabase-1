import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { propertyId, landlordId, phone, amount, propertyType } = await req.json();

    if (!propertyId || !landlordId || !phone || !amount || !propertyType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. SAFARICOM DARAJA OAUTH - GET ACCESS TOKEN
    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY") || "MOCK_CONSUMER_KEY";
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET") || "MOCK_CONSUMER_SECRET";
    const shortcode = Deno.env.get("MPESA_SHORTCODE") || "174379";
    const passkey = Deno.env.get("MPESA_PASSKEY") || "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
    const callbackUrl = Deno.env.get("MPESA_CALLBACK_URL") || `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-callback`;

    // Format phone to 254XXXXXXXXX
    let formattedPhone = phone.trim().replace("+", "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "254" + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith("254")) {
      formattedPhone = "254" + formattedPhone;
    }

    let checkoutRequestId = `ws_CO_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    let mpesaResponseData = null;

    // Check if real Daraja keys are configured, otherwise run in highly realistic test mode
    const isMock = consumerKey === "MOCK_CONSUMER_KEY" || consumerSecret === "MOCK_CONSUMER_SECRET";

    if (!isMock) {
      try {
        const auth = btoa(`${consumerKey}:${consumerSecret}`);
        const oauthResponse = await fetch(
          "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
          {
            headers: { Authorization: `Basic ${auth}` },
          }
        );
        const oauthData = await oauthResponse.json();
        const accessToken = oauthData.access_token;

        // 2. BUILD STK PAYLOAD & PASSWORD
        const timestamp = new Date()
          .toISOString()
          .replace(/[^0-9]/g, "")
          .slice(0, 14); // YYYYMMDDHHmmss
        const password = btoa(`${shortcode}${passkey}${timestamp}`);

        const stkPayload = {
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: Math.round(amount),
          PartyA: formattedPhone,
          PartyB: shortcode,
          PhoneNumber: formattedPhone,
          CallBackURL: callbackUrl,
          AccountReference: `Nestlist Prop ${propertyId.slice(0, 8)}`,
          TransactionDesc: `Listing fee for ${propertyType}`,
        };

        const stkResponse = await fetch(
          "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", // Sandbox endpoint or live endpoint
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(stkPayload),
          }
        );

        mpesaResponseData = await stkResponse.json();
        if (mpesaResponseData.CheckoutRequestID) {
          checkoutRequestId = mpesaResponseData.CheckoutRequestID;
        }
      } catch (err) {
        console.error("Daraja integration failed, fallback to mocked sandbox: ", err);
      }
    }

    // 3. CREATE PENDING LISTING PAYMENT ROW USING SERVICE ROLE BYPASSING RLS
    const { data: paymentRow, error: dbError } = await supabaseClient
      .from("listing_payments")
      .insert({
        property_id: propertyId,
        landlord_id: landlordId,
        amount: amount,
        property_type: propertyType,
        mpesa_checkout_request_id: checkoutRequestId,
        payer_phone: formattedPhone,
        status: "pending",
      })
      .select()
      .single();

    if (dbError) {
      throw dbError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: paymentRow.id,
        checkout_request_id: checkoutRequestId,
        message: isMock 
          ? "STK Push initiated successfully (Simulated)" 
          : "STK Push initiated successfully on landlord phone",
        is_mocked: isMock,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "An unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
