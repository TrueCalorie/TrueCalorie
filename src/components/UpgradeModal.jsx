import { useEffect, useState } from 'react'
import { usePro } from '../hooks/usePro'
import { supabase } from '../supabase'
import { capture } from '../analytics'
import { openExternal } from '../lib/openExternal'
import { apiFetch } from '../lib/apiFetch'

const FEATURES = [
  'Full macros for 200,000+ restaurant menu items',
  '858+ restaurant chains covered',
  'AI voice logging: speak your meal to log it',
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

    // Native (iOS): route through RevenueCat / StoreKit instead of Stripe.
    if (window.Capacitor?.isNativePlatform?.()) {
      try {
        const { Purchases, STOREKIT_VERSION } = await import('@revenuecat/purchases-capacitor')
        // Guard against an unconfigured SDK: App.jsx configures RevenueCat on
        // login, but if that effect hasn't run or silently failed, getOfferings
        // hangs/rejects. Configure here too (same apiKey + appUserID) before use.
        const { isConfigured } = await Purchases.isConfigured()
        if (!isConfigured) {
          const { data: { session: authSession } } = await supabase.auth.getSession()
          await Purchases.configure({
            apiKey: import.meta.env.VITE_REVENUECAT_API_KEY,
            appUserID: authSession?.user?.id,
            // Force StoreKit 2 — v13's StoreKit 1 path hangs on non-consumable
            // (Founders) purchases. Pass the STOREKIT_VERSION enum member.
            storeKitVersion: STOREKIT_VERSION.STOREKIT_2,
          })
        }
        const offerings = await Purchases.getOfferings()
        const pkg = billingPeriod === 'annual'
          ? offerings.current?.annual
          : offerings.current?.monthly
        if (!pkg) throw new Error('No offering available')
        capture('checkout_started', { plan: billingPeriod, store: 'apple' })
        await Purchases.purchasePackage({ aPackage: pkg })
        // Pro is granted server-side by api/revenuecat-webhook.js; the app
        // re-reads Pro status on foreground (appStateChange in App.jsx).
        onClose()
      } catch (err) {
        // PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR === '1' (or the
        // deprecated userCancelled flag): user backed out, close silently.
        if (err?.userCancelled === true || String(err?.code) === '1') {
          onClose()
        } else {
          console.error('IAP error:', err)
          setError('Purchase failed: ' + (err?.message || err?.code || 'unknown'))
          setLoading(false)
        }
      }
      return
    }

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession?.user) throw new Error('Not signed in')

      const res = await apiFetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession?.access_token}` },
        body: JSON.stringify({
          userEmail: authSession.user.email,
          plan: billingPeriod,
          native: window.Capacitor?.isNativePlatform?.(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout failed')

      capture('checkout_started', { plan: billingPeriod })
      openExternal(data.url)
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
          maxHeight: 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 40px)',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
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
