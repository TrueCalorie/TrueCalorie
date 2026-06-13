import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { verifyUser } from '../lib/verifyUser.js'
import { applyCors } from '../lib/cors.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' })
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

export default async function handler(req, res) {
  if (applyCors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await verifyUser(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { data: settings } = await supabase
    .from('user_settings')
    .select('pro_source, stripe_subscription_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (
    settings?.stripe_subscription_id &&
    (settings.pro_source === 'monthly' || settings.pro_source === 'annual')
  ) {
    try {
      await stripe.subscriptions.cancel(settings.stripe_subscription_id)
    } catch {
      // Subscription may already be cancelled; proceed
    }
  }

  // Delete recipe_ingredients before recipes to satisfy FK constraint
  const { data: userRecipes } = await supabase
    .from('recipes')
    .select('id')
    .eq('user_id', userId)
  if (userRecipes?.length) {
    await supabase.from('recipe_ingredients').delete().in('recipe_id', userRecipes.map(r => r.id))
  }

  await Promise.all([
    supabase.from('meal_logs').delete().eq('user_id', userId),
    supabase.from('user_settings').delete().eq('user_id', userId),
    supabase.from('weight_logs').delete().eq('user_id', userId),
    supabase.from('strava_tokens').delete().eq('user_id', userId),
    supabase.from('saved_foods').delete().eq('user_id', userId),
    supabase.from('recipes').delete().eq('user_id', userId),
    supabase.from('push_subscriptions').delete().eq('user_id', userId),
    supabase.from('achievements').delete().eq('user_id', userId),
    supabase.from('water_logs').delete().eq('user_id', userId),
  ])

  // Keep founders payment record but remove personal identifiers
  await supabase
    .from('founders')
    .update({ user_id: null, email: null })
    .eq('user_id', userId)

  const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)
  if (deleteError) return res.status(500).json({ error: 'Failed to delete account.' })

  return res.status(200).json({ ok: true })
}
