// api/strava-training.js
// Fetches multiple days of Strava activities for training analysis.
// Used by the Training section in Trends.jsx.
//
// POST { userId, days? }  (days defaults to 30)
// Returns {
//   connected, byDate: { [dateStr]: { calories, movingTimeSec, activities: [] } },
//   weeklyTotals: { calories, movingTimeSec, activityCount },
//   sportBreakdown: { [sportKey]: { minutes, calories } },
//   trainingDays: string[],  // dates with at least one activity
// }

import { createClient } from '@supabase/supabase-js'
import { verifyUser } from '../lib/verifyUser.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const SPORT_MAP = {
  Run: 'running', TrailRun: 'running', VirtualRun: 'running',
  Ride: 'cycling', VirtualRide: 'cycling', MountainBike: 'cycling',
  Swim: 'swimming',
  WeightTraining: 'strength', Workout: 'strength', CrossFit: 'strength',
  Soccer: 'team', Basketball: 'team', Football: 'team',
  Lacrosse: 'team', Hockey: 'team', Baseball: 'team', Volleyball: 'team',
  Tennis: 'general', Golf: 'general', Hike: 'general', Walk: 'general', Yoga: 'general',
}

const CALORIE_CORRECTION = {
  running: 0.95, cycling: 0.82, swimming: 1.00,
  strength: 0.88, team: 0.92, general: 0.90,
}

// ─── Our own calorie estimate (used when Strava returns 0) ────────────────
function estimateCalories(sport, movingTimeSec, distanceMeters, weightKg) {
  const hours = movingTimeSec / 3600
  const km    = (distanceMeters || 0) / 1000
  switch (sport) {
    case 'running':  return km * weightKg * 1.0
    case 'cycling':  return km * weightKg * 0.42
    case 'swimming': return 7.0 * weightKg * hours
    case 'strength': return 5.0 * weightKg * hours
    case 'team':     return 8.0 * weightKg * hours
    default:         return km > 0 ? km * weightKg * 0.55 : 4.0 * weightKg * hours
  }
}

const SPORT_LABEL = {
  running: 'Running', cycling: 'Cycling', swimming: 'Swimming',
  strength: 'Strength', team: 'Team Sports', general: 'Other',
}

function toLocalDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

async function refreshToken(userId, refreshToken) {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Token refresh failed')
  await supabase.from('strava_tokens').update({
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    expires_at:    data.expires_at,
  }).eq('user_id', userId)
  return data.access_token
}

