// api/strava-activities.js
// Fetches the authenticated user's Strava activities.
// Handles token refresh automatically.
// Returns structured activity data ready for display + macro adjustment.
//
// POST { userId, date? }
// Returns { activities, totalCalories, totalMovingTimeSec, connected }

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

// ─── Strava sport type → TrueCalorie sport key ─────────────────────────────
const SPORT_MAP = {
  Run:          'running',
  TrailRun:     'running',
  VirtualRun:   'running',
  Ride:         'cycling',
  VirtualRide:  'cycling',
  MountainBike: 'cycling',
  Swim:         'swimming',
  WeightTraining: 'strength',
  Workout:      'strength',
  CrossFit:     'strength',
  Soccer:       'team',
  Basketball:   'team',
  Football:     'team',
  Lacrosse:     'team',
  Hockey:       'team',
  Baseball:     'team',
  Volleyball:   'team',
  Tennis:       'general',
  Golf:         'general',
  Hike:         'general',
  Walk:         'general',
  Yoga:         'general',
}

// ─── Calorie accuracy adjustment by sport ──────────────────────────────────
// Strava's estimates are systematically biased. We apply correction factors.
const CALORIE_CORRECTION = {
  running:  0.95,  // Strava running is fairly accurate, slight overestimate
  cycling:  0.82,  // Cycling is notoriously overestimated (power meter vs HR estimate)
  swimming: 1.00,  // Swimming estimates vary too much to correct reliably
  strength: 0.88,  // HR-based strength estimates skew high
  team:     0.92,
  general:  0.90,
}

// ─── Token refresh ──────────────────────────────────────────────────────────
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

  // Update stored tokens
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

// ─── Local date helper (mirrors strava-training.js) ───────────────────────
function toLocalDateStr(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

// ─── Get valid access token (refresh if expired) ───────────────────────────
async function getValidToken(tokenRow) {
  const nowSec = Math.floor(Date.now() / 1000)
  // Refresh 5 minutes before expiry
  if (tokenRow.expires_at > nowSec + 300) {
    return tokenRow.access_token
  }
  return await refreshToken(tokenRow.user_id, tokenRow.refresh_token)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  const { userId, date } = body
  if (!userId) return res.status(400).json({ error: 'userId required' })

  // Fetch stored tokens
  const { data: tokenRow, error: tokenError } = await supabase
    .from('strava_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (tokenError || !tokenRow) {
    return res.status(200).json({ connected: false, activities: [], totalCalories: 0 })
  }

  // Get a valid (possibly refreshed) token
  let accessToken
  try {
    accessToken = await getValidToken(tokenRow)
  } catch (err) {
    console.error('Token refresh failed:', err)
    return res.status(200).json({ connected: false, activities: [], totalCalories: 0, tokenExpired: true })
  }

  // Use the client's local date string (YYYY-MM-DD) to avoid the UTC midnight
  // boundary bug. Fall back to server UTC date only if the client didn't send one.
  const targetDateStr = date || toLocalDateStr(new Date())

  // Fetch a wide 48-hour window (no tight UTC day boundary) and filter by local date.
  const afterSec = Math.floor((Date.now() - 48 * 60 * 60 * 1000) / 1000)

  let stravaActivities
  try {
    const activitiesRes = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${afterSec}&per_page=30`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!activitiesRes.ok) {
      throw new Error(`Strava API ${activitiesRes.status}`)
    }
    stravaActivities = await activitiesRes.json()
  } catch (err) {
    console.error('Strava activities fetch failed:', err)
    return res.status(200).json({ connected: true, activities: [], totalCalories: 0, fetchError: true })
  }

  // Keep only activities whose local start date matches the requested date
  const todayActivities = stravaActivities.filter(a =>
    toLocalDateStr(new Date(a.start_date_local || a.start_date)) === targetDateStr
  )

  // Process and structure each activity
  const activities = todayActivities.map(a => {
    const sport          = SPORT_MAP[a.sport_type] || SPORT_MAP[a.type] || 'general'
    const correction     = CALORIE_CORRECTION[sport] || 0.90
    const rawCalories    = a.calories || 0
    const adjustedCalories = Math.round(rawCalories * correction)
    const wasAdjusted    = sport === 'cycling' // Flag only the most egregious offender

    return {
      id:               a.id,
      name:             a.name,
      sport_type:       a.sport_type || a.type,
      sport_key:        sport,
      start_date:       a.start_date_local,
      moving_time_sec:  a.moving_time,
      elapsed_time_sec: a.elapsed_time,
      distance_meters:  a.distance,
      // Distance in human units
      distance_miles:   a.distance ? Math.round((a.distance / 1609.34) * 100) / 100 : null,
      distance_km:      a.distance ? Math.round((a.distance / 1000) * 100) / 100 : null,
      // Calories
      calories_raw:     rawCalories,
      calories:         adjustedCalories,
      calories_adjusted: wasAdjusted,
      // Speed/pace
      average_speed:    a.average_speed,
      average_heartrate: a.average_heartrate || null,
      max_heartrate:    a.max_heartrate || null,
      // Elevation
      total_elevation_gain: a.total_elevation_gain || 0,
      // Kudos/social
      kudos_count:      a.kudos_count || 0,
      // Strava URL
      strava_url:       `https://www.strava.com/activities/${a.id}`,
    }
  })

  const totalCalories      = activities.reduce((s, a) => s + a.calories, 0)
  const totalMovingTimeSec = activities.reduce((s, a) => s + a.moving_time_sec, 0)
  const hasCycling         = activities.some(a => a.sport_key === 'cycling')

  return res.status(200).json({
    connected:        true,
    athlete_name:     tokenRow.athlete_name,
    activities,
    totalCalories,
    totalMovingTimeSec,
    // Transparency note — tell UI when we've adjusted cycling estimates
    cyclingAdjustmentApplied: hasCycling,
  })
}
