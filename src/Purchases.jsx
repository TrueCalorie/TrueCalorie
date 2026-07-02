import { useState } from 'react'
import { supabase } from './supabase'
import { usePro } from './hooks/usePro'
import { capture } from './analytics'
import { openExternal } from './lib/openExternal'
import { openLegal } from './lib/openLegal'
import { apiFetch } from './lib/apiFetch'

const PRO_FEATURES = [
  { icon: 'ti-tools-kitchen-2', label: 'Restaurant search',   desc: '200k+ menu items across 858 chains (via Nutritionix)' },
  { icon: 'ti-microphone',      label: 'Voice logging',        desc: 'Speak your meal and the app logs it in seconds' },
  { icon: 'ti-run',             label: 'Athletic targets',     desc: 'Sport-specific calorie & macro goals built for your training load' },
  { icon: 'ti-chart-line',      label: 'Advanced trends',      desc: 'Full nutrition history and weekly insights' },
  { icon: 'ti-clipboard-list',  label: 'Meal templates',       desc: 'Save your go-to meals for one-tap logging' },
  { icon: 'ti-brand-strava',    label: 'Strava integration',   desc: 'Sync workouts and calories burned' },
]

const legalLinkStyle = {
  background: 'none', border: 'none', padding: 0,
  color: 'var(--muted)', textDecoration: 'underline', textUnderlineOffset: 3,
  fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
}

// Reject if a RevenueCat call hangs (unconfigured / stuck SDK) so the UI shows
// a clear error instead of silently doing nothing forever.
function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ])
}

