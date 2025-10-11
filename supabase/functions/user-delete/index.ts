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
    // Create Supabase client with service role for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Create client with user's auth for initial verification
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id

    // Parse request body for confirmation
    const { confirm } = await req.json()
    if (confirm !== 'DELETE_MY_ACCOUNT') {
      return new Response(
        JSON.stringify({ error: 'Confirmation required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Begin transaction-like operations
    try {
      // 1. Tombstone XIDs instead of deleting them (Fix for R-01: XID Re-identification Risk)
      // This preserves attendance statistics while severing the link to the user
      const { error: tombstoneError } = await supabaseClient
        .from('xids')
        .update({ 
          tombstoned_at: new Date().toISOString(),
          user_id: null // Remove the link to the user
        })
        .eq('user_id', userId)

      if (tombstoneError) {
        console.error('Error tombstoning XIDs:', tombstoneError)
        throw new Error('Failed to tombstone XIDs')
      }

      // 2. Delete user's personal data (cascading deletes will handle related records)
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .delete()
        .eq('user_id', userId)

      if (profileError) {
        console.error('Error deleting profile:', profileError)
        throw new Error('Failed to delete profile')
      }

      // 3. Delete the auth user (this will cascade to other user-owned tables via FK constraints)
      const { error: deleteUserError } = await supabaseClient.auth.admin.deleteUser(userId)

      if (deleteUserError) {
        console.error('Error deleting user:', deleteUserError)
        throw new Error('Failed to delete user account')
      }

      return new Response(
        JSON.stringify({ 
          message: 'Account deleted successfully. All personal data has been removed while preserving anonymized attendance statistics.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (deleteError) {
      console.error('Error during account deletion:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete account. Please try again or contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
