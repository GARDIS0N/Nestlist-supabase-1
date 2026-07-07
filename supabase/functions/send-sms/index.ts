import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SmsRequest {
  type:
    | "inquiry_received"
    | "inquiry_sent"
    | "payment_confirmed"
    | "listing_expiring"
    | "listing_expired"
    | "search_alert"
    | "welcome_landlord"
    | "welcome_tenant";
  phone: string;
  data: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { type, phone, data } = (await req.json()) as SmsRequest;

    if (!type || !phone || !data) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. CHOOSE AND FORMAT THE SMS TEMPLATE
    let messageText = "";

    switch (type) {
      case "inquiry_received":
        messageText = `Jambo ${data.landlord_name || "Landlord"}, you have a new inquiry from ${data.tenant_name || "a tenant"} (${data.tenant_phone}) regarding your listing "${data.property_title}": "${data.message || ""}". Reply via Nestlist!`;
        break;
      case "inquiry_sent":
        messageText = `Jambo ${data.tenant_name || "Tenant"}, your inquiry for "${data.property_title}" has been sent to the landlord. Their phone is ${data.landlord_phone || "N/A"}. Thank you for choosing Nestlist!`;
        break;
      case "payment_confirmed":
        messageText = `Habari ${data.landlord_name || "Landlord"}, payment of KSh ${data.amount} (Ref: ${data.mpesa_code}) received. Your listing "${data.property_title}" is now ACTIVE for 30 days. Log in to track views!`;
        break;
      case "listing_expiring":
        messageText = `Habari ${data.landlord_name || "Landlord"}, your listing "${data.property_title}" will expire in 5 days. Renew now to avoid losing inquiries!`;
        break;
      case "listing_expired":
        messageText = `Habari ${data.landlord_name || "Landlord"}, your listing "${data.property_title}" has expired. Pay KSh ${data.amount || "the fee"} to reactivate it for another 30 days.`;
        break;
      case "search_alert":
        messageText = `Jambo ${data.tenant_name || "Tenant"}, a new property matching your alert "${data.alert_name}" is available! "${data.property_title}" in ${data.location} at KSh ${data.price}/mo. View details on Nestlist: ${Deno.env.get("APP_URL") || "https://nestlist.co.ke"}/property/${data.property_id}`;
        break;
      case "welcome_landlord":
        messageText = `Karibu Nestlist, ${data.name || "Landlord"}! List your rooms, bedsitters, and apartments, pay the listing fee easily via M-Pesa, and start receiving inquiries instantly via SMS.`;
        break;
      case "welcome_tenant":
        messageText = `Karibu Nestlist, ${data.name || "Tenant"}! Search and filter rentals across Kenya, save favorites, and subscribe to search alerts. We notify you via SMS when matching rentals are listed!`;
        break;
      default:
        messageText = `Jambo from Nestlist! You have a new notification: ${JSON.stringify(data)}`;
        break;
    }

    // Ensure phone is internationally formatted (+254XXXXXXXXX)
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "+254" + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith("254") && !formattedPhone.startsWith("+")) {
      formattedPhone = "+" + formattedPhone;
    } else if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+254" + formattedPhone;
    }

    // 2. AFRICA'S TALKING API CONFIGURATION
    const username = Deno.env.get("AT_USERNAME") || "sandbox";
    const apiKey = Deno.env.get("AT_API_KEY") || "MOCK_AT_API_KEY";
    const isMock = apiKey === "MOCK_AT_API_KEY";

    let apiStatus = "sent";
    let messageId = `at_msg_${Date.now()}`;
    let cost = "KSh 0.80";

    if (!isMock) {
      try {
        const url = username === "sandbox"
          ? "https://api.sandbox.africastalking.com/version1/messaging"
          : "https://api.africastalking.com/version1/messaging";

        const formData = new URLSearchParams();
        formData.append("username", username);
        formData.append("to", formattedPhone);
        formData.append("message", messageText);

        const atResponse = await fetch(url, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
            "apiKey": apiKey,
          },
          body: formData.toString(),
        });

        const responseJson = await atResponse.json();
        const recipient = responseJson?.SMSMessageData?.Recipients?.[0];
        if (recipient) {
          apiStatus = recipient.status === "Success" ? "sent" : "failed";
          messageId = recipient.messageId;
          cost = recipient.cost;
        }
      } catch (err) {
        console.error("Africa's Talking integration failed, fallback to log-only. Error:", err);
        apiStatus = "error";
      }
    } else {
      console.log(`[SMS Simulator] Sending to ${formattedPhone}: "${messageText}"`);
    }

    // 3. LOG SMS TO DATABASE
    const { error: logError } = await supabaseClient.from("sms_logs").insert({
      type: type,
      recipient_phone: formattedPhone,
      message: messageText,
      status: apiStatus,
      message_id: messageId,
      cost: cost,
    });

    if (logError) {
      console.error("Failed to log SMS to database:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "SMS processed",
        message_id: messageId,
        is_mocked: isMock,
        text: messageText,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-sms handler:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
