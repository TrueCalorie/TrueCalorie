// api/strava/webhook.js
// Strava push subscription endpoint. (Phase 1 move: was api/strava-webhook.js;
// the registered callback URL is https://www.truecalorie.net/api/strava/webhook
// — www, never apex.)
//
// GET  — subscription verification: Strava sends hub.mode, hub.verify_token,
//        hub.challenge; we echo the challenge if the token matches.
// POST — activity events. Strava wants a 200 within 2 seconds, so we ack
//        first and do the work in waitUntil. Processes activity create AND
//        update; everything else (including deauth) is logged and dropped.
//        Only FUEL_COACH_ALLOWLIST users compose briefs (see lib/fuelGate.js;
//        gate removal is on the merge checklist).
//
// Every processed activity is persisted to strava_activities (upsert on
// activity_id, Strava's own id — idempotent across retries and updates),
// then the post-run brief generator runs inline.
//
// Service-role key is server-side only; this file never ships to a client.

import { createClient } from '@supabase/supabase-js'
import { waitUntil } from '@vercel/functions'
import { getValidToken } from '../../lib/stravaTokens.js'
import { isFuelCoachUser } from '../../lib/fuelGate.js'
import { composePostrunBrief } from '../../lib/composeBrief.js'
import { reportError } from '../../lib/sentry.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

// The Phase-1 spec names this STRAVA_VERIFY_TOKEN; the M3 handoff named it
// STRAVA_WEBHOOK_VERIFY_TOKEN. Accept whichever is set so a Vercel env
// mismatch can't silently break subscription validation.
function expectedVerifyToken() {
  return process.env.STRAVA_VERIFY_TOKEN || process.env.STRAVA_WEBHOOK_VERIFY_TOKEN
}

// Exported for unit tests; the handler runs this via waitUntil.
export async function processEvent(event) {
  try {
    if (event?.object_type !== 'activity' ||
        !['create', 'update'].includes(event?.aspect_type)) {
      // Deauth arrives as object_type 'athlete' with updates.authorized:"false".
      console.log('[strava-webhook] ignored event:',
        event?.object_type, event?.aspect_type, JSON.stringify(event?.updates || {}))
      return
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

    // Refresh the access token if expired (persists the new pair)
    const accessToken = await getValidToken(tokenRow)

    const detailRes = await fetch(
      `https://www.strava.com/api/v3/activities/${event.object_id}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!detailRes.ok) throw new Error(`Strava activity fetch ${detailRes.status}`)
    const activity = await detailRes.json()

    // Persist to strava_activities — upsert on Strava's own id, so webhook
    // retries and update events converge on one row.
    const { error: upsertError } = await supabase
      .from('strava_activities')
      .upsert({
        activity_id:       activity.id,
        user_id:           tokenRow.user_id,
        name:              activity.name || null,
        sport_type:        activity.sport_type || activity.type || null,
        start_date:        activity.start_date,
        moving_time_s:     activity.moving_time || 0,
        distance_m:        activity.distance || 0,
        elevation_gain_m:  activity.total_elevation_gain ?? null,
        average_heartrate: activity.average_heartrate ?? null,
        relative_effort:   activity.suffer_score ?? null,
        raw:               activity,
        synced_at:         new Date().toISOString(),
      }, { onConflict: 'activity_id' })
    if (upsertError) throw upsertError

    // Brief generation runs inline after the upsert; its own gates decide
    // whether a brief is warranted, and the fuel_briefs partial unique index
    // makes duplicate events a no-op.
    const result = await composePostrunBrief({ userId: tokenRow.user_id, activity })
    console.log(`[strava-webhook] activity ${event.object_id}: ` +
      (result.deduped ? 'brief deduped' : result.skipped ? `skipped (${result.skipped})` : 'brief composed'))
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

    if (mode === 'subscribe' && token && token === expectedVerifyToken()) {
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
