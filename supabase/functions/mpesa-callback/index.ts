import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    console.log("M-Pesa Callback received payload:", JSON.stringify(body));

    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) {
      return new Response(JSON.stringify({ error: "Invalid payload format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const checkoutRequestId = stkCallback.CheckoutRequestID;
    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;

    // Find payment row matching CheckoutRequestID
    const { data: paymentRow, error: findError } = await supabaseClient
      .from("listing_payments")
      .select("*")
      .eq("mpesa_checkout_request_id", checkoutRequestId)
      .maybeSingle();

    if (findError) {
      console.error("Database lookup error for checkout request ID:", findError);
      return new Response(JSON.stringify({ error: "Database error" }), { status: 500 });
    }

    if (!paymentRow) {
      console.warn(`No payment row found matching checkout ID: ${checkoutRequestId}`);
      return new Response(JSON.stringify({ message: "No match found, logged." }), { status: 200 });
    }

    if (resultCode === 0) {
      // Transaction successful
      let mpesaCode = "";
      let amountPaid = paymentRow.amount;
      let payerPhone = paymentRow.payer_phone;

      const metadataItems = stkCallback.CallbackMetadata?.Item || [];
      for (const item of metadataItems) {
        if (item.Name === "MpesaReceiptNumber") {
          mpesaCode = item.Value;
        } else if (item.Name === "Amount") {
          amountPaid = item.Value;
        } else if (item.Name === "PhoneNumber") {
          payerPhone = String(item.Value);
        }
      }

      const { error: updateError } = await supabaseClient
        .from("listing_payments")
        .update({
          status: "confirmed",
          mpesa_code: mpesaCode || `MPX_${Date.now()}`,
          amount_paid: amountPaid,
          payer_phone: payerPhone,
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", paymentRow.id);

      if (updateError) {
        console.error("Failed to update successful payment status:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update db" }), { status: 500 });
      }

      console.log(`Payment confirmed successfully for ID: ${paymentRow.id}`);
    } else {
      // Transaction failed / cancelled
      let status: "failed" | "cancelled" = "failed";
      if (resultCode === 1032) {
        status = "cancelled"; // Request cancelled by user
      }

      const { error: updateError } = await supabaseClient
        .from("listing_payments")
        .update({
          status: status,
          failure_reason: resultDesc || `ResultCode ${resultCode}`,
        })
        .eq("id", paymentRow.id);

      if (updateError) {
        console.error("Failed to update failed payment status:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update db" }), { status: 500 });
      }

      console.log(`Payment status set to ${status} for ID: ${paymentRow.id}`);
    }

    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Success" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in callback handler:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
