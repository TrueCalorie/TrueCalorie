// api/create-portal-session.js
// Creates a Stripe Customer Portal session for monthly Pro subscribers.
// Returns a redirect URL — the client opens it to manage billing / cancel.
//
// Only callable by authenticated users (userId verified against Supabase).
// Founders are excluded — their access is lifetime, no subscription to manage.

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { verifyUser } from '../lib/verifyUser.js'
import { applyCors } from '../lib/cors.js'

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' })
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// You must configure the portal in Stripe Dashboard before this works:
// Dashboard → Billing → Customer Portal → Settings → Activate portal
const RETURN_URL = process.env.PORTAL_RETURN_URL || 'https://truecalorie.net'

export default async function handler(req, res) {
  if (applyCors(req, res)) return
  if (String(req.method).toUpperCase() !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const userId = await verifyUser(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

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
      return res.status(400).json({ error: 'Founders have lifetime access. No subscription to manage.' })
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
