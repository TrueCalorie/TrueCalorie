// api/voice-log.js
// ─────────────────────────────────────────────────────────────────────────────
// Edge Runtime — zero cold start
// ─────────────────────────────────────────────────────────────────────────────

export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    })
  }

  let transcript
  try {
    const body = await req.json()
    transcript = body?.transcript
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
    return new Response(JSON.stringify({ error: 'transcript is required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // ── SWAP POINT ────────────────────────────────────────────────────────
    // When Nutritionix keys arrive, replace with:
    //   const foods = await parseWithNutritionix(transcript)
    // ─────────────────────────────────────────────────────────────────────
    const foods = await parseWithClaude(transcript)

    return new Response(JSON.stringify({ foods }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[voice-log] NLP error:', err)
    return new Response(JSON.stringify({ error: 'Failed to parse meal' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLAUDE PARSER
// ─────────────────────────────────────────────────────────────────────────────
async function parseWithClaude(transcript) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')

  const systemPrompt = `You are a precise nutrition data parser for an athlete calorie tracking app.

Given a natural language description of food, return a JSON array of food items with accurate nutrition data.

Rules:
- Use standard USDA nutrition values for generic foods
- Use realistic restaurant/branded values for named brands (e.g. "Chipotle chicken bowl")
- Parse quantities from the text (e.g. "2 eggs" = serving_qty: 2, serving_unit: "large eggs")
- If no quantity is mentioned, use the standard single serving as a best guess
- Round all macro values to the nearest whole number
- Return ONLY valid JSON — no markdown, no explanation, no extra text
- food_name should be lowercase and readable (e.g. "scrambled eggs", not "EGGS, SCRAMBLED")
- brand_name is null for generic foods

Clarifying questions:
- If preparation method significantly changes the calories (e.g. fried vs grilled chicken = 100+ cal difference), ask about it
- If the portion is genuinely ambiguous with no quantity mentioned (e.g. "some pasta", "a bowl of rice"), ask about it
- If the food type is ambiguous and matters nutritionally (e.g. "milk" could be whole/2%/skim), ask about it
- Do NOT ask about foods that are already clear (e.g. "2 scrambled eggs", "banana", "apple")
- Do NOT ask more than one question per food item
- clarifying_question is null and clarifying_options is [] when no question is needed

Return this exact structure:
{
  "foods": [
    {
      "food_name": "chicken breast",
      "brand_name": null,
      "nf_calories": 165,
      "nf_protein": 31,
      "nf_total_carbohydrate": 0,
      "nf_total_fat": 4,
      "serving_qty": 1,
      "serving_unit": "medium breast (170g)",
      "clarifying_question": "How was it prepared?",
      "clarifying_options": ["Grilled", "Baked", "Fried", "Rotisserie"]
    },
    {
      "food_name": "scrambled eggs",
      "brand_name": null,
      "nf_calories": 182,
      "nf_protein": 13,
      "nf_total_carbohydrate": 2,
      "nf_total_fat": 14,
      "serving_qty": 2,
      "serving_unit": "large eggs",
      "clarifying_question": null,
      "clarifying_options": []
    }
  ]
}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: transcript }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const text = data?.content?.[0]?.text?.trim()
  if (!text) throw new Error('Empty response from Claude')

  const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
  const parsed = JSON.parse(clean)
  if (!Array.isArray(parsed.foods)) throw new Error('Invalid response shape')

  return parsed.foods.map(f => ({
    food_name:             String(f.food_name || 'Unknown food'),
    brand_name:            f.brand_name || null,
    nf_calories:           Number(f.nf_calories)             || 0,
    nf_protein:            Number(f.nf_protein)              || 0,
    nf_total_carbohydrate: Number(f.nf_total_carbohydrate)   || 0,
    nf_total_fat:          Number(f.nf_total_fat)            || 0,
    serving_qty:           Number(f.serving_qty)             || 1,
    serving_unit:          String(f.serving_unit             || 'serving'),
    clarifying_question:   f.clarifying_question             || null,
    clarifying_options:    Array.isArray(f.clarifying_options) ? f.clarifying_options : [],
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// NUTRITIONIX PARSER — swap in when keys arrive from Molly (~June 2)
// ─────────────────────────────────────────────────────────────────────────────
// async function parseWithNutritionix(transcript) {
//   const APP_ID  = process.env.NUTRITIONIX_APP_ID
//   const API_KEY = process.env.NUTRITIONIX_API_KEY
//   if (!APP_ID || !API_KEY) throw new Error('Nutritionix keys not set')
//
//   const response = await fetch('https://trackapi.nutritionix.com/v2/natural/nutrients', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       'x-app-id':  APP_ID,
//       'x-app-key': API_KEY,
//     },
//     body: JSON.stringify({ query: transcript }),
//   })
//
//   if (!response.ok) throw new Error(`Nutritionix error ${response.status}`)
//   const data = await response.json()
//
//   return (data.foods || []).map(f => ({
//     food_name:             f.food_name,
//     brand_name:            f.brand_name_item || f.brand_name || null,
//     nf_calories:           f.nf_calories             || 0,
//     nf_protein:            f.nf_protein              || 0,
//     nf_total_carbohydrate: f.nf_total_carbohydrate   || 0,
//     nf_total_fat:          f.nf_total_fat            || 0,
//     serving_qty:           f.serving_qty             || 1,
//     serving_unit:          f.serving_unit            || 'serving',
//     clarifying_question:   null,
//     clarifying_options:    [],
//   }))
// }
