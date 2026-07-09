// api/restaurant-search.js — GRACEFUL STUB
//
// Restaurant search was removed in v2 (the Nutritionix keys were deleted from
// Vercel in June 2026 and the UI is gone). This route survives ONLY because
// shipped build-49 iOS binaries still call it from their bundled UI: they get
// a valid empty result and render "no results" instead of an error.
//
// Remove entirely once the installed base is on a v2 native build.

import { verifyUser } from '../lib/verifyUser.js'
import { applyCors } from '../lib/cors.js'

export default async function handler(req, res) {
  if (applyCors(req, res)) return
  if (String(req.method).toUpperCase() !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const userId = await verifyUser(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  // Same response shape the old route returned on success, with zero items.
  return res.status(200).json({ items: [] })
}