export default function Purchases({ session, onClose }) {
  const { isPro, isTrialing, trialDaysLeft, source, expiresAt, loading, cancelAtPeriodEnd, refresh } = usePro()
  const [billingPeriod, setBillingPeriod]         = useState('annual')
  const [checkoutLoading, setCheckoutLoading]     = useState(false)
  const [checkoutError, setCheckoutError]         = useState(null)
  const [portalLoading, setPortalLoading]         = useState(false)
  const [portalError, setPortalError]             = useState(null)
  const [restoreLoading, setRestoreLoading]       = useState(false)
  const [restoreMsg, setRestoreMsg]               = useState(null)

  const isNative = window.Capacitor?.isNativePlatform?.()
  const priceLine = billingPeriod === 'annual' ? '$59.99 per year' : '$9.99 per month'
  const cancelWhere = isNative ? 'your device Settings' : 'your account settings'

  // Show athletic targets prompt only when landing from Stripe checkout
  const [showAthleticPrompt, setShowAthleticPrompt] = useState(
    () => typeof window !== 'undefined' && window.location.search.includes('session_id')
  )

  const isFounder = source === 'founder'
  const isPaidPro = isPro && (source === 'monthly' || source === 'annual')
  const hasOwnedPro = isPro && source !== 'trial'

  const handleProSubscribe = async () => {
    setCheckoutLoading(true)
    setCheckoutError(null)

    // Native (iOS): route through RevenueCat / StoreKit instead of Stripe.
    if (isNative) {
      try {
        const { Purchases, STOREKIT_VERSION } = await import('@revenuecat/purchases-capacitor')
        // Guard against an unconfigured SDK: App.jsx configures RevenueCat on
        // login, but if that effect hasn't run or silently failed, getOfferings
        // hangs/rejects. Configure here too (same apiKey + appUserID) before use.
        const { isConfigured } = await Purchases.isConfigured()
        if (!isConfigured) {
          await Purchases.configure({
            apiKey: import.meta.env.VITE_REVENUECAT_API_KEY,
            appUserID: session.user.id,
            // Force StoreKit 2 — v13's StoreKit 1 path hangs on non-consumable
            // (Founders) purchases. Pass the STOREKIT_VERSION enum member.
            storeKitVersion: STOREKIT_VERSION.STOREKIT_2,
          })
        }
        const offerings = await withTimeout(Purchases.getOfferings(), 10000, 'Purchase timed out, please try again')
        const pkg = billingPeriod === 'annual'
          ? offerings.current?.annual
          : offerings.current?.monthly
        if (!pkg) throw new Error('No offering available')
        capture('checkout_started', { plan: billingPeriod, store: 'apple' })
        await Purchases.purchasePackage({ aPackage: pkg })
        // Pro is granted server-side by api/revenuecat-webhook.js; re-read so
        // this screen flips to the Pro dashboard once the row updates.
        refresh?.()
      } catch (err) {
        // Cancellation (code '1' / userCancelled): back out silently.
        if (!(err?.userCancelled === true || String(err?.code) === '1')) {
          setCheckoutError('Purchase failed: ' + (err?.message || err?.code || 'unknown'))
        }
      }
      setCheckoutLoading(false)
      return
    }

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const res  = await apiFetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession?.access_token}` },
        body: JSON.stringify({ userEmail: session.user.email, plan: billingPeriod }),
      })
      const data = await res.json()
      if (data?.url) {
        capture('checkout_started', { plan: billingPeriod })
        openExternal(data.url)
      } else {
        setCheckoutError(data?.error || 'Something went wrong. Please try again.')
      }
    } catch (err) {
      setCheckoutError('Something went wrong. Please try again.')
    }
    setCheckoutLoading(false)
  }

  const openPortal = async () => {
    setPortalLoading(true)
    setPortalError(null)
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const res  = await apiFetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession?.access_token}` },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data?.url) openExternal(data.url)
      else setPortalError(data?.error || 'Something went wrong. Try again.')
    } catch {
      setPortalError('Something went wrong. Try again.')
    } finally {
      setPortalLoading(false)
    }
  }

  const handleRestore = async () => {
    setRestoreLoading(true)
    setRestoreMsg(null)
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor')
      await Purchases.restorePurchases()
      // Pro is reconciled server-side via the webhook / RevenueCat backend.
      refresh?.()
      setRestoreMsg({ ok: true, text: 'Purchases restored. Your Pro access is up to date.' })
    } catch {
      setRestoreMsg({ ok: false, text: 'Could not restore purchases. Please try again.' })
    } finally {
      setRestoreLoading(false)
    }
  }

  if (loading) return null

  const renewDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      {/* ── Sticky header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        paddingTop: 'calc(16px + env(safe-area-inset-top))', paddingRight: 16, paddingBottom: 14, paddingLeft: 16, borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1,
      }}>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', padding: 0,
          cursor: 'pointer', color: 'var(--text)', fontSize: 20, lineHeight: 1,
        }}>←</button>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
          Subscription
        </span>
      </div>

      {/* ── Pro / Founder dashboard ─────────────────────────────────────────── */}
      {hasOwnedPro ? (
      <div style={{ padding: '20px 16px 40px', maxWidth: 480, margin: '0 auto' }}>

        {/* ── Post-purchase athletic targets prompt ── */}
        {showAthleticPrompt && (
          <div style={{
            background: 'rgba(29,158,117,0.08)',
            border: '1px solid rgba(29,158,117,0.25)',
            borderRadius: 14, padding: '16px',
            marginBottom: 20, position: 'relative',
          }}>
            <button
              onClick={() => setShowAthleticPrompt(false)}
              style={{
                position: 'absolute', top: 10, right: 12,
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 18, color: 'var(--muted)', lineHeight: 1, padding: 4,
                fontFamily: 'inherit',
              }}
            >×</button>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <i className="ti ti-run" style={{ fontSize: 24, flexShrink: 0, color: '#1D9E75' }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                  Welcome to Pro. Set your athletic targets
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 12 }}>
                  Head to Settings → Body & Fitness to enter your sport and training volume. You'll get calorie and macro targets built for your actual training load.
                </div>
                <button
                  onClick={() => {
                    setShowAthleticPrompt(false)
                    if (typeof onClose === 'function') onClose()
                  }}
                  style={{
                    padding: '9px 16px', background: 'var(--accent)', border: 'none',
                    borderRadius: 9, fontSize: 13, fontWeight: 600, color: '#fff',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Go to Settings →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Status card ── */}
        <div style={{
          background: isFounder ? '#0a0a0a' : 'var(--surface)',
          border: isFounder ? '1px solid #1f1f1f' : '1px solid var(--border)',
          borderRadius: 16, padding: '20px', marginBottom: 20,
          position: 'relative', overflow: 'hidden',
        }}>
          {isFounder && (
            <div style={{
              position: 'absolute', top: -20, right: -20,
              width: 120, height: 120,
              background: 'radial-gradient(circle, rgba(29,158,117,0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
          )}

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 9, fontWeight: 700, letterSpacing: '0.15em',
            color: isFounder ? '#1D9E75' : 'var(--accent)',
            textTransform: 'uppercase',
            border: `1px solid ${isFounder ? 'rgba(29,158,117,0.4)' : 'var(--border)'}`,
            borderRadius: 6, padding: '3px 10px', marginBottom: 14,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: isFounder ? '#1D9E75' : '#22c55e',
              display: 'inline-block',
            }} />
            {isFounder ? "Founder's Access" : 'Pro'}
          </div>

          <div style={{
            fontSize: 20, fontWeight: 700, color: isFounder ? '#fff' : 'var(--text)',
            letterSpacing: '-0.02em', marginBottom: 6,
          }}>
            {isFounder ? 'Lifetime Pro access.' : "You're on Pro."}
          </div>

          <div style={{ fontSize: 13, color: isFounder ? '#555' : 'var(--muted)', lineHeight: 1.55 }}>
            {isFounder
              ? 'You were here first. Every feature, now and everything we ship, is yours permanently.'
              : renewDate
                ? cancelAtPeriodEnd ? `Pro until ${renewDate}, won't renew.` : `Renews ${renewDate}.`
                : 'Your Pro access is active.'}
          </div>
        </div>

        {/* ── Feature list ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 12 }}>
            INCLUDED IN YOUR PLAN
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            {PRO_FEATURES.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '13px 16px',
                borderBottom: i < PRO_FEATURES.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <i className={`ti ${f.icon}`} style={{ fontSize: 18, flexShrink: 0, marginTop: 1, color: '#1D9E75' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>{f.desc}</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 13, color: '#22c55e', flexShrink: 0, marginTop: 2 }}>✓</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Manage billing (paid pro only, web only) ──
            IAP subscribers manage billing in iOS Settings, not our Stripe
            portal, so hide it on native. ── */}
        {isPaidPro && !isNative && (
          <div style={{ textAlign: 'center' }}>
            {portalError && (
              <div style={{
                background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.3)',
                color: '#E24B4A', borderRadius: 8, padding: '10px 12px',
                fontSize: 13, marginBottom: 10,
              }}>
                {portalError}
              </div>
            )}
            <button
              onClick={openPortal}
              disabled={portalLoading}
              style={{
                background: 'none', border: 'none', cursor: portalLoading ? 'default' : 'pointer',
                fontSize: 13, color: 'var(--muted)', textDecoration: 'underline',
                textUnderlineOffset: 3, fontFamily: 'inherit',
                opacity: portalLoading ? 0.6 : 1,
              }}
            >
              {portalLoading ? 'Opening…' : 'Manage billing →'}
            </button>
          </div>
        )}
      </div>
      ) : (
      /* ── Purchase screen (free / trialing users) ─────────────────────────── */
      <div style={{ padding: '20px 16px 40px', maxWidth: 480, margin: '0 auto' }}>

      {/* Trial banner */}
      {isTrialing && (
        <div style={{
          background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.3)',
          borderRadius: 10, padding: '10px 14px',
          fontSize: 13, color: '#f5a623', marginBottom: 16, textAlign: 'center',
        }}>
          {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} left in your trial. Upgrade to keep access.
        </div>
      )}

      {/* Pro plan card */}
      <div style={{ border: '1.5px solid var(--text)', borderRadius: 16, overflow: 'hidden', marginBottom: 14 }}>
        {/* Header band */}
        <div style={{
          background: 'var(--text)', color: 'var(--bg)',
          padding: '16px 18px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.5, marginBottom: 10 }}>
              Pro Plan
            </div>

            {/* Billing period selector */}
            <div style={{
              display: 'inline-flex', background: 'rgba(0,0,0,0.18)',
              borderRadius: 8, padding: 3, marginBottom: 12,
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
                    background: billingPeriod === opt.value ? 'var(--bg)' : 'transparent',
                    color: billingPeriod === opt.value ? 'var(--text)' : 'var(--bg)',
                    opacity: billingPeriod === opt.value ? 1 : 0.55,
                    fontSize: 12, fontWeight: billingPeriod === opt.value ? 700 : 400,
                    cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'background 0.15s, opacity 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {billingPeriod === 'annual' ? (
              <>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  $59.99
                  <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.55 }}> / year</span>
                </div>
                <div style={{ fontSize: 12, opacity: 0.65, marginTop: 5 }}>
                  $5.00 a month. Save 50%.
                </div>
              </>
            ) : (
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>
                $9.99
                <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.55 }}> / month</span>
              </div>
            )}
          </div>
          {isTrialing && (
            <div style={{ fontSize: 11, color: '#f5a623', fontWeight: 600, marginTop: 2 }}>{trialDaysLeft}d trial left</div>
          )}
        </div>

        {/* Feature list */}
        <div style={{ padding: '4px 18px 14px' }}>
          {PRO_FEATURES.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 0',
              borderBottom: i < PRO_FEATURES.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <i className={`ti ${f.icon}`} style={{ fontSize: 17, flexShrink: 0, marginTop: 1, color: '#1D9E75' }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{f.label}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1, lineHeight: 1.4 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ padding: '0 18px 18px' }}>
          {checkoutError && (
            <div style={{
              background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.3)',
              color: '#E24B4A', borderRadius: 8, padding: '10px 12px',
              fontSize: 13, marginBottom: 10,
            }}>
              {checkoutError}
            </div>
          )}
          <button
            onClick={handleProSubscribe}
            disabled={checkoutLoading}
            style={{
              width: '100%', padding: '13px',
              background: 'var(--text)', color: 'var(--bg)',
              border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 600,
              cursor: checkoutLoading ? 'default' : 'pointer',
              opacity: checkoutLoading ? 0.6 : 1,
              fontFamily: 'inherit',
            }}
          >
            {checkoutLoading
              ? 'Loading...'
              : isTrialing
                ? 'Upgrade now to keep Pro access'
                : 'Start 7-day free trial'}
          </button>
          {!isTrialing && (
            <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 8 }}>
              No card charged until trial ends · Cancel anytime
            </p>
          )}

          <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', margin: '8px 0 0', lineHeight: 1.5 }}>
            {isTrialing
              ? `Your 7-day free trial starts today. After it ends, TrueCalorie Pro renews automatically at ${priceLine} until you cancel. Cancel anytime in ${cancelWhere}.`
              : `TrueCalorie Pro renews automatically at ${priceLine} until you cancel. Cancel anytime in ${cancelWhere}.`}
          </p>

          <p style={{ textAlign: 'center', margin: '8px 0 0' }}>
            <button onClick={() => openLegal('/terms')} style={legalLinkStyle}>
              Terms of Use
            </button>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}> · </span>
            <button onClick={() => openLegal('/privacy')} style={legalLinkStyle}>
              Privacy Policy
            </button>
          </p>

          {/* ── Restore Purchases (native / IAP only) ── */}
          {isNative && (
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button
                onClick={handleRestore}
                disabled={restoreLoading}
                style={{
                  background: 'none', border: 'none',
                  cursor: restoreLoading ? 'default' : 'pointer',
                  fontSize: 13, color: 'var(--muted)', textDecoration: 'underline',
                  textUnderlineOffset: 3, fontFamily: 'inherit',
                  opacity: restoreLoading ? 0.6 : 1,
                }}
              >
                {restoreLoading ? 'Restoring…' : 'Restore Purchases'}
              </button>
              {restoreMsg && (
                <p style={{
                  fontSize: 12, marginTop: 8,
                  color: restoreMsg.ok ? '#1D9E75' : '#E24B4A',
                }}>
                  {restoreMsg.text}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      </div>
      )}
    </div>
  )
}
