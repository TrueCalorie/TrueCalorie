// lib/composeBrief.js
// The brief composer. Internal module, deliberately NOT an api/ route (every
// api/ file is a public URL on Vercel; this must only be callable by the
// Strava webhook and the morning cron).
//
// Inputs: the activity (postrun) or the morning context, the user's
// profile/settings, and recent check-ins. Targets come from the existing
// targets engine (src/macros.js — pure JS, consumed, not rewritten). Claude
// writes the brief body under the v2 copy rules; a deterministic template is
// the fallback so composition never fails on an API error. The row lands in
// fuel_briefs, delivery goes through lib/notify.js.

import { createClient } from '@supabase/supabase-js'
import { PostHog } from 'posthog-node'
import { reportError } from './sentry.js'
import { calculateGoalsPro } from '../src/macros.js'
import { deliverBrief } from './notify.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

// Same mapping as api/strava-activities.js (kept verbatim; consolidation of
// the Strava helpers is on the merge checklist).
const SPORT_MAP = {
  Run: 'running', TrailRun: 'running', VirtualRun: 'running',
  Ride: 'cycling', VirtualRide: 'cycling', MountainBike: 'cycling',
  Swim: 'swimming',
  WeightTraining: 'strength', Workout: 'strength', CrossFit: 'strength',
  Soccer: 'team', Basketball: 'team', Football: 'team',
  Lacrosse: 'team', Hockey: 'team', Baseball: 'team', Volleyball: 'team',
  Tennis: 'general', Golf: 'general', Hike: 'general', Walk: 'general', Yoga: 'general',
}

const DINING_LABEL = {
  dining_hall: 'college dining hall',
  apartment:   'own kitchen (apartment)',
  mixed:       'mix of dining hall and own kitchen',
}

// ── Recovery window targets (food-real numbers) ────────────────────────────
// Standard sports-nutrition ranges: ~1.0-1.2 g/kg carbs and ~0.3-0.4 g/kg
// protein in the first hour after substantial work. Scaled down for short
// sessions, rounded to 5 g so the order reads like food, not homework.
function recoveryTargets(weightKg, movingMin) {
  const carbFactor = movingMin >= 90 ? 1.2 : movingMin >= 45 ? 1.0 : 0.7
  const round5 = n => Math.max(5, Math.round(n / 5) * 5)
  return {
    carbs_g:   round5(Math.min(weightKg * carbFactor, 140)),
    protein_g: round5(Math.min(Math.max(weightKg * 0.35, 20), 45)),
  }
}

function stripEmDashes(text) {
  return String(text || '').replace(/\s*[—–]\s*/g, ', ').trim()
}

async function loadUserContext(userId) {
  const [settingsRes, profileRes, checkinsRes] = await Promise.all([
    supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('fuel_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('fuel_checkins').select('date, response')
      .eq('user_id', userId).order('date', { ascending: false }).limit(7),
  ])
  return {
    settings: settingsRes.data || null,
    profile:  profileRes.data || null,
    checkins: checkinsRes.data || [],
  }
}

// ── Claude copywriter ───────────────────────────────────────────────────────
const VOICE_RULES = `You write fuel briefs for TrueCalorie, a fueling coach for competitive athletes.

Voice rules (non-negotiable):
- Direct, informal, human. Second person. No AI-sounding language.
- NEVER use an em dash or en dash anywhere. Use periods and commas instead.
- Orders in food, not macro homework. Say "real breakfast" and "carb heavy lunch", not "consume 120g of carbohydrates".
- 2 to 4 short sentences. No greetings, no sign-offs, no emoji, no headers.
- Never shame. The product protects athletes from under-fueling. Warn like a coach who cares, not an app that scolds.

Register examples (match this exactly):
"Hard day. Tempo at 4:30. Eat like it: real breakfast now, carb heavy lunch, snack by 2:30."
"8.0 mi tempo logged. Window's open: about 80g carbs and 25g protein in the next hour."
"Tonight: dinner around 950 kcal. Tomorrow is easy, so tonight does the repair work."

Return ONLY the brief text. No quotes, no markdown, no explanation.`

async function writeBody(userPrompt) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:       'claude-haiku-4-5-20251001',
      max_tokens:  300,
      temperature: 0.7,
      system:      VOICE_RULES,
      messages:    [{ role: 'user', content: userPrompt }],
    }),
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error ${response.status}: ${err}`)
  }
  const data = await response.json()
  return stripEmDashes(data?.content?.[0]?.text)
}

function checkinSummary(checkins) {
  if (!checkins.length) return 'No check-in history yet.'
  return 'Last check-ins (newest first): ' +
    checkins.map(c => `${c.date}: ${c.response}`).join(', ')
}

async function captureServer(userId, event, properties) {
  try {
    const ph = new PostHog(process.env.POSTHOG_KEY, { host: 'https://us.i.posthog.com', flushAt: 1, flushInterval: 0 })
    ph.capture({ distinctId: userId, event, properties })
    await ph.shutdown()
  } catch {}
}

async function insertAndDeliver(row, userId) {
  const { data: brief, error } = await supabase
    .from('fuel_briefs')
    .insert(row)
    .select()
    .single()

  if (error) {
    // 23505 = unique violation on fuel_briefs_activity_uniq: webhook retry,
    // brief already exists. Not an error.
    if (error.code === '23505') return { deduped: true }
    throw error
  }

  await deliverBrief(userId, brief)
  await captureServer(userId, 'brief_delivered', { kind: brief.kind })
  return { brief }
}

// ── Post-run brief ──────────────────────────────────────────────────────────
// activity: the detailed Strava activity (GET /activities/{id} response).
export async function composePostrunBrief({ userId, activity }) {
  const { settings, profile, checkins } = await loadUserContext(userId)
  if (!settings) throw new Error(`No user_settings for ${userId}`)

  const sport     = SPORT_MAP[activity.sport_type] || SPORT_MAP[activity.type] || 'general'
  const movingMin = Math.round((activity.moving_time || 0) / 60)
  const miles     = activity.distance ? Math.round((activity.distance / 1609.34) * 10) / 10 : null
  const weightKg  = settings.weight_kg || 70

  const { carbs_g, protein_g } = recoveryTargets(weightKg, movingMin)
  const goals        = calculateGoalsPro(settings)
  const windowEndsAt = new Date(Date.now() + 60 * 60 * 1000)

  const userPrompt = `Write a post-workout recovery brief. The athlete's workout just synced from Strava.

