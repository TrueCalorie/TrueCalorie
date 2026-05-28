import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia',
})

const PRO_MONTHLY_PRICE_ID = 'price_1TcCMTRz19liVCNXQmgD2VVM'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  const { userId, userEmail } = body

  if (!userId || !userEmail) {
    return res.status(400).json({ error: 'userId and userEmail are required' })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: [
        {
          price: PRO_MONTHLY_PRICE_ID,
          quantity: 1,
        },
      ],
      // Pass userId through so the webhook can grant Pro to the right user
      client_reference_id: userId,
      subscription_data: {
        metadata: {
          user_id: userId,
          type: 'pro_monthly',
        },
        // Honor the remaining trial days if the user is still in trial
        // Stripe will not charge until trial ends
        trial_end: 'now', // We manage trial in our DB — charge immediately on upgrade
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
