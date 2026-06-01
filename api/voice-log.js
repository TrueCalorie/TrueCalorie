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

## REFERENCE TABLE — use EXACT values for these foods, scale proportionally for different sizes:
FOOD | SERVING | CAL | PROTEIN(g) | CARBS(g) | FAT(g)
chicken breast grilled | 1 medium (174g) | 287 | 54 | 0 | 6
chicken breast grilled | 100g | 165 | 31 | 0 | 3.6
chicken thigh grilled | 1 thigh (109g) | 207 | 21 | 0 | 13
ground beef 80/20 cooked | 100g | 215 | 26 | 0 | 13
ground beef 80/20 cooked | 3oz (85g) | 183 | 22 | 0 | 11
salmon cooked | 100g | 208 | 20 | 0 | 13
salmon cooked | 1 fillet (178g) | 370 | 36 | 0 | 23
tuna canned in water | 1 can (142g) | 165 | 36 | 0 | 1
shrimp cooked | 100g | 99 | 24 | 0 | 1
eggs scrambled | 1 large egg | 91 | 6 | 1 | 7
eggs hard boiled | 1 large egg | 72 | 6 | 0 | 5
egg whites | 1 large white (33g) | 17 | 4 | 0 | 0
white rice cooked | 1 cup (186g) | 242 | 4 | 53 | 0
brown rice cooked | 1 cup (202g) | 216 | 5 | 45 | 2
pasta cooked | 1 cup (140g) | 221 | 8 | 43 | 1
oats dry | 1 cup (81g) | 307 | 11 | 55 | 5
oatmeal cooked | 1 cup (234g) | 158 | 5 | 27 | 3
bread white | 1 slice (25g) | 66 | 2 | 13 | 1
bread whole wheat | 1 slice (28g) | 69 | 4 | 12 | 1
sweet potato baked | 1 medium (130g) | 112 | 2 | 26 | 0
banana | 1 medium (118g) | 105 | 1 | 27 | 0
apple | 1 medium (182g) | 95 | 0 | 25 | 0
avocado | half (75g) | 120 | 2 | 6 | 11
broccoli cooked | 1 cup (91g) | 31 | 3 | 6 | 0
black beans cooked | 1 cup (172g) | 227 | 15 | 41 | 1
whole milk | 1 cup (244ml) | 149 | 8 | 12 | 8
2% milk | 1 cup (244ml) | 122 | 8 | 12 | 5
greek yogurt plain 2% | 1 cup (227g) | 150 | 20 | 9 | 4
greek yogurt plain 0% | 1 cup (227g) | 130 | 22 | 9 | 0
cheddar cheese | 1 oz (28g) | 113 | 7 | 0 | 9
peanut butter | 2 tbsp (32g) | 188 | 8 | 6 | 16
almonds | 1 oz (28g) | 162 | 6 | 6 | 14
protein shake whey | 1 scoop (30g) | 120 | 24 | 3 | 2
olive oil | 1 tbsp (14g) | 124 | 0 | 0 | 14
orange juice | 1 cup (248ml) | 112 | 2 | 26 | 0

## Rules:
- For any food in the reference table: use EXACTLY those calorie and macro values. Scale proportionally for different quantities (e.g. 2 chicken breasts = 2x the values).
- For foods NOT in the table: use standard USDA values. Be consistent — the same food description must always return the same values.
- For named restaurant/branded items (e.g. "Chipotle chicken bowl", "McDonald's Big Mac"): use that chain's published nutrition data.
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
      "clarifying_question": "How was it prepared?",
      "clarifying_options": ["Grilled", "Baked", "Fried", "Rotisserie"]
    },
    {
      "food_name": "scrambled eggs",
      "brand_name": null,
      "nf_calories": 182,
      "nf_protein": 12,
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
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: 'user', content: transcript }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const text = data?.content?.[0]?.text || ''

  // Strip any accidental markdown fences
  const clean = text.replace(/```json|```/g, '').trim()

  let parsed
  try {
    parsed = JSON.parse(clean)
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${clean}`)
  }

  const foods = parsed?.foods
  if (!Array.isArray(foods)) throw new Error('Unexpected response shape from Claude')

  return foods
}
