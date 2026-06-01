// api/strava-callback.js
// Handles the OAuth redirect from Strava after the user authorizes.
// Exchanges the code for tokens, saves to strava_tokens in Supabase,
// then redirects back to the app with ?strava=connected

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

export default async function handler(req, res) {
  const { code, error, state } = req.query

  const appUrl = process.env.VITE_APP_URL || 'https://truecalorie.net'

  if (error || !code) {
    return res.redirect(302, `${appUrl}/?strava=denied`)
  }

  // Exchange code for tokens
  let tokenData
  try {
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type:    'authorization_code',
      }),
    })
    tokenData = await tokenRes.json()
  } catch (err) {
    console.error('Strava token exchange failed:', err)
    return res.redirect(302, `${appUrl}/?strava=error`)
  }

  if (!tokenData.access_token) {
    console.error('No access token in Strava response:', tokenData)
    return res.redirect(302, `${appUrl}/?strava=error`)
  }

  const athlete = tokenData.athlete || {}

  // We need the Supabase user ID. Strava passes our state param back —
  // we embed the user ID in state when initiating the OAuth flow.
  // If state is missing (e.g. direct nav), we can't link the account.
  const userId = state
  if (!userId) {
    console.error('No userId in state param')
    return res.redirect(302, `${appUrl}/?strava=error`)
  }

  // Upsert tokens — one row per user, replace on reconnect
  const { error: dbError } = await supabase
    .from('strava_tokens')
    .upsert({
      user_id:       userId,
      athlete_id:    athlete.id,
      access_token:  tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at:    tokenData.expires_at,
      athlete_name:  athlete.firstname ? `${athlete.firstname} ${athlete.lastname || ''}`.trim() : null,
      athlete_city:  athlete.city || null,
      athlete_sport: athlete.athlete_type === 1 ? 'cyclist' : 'runner',
    }, { onConflict: 'user_id' })

  if (dbError) {
    console.error('Failed to save Strava tokens:', dbError)
    return res.redirect(302, `${appUrl}/?strava=error`)
  }

  return res.redirect(302, `${appUrl}/`)
}
