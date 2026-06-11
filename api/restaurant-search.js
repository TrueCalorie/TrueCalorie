import { createClient } from '@supabase/supabase-js'
import { verifyUser } from '../lib/verifyUser.js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

// UTC date string (YYYY-MM-DD) for the rate-limit reset window. Deliberately UTC and
// server-deterministic — abuse cap, not user-facing day grouping.
function utcDateStr() {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const userId = await verifyUser(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  // Server-side Pro gate — this endpoint hits the PAID Nutritionix API. Hiding the UI
  // button is not a gate; enforce here. Deny on uncertainty (cost-bearing endpoint).
  let isPro = false
  try {
    const { data } = await supabaseAdmin
      .from('user_settings')
      .select('is_pro, pro_source')
      .eq('user_id', userId)
      .maybeSingle()
    isPro = !!(data?.is_pro)
  } catch {
    isPro = false
  }
  if (!isPro) return res.status(403).json({ error: 'Pro subscription required' })

  // Per-user daily cap (UTC reset window). SELECT then UPDATE/INSERT; log and continue
  // on any failure so a DB hiccup never blocks a paying user.
  const today = utcDateStr()
  try {
    const { data: rl } = await supabaseAdmin
      .from('api_rate_limits')
      .select('call_count')
      .eq('user_id', userId)
      .eq('date', today)
      .eq('endpoint', 'restaurant-search')
      .maybeSingle()

    const current = rl?.call_count || 0
    if (current >= 75) {
      return res.status(429).json({ error: 'Daily restaurant search limit reached' })
    }

    if (rl) {
      await supabaseAdmin
        .from('api_rate_limits')
        .update({ call_count: current + 1 })
        .eq('user_id', userId)
        .eq('date', today)
        .eq('endpoint', 'restaurant-search')
    } else {
      await supabaseAdmin
        .from('api_rate_limits')
        .insert({ user_id: userId, date: today, endpoint: 'restaurant-search', call_count: 1 })
    }
  } catch (err) {
    console.error('[restaurant-search] rate limit check failed:', err)
  }

  const { query, mode } = req.body // mode: 'search' | 'chain'
  if (!query) return res.status(400).json({ error: 'query required' })

  const APP_ID  = process.env.NUTRITIONIX_APP_ID
  const APP_KEY = process.env.NUTRITIONIX_APP_KEY

  try {
    let url
    if (mode === 'chain') {
      // Brand menu browsing — search by brand name, branded items only
      url = `https://trackapi.nutritionix.com/v2/search/instant?query=${encodeURIComponent(query)}&branded=true&self=false&common=false&detailed=true`
    } else {
      // General restaurant search
      url = `https://trackapi.nutritionix.com/v2/search/instant?query=${encodeURIComponent(query)}&branded=true&self=false&common=false`
    }

    const ntxRes = await fetch(url, {
      headers: { 'x-app-id': APP_ID, 'x-app-key': APP_KEY }
    })
    if (!ntxRes.ok) throw new Error(`Nutritionix ${ntxRes.status}`)
    const data = await ntxRes.json()

    const items = (data.branded || []).map(item => ({
      food_name:             item.food_name,
      brand_name:            item.brand_name,
      nf_calories:           item.nf_calories,
      nf_protein:            item.nf_protein,
      nf_total_carbohydrate: item.nf_total_carbohydrate,
      nf_total_fat:          item.nf_total_fat,
      serving_unit:          item.serving_unit,
      serving_qty:           item.serving_qty,
    }))

    res.status(200).json({ items })
  } catch (e) {
    console.error('Nutritionix error:', e)
    res.status(500).json({ error: 'Search failed' })
  }
}
