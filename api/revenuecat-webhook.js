import { createClient } from '@supabase/supabase-js'
import { reportError } from '../lib/sentry.js'

// ──────────────────────────────────────────────────────────────────
// RevenueCat webhook (Apple In-App Purchase)
//
// Mirrors the Supabase pattern in stripe-webhook.js: a service-role
// client updates user_settings in response to store events. RevenueCat
// is configured (App.jsx) with appUserID === the Supabase user id, so
// event.app_user_id maps directly to user_settings.user_id.
//
// Auth: RevenueCat sends the Authorization header value configured in the
// dashboard verbatim. We require it to match REVENUECAT_WEBHOOK_SECRET.
// Unlike Stripe there is no raw-body signature, so the default JSON body
// parser is fine (no bodyParser:false).
// ──────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const FOUNDER_PRODUCT_ID = 'net.truecalorie.founders'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Authorization header must match the configured shared secret.
  const auth = req.headers['authorization']
  if (!auth || auth !== process.env.REVENUECAT_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Vercel parses application/json into req.body; tolerate a raw string too.
  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }

  const event = body?.event
  if (!event?.type) {
    return res.status(400).json({ error: 'Missing event' })
  }

  const userId = event.app_user_id
  console.log(`RevenueCat event: ${event.type} for ${userId} (${event.product_id || 'n/a'})`)

  try {
    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
        await handleSubscriptionActive(event)
        break
      case 'NON_SUBSCRIPTION_PURCHASE':
        await handleNonSubscription(event)
        break
      case 'CANCELLATION':
        await handleCancellation(event)
        break
      case 'EXPIRATION':
        await handleExpiration(event)
        break
      default:
        console.log(`Unhandled RevenueCat event type: ${event.type}`)
    }
    return res.status(200).json({ received: true })
  } catch (err) {
    console.error(`Error handling RevenueCat ${event.type}:`, err)
    await reportError(err, { tags: { endpoint: 'revenuecat-webhook' }, extra: { eventType: event.type } })
    return res.status(500).json({ error: err.message })
  }
}

// ── Active subscription (initial purchase or renewal) ─────────────
async function handleSubscriptionActive(event) {
  const userId = event.app_user_id
  if (!userId) { console.warn('No app_user_id on event, skipping'); return }

  const proSource = (event.product_id || '').includes('annual') ? 'annual' : 'monthly'
  const expiresAt = event.expiration_at_ms
    ? new Date(event.expiration_at_ms).toISOString()
    : null

  const { error } = await supabase
    .from('user_settings')
    .update({
      is_pro: true,
      pro_source: proSource,
      pro_expires_at: expiresAt,
      cancel_at_period_end: false,
    })
    .eq('user_id', userId)

  if (error) throw error
  console.log(`Granted Pro to ${userId} (${proSource}) until ${expiresAt}`)
}

// ── Non-subscription purchase (founder lifetime, net.truecalorie.founders) ──
// NOTE: user_settings has no is_founder column. The schema records founders as
// pro_source === 'founder' with no expiry (this is what usePro reads and what
// stripe-webhook's founder path sets), so we use that here instead.
async function handleNonSubscription(event) {
  const userId = event.app_user_id
  if (!userId) { console.warn('No app_user_id on event, skipping'); return }

  if (event.product_id !== FOUNDER_PRODUCT_ID) {
    console.log(`Non-subscription product ${event.product_id} not recognized, skipping`)
    return
  }

  const { error } = await supabase
    .from('user_settings')
    .update({
      is_pro: true,
      pro_source: 'founder',
      pro_activated_at: new Date().toISOString(),
      pro_expires_at: null,
    })
    .eq('user_id', userId)

  if (error) throw error
  console.log(`Granted founder Pro to ${userId}`)
}

// ── Cancellation (still entitled until expiry) ────────────────────
async function handleCancellation(event) {
  const userId = event.app_user_id
  if (!userId) { console.warn('No app_user_id on event, skipping'); return }

  const { error } = await supabase
    .from('user_settings')
    .update({ cancel_at_period_end: true })
    .eq('user_id', userId)

  if (error) throw error
  console.log(`Marked cancel_at_period_end for ${userId}`)
}

// ── Expiration (access ends) ──────────────────────────────────────
async function handleExpiration(event) {
  const userId = event.app_user_id
  if (!userId) { console.warn('No app_user_id on event, skipping'); return }

  const { error } = await supabase
    .from('user_settings')
    .update({ is_pro: false })
    .eq('user_id', userId)

  if (error) throw error
  console.log(`Revoked Pro for ${userId} (expired)`)
}
