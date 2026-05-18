/**
 * Nutritionix service module.
 * 
 * In dev (no keys), returns realistic mock data so we can build the UX.
 * When VITE_NUTRITIONIX_APP_ID and VITE_NUTRITIONIX_APP_KEY exist, hits the real API.
 * 
 * Components should NEVER call Nutritionix directly. Always go through here.
 */

const APP_ID = import.meta.env.VITE_NUTRITIONIX_APP_ID
const APP_KEY = import.meta.env.VITE_NUTRITIONIX_APP_KEY
const HAS_REAL_KEYS = Boolean(APP_ID && APP_KEY)

// ──────────────────────────────────────────────────────────────────────────
// MOCK DATA
// Realistic enough to build the UX against. Removed when real API is wired.
// ──────────────────────────────────────────────────────────────────────────

const MOCK_RESTAURANTS = [
  // Chipotle
  { food_name: 'Chicken Burrito Bowl', brand_name: 'Chipotle', nf_calories: 630, nf_protein: 45, nf_total_carbohydrate: 58, nf_total_fat: 23, serving_unit: 'bowl', serving_qty: 1 },
  { food_name: 'Steak Burrito', brand_name: 'Chipotle', nf_calories: 940, nf_protein: 47, nf_total_carbohydrate: 110, nf_total_fat: 33, serving_unit: 'burrito', serving_qty: 1 },
  { food_name: 'Carnitas Bowl', brand_name: 'Chipotle', nf_calories: 705, nf_protein: 38, nf_total_carbohydrate: 63, nf_total_fat: 32, serving_unit: 'bowl', serving_qty: 1 },
  { food_name: 'Sofritas Bowl', brand_name: 'Chipotle', nf_calories: 580, nf_protein: 22, nf_total_carbohydrate: 70, nf_total_fat: 22, serving_unit: 'bowl', serving_qty: 1 },
  { food_name: 'Chicken Salad', brand_name: 'Chipotle', nf_calories: 545, nf_protein: 42, nf_total_carbohydrate: 35, nf_total_fat: 25, serving_unit: 'salad', serving_qty: 1 },

  // Chick-fil-A
  { food_name: 'Grilled Chicken Sandwich', brand_name: 'Chick-fil-A', nf_calories: 390, nf_protein: 28, nf_total_carbohydrate: 44, nf_total_fat: 12, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Chicken Nuggets (12 ct)', brand_name: 'Chick-fil-A', nf_calories: 380, nf_protein: 40, nf_total_carbohydrate: 16, nf_total_fat: 18, serving_unit: 'order', serving_qty: 1 },
  { food_name: 'Cobb Salad with Grilled Chicken', brand_name: 'Chick-fil-A', nf_calories: 440, nf_protein: 41, nf_total_carbohydrate: 19, nf_total_fat: 24, serving_unit: 'salad', serving_qty: 1 },
  { food_name: 'Spicy Chicken Sandwich', brand_name: 'Chick-fil-A', nf_calories: 450, nf_protein: 28, nf_total_carbohydrate: 45, nf_total_fat: 19, serving_unit: 'sandwich', serving_qty: 1 },

  // Starbucks
  { food_name: 'Grande Caffè Latte', brand_name: 'Starbucks', nf_calories: 190, nf_protein: 12, nf_total_carbohydrate: 19, nf_total_fat: 7, serving_unit: 'grande', serving_qty: 1 },
  { food_name: 'Egg White & Roasted Red Pepper Bites', brand_name: 'Starbucks', nf_calories: 170, nf_protein: 13, nf_total_carbohydrate: 13, nf_total_fat: 8, serving_unit: 'order', serving_qty: 1 },
  { food_name: 'Spinach, Feta & Egg White Wrap', brand_name: 'Starbucks', nf_calories: 290, nf_protein: 20, nf_total_carbohydrate: 33, nf_total_fat: 8, serving_unit: 'wrap', serving_qty: 1 },
  { food_name: 'Protein Box Eggs & Cheese', brand_name: 'Starbucks', nf_calories: 470, nf_protein: 25, nf_total_carbohydrate: 40, nf_total_fat: 25, serving_unit: 'box', serving_qty: 1 },

  // McDonald's
  { food_name: 'Big Mac', brand_name: "McDonald's", nf_calories: 590, nf_protein: 25, nf_total_carbohydrate: 46, nf_total_fat: 34, serving_unit: 'burger', serving_qty: 1 },
  { food_name: 'Quarter Pounder with Cheese', brand_name: "McDonald's", nf_calories: 520, nf_protein: 30, nf_total_carbohydrate: 42, nf_total_fat: 26, serving_unit: 'burger', serving_qty: 1 },
  { food_name: 'McChicken', brand_name: "McDonald's", nf_calories: 400, nf_protein: 14, nf_total_carbohydrate: 39, nf_total_fat: 21, serving_unit: 'sandwich', serving_qty: 1 },
  { food_name: 'Egg McMuffin', brand_name: "McDonald's", nf_calories: 310, nf_protein: 17, nf_total_carbohydrate: 30, nf_total_fat: 13, serving_unit: 'sandwich', serving_qty: 1 },

  // Subway
  { food_name: 'Turkey Breast 6"', brand_name: 'Subway', nf_calories: 280, nf_protein: 18, nf_total_carbohydrate: 46, nf_total_fat: 3.5, serving_unit: '6 inch', serving_qty: 1 },
  { food_name: 'Italian B.M.T. 6"', brand_name: 'Subway', nf_calories: 410, nf_protein: 21, nf_total_carbohydrate: 47, nf_total_fat: 16, serving_unit: '6 inch', serving_qty: 1 },
  { food_name: 'Rotisserie Chicken 6"', brand_name: 'Subway', nf_calories: 330, nf_protein: 29, nf_total_carbohydrate: 46, nf_total_fat: 5, serving_unit: '6 inch', serving_qty: 1 },

  // Panera
  { food_name: 'Mediterranean Bowl with Chicken', brand_name: 'Panera Bread', nf_calories: 530, nf_protein: 32, nf_total_carbohydrate: 56, nf_total_fat: 19, serving_unit: 'bowl', serving_qty: 1 },
  { food_name: 'Green Goddess Cobb Salad', brand_name: 'Panera Bread', nf_calories: 530, nf_protein: 38, nf_total_carbohydrate: 25, nf_total_fat: 33, serving_unit: 'salad', serving_qty: 1 },
  { food_name: 'Broccoli Cheddar Soup (cup)', brand_name: 'Panera Bread', nf_calories: 230, nf_protein: 9, nf_total_carbohydrate: 19, nf_total_fat: 14, serving_unit: 'cup', serving_qty: 1 },
]

// Score how relevant a result is to the query. Same approach as your existing search.
function scoreResult(item, query) {
  let score = 0
  const name = item.food_name.toLowerCase()
  const brand = (item.brand_name || '').toLowerCase()
  const q = query.toLowerCase()

  if (name === q) score += 100
  if (name.startsWith(q)) score += 50
  if (name.includes(q)) score += 25
  if (brand === q) score += 60
  if (brand.startsWith(q)) score += 40
  if (brand.includes(q)) score += 15
  return score
}

// ──────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ──────────────────────────────────────────────────────────────────────────

/**
 * Search restaurant menu items.
 * @param {string} query
 * @returns {Promise<Array>} Array of items with shape:
 *   { food_name, brand_name, nf_calories, nf_protein, nf_total_carbohydrate, nf_total_fat, serving_unit, serving_qty }
 */
export async function searchRestaurants(query) {
  if (!query?.trim()) return []

  if (HAS_REAL_KEYS) {
    return searchRestaurantsReal(query)
  }
  return searchRestaurantsMock(query)
}

async function searchRestaurantsMock(query) {
  // Simulate network latency so loading states are testable
  await new Promise(r => setTimeout(r, 350))

  return MOCK_RESTAURANTS
    .map(item => ({ ...item, _score: scoreResult(item, query) }))
    .filter(item => item._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 20)
}

async function searchRestaurantsReal(query) {
  try {
    const res = await fetch(
      `https://trackapi.nutritionix.com/v2/search/instant?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'x-app-id': APP_ID,
          'x-app-key': APP_KEY,
        },
      }
    )
    if (!res.ok) throw new Error(`Nutritionix returned ${res.status}`)
    const data = await res.json()
    
    // Nutritionix returns { branded: [], common: [] }
    // We want branded items (restaurants) primarily, common as fallback
    const branded = (data.branded || []).map(item => ({
      food_name: item.food_name,
      brand_name: item.brand_name,
      nf_calories: item.nf_calories,
      nf_protein: item.nf_protein,
      nf_total_carbohydrate: item.nf_total_carbohydrate,
      nf_total_fat: item.nf_total_fat,
      serving_unit: item.serving_unit,
      serving_qty: item.serving_qty,
    }))
    return branded
  } catch (e) {
    console.error('Nutritionix search failed:', e)
    return []
  }
}

export const NUTRITIONIX_HAS_REAL_KEYS = HAS_REAL_KEYS