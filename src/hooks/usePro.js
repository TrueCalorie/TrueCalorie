import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

/**
 * Returns the current user's Pro status.
 * 
 * Returns: { isPro, loading, source, expiresAt, refresh }
 * 
 * - isPro: boolean — true if user has active Pro access
 * - loading: boolean — true while fetching, false once resolved
 * - source: string | null — 'founder' | 'monthly' | 'annual' | 'comp' | 'trial'
 * - expiresAt: Date | null — when Pro expires (null = lifetime)
 * - refresh: function — manually re-check Pro status (use after Stripe checkout)
 */
export function usePro() {
  const [state, setState] = useState({
    isPro: false,
    loading: true,
    source: null,
    expiresAt: null,
  })

  const fetchProStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setState({ isPro: false, loading: false, source: null, expiresAt: null })
      return
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('is_pro, pro_source, pro_expires_at')
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      setState({ isPro: false, loading: false, source: null, expiresAt: null })
      return
    }

    // Check expiration — if pro_expires_at is in the past, they're not Pro anymore
    const expiresAt = data.pro_expires_at ? new Date(data.pro_expires_at) : null
    const isExpired = expiresAt && expiresAt < new Date()
    const isPro = data.is_pro && !isExpired

    setState({
      isPro,
      loading: false,
      source: data.pro_source,
      expiresAt,
    })
  }

  useEffect(() => {
    fetchProStatus()

    // Re-check Pro status when auth state changes (login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchProStatus()
    })

    return () => subscription.unsubscribe()
  }, [])

  return { ...state, refresh: fetchProStatus }
}