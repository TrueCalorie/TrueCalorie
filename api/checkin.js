// api/checkin.js
// One-tap evening check-in: "Did you fuel today's work?"
//
// POST { date, response }
//   date:     the client's LOCAL date string (YYYY-MM-DD, toLocalDateStr
//             convention — never a UTC split)
//   response: 'nailed' | 'mostly' | 'short'
//
// Upserts on (user_id, date): tapping again tonight changes the answer.

import { createClient } from '@supabase/supabase-js'
import { verifyUser } from '../lib/verifyUser.js'
import { applyCors } from '../lib/cors.js'
import { reportError } from '../lib/sentry.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const RESPONSES = ['nailed', 'mostly', 'short']

export default async function handler(req, res) {
  if (applyCors(req, res)) return
  if (String(req.method).toUpperCase() !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = await verifyUser(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  const { date, response } = body || {}
  if (!RESPONSES.includes(response)) {
    return res.status(400).json({ error: 'response must be nailed, mostly, or short' })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD' })
  }

  const { data: checkin, error } = await supabase
    .from('fuel_checkins')
    .upsert(
      { user_id: userId, date, response },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single()

  if (error) {
    await reportError(error, { tags: { endpoint: 'checkin' }, extra: { userId, date } })
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ ok: true, checkin })
}