Workout: ${activity.name || 'workout'} (${sport}), ${movingMin} min moving${miles ? `, ${miles} mi` : ''}${activity.average_heartrate ? `, avg HR ${Math.round(activity.average_heartrate)}` : ''}.
Recovery window order: about ${carbs_g}g carbs and ${protein_g}g protein in the next hour. State this order, in food terms.
Daily calorie target: about ${goals.calorie_goal} kcal.
Food access: ${DINING_LABEL[profile?.dining_situation] || 'unknown'}.
${checkinSummary(checkins)}`

  let body
  try {
    body = await writeBody(userPrompt)
  } catch (err) {
    await reportError(err, { tags: { module: 'compose-brief' }, extra: { kind: 'postrun', userId } })
    body = `${miles ? `${miles} mi` : `${movingMin} min`} ${sport} logged. Window's open: about ${carbs_g}g carbs and ${protein_g}g protein in the next hour.`
  }

  return insertAndDeliver({
    user_id:            userId,
    kind:               'postrun',
    strava_activity_id: activity.id,
    body,
    macros:             { carbs_g, protein_g, window_min: 60 },
    window_ends_at:     windowEndsAt.toISOString(),
  }, userId)
}

// ── Morning brief ───────────────────────────────────────────────────────────
// context: { classification: 'hard' | 'easy' | 'rest', weekdayAvgMin,
//            yesterdayMin } from the morning cron's v0 heuristic.
export async function composeMorningBrief({ userId, context }) {
  const { settings, profile, checkins } = await loadUserContext(userId)
  if (!settings) throw new Error(`No user_settings for ${userId}`)

  const goals = calculateGoalsPro(settings)

  const userPrompt = `Write a morning fuel brief for a hard training day. It should tell the athlete how to eat BEFORE the work.

Today looks hard: this weekday averages ${context.weekdayAvgMin} min of training over the last 4 weeks${context.yesterdayMin ? `, and yesterday was ${context.yesterdayMin} min` : ''}.
Sport: ${settings.sport || 'endurance'}.
Daily target: about ${goals.calorie_goal} kcal, roughly ${goals.carbs_goal}g carbs and ${goals.protein_goal}g protein.
Food access: ${DINING_LABEL[profile?.dining_situation] || 'unknown'}.
${checkinSummary(checkins)}
Order the day in food terms: real breakfast, carb heavy lunch, timed snack. Do not mention the weekday average or the data source.`

  let body
  try {
    body = await writeBody(userPrompt)
  } catch (err) {
    await reportError(err, { tags: { module: 'compose-brief' }, extra: { kind: 'morning', userId } })
    body = 'Hard day ahead. Eat like it: real breakfast now, carb heavy lunch, snack two hours before the work.'
  }

  return insertAndDeliver({
    user_id: userId,
    kind:    'morning',
    body,
    macros:  { kcal: goals.calorie_goal, carbs_g: goals.carbs_goal, protein_g: goals.protein_goal },
  }, userId)
}
