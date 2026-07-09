// api/morning-briefs.js
// Daily morning-brief fan-out, hit by the Vercel cron in vercel.json.
// Auth: CRON_SECRET bearer, same as api/send-notifications.js.
//
// TODO (v0 shortcut, accepted): single fixed UTC run time (13:00 UTC ≈ 7am
// Mountain). No per-user timezone logic yet — reuse push_subscriptions.timezone
// or fuel_profiles when this graduates.
//
// TODO (deferred, on the post-merge list): real per-user hard-day prediction.
// v0 heuristic: a day is "hard" when this weekday averaged >= 60 min of
// training over the last 4 weeks. Rest/easy days get no morning brief (the
// Today screen shows the quiet rest-day state).
//
// Note: Vercel crons only run on PRODUCTION deployments. On the branch this
// route is exercised by curl with the CRON_SECRET.

import { createClient } from '@supabase/supabase-js'
import { getValidToken } from '../lib/stravaTokens.js'
import { isFuelCoachUser } from '../lib/fuelGate.js'
import { composeMorningBrief } from '../lib/composeBrief.js'
import { reportError } from '../lib/sentry.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

// v0 hard-day heuristic from the athlete's own Strava history.
async function classifyToday(tokenRow) {
  const accessToken = await getValidToken(tokenRow)
  const afterSec = Math.floor((Date.now() - 29 * 24 * 60 * 60 * 1000) / 1000)
  const r = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${afterSec}&per_page=200`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!r.ok) throw new Error(`Strava API ${r.status}`)
  const activities = await r.json()

  const now = new Date()
  const todayDow = now.getDay()

  const minutesByDate = {}
  for (const a of activities) {
    const d = new Date(a.start_date_local || a.start_date)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    minutesByDate[key] = (minutesByDate[key] || 0) + Math.round((a.moving_time || 0) / 60)
  }

  // Average this weekday over the last 4 weeks (excluding today)
  let sameDowTotal = 0
  for (let w = 1; w <= 4; w++) {
    const d = new Date(now)
    d.setDate(now.getDate() - 7 * w)
    if (d.getDay() !== todayDow) continue // paranoia; always true
    sameDowTotal += minutesByDate[`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`] || 0
  }
  const weekdayAvgMin = Math.round(sameDowTotal / 4)

  const yest = new Date(now)
  yest.setDate(now.getDate() - 1)
  const yesterdayMin = minutesByDate[`${yest.getFullYear()}-${yest.getMonth()}-${yest.getDate()}`] || 0

  const classification = weekdayAvgMin >= 60 ? 'hard' : weekdayAvgMin >= 15 ? 'easy' : 'rest'
  return { classification, weekdayAvgMin, yesterdayMin }
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Branch-life gate: only allowlisted users get briefs. Merge checklist:
  // remove the gate and iterate all Strava-connected users instead.
  const userIds = (process.env.FUEL_COACH_ALLOWLIST || '')
    .split(',').map(s => s.trim()).filter(Boolean)

  const results = []
  for (const userId of userIds) {
    if (!isFuelCoachUser(userId)) continue // keep the single gate authoritative
    try {
      const { data: tokenRow } = await supabase
        .from('strava_tokens')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      if (!tokenRow) {
        results.push({ userId, skipped: 'no strava connection' })
        continue
      }

      // Dedupe: one morning brief per day (cron retries, manual curls)
      const since = new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString()
      const { data: existing } = await supabase
        .from('fuel_briefs')
        .select('id')
        .eq('user_id', userId)
        .eq('kind', 'morning')
        .gte('created_at', since)
        .limit(1)
      if (existing?.length) {
        results.push({ userId, skipped: 'already briefed today' })
        continue
      }

      const context = await classifyToday(tokenRow)
      if (context.classification !== 'hard') {
        results.push({ userId, skipped: `${context.classification} day` })
        continue
      }

      const result = await composeMorningBrief({ userId, context })
      results.push({ userId, briefed: true, deduped: !!result.deduped })
    } catch (err) {
      console.error(`[morning-briefs] failed for ${userId}:`, err?.message)
      await reportError(err, { tags: { endpoint: 'morning-briefs' }, extra: { userId } })
      results.push({ userId, error: err?.message })
    }
  }

  return res.status(200).json({ ran: userIds.length, results })
}
