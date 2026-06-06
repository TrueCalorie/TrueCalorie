import { verifyUser } from '../lib/verifyUser.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const userId = await verifyUser(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

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
