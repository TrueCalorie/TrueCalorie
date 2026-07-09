// lib/stravaTokens.js
// Strava token refresh for v2 server code (webhook, morning briefs).
//
// refreshToken/getValidToken are verbatim copies of the working logic in
// api/strava-activities.js and api/strava-training.js. Those two routes keep
// their own copies untouched on this branch (zero production risk);
// consolidating all three onto this module is on the merge checklist.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

export async function refreshToken(userId, refreshTokenValue) {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type:    'refresh_token',
      refresh_token: refreshTokenValue,
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Token refresh failed')

  await supabase
    .from('strava_tokens')
    .update({
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
      expires_at:    data.expires_at,
    })
    .eq('user_id', userId)

  return data.access_token
}

export async function getValidToken(tokenRow) {
  const nowSec = Math.floor(Date.now() / 1000)
  // Refresh 5 minutes before expiry
  if (tokenRow.expires_at > nowSec + 300) {
    return tokenRow.access_token
  }
  return await refreshToken(tokenRow.user_id, tokenRow.refresh_token)
}
