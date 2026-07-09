// api/brief-today.js
// Current brief state for the signed-in user. The Today screen polls this.
//
// POST { date, tz }
//   date: client LOCAL date string (YYYY-MM-DD)
//   tz:   IANA timezone (e.g. "America/Denver") — used to bucket briefs
//         (created_at is timestamptz) into the client's local day, same
//         Intl technique as api/send-notifications.js.
//
// Returns { state, brief, checkin }
//   state: 'window-open'     — a post-run recovery window is live
//          'day-complete'    — training done for today (window passed or
//                              check-in submitted); UI shows the check-in
//                              prompt until one exists
//          'before-training' — a morning brief exists, no activity yet
//          'rest-day'        — nothing scheduled, quiet maintenance message
//   brief: the row driving the state (postrun brief for window-open and
//          day-complete, morning brief for before-training, null for rest-day)

import { createClient } from '@supabase/supabase-js'
import { verifyUser } from '../lib/verifyUser.js'
import { applyCors } from '../lib/cors.js'
import { reportError } from '../lib/sentry.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

function localDateStr(tz, date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(date)
}

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

  const tz = body?.tz || 'America/Denver'
  let date = body?.date
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
    date = localDateStr(tz, new Date())
  }

  try {
    // Wide 36h fetch, then filter to the client's local day (the codebase's
    // standard pattern for dodging UTC day boundaries).
    const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()
    const [briefsRes, checkinRes] = await Promise.all([
      supabase.from('fuel_briefs')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', since)
        .order('created_at', { ascending: false }),
      supabase.from('fuel_checkins')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle(),
    ])

    if (briefsRes.error) throw briefsRes.error

    const todays = (briefsRes.data || []).filter(
      b => localDateStr(tz, new Date(b.created_at)) === date
    )
    const checkin = checkinRes.data || null

    const now          = new Date()
    const postrun      = todays.find(b => b.kind === 'postrun' || b.kind === 'adjust')
    const morning      = todays.find(b => b.kind === 'morning')
    const windowIsOpen = postrun?.window_ends_at && new Date(postrun.window_ends_at) > now

    let state, brief
    if (windowIsOpen) {
      state = 'window-open'
      brief = postrun
    } else if (postrun || checkin) {
      state = 'day-complete'
      brief = postrun || morning
    } else if (morning) {
      state = 'before-training'
      brief = morning
    } else {
      state = 'rest-day'
      brief = null
    }

    return res.status(200).json({ state, brief, checkin })
  } catch (err) {
    await reportError(err, { tags: { endpoint: 'brief-today' }, extra: { userId } })
    return res.status(500).json({ error: 'Failed to load brief state' })
  }
}
