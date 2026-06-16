// api/strava-callback.js
// Handles the OAuth redirect from Strava after the user authorizes.
// Exchanges the code for tokens, saves to strava_tokens in Supabase,
// then redirects back to the app.
//
// State carries the Supabase user ID, plus a "__native" suffix when the flow
// started in the Capacitor app. On native we return via the truecalorie://
// custom scheme (caught by the single appUrlOpen listener in src/App.jsx);
// on web we keep the original https redirects unchanged.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

// status: 'connected' | 'denied' | 'error'
function redirectBack(res, appUrl, isNative, status) {
  if (isNative) {
    return res.redirect(302, `truecalorie://strava?${status}=1`)
  }
  // Web: preserve existing behavior exactly — success returns to the app root
  // with no param, failures carry ?strava=denied / ?strava=error.
  if (status === 'connected') {
    return res.redirect(302, `${appUrl}/`)
  }
  return res.redirect(302, `${appUrl}/?strava=${status}`)
}

export default async function handler(req, res) {
  const { code, error, state } = req.query

  const appUrl = process.env.VITE_APP_URL || 'https://truecalorie.net'

  // Pull the native flag out of state and recover the clean Supabase user ID.
  const isNative = typeof state === 'string' && state.endsWith('__native')
  const userId   = isNative ? state.slice(0, -'__native'.length) : state

  if (error || !code) {
    return redirectBack(res, appUrl, isNative, 'denied')
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
    return redirectBack(res, appUrl, isNative, 'error')
  }

  if (!tokenData.access_token) {
    console.error('No access token in Strava response:', tokenData)
    return redirectBack(res, appUrl, isNative, 'error')
  }

  const athlete = tokenData.athlete || {}

  // We need the Supabase user ID. Strava passes our state param back —
  // we embed the user ID in state when initiating the OAuth flow.
  // If state is missing (e.g. direct nav), we can't link the account.
  if (!userId) {
    console.error('No userId in state param')
    return redirectBack(res, appUrl, isNative, 'error')
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
    return redirectBack(res, appUrl, isNative, 'error')
  }

  return redirectBack(res, appUrl, isNative, 'connected')
}
