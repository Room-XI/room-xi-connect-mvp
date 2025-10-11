import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already has an XID
    const { data: existingXid } = await supabaseClient
      .from('xids')
      .select('id, xid_hash, checksum')
      .eq('user_id', user.id)
      .is('tombstoned_at', null)
      .single()

    if (existingXid) {
      // Return existing XID info (hash only for security - Fix for R-01: XID Re-identification Risk)
      return new Response(
        JSON.stringify({
          xid_id: existingXid.id,
          xid_hash: existingXid.xid_hash,
          checksum: existingXid.checksum,
          message: 'XID already exists'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate a new XID (8-character alphanumeric)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let rawXid = ''
    for (let i = 0; i < 8; i++) {
      rawXid += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    // Create checksum (first 4 chars of SHA-256)
    const encoder = new TextEncoder()
    const data = encoder.encode(rawXid)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = new Uint8Array(hashBuffer)
    const checksum = Array.from(hashArray.slice(0, 2))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()

    // Hash the XID with server-side secret for storage (Fix for R-01: XID Re-identification Risk)
    const secret = Deno.env.get('XID_HASH_SECRET') ?? 'default-secret-change-in-production'
    const saltedXid = rawXid + secret
    const saltedData = encoder.encode(saltedXid)
    const saltedHashBuffer = await crypto.subtle.digest('SHA-256', saltedData)
    const saltedHashArray = new Uint8Array(saltedHashBuffer)
    const xidHash = Array.from(saltedHashArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Store the hashed XID in database
    const { data: newXid, error: insertError } = await supabaseClient
      .from('xids')
      .insert({
        user_id: user.id,
        xid_hash: xidHash,
        checksum: checksum
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Error creating XID:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create XID' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Return the raw XID to the user (shown once only - Fix for R-01: XID Re-identification Risk)
    return new Response(
      JSON.stringify({
        xid_id: newXid.id,
        raw_xid: rawXid, // Only returned once during creation
        checksum: checksum,
        message: 'XID created successfully. Please save this XID as it will not be shown again.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
