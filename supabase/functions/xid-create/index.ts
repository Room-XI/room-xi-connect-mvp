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

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already has an active XID
    const { data: existingXid } = await supabase
      .from("xids")
      .select("id, xid_hash, checksum")
      .eq("user_id", user.id)
      .is("tombstoned_at", null)
      .single();

    if (existingXid) {
      return new Response(
        JSON.stringify({
          ok: true,
          xid_id: existingXid.id,
          xid_hash: existingXid.xid_hash,
          checksum: existingXid.checksum,
          message: "XID already exists"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate salt (32 bytes for strong security)
    const saltBytes = new Uint8Array(32);
    crypto.getRandomValues(saltBytes);
    const salt = btoa(String.fromCharCode(...saltBytes));

    // Generate XID hash using database function (with pepper from environment)
    const { data: xidHash, error: hashError } = await supabase
      .rpc("generate_xid_hash", {
        user_id: user.id,
        salt: salt
      });

    if (hashError) {
      console.error("Error generating XID hash:", hashError);
      throw new Error("Failed to generate XID hash");
    }

    // Generate checksum (SHA-256 of hash, first 8 chars)
    const checksumBytes = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(xidHash)
    );
    const checksum = btoa(String.fromCharCode(...new Uint8Array(checksumBytes)))
      .substring(0, 8);

    // Tombstone old XIDs (for rotation)
    await supabase
      .from("xids")
      .update({ tombstoned_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("tombstoned_at", null);

    // Create new XID
    const { data: xid, error: xidError } = await supabase
      .from("xids")
      .insert({
        user_id: user.id,
        xid_hash: xidHash,
        salt: salt,
        checksum: checksum
      })
      .select()
      .single();

    if (xidError) {
      console.error("Error creating XID:", xidError);
      throw new Error("Failed to create XID");
    }

    // Log audit trail
    await supabase.from("audit_trail").insert({
      user_id: user.id,
      action: "INSERT",
      table_name: "xids",
      record_id: xid.id,
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
      user_agent: req.headers.get("user-agent"),
      result: "success"
    });

    return new Response(
      JSON.stringify({ 
        ok: true, 
        xid_id: xid.id,
        xid_hash: xid.xid_hash,
        checksum: xid.checksum,
        message: "XID created successfully"
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (e) {
    console.error("XID creation error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

