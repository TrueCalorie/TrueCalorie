// api/voice-log.js
// ─────────────────────────────────────────────────────────────────────────────
// Edge Runtime — zero cold start
//
// Two modes, one route family:
//   (default)      { transcript }           -> { foods }   parse-and-log
//   mode: 'ask'    { mode: 'ask', question } -> { answer }  fueling Q&A
//
// The parse mode is UNCHANGED (shipped build-49 binaries call it); ask is
// additive for the v2 Today screen.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'
import { verifyUser } from '../lib/verifyUser.js'
import { CORS_HEADERS } from '../lib/cors.js'

export const config = { runtime: 'edge' }

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

// UTC date string (YYYY-MM-DD) for the rate-limit reset window. Deliberately UTC and
// server-deterministic — this is an abuse cap, not user-facing day grouping, so the
// local-date helper used for meal logs does not apply here.
function utcDateStr() {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

export default async function handler(req) {
  // CORS preflight — Edge runtime has no res object, so we mirror lib/cors.js by hand.
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  if (String(req.method).toUpperCase() !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  // Verify JWT — reject spoofed or missing tokens
  const userId = await verifyUser(req)
  if (!userId) return json(401, { error: 'Unauthorized' })

  // Look up Pro status server-side — never trust the client. Both modes are
  // cost-bearing (Claude), so a non-Pro caller must be rejected here,
  // not just in the UI. Deny on uncertainty.
  let isPro = false
  try {
    const { data } = await supabaseAdmin
      .from('user_settings')
      .select('is_pro')
      .eq('user_id', userId)
      .maybeSingle()
    isPro = !!(data?.is_pro)
  } catch {
    isPro = false
  }

  if (!isPro) {
    return json(403, { error: 'Pro subscription required' })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'Invalid JSON' })
  }

  const isAsk = body?.mode === 'ask'
  const rateLimitEndpoint = isAsk ? 'ask' : 'voice-log'

  // Per-user daily cap — guards against runaway loops and abuse driving API
  // cost. SELECT then UPDATE/INSERT (Supabase upsert cannot atomically increment).
  // If the rate-limit DB ops fail for any reason, log and continue: never block a
  // paying user on a rate-limit failure.
  const today = utcDateStr()
  try {
    const { data: rl } = await supabaseAdmin
      .from('api_rate_limits')
      .select('call_count')
      .eq('user_id', userId)
      .eq('date', today)
      .eq('endpoint', rateLimitEndpoint)
      .maybeSingle()

    const current = rl?.call_count || 0
    if (current >= 25) {
      return json(429, { error: isAsk ? 'Daily ask limit reached' : 'Daily voice log limit reached' })
    }

    if (rl) {
      await supabaseAdmin
        .from('api_rate_limits')
        .update({ call_count: current + 1 })
        .eq('user_id', userId)
        .eq('date', today)
        .eq('endpoint', rateLimitEndpoint)
    } else {
      await supabaseAdmin
        .from('api_rate_limits')
        .insert({ user_id: userId, date: today, endpoint: rateLimitEndpoint, call_count: 1 })
    }
  } catch (err) {
    console.error(`[voice-log] rate limit check failed:`, err)
  }

  // ── Ask mode ───────────────────────────────────────────────────────────────
  if (isAsk) {
    const question = body?.question
    if (!question || typeof question !== 'string' || !question.trim()) {
      return json(400, { error: 'question is required' })
    }
    try {
      const answer = await answerWithClaude(userId, question.trim())
      return json(200, { answer })
    } catch (err) {
      console.error('[voice-log] ask error:', err)
      return json(500, { error: 'Failed to answer' })
    }
  }

  // ── Parse mode (unchanged) ────────────────────────────────────────────────
  const transcript = body?.transcript
  if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
    return json(400, { error: 'transcript is required' })
  }

  try {
    const foods = await parseWithClaude(transcript)
    return json(200, { foods })
  } catch (err) {
    console.error('[voice-log] NLP error:', err)
    return json(500, { error: 'Failed to parse meal' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ASK: fueling Q&A grounded in the user's profile and today's brief
// ─────────────────────────────────────────────────────────────────────────────
async function answerWithClaude(userId, question) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')

  // Context: settings (sport, targets), fuel profile, the latest brief (24h).
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const [settingsRes, profileRes, briefRes] = await Promise.all([
    supabaseAdmin.from('user_settings')
      .select('sport, calorie_goal, protein_goal, carbs_goal, weight_kg, goal')
      .eq('user_id', userId).maybeSingle(),
    supabaseAdmin.from('fuel_profiles')
      .select('dining_situation').eq('user_id', userId).maybeSingle(),
    supabaseAdmin.from('fuel_briefs')
      .select('kind, body, macros, window_ends_at')
      .eq('user_id', userId).gte('created_at', since)
      .order('created_at', { ascending: false }).limit(1),
  ])

  const s = settingsRes?.data || {}
  const dining = profileRes?.data?.dining_situation || 'unknown'
  const brief = briefRes?.data?.[0] || null

  const systemPrompt = `You are the fueling coach inside TrueCalorie, answering a quick question from a competitive athlete.

Voice rules (non-negotiable):
- Direct, informal, human. Second person. No AI-sounding language.
- NEVER use an em dash or en dash. Periods and commas only.
- Answer in food terms first, numbers second. 1 to 3 short sentences. No lists, no headers, no emoji.
- If the question is outside fueling and training nutrition (medical, injuries, medication, disordered eating), say it's outside what you cover and point them to a professional, in one sentence, warmly.

Athlete context:
- Sport: ${s.sport || 'not set'}
- Daily targets: about ${s.calorie_goal || 'unknown'} kcal, ${s.protein_goal || '?'}g protein, ${s.carbs_goal || '?'}g carbs
- Goal: ${s.goal || 'not set'}
- Food access: ${dining}
- Latest brief${brief ? ` (${brief.kind})` : ''}: ${brief ? brief.body : 'none today'}`

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
      system:      systemPrompt,
      messages:    [{ role: 'user', content: question }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const text = data?.content?.[0]?.text || ''
  // Belt and braces on the no-dashes rule
  return text.replace(/\s*[—–]\s*/g, ', ').trim()
}

// ─────────────────────────────────────────────────────────────────────────────
// CLAUDE PARSER
// ─────────────────────────────────────────────────────────────────────────────
async function parseWithClaude(transcript) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')

  const systemPrompt = `You are a precise nutrition data parser for an athlete calorie tracking app.

Given a natural language description of food, return a JSON array of food items with accurate nutrition data.

## Reference table — use EXACT values for these common athlete foods:
- Large egg (1): 78 cal, 6g protein, 0g carbs, 5g fat
- Banana (1 medium): 105 cal, 1g protein, 27g carbs, 0g fat
- Chicken breast (1 medium, 174g, grilled): 287 cal, 54g protein, 0g carbs, 6g fat
- Oatmeal (1 cup cooked): 166 cal, 6g protein, 32g carbs, 4g fat
- White rice (1 cup cooked): 206 cal, 4g protein, 45g carbs, 0g fat
- Brown rice (1 cup cooked): 216 cal, 5g protein, 45g carbs, 2g fat
- Whole milk (1 cup): 149 cal, 8g protein, 12g carbs, 8g fat
- 2% milk (1 cup): 122 cal, 8g protein, 12g carbs, 5g fat
- Greek yogurt, plain, full fat (1 cup): 220 cal, 20g protein, 8g carbs, 11g fat
- Peanut butter (2 tbsp): 188 cal, 8g protein, 7g carbs, 16g fat
- Almond butter (2 tbsp): 196 cal, 7g protein, 6g carbs, 18g fat
- White bread (1 slice): 79 cal, 3g protein, 15g carbs, 1g fat
- Whole wheat bread (1 slice): 81 cal, 4g protein, 14g carbs, 1g fat
- Salmon (3 oz, cooked): 175 cal, 19g protein, 0g carbs, 11g fat
- Tuna (1 can, 5 oz, in water): 109 cal, 25g protein, 0g carbs, 1g fat
- Ground beef 80/20 (4 oz, cooked): 287 cal, 20g protein, 0g carbs, 23g fat
- Sweet potato (1 medium, baked): 103 cal, 2g protein, 24g carbs, 0g fat
- Broccoli (1 cup, cooked): 55 cal, 4g protein, 11g carbs, 1g fat
- Apple (1 medium): 95 cal, 0g protein, 25g carbs, 0g fat
- Orange (1 medium): 62 cal, 1g protein, 15g carbs, 0g fat
- Almonds (1 oz, ~23 nuts): 164 cal, 6g protein, 6g carbs, 14g fat
- Protein shake (1 scoop whey, water): 120 cal, 25g protein, 3g carbs, 2g fat
- Cottage cheese (1 cup, 2%): 206 cal, 28g protein, 8g carbs, 5g fat
- Cheddar cheese (1 oz): 114 cal, 7g protein, 0g carbs, 9g fat
- Pasta (1 cup cooked): 220 cal, 8g protein, 43g carbs, 1g fat
- Black beans (1 cup cooked): 227 cal, 15g protein, 41g carbs, 1g fat
- Olive oil (1 tbsp): 119 cal, 0g protein, 0g carbs, 14g fat
- Butter (1 tbsp): 102 cal, 0g protein, 0g carbs, 12g fat
- Coffee, black (8 oz): 2 cal, 0g protein, 0g carbs, 0g fat
- Orange juice (8 oz): 112 cal, 2g protein, 26g carbs, 0g fat

## Rules:
- Use the reference table values exactly when the food matches.
- For foods not in the reference table, use accurate nutritional estimates.
- Parse quantities from the text (e.g. "2 eggs" = serving_qty: 2, serving_unit: "large eggs").
- If no quantity is mentioned, use the standard single serving from the reference table above.
- Round all macro values to the nearest whole number.
- Return ONLY valid JSON — no markdown, no explanation, no extra text.
- food_name should be lowercase and readable (e.g. "scrambled eggs", not "EGGS, SCRAMBLED").
- brand_name is null for generic foods.
- ALWAYS fill in nf_calories, nf_protein, nf_total_carbohydrate, and nf_total_fat with your best numeric estimate, EVEN when you also include a clarifying_question. Never return 0 calories for a food that actually contains calories. When a clarifying question would change the numbers, compute them now using the single most likely default (e.g. assume grilled for "chicken", 2% for "milk", medium portion for "a bowl of rice"); the user's answer refines those numbers afterward. The card must always show a real calorie estimate before the user touches anything.

## Clarifying questions:
- If preparation method significantly changes the calories (e.g. fried vs grilled chicken = 100+ cal difference), ask about it.
- If the portion is genuinely ambiguous with no quantity mentioned (e.g. "some pasta", "a bowl of rice"), ask about it.
- If the food type is ambiguous and matters nutritionally (e.g. "milk" could be whole/2%/skim), ask about it.
- Do NOT ask about foods that are already clear (e.g. "2 scrambled eggs", "banana", "apple").
- Do NOT ask more than one question per food item.
- clarifying_question is null and clarifying_options is [] when no question is needed.
- clarifying_options must be 2 to 4 CONCRETE, directly selectable answers (e.g. ["whole", "2%", "skim"] or ["grilled", "fried", "baked"]). NEVER include a catch-all or non-answer option such as "other", "something else", "not sure", "please elaborate", "none of these", or "n/a" — the app already provides its own "Other" free-text box and a "Skip" button, so those would be dead-end choices the user cannot fill in.

Return this exact structure:
{
  "foods": [
    {
      "food_name": "chicken breast",
      "brand_name": null,
      "nf_calories": 287,
      "nf_protein": 54,
      "nf_total_carbohydrate": 0,
      "nf_total_fat": 6,
      "serving_qty": 1,
      "serving_unit": "medium breast (174g)",
      "clarifying_question": null,
      "clarifying_options": []
    }
  ]
}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:       'claude-haiku-4-5-20251001',
      max_tokens:  1024,
      temperature: 0,
      system:      systemPrompt,
      messages:    [{ role: 'user', content: transcript }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error ${response.status}: ${err}`)
  }

  const data  = await response.json()
  const text  = data?.content?.[0]?.text || ''
  const clean = text.replace(/```json|```/g, '').trim()

  let parsed
  try { parsed = JSON.parse(clean) }
  catch { throw new Error(`Failed to parse Claude response as JSON: ${clean}`) }

  const foods = parsed?.foods
  if (!Array.isArray(foods)) throw new Error('Unexpected response shape from Claude')

  return foods
}
