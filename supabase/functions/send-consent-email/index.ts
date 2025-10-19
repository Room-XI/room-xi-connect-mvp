import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple HTML sanitization function
function sanitize(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SG_KEY = Deno.env.get("SENDGRID_API_KEY");
    const SG_FROM = Deno.env.get("SENDGRID_FROM");
    const APP_URL = Deno.env.get("APP_URL") || "https://roomxiconnect.org";

    if (!SUPABASE_URL || !SERVICE_KEY) {
      throw new Error("Missing Supabase environment variables");
    }
    if (!SG_KEY || !SG_FROM) {
      throw new Error("Missing SendGrid environment variables");
    }

    const { youth_id, to_org_id, referral_id } = await req.json();
    
    if (!youth_id || !to_org_id) {
      throw new Error("youth_id and to_org_id are required");
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Get youth profile with guardian email
    const { data: youth, error: youthError } = await supabase
      .from("youth_profiles")
      .select("display_name, guardian_email, guardian_name, age")
      .eq("user_id", youth_id)
      .single();

    if (youthError) throw youthError;

    // Verify guardian email exists
    if (!youth?.guardian_email) {
      throw new Error("Guardian email not found - cannot send consent request");
    }

    // Verify youth is a minor (requires guardian consent)
    if (youth.age && youth.age >= 18) {
      throw new Error("Youth is 18+ - guardian consent not required");
    }

    // Get organization name
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", to_org_id)
      .single();

    if (orgError) throw orgError;

    // Sanitize user input to prevent email injection
    const sanitizedYouthName = sanitize(youth.display_name || "your youth");
    const sanitizedOrgName = sanitize(org?.name || "the receiving organization");
    const sanitizedGuardianName = sanitize(youth.guardian_name || "Guardian");

    // Generate verification token
    const verificationToken = crypto.randomUUID();
    const verificationUrl = `${APP_URL}/verify-consent/${verificationToken}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store consent request
    const { error: consentError } = await supabase
      .from("consents")
      .upsert({
        youth_id,
        grantee_org_id: to_org_id,
        scope: "referral",
        status: "pending",
        guardian_email: youth.guardian_email,
        guardian_name: youth.guardian_name,
        verification_token: verificationToken,
        verification_sent_at: new Date().toISOString(),
        verification_expires_at: expiresAt.toISOString()
      }, {
        onConflict: "youth_id,grantee_org_id,scope"
      });

    if (consentError) throw consentError;

    // Compose email
    const subject = `Consent Request: Share Information for ${sanitizedYouthName}`;
    
    const plainText = [
      `Hello ${sanitizedGuardianName},`,
      ``,
      `We're requesting your consent to share intake information for ${sanitizedYouthName} with ${sanitizedOrgName}.`,
      ``,
      `This will allow ${sanitizedOrgName} to provide better support without requiring ${sanitizedYouthName} to repeat their story.`,
      ``,
      `To grant or deny consent, please click the link below:`,
      verificationUrl,
      ``,
      `This link expires in 7 days.`,
      ``,
      `If you have questions, please contact us at ${SG_FROM}.`,
      ``,
      `Thank you,`,
      `Room XI Connect Team`
    ].join("\n");

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2D3748;">Consent Request</h2>
        <p>Hello ${sanitizedGuardianName},</p>
        <p>We're requesting your consent to share intake information for <strong>${sanitizedYouthName}</strong> with <strong>${sanitizedOrgName}</strong>.</p>
        <p>This will allow ${sanitizedOrgName} to provide better support without requiring ${sanitizedYouthName} to repeat their story.</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${verificationUrl}" style="background-color: #2EC489; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Review Consent Request
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">This link expires in 7 days.</p>
        <p style="color: #666; font-size: 14px;">If you have questions, please contact us at ${SG_FROM}.</p>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">Room XI Connect - Empowering youth through technology and community</p>
      </div>
    `;

    // Send email via SendGrid
    const emailBody = {
      personalizations: [
        { 
          to: [{ email: youth.guardian_email, name: sanitizedGuardianName }] 
        }
      ],
      from: { email: SG_FROM, name: "Room XI Connect" },
      subject,
      content: [
        { type: "text/plain", value: plainText },
        { type: "text/html", value: htmlContent }
      ]
    };

    const sgResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SG_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(emailBody)
    });

    if (!sgResponse.ok) {
      const errorText = await sgResponse.text();
      throw new Error(`SendGrid error: ${sgResponse.status} ${errorText}`);
    }

    // Log consent event
    await supabase.from("consent_events").insert({
      user_id: youth_id,
      actor: "system",
      event_type: "requested",
      consent_key: "referral",
      old_value: false,
      new_value: false,
      evidence_ref: `Consent request sent to ${youth.guardian_email} for referral to ${sanitizedOrgName}`
    });

    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: "Consent request sent successfully",
        expires_at: expiresAt.toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (e) {
    console.error("Send consent email error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

