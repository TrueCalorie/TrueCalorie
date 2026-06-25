import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { openExternal } from './lib/openExternal'

// Stripe Payment Link — $79.99 one-time lifetime founders price
// To set up: Stripe Dashboard → Products → Add product → $79.99 one-time
// Then: Payment Links → New link → select that product → copy URL
// Then add to Vercel env as VITE_STRIPE_FOUNDERS_LINK
const STRIPE_PAYMENT_LINK = import.meta.env.VITE_STRIPE_FOUNDERS_LINK || ''

const FOUNDER_CAP = 100

export default function Founders({ onBack }) {
  const [claimed, setClaimed] = useState(0)
  const [loading, setLoading] = useState(true)
  const [claimError, setClaimError] = useState(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    const els = document.querySelectorAll('.fade-up')
    els.forEach((el, i) => {
      el.style.opacity = 0
      el.style.transform = 'translateY(24px)'
      el.style.transition = `opacity 0.7s ease ${i * 0.12}s, transform 0.7s ease ${i * 0.12}s`
      setTimeout(() => {
        el.style.opacity = 1
        el.style.transform = 'translateY(0)'
      }, 50)
    })
    fetchClaimedCount()
  }, [])

  const fetchClaimedCount = async () => {
    try {
      const { data, error } = await supabase.rpc('founder_count')
      if (!error && data !== null) setClaimed(data)
    } catch {}
    setLoading(false)
  }

  const handleClaim = async () => {
    setClaimError(null)

    // Native (iOS): buy the founder non-consumable through RevenueCat /
    // StoreKit instead of the Stripe payment link. Route through the offering
    // path (matching Pro monthly/annual) rather than getProducts, which returns
    // empty in sandbox. The founders package lives at offerings.current.founders
    // in the default offering. Pro/founder is granted server-side by
    // api/revenuecat-webhook.js on the NON_SUBSCRIPTION_PURCHASE event.
    if (window.Capacitor?.isNativePlatform?.()) {
      try {
        const { Purchases } = await import('@revenuecat/purchases-capacitor')
        const offerings = await Purchases.getOfferings()
        const foundersPackage = offerings.current?.founders
        if (!foundersPackage) throw new Error('No offering available')
        await Purchases.purchasePackage({ aPackage: foundersPackage })
      } catch (err) {
        // Cancellation (code '1' / userCancelled): back out silently.
        if (!(err?.userCancelled === true || String(err?.code) === '1')) {
          setClaimError('Something went wrong. Please try again.')
        }
      }
      return
    }

    if (!STRIPE_PAYMENT_LINK) {
      alert('Stripe checkout is not configured yet. Please contact us.')
      return
    }
    openExternal(STRIPE_PAYMENT_LINK)
  }

  const spotsLeft  = Math.max(0, FOUNDER_CAP - claimed)
  const soldOut    = spotsLeft === 0
  const pctClaimed = Math.min((claimed / FOUNDER_CAP) * 100, 100)

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: "'Georgia', serif",
      overflowX: 'hidden',
    }}>

      {/* Nav */}
      <nav className="fade-up" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 'calc(24px + env(safe-area-inset-top))', paddingRight: 32, paddingBottom: 24, paddingLeft: 32, borderBottom: '1px solid #1f1f1f',
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: '#666',
          fontSize: 13, fontFamily: 'sans-serif', cursor: 'pointer',
          padding: 0, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          ← Back
        </button>
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>TrueCalorie</span>
        <div style={{ width: 60 }} />
      </nav>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '64px 32px 80px' }}>

        {/* Eyebrow */}
        <div className="fade-up" style={{
          fontSize: 11, letterSpacing: '0.15em', color: '#1D9E75',
          fontFamily: 'sans-serif', marginBottom: 20,
          textTransform: 'uppercase', fontWeight: 600, textAlign: 'center',
        }}>
          Founders Membership
        </div>

        {/* Headline */}
        <h1 className="fade-up" style={{
          fontSize: 'clamp(30px, 5vw, 44px)', fontWeight: 700,
          lineHeight: 1.15, letterSpacing: '-0.03em',
          marginBottom: 20, textAlign: 'center',
        }}>
          $79.99.<br />
          <span style={{ color: '#555' }}>Locked in forever.</span>
        </h1>

        {/* Subheadline */}
        <p className="fade-up" style={{
          fontSize: 16, color: '#666', lineHeight: 1.7,
          fontFamily: 'sans-serif', textAlign: 'center',
          maxWidth: 460, margin: '0 auto 48px',
        }}>
          TrueCalorie Pro is $9.99 a month. Founders get it for $79.99, one time.
          No renewals, no price changes, ever.
        </p>

        {/* Spots counter */}
        <div className="fade-up" style={{
          background: '#0d1f17',
          border: '1px solid #1a5c3a',
          borderRadius: 16,
          padding: '28px 32px',
          marginBottom: 32,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 13, color: '#888', fontFamily: 'sans-serif', marginBottom: 4 }}>
                Spots claimed
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: '#1D9E75' }}>
                {loading ? '...' : claimed}
                <span style={{ fontSize: 18, color: '#333', fontWeight: 400 }}> / {FOUNDER_CAP}</span>
              </div>
            </div>
            {!soldOut && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, color: '#888', fontFamily: 'sans-serif', marginBottom: 4 }}>
                  Remaining
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em' }}>
                  {loading ? '...' : spotsLeft}
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div style={{ height: 4, background: '#0a2018', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${pctClaimed}%`,
              background: '#1D9E75', borderRadius: 2,
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>

        {/* What you get */}
        <div className="fade-up" style={{ marginBottom: 36 }}>
          <div style={{
            fontSize: 11, letterSpacing: '0.12em', color: '#555',
            fontFamily: 'sans-serif', textTransform: 'uppercase',
            fontWeight: 600, marginBottom: 16,
          }}>
            What founders get
          </div>
          {[
            { icon: '🎙', text: 'Voice logging. Log a full meal by speaking.' },
            { icon: '🍽', text: 'Restaurant search. 800+ menus, instantly.' },
            { icon: '📈', text: 'Advanced trends. Rolling averages, projections, heat maps.' },
            { icon: '🏃', text: 'Athletic targets. Goals calibrated to your sport and training volume.' },
            { icon: '✦', text: 'Founder badge. Permanent recognition in the app.' },
            { icon: '🔒', text: '$79.99, one time. No renewals. No matter what Pro costs later.' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              padding: '12px 0',
              borderBottom: i < 5 ? '1px solid #111' : 'none',
            }}>
              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
              <span style={{ fontSize: 14, color: '#ccc', fontFamily: 'sans-serif', lineHeight: 1.5 }}>
                {item.text}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="fade-up">
          {soldOut ? (
            <div style={{
              textAlign: 'center', padding: '20px',
              border: '1px solid #222', borderRadius: 12,
              fontSize: 15, color: '#555', fontFamily: 'sans-serif',
            }}>
              All founder spots have been claimed.
            </div>
          ) : (
            <>
              <button
                onClick={handleClaim}
                style={{
                  width: '100%', padding: '16px',
                  background: '#1D9E75', color: '#fff',
                  border: 'none', borderRadius: 12,
                  fontSize: 16, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'sans-serif',
                  letterSpacing: '-0.01em', transition: 'opacity 0.2s',
                  marginBottom: 12,
                }}
                onMouseEnter={e => e.target.style.opacity = 0.88}
                onMouseLeave={e => e.target.style.opacity = 1}
              >
                Claim your spot. $79.99.
              </button>
              <p style={{
                fontSize: 12, color: '#444', fontFamily: 'sans-serif',
                textAlign: 'center', lineHeight: 1.6, margin: 0,
              }}>
                One-time purchase. No renewal. Yours forever.
              </p>
              {claimError && (
                <p style={{
                  fontSize: 13, color: '#E24B4A', fontFamily: 'sans-serif',
                  textAlign: 'center', marginTop: 12, marginBottom: 0,
                }}>
                  {claimError}
                </p>
              )}
            </>
          )}
        </div>

        {/* Fine print context */}
        <div className="fade-up" style={{
          marginTop: 48, paddingTop: 32, borderTop: '1px solid #1a1a1a',
          fontSize: 13, color: '#444', fontFamily: 'sans-serif', lineHeight: 1.7,
          textAlign: 'center',
        }}>
          TrueCalorie Pro is $9.99/month. Founders pay $79.99, one time.
          No renewals, no price changes, ever.
        </div>

      </div>
    </div>
  )
}
