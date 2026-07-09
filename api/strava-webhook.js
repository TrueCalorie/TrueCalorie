// api/strava-webhook.js
// Strava push subscription endpoint.
//
// GET  — subscription verification: Strava sends hub.mode, hub.verify_token,
//        hub.challenge; we echo the challenge if the token matches
//        STRAVA_WEBHOOK_VERIFY_TOKEN.
// POST — activity events. Strava wants a 200 within 2 seconds, so we ack
//        first and do the work in waitUntil. Only activity-create events for
//        FUEL_COACH_ALLOWLIST users compose a brief; everything else is
//        logged and dropped (see lib/fuelGate.js — gate removal is on the
//        merge checklist).
//
// Registration (Jackson's side): one subscription per Strava app, against a
// STABLE url. Branch life: the Vercel branch alias. At merge: re-register
// against https://www.truecalorie.net/api/strava-webhook (www, never apex).

import { createClient } from '@supabase/supabase-js'
import { waitUntil } from '@vercel/functions'
import { getValidToken } from '../lib/stravaTokens.js'
import { isFuelCoachUser } from '../lib/fuelGate.js'
import { composePostrunBrief } from '../lib/composeBrief.js'
import { reportError } from '../lib/sentry.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

async function processEvent(event) {
  try {
    if (event?.object_type !== 'activity' || event?.aspect_type !== 'create') {
      return // updates, deletes, athlete deauth events: not our trigger
    }

    // Map Strava athlete -> TrueCalorie user
    const { data: tokenRow } = await supabase
      .from('strava_tokens')
      .select('*')
      .eq('athlete_id', event.owner_id)
      .maybeSingle()

    if (!tokenRow) {
      console.log(`[strava-webhook] no user for athlete ${event.owner_id}, dropped`)
      return
    }

    if (!isFuelCoachUser(tokenRow.user_id)) {
      console.log(`[strava-webhook] user ${tokenRow.user_id} not allowlisted, dropped`)
      return
    }

    const accessToken = await getValidToken(tokenRow)
    const detailRes = await fetch(
      `https://www.strava.com/api/v3/activities/${event.object_id}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!detailRes.ok) throw new Error(`Strava activity fetch ${detailRes.status}`)
    const activity = await detailRes.json()

    const result = await composePostrunBrief({ userId: tokenRow.user_id, activity })
    console.log(`[strava-webhook] activity ${event.object_id}: ${result.deduped ? 'deduped' : 'brief composed'}`)
  } catch (err) {
    console.error('[strava-webhook] processing failed:', err?.message)
    await reportError(err, { tags: { endpoint: 'strava-webhook' }, extra: { event } })
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const mode      = req.query['hub.mode']
    const token     = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    if (mode === 'subscribe' && token && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
      return res.status(200).json({ 'hub.challenge': challenge })
    }
    return res.status(403).json({ error: 'Verification failed' })
  }

  if (req.method === 'POST') {
    let event
    try {
      event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' })
    }

    // Ack fast (Strava's 2s deadline), then process.
    waitUntil(processEvent(event))
    return res.status(200).json({ received: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
