import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { usePro } from './hooks/usePro'

// ── Copy this value from your Founders.jsx STRIPE_PAYMENT_LINK constant ──
const FOUNDERS_PAYMENT_LINK = 'https://buy.stripe.com/9B63cx51cfpA5ac11v2Ji02'
const FOUNDER_CAP = 100  // Keep in sync with Founders.jsx

const PRO_FEATURES = [
  { icon: '🍽', label: 'Restaurant search', desc: '200k+ menu items across 858 chains (via Nutritionix)' },
  { icon: '🎙', label: 'Voice logging', desc: 'Speak your meal — app logs it in seconds (coming soon)' },
  { icon: '📈', label: 'Advanced trends', desc: 'Full nutrition history and weekly insights' },
  { icon: '📋', label: 'Meal templates', desc: 'Save your go-to meals for one-tap logging' },
  { icon: '📤', label: 'CSV export', desc: 'Export your complete food log anytime' },
  { icon: '🏃', label: 'Strava integration', desc: 'Sync workouts and calories burned' },
]

export default function Purchases({ session }) {
  const { isPro, isTrialing, trialDaysLeft, source, expiresAt } = usePro()
  const [showFoundersModal, setShowFoundersModal] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState(null)
  const [foundersClaimed, setFoundersClaimed] = useState(null)

  const isFounder  = source === 'founder'
  const isPaidPro  = isPro && source === 'monthly'
  const spotsLeft  = foundersClaimed !== null ? Math.max(0, FOUNDER_CAP - foundersClaimed) : null

  useEffect(() => {
    fetchFoundersClaimed()
  }, [])

  const fetchFoundersClaimed = async () => {
    const { count } = await supabase
      .from('founders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
    setFoundersClaimed(count ?? 0)
  }

  const handleProSubscribe = async () => {
    setCheckoutLoading(true)
    setCheckoutError(null)
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id, userEmail: session.user.email }),
      })
      const data = await res.json()
      if (data?.url) {
        window.location.href = data.url
      } else {
        setCheckoutError(data?.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setCheckoutError('Something went wrong. Please try again.')
    }
    setCheckoutLoading(false)
  }

  // ── Plan status config ──
  let planLabel, planSubtext, statusDot
  if (isFounder) {
    planLabel   = 'Founder · Pro'
    planSubtext = 'Lifetime Pro access. You were here first.'
    statusDot   = '#1D9E75'
  } else if (isPaidPro) {
    const renewDate = expiresAt
      ? new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null
    planLabel   = 'Pro'
    planSubtext = renewDate ? `Renews ${renewDate}` : 'Active subscription'
    statusDot   = '#1D9E75'
  } else if (isTrialing) {
    planLabel   = `Trial · ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left`
    planSubtext = 'Full Pro access during trial — no card on file.'
    statusDot   = '#f5a623'
  } else {
    planLabel   = 'Free'
    planSubtext = 'Upgrade to unlock all Pro features.'
    statusDot   = 'var(--muted)'
  }

  return (
    <div style={{ padding: '24px 16px 100px' }}>

      {/* ── Page heading ── */}
      <div style={{ marginBottom: 22 }}>
        <h2 style={{
          fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em',
          color: 'var(--text)', margin: 0,
        }}>
          Plans & Billing
        </h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          Manage your TrueCalorie subscription.
        </p>
      </div>

      {/* ── Current plan card ── */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          width: 9, height: 9, borderRadius: '50%',
          background: statusDot, flexShrink: 0,
          boxShadow: `0 0 0 3px ${statusDot}22`,
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            {planLabel}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            {planSubtext}
          </div>
        </div>
        {isFounder && (
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
            color: '#1D9E75', border: '1px solid #1D9E75',
            borderRadius: 5, padding: '3px 7px', textTransform: 'uppercase',
            flexShrink: 0,
          }}>
            FOUNDER
          </div>
        )}
      </div>

      {/* ── Pro plan card — hidden only for Founders ── */}
      {!isFounder && (
        <div style={{
          background: 'var(--surface)',
          border: isPaidPro ? '1.5px solid var(--accent)' : '1px solid var(--border)',
          borderRadius: 16,
          overflow: 'hidden',
          marginBottom: 14,
        }}>
          {/* Card header band */}
          <div style={{
            background: 'var(--text)',
            color: 'var(--bg)',
            padding: '16px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}>
            <div>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', opacity: 0.5, marginBottom: 6,
              }}>
                Pro Plan
              </div>
              <div style={{
                fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em',
                lineHeight: 1,
              }}>
                $9.99
                <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.55 }}> / month</span>
              </div>
            </div>
            {isTrialing && (
              <div style={{ fontSize: 11, color: '#f5a623', fontWeight: 600 }}>
                {trialDaysLeft}d trial left
              </div>
            )}
            {isPaidPro && (
              <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
                ✓ ACTIVE
              </div>
            )}
          </div>

          {/* Feature list */}
          <div style={{ padding: '4px 18px 14px' }}>
            {PRO_FEATURES.map((f, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 0',
                borderBottom: i < PRO_FEATURES.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{ fontSize: 17, flexShrink: 0, marginTop: 1 }}>{f.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1, lineHeight: 1.4 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA area */}
          <div style={{ padding: '0 18px 18px' }}>
            {checkoutError && (
              <div style={{
                background: 'rgba(226,75,74,0.1)',
                border: '1px solid rgba(226,75,74,0.3)',
                color: '#E24B4A',
                borderRadius: 8, padding: '10px 12px',
                fontSize: 13, marginBottom: 10,
              }}>
                {checkoutError}
              </div>
            )}

            {isPaidPro ? (
              <button
                onClick={() => alert('To manage or cancel your subscription, email support@truecalorie.net')}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 12,
                  border: '1px solid var(--border)', background: 'var(--surface2)',
                  color: 'var(--muted)', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Manage Subscription
              </button>
            ) : (
              <>
                <button
                  onClick={handleProSubscribe}
                  disabled={checkoutLoading}
                  style={{
                    width: '100%', padding: '15px 0', borderRadius: 12, border: 'none',
                    background: checkoutLoading ? 'var(--muted)' : 'var(--accent)',
                    color: '#fff',
                    fontSize: 15, fontWeight: 700,
                    cursor: checkoutLoading ? 'default' : 'pointer',
                    fontFamily: 'inherit',
                    letterSpacing: '0.01em',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => { if (!checkoutLoading) e.currentTarget.style.opacity = '0.88' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                >
                  {checkoutLoading
                    ? 'Loading...'
                    : isTrialing
                      ? `Subscribe · ${trialDaysLeft}d free trial active`
                      : 'Subscribe to Pro →'
                  }
                </button>
                <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 8 }}>
                  Cancel anytime. No commitment.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Founders card — hidden for existing Founders or sold-out ── */}
      {!isFounder && spotsLeft !== 0 && (
        <div
          onClick={() => setShowFoundersModal(true)}
          style={{
            background: '#0a0a0a',
            border: '1px solid #1f1f1f',
            borderRadius: 16,
            padding: '18px',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#1D9E75'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#1f1f1f'}
        >
          {/* Subtle green glow */}
          <div style={{
            position: 'absolute', top: -20, right: -20,
            width: 100, height: 100,
            background: 'radial-gradient(circle, rgba(29,158,117,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.15em',
              color: '#1D9E75', textTransform: 'uppercase',
            }}>
              Founders' Access · Limited
            </div>
            {spotsLeft !== null && (
              <div style={{
                fontSize: 10, color: '#555',
                background: '#111', border: '1px solid #222',
                borderRadius: 5, padding: '2px 8px', flexShrink: 0,
              }}>
                {spotsLeft} / {FOUNDER_CAP} left
              </div>
            )}
          </div>

          <div style={{
            fontSize: 18, fontWeight: 700, color: '#fff',
            letterSpacing: '-0.02em', marginBottom: 6, lineHeight: 1.25,
          }}>
            Lock in Pro forever.
          </div>
          <div style={{ fontSize: 13, color: '#555', lineHeight: 1.55, marginBottom: 14 }}>
            One-time payment. Every Pro feature, permanently — at a price the public will never see.
          </div>

          <div style={{ fontSize: 13, fontWeight: 600, color: '#1D9E75' }}>
            Learn more →
          </div>
        </div>
      )}

      {/* ── Founders bottom-sheet modal ── */}
      {showFoundersModal && (
        <FoundersModal
          spotsLeft={spotsLeft}
          onClose={() => setShowFoundersModal(false)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────
// Founders bottom-sheet modal
// ─────────────────────────────────────────
function FoundersModal({ spotsLeft, onClose }) {
  const isFull = spotsLeft === 0

  const PERKS = [
    'Every Pro feature — now and everything we ship',
    'Locked forever at this price, never charged monthly',
    'Founder badge on your profile',
    'Direct line to the founder during development',
  ]

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'flex-end',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460, margin: '0 auto',
          background: '#0c0c0c',
          borderRadius: '22px 22px 0 0',
          border: '1px solid #1a1a1a',
          borderBottom: 'none',
          padding: '20px 24px 44px',
          fontFamily: "'Georgia', serif",
          animation: 'slideUp 0.25s ease',
        }}
      >
        {/* Handle */}
        <div style={{
          width: 36, height: 4, background: '#2a2a2a',
          borderRadius: 2, margin: '0 auto 22px',
        }} />

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 9, fontWeight: 700, letterSpacing: '0.15em',
          color: '#1D9E75', textTransform: 'uppercase',
          border: '1px solid rgba(29,158,117,0.4)',
          borderRadius: 6, padding: '4px 10px',
          marginBottom: 18, fontFamily: 'sans-serif',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#1D9E75', display: 'inline-block',
          }} />
          {spotsLeft !== null ? `${spotsLeft} of ${FOUNDER_CAP} spots remaining` : `Limited to ${FOUNDER_CAP}`}
        </div>

        <h2 style={{
          fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em',
          color: '#fff', margin: '0 0 12px', lineHeight: 1.15,
        }}>
          Lock in Pro<br />
          <span style={{ color: '#333' }}>before the world finds us.</span>
        </h2>

        <p style={{
          fontSize: 15, color: '#555', lineHeight: 1.65,
          fontFamily: 'sans-serif', margin: '0 0 24px',
        }}>
          We're building the calorie tracker athletes actually deserve.
          Founders get every Pro feature — forever — at a price the public will never see.
        </p>

        {/* Price callout */}
        <div style={{
          background: '#111', border: '1px solid #1f1f1f',
          borderRadius: 12, padding: '16px',
          display: 'flex', alignItems: 'baseline', gap: 10,
          marginBottom: 20,
        }}>
          <span style={{
            fontSize: 36, fontWeight: 700, color: '#fff',
            letterSpacing: '-0.03em', fontFamily: 'sans-serif',
          }}>
            $79
          </span>
          <div>
            <div style={{ fontSize: 13, color: '#444', fontFamily: 'sans-serif' }}>
              one-time · forever
            </div>
            <div style={{ fontSize: 11, color: '#333', fontFamily: 'sans-serif', marginTop: 1 }}>
              Public price will be <span style={{ textDecoration: 'line-through' }}>$119/yr</span>
            </div>
          </div>
        </div>

        {/* Perks */}
        <div style={{ marginBottom: 24 }}>
          {PERKS.map((perk, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '9px 0',
              borderBottom: '1px solid #111',
              fontFamily: 'sans-serif',
            }}>
              <span style={{ color: '#1D9E75', fontWeight: 700, flexShrink: 0, fontSize: 13 }}>✓</span>
              <span style={{ fontSize: 14, color: '#aaa', lineHeight: 1.45 }}>{perk}</span>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <button
          onClick={() => { if (!isFull) window.location.href = FOUNDERS_PAYMENT_LINK }}
          disabled={isFull}
          style={{
            width: '100%', padding: '16px 0', borderRadius: 12, border: 'none',
            background: isFull ? '#1a1a1a' : '#fff',
            color: isFull ? '#444' : '#000',
            fontSize: 15, fontWeight: 700,
            cursor: isFull ? 'default' : 'pointer',
            fontFamily: 'sans-serif',
            letterSpacing: '-0.01em',
            marginBottom: 10,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (!isFull) e.currentTarget.style.background = '#e5e5e5' }}
          onMouseLeave={e => { if (!isFull) e.currentTarget.style.background = '#fff' }}
        >
          {isFull ? 'All spots claimed' : 'Claim Founders\' Access →'}
        </button>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 12,
            border: '1px solid #1f1f1f', background: 'none',
            color: '#444', fontSize: 14, cursor: 'pointer',
            fontFamily: 'sans-serif',
          }}
        >
          Not now
        </button>

        {!isFull && (
          <p style={{
            fontSize: 11, color: '#2a2a2a', textAlign: 'center',
            marginTop: 14, fontFamily: 'sans-serif',
          }}>
            Pro features launch Q3 2026 · Full refund if you cancel before then
          </p>
        )}
      </div>
    </div>
  )
}
