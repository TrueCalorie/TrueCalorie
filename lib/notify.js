// lib/notify.js
// Delivery abstraction for fuel briefs.
//
// v0 dispatcher: stamps delivered_at (in-app surfacing via /api/brief-today
// polling), and additionally sends a real web push when the user already has
// an enabled push_subscriptions row (the existing v1 web-push infra: VAPID +
// public/sw-push.js). No APNs, no native push wiring on this branch; that is
// a later MacinCloud pass after merge. Native clients get briefs by polling.
//
// Never throws: delivery failure must not break brief composition.

import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const PUSH_TITLES = {
  morning: "Today's fuel plan",
  postrun: "Window's open",
  adjust:  'Fuel update',
}

let vapidConfigured = false
function ensureVapid() {
  if (vapidConfigured) return true
  if (!process.env.VITE_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return false
  webpush.setVapidDetails(
    'mailto:jackson@truecalorie.net',
    process.env.VITE_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
  vapidConfigured = true
  return true
}

export async function deliverBrief(userId, brief) {
  // 1. In-app surfacing: the brief counts as delivered once it is fetchable.
  try {
    await supabase
      .from('fuel_briefs')
      .update({ delivered_at: new Date().toISOString() })
      .eq('id', brief.id)
  } catch (err) {
    console.error('[notify] delivered_at stamp failed:', err?.message)
  }

  // 2. Best-effort web push for users who already enabled reminders.
  try {
    if (!ensureVapid()) return
    const { data: sub } = await supabase
      .from('push_subscriptions')
      .select('subscription, enabled')
      .eq('user_id', userId)
      .maybeSingle()
    if (!sub?.enabled || !sub?.subscription) return

    await webpush.sendNotification(
      sub.subscription,
      JSON.stringify({
        title: PUSH_TITLES[brief.kind] || 'TrueCalorie',
        body:  brief.body,
        url:   '/',
      })
    )
  } catch (err) {
    // 410 Gone / 404: subscription no longer valid, disable it (same handling
    // as api/send-notifications.js)
    if (err?.statusCode === 410 || err?.statusCode === 404) {
      try {
        await supabase
          .from('push_subscriptions')
          .update({ enabled: false })
          .eq('user_id', userId)
      } catch {}
    }
    console.error('[notify] web push failed:', err?.message)
  }
}
