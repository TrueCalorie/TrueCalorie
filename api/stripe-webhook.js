import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// ──────────────────────────────────────────────────────────────────
// CLIENTS
// ──────────────────────────────────────────────────────────────────

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-10-28.acacia',
})

// IMPORTANT: This uses the SERVICE ROLE key, not the anon key.
// Service role bypasses RLS so the webhook can write to any user's data.
// NEVER expose this key in frontend code.
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

// Vercel needs the raw body to verify Stripe signatures.
// This config tells Vercel NOT to parse the body as JSON.
export const config = {
  api: {
    bodyParser: false,
  },
}

// ──────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Read raw body for signature verification
  const rawBody = await getRawBody(req)
  const signature = req.headers['stripe-signature']

  let event

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  console.log(`Received event: ${event.type}`)

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return res.status(200).json({ received: true })
  } catch (err) {
    console.error(`Error handling ${event.type}:`, err)
    return res.status(500).json({ error: err.message })
  }
}

// ──────────────────────────────────────────────────────────────────
// EVENT HANDLERS
// ──────────────────────────────────────────────────────────────────

/**
 * Fires when someone successfully completes Stripe Checkout.
 * This is the "they just bought it" event.
 */
async function handleCheckoutCompleted(session) {
  const email = session.customer_details?.email || session.customer_email
  const customerId = session.customer
  const subscriptionId = session.subscription
  const amountPaid = session.amount_total // in cents

  if (!email) {
    console.error('No email on checkout session, skipping')
    return
  }

  console.log(`Processing founder purchase for ${email}`)

  // Check if a TrueCalorie user already exists with this email
  const { data: existingUser } = await supabase.auth.admin
    .listUsers()
    .then(({ data }) => ({
      data: data?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
    }))

  const userId = existingUser?.id || null

  // Insert founder row
  const { error: insertError } = await supabase
    .from('founders')
    .insert({
      email: email.toLowerCase(),
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      user_id: userId,
      status: 'active',
      amount_paid: amountPaid,
      activated_at: new Date().toISOString(),
    })

  if (insertError) {
    // If it's a duplicate (Stripe retried), that's fine — ignore
    if (insertError.code === '23505') {
      console.log(`Duplicate webhook for subscription ${subscriptionId}, ignoring`)
      return
    }
    throw insertError
  }

  // If we found a matching user, grant them Pro immediately
  if (userId) {
    const { error: settingsError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        is_pro: true,
        pro_source: 'founder',
        pro_activated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    if (settingsError) {
      console.error('Failed to grant Pro:', settingsError)
      throw settingsError
    }

    console.log(`Granted Pro to existing user ${userId}`)
  } else {
    console.log(`No matching user yet for ${email} — will link on signup`)
  }
}

/**
 * Fires when a subscription's status changes.
 * Keeps the founders table status field in sync.
 */
async function handleSubscriptionUpdated(subscription) {
  const subscriptionId = subscription.id
  const status = subscription.status // 'active', 'past_due', 'canceled', etc.

  console.log(`Subscription ${subscriptionId} updated to status: ${status}`)

  const { error } = await supabase
    .from('founders')
    .update({ status })
    .eq('stripe_subscription_id', subscriptionId)

  if (error) {
    console.error('Failed to update subscription status:', error)
    throw error
  }
}

/**
 * Fires when a subscription is canceled or ends.
 * Marks the founder row as canceled and revokes Pro access.
 */
async function handleSubscriptionDeleted(subscription) {
  const subscriptionId = subscription.id

  console.log(`Subscription ${subscriptionId} canceled`)

  // Look up the founder row
  const { data: founder, error: lookupError } = await supabase
    .from('founders')
    .select('user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (lookupError) {
    console.error('Failed to find founder for canceled sub:', lookupError)
    throw lookupError
  }

  // Mark as canceled
  await supabase
    .from('founders')
    .update({ status: 'canceled' })
    .eq('stripe_subscription_id', subscriptionId)

  // Revoke Pro for the linked user
  if (founder?.user_id) {
    await supabase
      .from('user_settings')
      .update({
        is_pro: false,
        pro_source: null,
        pro_activated_at: null,
      })
      .eq('user_id', founder.user_id)

    console.log(`Revoked Pro for user ${founder.user_id}`)
  }
}

// ──────────────────────────────────────────────────────────────────
// UTILITY: Read raw request body
// ──────────────────────────────────────────────────────────────────

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}