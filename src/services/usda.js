// USDA FoodData Central search.
// Free tier of TrueCalorie — covers raw/foundation foods that Open Food Facts
// doesn't cover well (chicken breast, broccoli, oatmeal, etc.).
//
// Foundation and SR Legacy items are dietitian-verified by USDA and tagged
// with verified=true so the UI can show a quality signal.
//
// Branded items are manufacturer-submitted and not specially badged.

const API_KEY = import.meta.env.VITE_USDA_API_KEY
const HAS_KEY = Boolean(API_KEY)
const TIMEOUT_MS = 8000

export const USDA_HAS_KEY = HAS_KEY

export async function searchUSDA(query) {
  if (!HAS_KEY || !query?.trim()) return []

  const url =
    `https://api.nal.usda.gov/fdc/v1/foods/search` +
    `?api_key=${API_KEY}` +
    `&query=${encodeURIComponent(query)}` +
    `&dataType=Foundation,SR%20Legacy,Branded` +
    `&pageSize=25`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (!res.ok) throw new Error(`USDA returned ${res.status}`)
    const data = await res.json()
    return mapUSDA(data)
  } catch (e) {
    clearTimeout(timeoutId)
    console.warn('USDA search failed:', e)
    return []
  }
}

// Normalizes USDA's servingSizeUnit codes to the units the UI understands.
// The foods/search endpoint reports per-100 nutrients, so conversion to a real
// serving is only valid for mass/volume units. Anything else returns null and
// the caller falls back to honest per-100g labeling.
function normalizeUsdaUnit(u) {
  if (!u) return null
  const x = String(u).toLowerCase().trim()
  if (['grm', 'g', 'gram', 'grams'].includes(x)) return 'g'
  if (['mlt', 'ml', 'milliliter', 'milliliters'].includes(x)) return 'ml'
  return null
}

function mapUSDA(data) {
  if (!data?.foods) return []

  return data.foods.map(food => {
    // Multiple energy nutrient IDs are used by different USDA datasets
    const getNutrient = (ids) => {
      for (const id of ids) {
        const n = food.foodNutrients?.find(n => n.nutrientId === id)
        if (n?.value !== undefined && n.value !== null) return n.value
      }
      return 0
    }

    // IMPORTANT: in the foods/search endpoint these values are PER 100 g/ml for
    // every dataType, Branded included (the per-serving labelNutrients block is
    // only returned by the /food/{fdcId} detail endpoint). The previous code
    // logged the per-100g value as one serving, a large overcount for grocery
    // items (e.g. 359 cal for "one serving" of Cheerios vs 72 for the real 20g).
    const cal100  = getNutrient([1008, 2047, 2048])  // Energy
    const pro100  = getNutrient([1003])              // Protein
    const carb100 = getNutrient([1005])              // Carbohydrate, by difference
    const fat100  = getNutrient([1004])              // Total lipid (fat)

    // Skip items missing calorie data — not useful for tracking
    if (!cal100) return null

    const isFoundation = food.dataType === 'Foundation' || food.dataType === 'SR Legacy'
    const brand_name   = food.brandOwner || food.brandName || null

    // Branded: convert per-100 to per-serving using the real serving size so the
    // logged macros match the food in front of the user. Only mass/volume units
    // can be converted from a per-100 basis; if the unit is unusable, fall back
    // to honest per-100g labeling rather than mislabel some other unit as 100g.
    if (!isFoundation) {
      const unit = normalizeUsdaUnit(food.servingSizeUnit)
      const size = Number(food.servingSize)
      if (unit && size > 0) {
        const factor = size / 100
        return {
          food_name: food.description,
          brand_name,
          nf_calories: Math.round(cal100 * factor),
          nf_protein: Math.round(pro100 * factor),
          nf_total_carbohydrate: Math.round(carb100 * factor),
          nf_total_fat: Math.round(fat100 * factor),
          serving_qty: size,
          serving_unit: unit,
          verified: false,
          source: 'usda',
        }
      }
    }

    // Foundation / SR Legacy (and Branded with no usable serving size): values are
    // per 100g. Label that honestly as "Per 100 g" instead of pretending 100g is
    // one serving — the modal stepper is gram-aware so the user can dial it in.
    return {
      food_name: food.description,
      brand_name,
      nf_calories: Math.round(cal100),
      nf_protein: Math.round(pro100),
      nf_total_carbohydrate: Math.round(carb100),
      nf_total_fat: Math.round(fat100),
      serving_qty: 100,
      serving_unit: 'g',
      verified: isFoundation,
      source: 'usda',
    }
  }).filter(Boolean)
}