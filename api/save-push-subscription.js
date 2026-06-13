import { createClient } from '@supabase/supabase-js'
import { verifyUser } from '../lib/verifyUser.js'
import { applyCors } from '../lib/cors.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

export default async function handler(req, res) {
  if (applyCors(req, res)) return
  const userId = await verifyUser(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'DELETE') {
    await supabase.from('push_subscriptions').delete().eq('user_id', userId)
    return res.status(200).json({ ok: true })
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  if (req.method === 'POST') {
    const { subscription, reminder_time, timezone } = body
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id:      userId,
        subscription,
        reminder_time: reminder_time || '19:00',
        timezone:     timezone || 'America/Denver',
        enabled:      true,
        updated_at:   new Date().toISOString(),
      }, { onConflict: 'user_id' })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'PATCH') {
    const { reminder_time } = body
    const { error } = await supabase
      .from('push_subscriptions')
      .update({ reminder_time, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
