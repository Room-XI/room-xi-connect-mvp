import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-csrf-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { from_org_id, to_org_id, youth_id, summary, priority = 'medium' } = await req.json();

    // Validate inputs
    if (!from_org_id || !to_org_id || !youth_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing required fields: from_org_id, to_org_id, youth_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate priority
    if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid priority. Must be: low, medium, high, or urgent" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate summary length
    if (summary && summary.length > 500) {
      return new Response(
        JSON.stringify({ ok: false, error: "Summary too long. Maximum 500 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user ID from auth token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is member of from_org
    const { data: membership } = await supabase
      .from("org_members")
      .select("*")
      .eq("user_id", user.id)
      .eq("org_id", from_org_id)
      .eq("active", true)
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ ok: false, error: "Not a member of sending organization" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check consent
    const { data: consentRows, error: consentErr } = await supabase
      .from("consents")
      .select("*")
      .eq("youth_id", youth_id)
      .eq("grantee_org_id", to_org_id)
      .in("scope", ["referral", "share_intake"])
      .eq("status", "granted");

    if (consentErr) throw consentErr;

    const status = consentRows.length > 0 ? "sent" : "pending_consent";

    // Create referral
    const { data, error } = await supabase
      .from("referrals")
      .insert([{ 
        from_org_id, 
        to_org_id, 
        youth_id, 
        summary: summary?.substring(0, 500), // Enforce length limit
        priority,
        status,
        sent_at: status === 'sent' ? new Date().toISOString() : null
      }])
      .select()
      .single();

    if (error) throw error;

    // If consent missing, send guardian consent email
    if (status === "pending_consent") {
      // Get youth profile to check if minor
      const { data: youthProfile } = await supabase
        .from("youth_profiles")
        .select("age, guardian_email")
        .eq("user_id", youth_id)
        .single();

      if (youthProfile && youthProfile.age < 18 && youthProfile.guardian_email) {
        // Trigger consent email function
        await fetch(new URL(req.url).origin + "/functions/v1/send-consent-email", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            "Authorization": authHeader,
            ...corsHeaders 
          },
          body: JSON.stringify({ youth_id, to_org_id, referral_id: data.id }),
        });
      }
    }

    // Log audit trail
    await supabase.from("audit_trail").insert({
      user_id: user.id,
      org_id: from_org_id,
      action: "INSERT",
      table_name: "referrals",
      record_id: data.id,
      record_data: data,
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
      user_agent: req.headers.get("user-agent"),
      result: "success"
    });

    return new Response(
      JSON.stringify({ ok: true, referral: data }),
      { 
        status: 201, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (e) {
    console.error("Referral creation error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

