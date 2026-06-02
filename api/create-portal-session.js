// api/create-portal-session.js
// Creates a Stripe Customer Portal session for monthly Pro subscribers.
// Returns a redirect URL — the client opens it to manage billing / cancel.
//
// Only callable by authenticated users (userId verified against Supabase).
// Founders are excluded — their access is lifetime, no subscription to manage.

const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// You must configure the portal in Stripe Dashboard before this works:
// Dashboard → Billing → Customer Portal → Settings → Activate portal
const RETURN_URL = process.env.PORTAL_RETURN_URL || 'https://truecalorie.net'

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'userId is required' })

    // Pull subscription ID from user_settings
    const { data: settings, error: dbErr } = await supabase
      .from('user_settings')
      .select('stripe_subscription_id, pro_source')
      .eq('user_id', userId)
      .single()

    if (dbErr || !settings) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (settings.pro_source === 'founder') {
      return res.status(400).json({ error: 'Founders have lifetime access — no subscription to manage.' })
    }

    if (!settings.stripe_subscription_id) {
      return res.status(400).json({ error: 'No active subscription found for this user.' })
    }

    // Get the Stripe customer ID from the subscription
    const subscription = await stripe.subscriptions.retrieve(settings.stripe_subscription_id)

    // Create the portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer:   subscription.customer,
      return_url: RETURN_URL,
    })

    return res.status(200).json({ url: portalSession.url })

  } catch (err) {
    console.error('Portal session error:', err.message)
    return res.status(500).json({ error: 'Failed to create portal session. Please try again.' })
  }
}
