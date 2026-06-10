import { useEffect, useState } from 'react'
import { usePro } from '../hooks/usePro'
import { supabase } from '../supabase'
import { capture } from '../analytics'

const FEATURES = [
  'Full macros for 200,000+ restaurant menu items',
  '858+ restaurant chains covered',
  'AI voice logging — speak your meal to log it',
  'Meal templates for your go-to foods',
  'Advanced trend analysis',
  'Strava integration',
]

export default function UpgradeModal({ open, onClose }) {
  const { isTrialing, trialDaysLeft, source } = usePro()
  const [billingPeriod, setBillingPeriod] = useState('annual')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Handle ?checkout=success in URL after Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('checkout') === 'success') {
      // Clean up URL
      window.history.replaceState({}, '', '/')
    }
  }, [])

  if (!open) return null

  const trialExpired = source === 'trial' && !isTrialing
  const inTrial = isTrialing && trialDaysLeft > 0

  const headline = trialExpired
    ? 'Your trial has ended'
    : inTrial
    ? `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left in your trial`
    : 'Unlock TrueCalorie Pro'

  const subtext = trialExpired
    ? 'Upgrade to keep restaurant search and all Pro features.'
    : inTrial
    ? 'Upgrade now to keep access when your trial ends.'
    : 'Get accurate macros for every restaurant meal, voice logging, and more.'

  const handleCheckout = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession?.user) throw new Error('Not signed in')

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession?.access_token}` },
        body: JSON.stringify({ userEmail: authSession.user.email, plan: billingPeriod }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout failed')

      capture('checkout_started', { plan: billingPeriod })
      window.location.href = data.url
    } catch (err) {
      console.error('Checkout error:', err)
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: 28,
          maxWidth: 400, width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Status badge */}
        {trialExpired && (
          <div style={{
            display: 'inline-block', marginBottom: 12,
            padding: '3px 10px', borderRadius: 20,
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#ef4444', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
          }}>TRIAL ENDED</div>
        )}
        {inTrial && (
          <div style={{
            display: 'inline-block', marginBottom: 12,
            padding: '3px 10px', borderRadius: 20,
            background: 'rgba(245,166,35,0.1)',
            border: '1px solid rgba(245,166,35,0.3)',
            color: '#f5a623', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
          }}>TRIAL ACTIVE</div>
        )}

        {/* Headline */}
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>
          {headline}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
          {subtext}
        </p>

        {/* Features */}
        <div style={{ marginBottom: 24 }}>
          {FEATURES.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '5px 0', fontSize: 13, color: 'var(--text)' }}>
              <span style={{ color: '#1D9E75', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
              {f}
            </div>
          ))}
        </div>

        {/* Billing period selector */}
        <div style={{
          display: 'inline-flex', background: 'var(--surface2)',
          borderRadius: 8, padding: 3, marginBottom: 14,
        }}>
          {[
            { value: 'annual',  label: 'Annual' },
            { value: 'monthly', label: 'Monthly' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setBillingPeriod(opt.value)}
              style={{
                padding: '5px 14px', borderRadius: 6, border: 'none',
                background: billingPeriod === opt.value ? 'var(--text)' : 'transparent',
                color: billingPeriod === opt.value ? 'var(--bg)' : 'var(--muted)',
                fontSize: 12, fontWeight: billingPeriod === opt.value ? 700 : 400,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Price + CTA */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 12,
        }}>
          <div>
            {billingPeriod === 'annual' ? (
              <>
                <div>
                  <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>$59.99</span>
                  <span style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 6 }}>/ year</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                  $5.00 a month. Save 50%.
                </div>
              </>
            ) : (
              <div>
                <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>$9.99</span>
                <span style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 6 }}>/ month</span>
              </div>
            )}
          </div>
          <button
            onClick={handleCheckout}
            disabled={loading}
            style={{
              padding: '12px 24px', borderRadius: 10, border: 'none',
              background: loading ? 'var(--border)' : 'var(--text)',
              color: 'var(--bg)',
              fontSize: 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
              fontFamily: 'sans-serif', transition: 'background 0.15s',
            }}
          >
            {loading ? 'Loading...' : 'Subscribe'}
          </button>
        </div>

        {error && (
          <p style={{ fontSize: 12, color: '#ef4444', margin: '0 0 12px' }}>{error}</p>
        )}

        <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 16px', lineHeight: 1.5 }}>
          {inTrial ? "You won't be charged until your trial ends." : 'Cancel anytime. No hidden fees.'}
        </p>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '10px 0', borderRadius: 10,
            border: '1px solid var(--border)', background: 'none',
            color: 'var(--muted)', fontSize: 13, cursor: 'pointer',
            fontFamily: 'sans-serif',
          }}
        >
          {inTrial ? 'keep exploring for now' : 'maybe later'}
        </button>
      </div>
    </div>
  )
}
