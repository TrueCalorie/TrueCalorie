import Stripe from 'stripe'
import { verifyUser } from '../lib/verifyUser.js'
import { applyCors } from '../lib/cors.js'
import { reportError } from '../lib/sentry.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia',
})

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

  const { userEmail, plan, native } = body
  if (!userEmail) {
    return res.status(400).json({ error: 'userEmail is required' })
  }

  const planNorm = plan === 'annual' ? 'annual' : 'monthly'
  const priceId = planNorm === 'annual'
    ? process.env.STRIPE_PRICE_ID_ANNUAL
    : process.env.STRIPE_PRICE_ID_MONTHLY

  if (!priceId) {
    return res.status(500).json({ error: `Price ID for plan '${planNorm}' is not configured.` })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      client_reference_id: userId,
      subscription_data: {
        metadata: {
          user_id: userId,
          type: planNorm === 'annual' ? 'pro_annual' : 'pro_monthly',
        },
      },
      // Native loads success_url inside the Safari sheet, so it must be a clean
      // static confirmation page, not the full web app (which renders the
      // logged-out landing page). Web keeps returning into the app. Always use
      // the www host explicitly here, not the apex fallback.
      success_url: native
        ? 'https://www.truecalorie.net/checkout-success.html'
        : 'https://www.truecalorie.net/?checkout=success',
      cancel_url: 'https://www.truecalorie.net/?checkout=canceled',
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout session error:', err)
    await reportError(err, { tags: { endpoint: 'create-checkout-session' } })
    return res.status(500).json({ error: err.message })
  }
}