async function getValidToken(tokenRow) {
  const nowSec = Math.floor(Date.now() / 1000)
  if (tokenRow.expires_at > nowSec + 300) return tokenRow.access_token
  return await refreshToken(tokenRow.user_id, tokenRow.refresh_token)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await verifyUser(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  let body
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body }
  catch { return res.status(400).json({ error: 'Invalid JSON' }) }

  const { days = 30 } = body

  // Fetch token
  const { data: tokenRow, error: tokenError } = await supabase
    .from('strava_tokens').select('*').eq('user_id', userId).single()

  if (tokenError || !tokenRow) {
    return res.status(200).json({ connected: false })
  }

  let accessToken
  try { accessToken = await getValidToken(tokenRow) }
  catch { return res.status(200).json({ connected: false, tokenExpired: true }) }

  // Fetch user weight for calorie estimation fallback
  const { data: userSettings } = await supabase
    .from('user_settings').select('weight_kg').eq('user_id', userId).maybeSingle()
  const weightKg = userSettings?.weight_kg || 70

  // Date range
  const now      = new Date()
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1), 0, 0, 0)
  const afterSec = Math.floor(dayStart.getTime() / 1000)

  // Fetch from Strava (max 200 activities — enough for 30-90 days)
  let stravaActivities
  try {
    const r = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${afterSec}&per_page=200`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!r.ok) throw new Error(`Strava API ${r.status}`)
    stravaActivities = await r.json()
  } catch (err) {
    console.error('Strava fetch failed:', err)
    return res.status(200).json({ connected: true, byDate: {}, fetchError: true })
  }

  // Process into day buckets
  const byDate = {}
  const sportBreakdown = {}

  stravaActivities.forEach(a => {
    const sport        = SPORT_MAP[a.sport_type] || SPORT_MAP[a.type] || 'general'
    const correction   = CALORIE_CORRECTION[sport] || 0.90
    const movingSec    = a.moving_time || 0
    const stravaRaw    = Math.round(a.calories || 0)
    // Prefer Strava's calories (with sport correction); fall back to our own estimate.
    // When estimated, set rawCalories = calories so the CalorieAccuracy card stays quiet.
    const calories    = stravaRaw > 0
      ? Math.round(stravaRaw * correction)
      : Math.round(estimateCalories(sport, movingSec, a.distance, weightKg))
    const rawCalories = stravaRaw > 0 ? stravaRaw : calories

    // Use local date of activity start
    const actDate = toLocalDateStr(new Date(a.start_date_local || a.start_date))

    if (!byDate[actDate]) byDate[actDate] = { calories: 0, rawCalories: 0, movingTimeSec: 0, activities: [] }
    byDate[actDate].calories      += calories
    byDate[actDate].rawCalories   += rawCalories
    byDate[actDate].movingTimeSec += movingSec
    byDate[actDate].activities.push({
      id:           a.id,
      name:         a.name,
      sport_key:    sport,
      sport_label:  SPORT_LABEL[sport],
      calories,
      movingTimeSec: movingSec,
      distanceMiles: a.distance ? Math.round((a.distance / 1609.34) * 10) / 10 : null,
    })

    // Sport breakdown
    if (!sportBreakdown[sport]) sportBreakdown[sport] = { minutes: 0, calories: 0, label: SPORT_LABEL[sport] }
    sportBreakdown[sport].minutes  += Math.round(movingSec / 60)
    sportBreakdown[sport].calories += calories
  })

  // This week's totals (Mon–Sun)
  const todayStr  = toLocalDateStr(now)
  const dayOfWeek = now.getDay() // 0=Sun
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - ((dayOfWeek + 6) % 7)) // Monday
  const weekStartStr = toLocalDateStr(weekStart)

  let weekCalories = 0, weekRawCalories = 0, weekMovingSec = 0, weekActivityCount = 0
  Object.entries(byDate).forEach(([date, d]) => {
    if (date >= weekStartStr && date <= todayStr) {
      weekCalories      += d.calories
      weekRawCalories   += d.rawCalories || 0
      weekMovingSec     += d.movingTimeSec
      weekActivityCount += d.activities.length
    }
  })

  // Prior Mon–Sun week
  const priorWeekEnd   = new Date(weekStart)
  priorWeekEnd.setDate(weekStart.getDate() - 1)
  const priorWeekStart = new Date(weekStart)
  priorWeekStart.setDate(weekStart.getDate() - 7)
  const priorWeekStartStr = toLocalDateStr(priorWeekStart)
  const priorWeekEndStr   = toLocalDateStr(priorWeekEnd)

  let priorCalories = 0, priorMovingSec = 0, priorActivityCount = 0
  Object.entries(byDate).forEach(([date, d]) => {
    if (date >= priorWeekStartStr && date <= priorWeekEndStr) {
      priorCalories      += d.calories
      priorMovingSec     += d.movingTimeSec
      priorActivityCount += d.activities.length
    }
  })

  const trainingDays = Object.keys(byDate).sort()

  return res.status(200).json({
    connected: true,
    byDate,
    trainingDays,
    weeklyTotals: {
      calories:      weekCalories,
      rawCalories:   weekRawCalories,
      movingTimeSec: weekMovingSec,
      activityCount: weekActivityCount,
    },
    priorWeeklyTotals: {
      calories:      priorCalories,
      movingTimeSec: priorMovingSec,
      activityCount: priorActivityCount,
    },
    sportBreakdown,
    athleteName: tokenRow.athlete_name,
  })
}
