import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { email, displayName, phone, invitedBy } = body

    if (!email || !displayName) {
      throw new Error('Email and display name are required')
    }

    if (!email.endsWith('@ishantechnologies.com')) {
      throw new Error('Email must be from @ishantechnologies.com domain')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Server configuration error')
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }
    const token = authHeader.replace('Bearer ', '')
    const { error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError) {
      throw new Error('Unauthorized')
    }

    // 1. Record invitation
    const { data: invitation, error: dbError } = await supabaseAdmin
      .from('invitations')
      .insert({
        email,
        display_name: displayName,
        phone: phone || null,
        invited_by: invitedBy || 'admin',
        status: 'pending'
      })
      .select()
      .single()

    if (dbError && dbError.code !== '23505') {
      throw dbError
    }

    // 2. Create user
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: displayName,
        phone: phone || '',
        is_admin: false
      }
    })

    if (createError && !createError.message.includes('already registered')) {
      throw createError
    }

    const frontendUrl = Deno.env.get('FRONTEND_URL') ?? 'http://localhost:8082'

    // 3. Generate invite link with redirect to set-password page
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${frontendUrl}/set-password.html`
      }
    })

    if (linkError) throw linkError

    // Encode the magic link to protect from email scanners
    const actualLink = linkData.properties.action_link
    const encodedLink = btoa(actualLink)

    // Create protected link that requires button click
    const inviteLink = `${frontendUrl}/verify-invite.html?link=${encodeURIComponent(encodedLink)}`

    // 4. Send to n8n webhook
    const webhookUrl = Deno.env.get('N8N_WEBHOOK_URL')

    if (webhookUrl) {
      const n8nResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: displayName,
          invite_link: inviteLink,
          phone,
          user_id: userData?.user?.id
        })
      })

      if (!n8nResponse.ok) {
        console.error('n8n webhook failed:', await n8nResponse.text())
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Invitation sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
