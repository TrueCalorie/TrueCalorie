import Stripe from 'stripe'
import { verifyUser } from '../lib/verifyUser.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia',
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

  const { userEmail, plan } = body
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
      success_url: `${process.env.VITE_APP_URL || 'https://truecalorie.net'}/?checkout=success`,
      cancel_url: `${process.env.VITE_APP_URL || 'https://truecalorie.net'}/?checkout=canceled`,
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout session error:', err)
    return res.status(500).json({ error: err.message })
  }
}
