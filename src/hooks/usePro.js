import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

/**
 * Returns the current user's Pro status.
 *
 * Returns: { isPro, isTrialing, trialDaysLeft, loading, source, expiresAt, refresh }
 *
 * - isPro:          boolean — true if user has active Pro access (includes active trial)
 * - isTrialing:     boolean — true if user is in their 7-day trial (subset of isPro)
 * - trialDaysLeft:  number  — days remaining in trial (0 if expired or not on trial)
 * - loading:        boolean — true while fetching
 * - source:         string | null — 'founder' | 'monthly' | 'annual' | 'comp' | 'trial'
 * - expiresAt:      Date | null — when Pro expires (null = lifetime / founder)
 * - refresh:        function — re-check Pro status (call after Stripe checkout completes)
 */
export function usePro() {
  const [state, setState] = useState({
    isPro: false,
    isTrialing: false,
    trialDaysLeft: 0,
    loading: true,
    source: null,
    expiresAt: null,
    cancelAtPeriodEnd: false,
  })

  const fetchProStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setState({ isPro: false, isTrialing: false, trialDaysLeft: 0, loading: false, source: null, expiresAt: null, cancelAtPeriodEnd: false })
        return
      }

      const { data, error } = await supabase
        .from('user_settings')
        .select('is_pro, pro_source, pro_expires_at, trial_started_at, cancel_at_period_end')
        .eq('user_id', user.id)
        .single()

      if (error || !data) {
        setState({ isPro: false, isTrialing: false, trialDaysLeft: 0, loading: false, source: null, expiresAt: null, cancelAtPeriodEnd: false })
        return
      }

      const expiresAt = data.pro_expires_at ? new Date(data.pro_expires_at) : null
      const now = new Date()
      const isExpired = expiresAt && expiresAt < now
      const isPro = data.is_pro && !isExpired

      const isTrialing = isPro && data.pro_source === 'trial'
      let trialDaysLeft = 0
      if (isTrialing && expiresAt) {
        const msLeft = expiresAt - now
        trialDaysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))
      }

      setState({
        isPro,
        isTrialing,
        trialDaysLeft,
        loading: false,
        source: data.pro_source,
        expiresAt,
        cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
      })
    } catch {
      setState({ isPro: false, isTrialing: false, trialDaysLeft: 0, loading: false, source: null, expiresAt: null, cancelAtPeriodEnd: false })
    }
  }

  useEffect(() => {
    fetchProStatus()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchProStatus()
    })
    return () => subscription.unsubscribe()
  }, [])

  return { ...state, refresh: fetchProStatus }
}
