import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia',
})

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

export const config = {
  api: { bodyParser: false },
}

// ──────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

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
// CHECKOUT COMPLETED
// Routes to Pro or Founder handler based on metadata
// ──────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session) {
  // Pro subscriptions set client_reference_id to the Supabase user ID
  const isProCheckout = !!session.client_reference_id

  if (isProCheckout) {
    await handleProCheckoutCompleted(session)
  } else {
    await handleFounderCheckoutCompleted(session)
  }
}

// ── Pro subscription checkout ─────────────────────────────────────

async function handleProCheckoutCompleted(session) {
  const userId = session.client_reference_id
  const subscriptionId = session.subscription

  console.log(`Pro checkout completed for user ${userId}`)

  // Fetch subscription to get current_period_end
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const periodEnd = new Date(subscription.current_period_end * 1000).toISOString()

  const { error } = await supabase
    .from('user_settings')
    .update({
      is_pro: true,
      pro_source: 'monthly',
      pro_activated_at: new Date().toISOString(),
      pro_expires_at: periodEnd,
      // Store stripe subscription ID so we can update it later
      stripe_subscription_id: subscriptionId,
    })
    .eq('user_id', userId)

  if (error) {
    console.error('Failed to grant Pro:', error)
    throw error
  }

  console.log(`Granted Pro to user ${userId} until ${periodEnd}`)
}

// ── Founder one-time checkout (unchanged) ─────────────────────────

async function handleFounderCheckoutCompleted(session) {
  const email = session.customer_details?.email || session.customer_email
  const customerId = session.customer
  const subscriptionId = session.subscription
  const amountPaid = session.amount_total

  if (!email) {
    console.error('No email on founder checkout session, skipping')
    return
  }

  console.log(`Processing founder purchase for ${email}`)

  const { data: existingUser } = await supabase.auth.admin
    .listUsers()
    .then(({ data }) => ({
      data: data?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
    }))

  const userId = existingUser?.id || null

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
    if (insertError.code === '23505') {
      console.log(`Duplicate webhook for subscription ${subscriptionId}, ignoring`)
      return
    }
    throw insertError
  }

  if (userId) {
    const { error: settingsError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        is_pro: true,
        pro_source: 'founder',
        pro_activated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (settingsError) throw settingsError
    console.log(`Granted founder Pro to user ${userId}`)
  }
}

// ──────────────────────────────────────────────────────────────────
// SUBSCRIPTION UPDATED
// Handles both Pro renewals and founder status changes
// ──────────────────────────────────────────────────────────────────

async function handleSubscriptionUpdated(subscription) {
  const subscriptionId = subscription.id
  const userId = subscription.metadata?.user_id
  const type = subscription.metadata?.type

  console.log(`Subscription ${subscriptionId} updated — type: ${type}, status: ${subscription.status}`)

  if (type === 'pro_monthly' && userId) {
    // Pro subscription — update period end and status in user_settings
    const periodEnd = new Date(subscription.current_period_end * 1000).toISOString()
    const isActive = subscription.status === 'active'

    await supabase
      .from('user_settings')
      .update({
        is_pro: isActive,
        pro_expires_at: isActive ? periodEnd : new Date().toISOString(),
      })
      .eq('user_id', userId)

    console.log(`Updated Pro status for user ${userId}: active=${isActive}, expires=${periodEnd}`)
  } else {
    // Founder subscription — update founders table status only
    await supabase
      .from('founders')
      .update({ status: subscription.status })
      .eq('stripe_subscription_id', subscriptionId)

    console.log(`Updated founder subscription ${subscriptionId} status to ${subscription.status}`)
  }
}

// ──────────────────────────────────────────────────────────────────
// SUBSCRIPTION DELETED
// Revokes Pro when subscription is fully canceled
// ──────────────────────────────────────────────────────────────────

async function handleSubscriptionDeleted(subscription) {
  const subscriptionId = subscription.id
  const userId = subscription.metadata?.user_id
  const type = subscription.metadata?.type

  console.log(`Subscription ${subscriptionId} deleted — type: ${type}`)

  if (type === 'pro_monthly' && userId) {
    // Revoke Pro — drop back to free tier
    await supabase
      .from('user_settings')
      .update({
        is_pro: false,
        pro_source: null,
        pro_expires_at: new Date().toISOString(),
        stripe_subscription_id: null,
      })
      .eq('user_id', userId)

    console.log(`Revoked Pro for user ${userId}`)
  } else {
    // Founder subscription canceled
    const { data: founder } = await supabase
      .from('founders')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single()

    await supabase
      .from('founders')
      .update({ status: 'canceled' })
      .eq('stripe_subscription_id', subscriptionId)

    if (founder?.user_id) {
      await supabase
        .from('user_settings')
        .update({ is_pro: false, pro_source: null, pro_activated_at: null })
        .eq('user_id', founder.user_id)

      console.log(`Revoked founder Pro for user ${founder.user_id}`)
    }
  }
}

// ──────────────────────────────────────────────────────────────────
// UTILITY
// ──────────────────────────────────────────────────────────────────

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}
