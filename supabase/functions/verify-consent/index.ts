import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token, action, guardian_dob } = await req.json();

    if (!token || !action || !guardian_dob) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing required fields: token, action, guardian_dob" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["grant", "deny"].includes(action)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid action. Must be 'grant' or 'deny'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find consent by token
    const { data: consent, error: consentError } = await supabase
      .from("consents")
      .select("*")
      .eq("verification_token", token)
      .eq("status", "pending")
      .single();

    if (consentError || !consent) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid or expired consent request" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (new Date(consent.verification_expires_at) < new Date()) {
      await supabase
        .from("consents")
        .update({ status: "expired" })
        .eq("id", consent.id);

      return new Response(
        JSON.stringify({ ok: false, error: "Consent request has expired" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify guardian is 18+
    const guardianAge = Math.floor(
      (new Date().getTime() - new Date(guardian_dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );

    if (guardianAge < 18) {
      return new Response(
        JSON.stringify({ ok: false, error: "Guardian must be 18 or older to provide consent" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get IP and user agent
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Update consent
    const newStatus = action === "grant" ? "granted" : "revoked";
    const { error: updateError } = await supabase
      .from("consents")
      .update({
        status: newStatus,
        signed_at: new Date().toISOString(),
        signed_by_ip: ip,
        signed_by_user_agent: userAgent,
        guardian_verified: true
      })
      .eq("id", consent.id);

    if (updateError) throw updateError;

    // Log consent event
    await supabase.from("consent_events").insert({
      user_id: consent.youth_id,
      actor: "guardian",
      event_type: action === "grant" ? "granted" : "revoked",
      consent_key: consent.scope,
      old_value: false,
      new_value: action === "grant",
      ip_address: ip,
      user_agent: userAgent,
      evidence_ref: `Guardian ${action === "grant" ? "granted" : "denied"} consent via email verification`
    });

    // If granted, update related referrals
    if (action === "grant") {
      await supabase
        .from("referrals")
        .update({ 
          status: "sent",
          sent_at: new Date().toISOString()
        })
        .eq("youth_id", consent.youth_id)
        .eq("to_org_id", consent.grantee_org_id)
        .eq("status", "pending_consent");
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: `Consent ${action === "grant" ? "granted" : "denied"} successfully` 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (e) {
    console.error("Verify consent error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

