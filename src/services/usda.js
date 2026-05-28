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

    const calories = getNutrient([1008, 2047, 2048])  // Energy
    const protein  = getNutrient([1003])              // Protein
    const carbs    = getNutrient([1005])              // Carbohydrate, by difference
    const fat      = getNutrient([1004])              // Total lipid (fat)

    // Skip items missing calorie data — not useful for tracking
    if (!calories) return null

    const isFoundation = food.dataType === 'Foundation' || food.dataType === 'SR Legacy'

    // For Branded foods we have real serving sizes; values are already per-serving.
    // For Foundation/SR Legacy, values are per 100g — we treat that as "one serving"
    // so the existing servings stepper still works (user can dial to 0.5, 1.5, etc.).
    return {
      food_name: food.description,
      brand_name: food.brandOwner || food.brandName || null,
      nf_calories: Math.round(calories),
      nf_protein: Math.round(protein),
      nf_total_carbohydrate: Math.round(carbs),
      nf_total_fat: Math.round(fat),
      verified: isFoundation,
      source: 'usda',
    }
  }).filter(Boolean)
}