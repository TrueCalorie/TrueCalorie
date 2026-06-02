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

  let transcript, isTrialing
  try {
    const body = await req.json()
    transcript = body?.transcript
    isTrialing = body?.isTrialing ?? false
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
    const hasNutritionixKeys = !!(
      process.env.NUTRITIONIX_APP_ID && process.env.NUTRITIONIX_APP_KEY
    )
    console.log(`[voice-log] Using ${isTrialing ? 'Claude Haiku (trial)' : 'Nutritionix (paid)'}`)
    const foods = (!isTrialing && hasNutritionixKeys)
      ? await parseWithNutritionix(transcript)
      : await parseWithClaude(transcript)

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
// NUTRITIONIX NLP PARSER
// Uses Nutritionix's natural language endpoint — purpose-built for food phrases.
// More accurate than Claude for food quantities and restaurant items.
// Falls back to Claude automatically if keys not set.
// ─────────────────────────────────────────────────────────────────────────────
async function parseWithNutritionix(transcript) {
  const APP_ID  = process.env.NUTRITIONIX_APP_ID
  const APP_KEY = process.env.NUTRITIONIX_APP_KEY

  if (!APP_ID || !APP_KEY) throw new Error('Nutritionix keys not configured')

  const res = await fetch('https://trackapi.nutritionix.com/v2/natural/nutrients', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'x-app-id':      APP_ID,
      'x-app-key':     APP_KEY,
      'x-remote-user-id': '0', // required by Nutritionix — 0 = anonymous
    },
    body: JSON.stringify({ query: transcript }),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('[voice-log] Nutritionix NLP error:', res.status, errText)
    // Fall back to Claude on Nutritionix failure
    return parseWithClaude(transcript)
  }

  const data = await res.json()
  const foods = (data.foods || []).map(item => ({
    food_name:             item.food_name,
    brand_name:            item.brand_name || null,
    nf_calories:           Math.round(item.nf_calories           || 0),
    nf_protein:            Math.round(item.nf_protein            || 0),
    nf_total_carbohydrate: Math.round(item.nf_total_carbohydrate || 0),
    nf_total_fat:          Math.round(item.nf_total_fat          || 0),
    serving_qty:           item.serving_qty  || 1,
    serving_unit:          item.serving_unit || 'serving',
    // Nutritionix handles its own disambiguation — no clarifying questions needed
    clarifying_question: null,
    clarifying_options:  [],
  }))

  if (!foods.length) {
    // Nutritionix returned nothing — fall back to Claude
    return parseWithClaude(transcript)
  }

  return foods
}

// ─────────────────────────────────────────────────────────────────────────────
// CLAUDE PARSER (fallback)
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

## Clarifying questions:
- If preparation method significantly changes the calories (e.g. fried vs grilled chicken = 100+ cal difference), ask about it.
- If the portion is genuinely ambiguous with no quantity mentioned (e.g. "some pasta", "a bowl of rice"), ask about it.
- If the food type is ambiguous and matters nutritionally (e.g. "milk" could be whole/2%/skim), ask about it.
- Do NOT ask about foods that are already clear (e.g. "2 scrambled eggs", "banana", "apple").
- Do NOT ask more than one question per food item.
- clarifying_question is null and clarifying_options is [] when no question is needed.

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
