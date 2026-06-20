import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { reportError } from '../lib/sentry.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

webpush.setVapidDetails(
  'mailto:jackson@truecalorie.net',
  process.env.VITE_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

function localHour(tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', hour12: false, timeZone: tz,
  }).formatToParts(new Date())
  const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
  return h === 24 ? 0 : h
}

function localDateStr(tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('enabled', true)

  if (error) {
    await reportError(error, { tags: { endpoint: 'send-notifications' }, extra: { stage: 'load-subscriptions' } })
    return res.status(500).json({ error: error.message })
  }

  let sent = 0
  const total = subs?.length || 0

  for (const sub of subs || []) {
    const { user_id, subscription, reminder_time, timezone } = sub

    // Only fire when current local hour matches the user's chosen reminder hour
    const reminderHour = parseInt(reminder_time.split(':')[0])
    if (localHour(timezone) !== reminderHour) continue

    // Check whether the user has already logged anything today (local timezone)
    const todayStr = localDateStr(timezone)
    // Fetch logs from the last 48 hours so we catch both sides of the local midnight
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    const { data: logs } = await supabase
      .from('meal_logs')
      .select('logged_at')
      .eq('user_id', user_id)
      .gte('logged_at', since)

    const hasLoggedToday = (logs || []).some(
      l => new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date(l.logged_at)) === todayStr
    )
    if (hasLoggedToday) continue

    try {
      await webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: 'Time to log 🍽️',
          body:  "You haven't logged today. Keep your streak alive.",
          url:   '/',
        })
      )
      sent++
    } catch (err) {
      // 410 Gone / 404: subscription is no longer valid, disable it
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase
          .from('push_subscriptions')
          .update({ enabled: false })
          .eq('user_id', user_id)
      }
      console.error(`Push failed for ${user_id}:`, err.message)
    }
  }

  return res.status(200).json({ sent, total })
}
