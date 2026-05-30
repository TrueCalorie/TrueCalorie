import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { usePro } from './hooks/usePro'

const FOUNDERS_PAYMENT_LINK = 'https://buy.stripe.com/9B63cx51cfpA5ac11v2Ji02'
const FOUNDER_CAP = 100

const PRO_FEATURES = [
  { icon: '🍽',  label: 'Restaurant search',   desc: '200k+ menu items across 858 chains (via Nutritionix)' },
  { icon: '🎙',  label: 'Voice logging',        desc: 'Speak your meal — app logs it in seconds' },
  { icon: '📈',  label: 'Advanced trends',      desc: 'Full nutrition history and weekly insights' },
  { icon: '📋',  label: 'Meal templates',       desc: 'Save your go-to meals for one-tap logging' },
  { icon: '📤',  label: 'CSV export',           desc: 'Export your complete food log anytime' },
  { icon: '🏃',  label: 'Strava integration',   desc: 'Sync workouts and calories burned' },
]

export default function Purchases({ session }) {
  const { isPro, isTrialing, trialDaysLeft, source, expiresAt, loading } = usePro()
  const [showFoundersModal, setShowFoundersModal] = useState(false)
  const [checkoutLoading, setCheckoutLoading]     = useState(false)
  const [checkoutError, setCheckoutError]         = useState(null)
  const [foundersClaimed, setFoundersClaimed]     = useState(null)

  const isFounder = source === 'founder'
  const isPaidPro = isPro && source === 'monthly'
  const spotsLeft = foundersClaimed !== null ? Math.max(0, FOUNDER_CAP - foundersClaimed) : null

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
      const res  = await fetch('/api/create-checkout-session', {
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

  // ── Guard: don't render anything until usePro resolves.
  // This prevents the purchase screen flashing before we know the user's status.
  if (loading) return null

  // ── Pro / Founder dashboard ───────────────────────────────────────────────
  if (isPro || isFounder) {
    const renewDate = expiresAt
      ? new Date(expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : null

    return (
      <div style={{ padding: '20px 16px 40px', maxWidth: 480, margin: '0 auto' }}>

        {/* ── Status card ── */}
        <div style={{
          background: isFounder ? '#0a0a0a' : 'var(--surface)',
          border: isFounder ? '1px solid #1f1f1f' : '1px solid var(--border)',
          borderRadius: 16,
          padding: '20px',
          marginBottom: 20,
          position: 'relative',
          overflow: 'hidden',
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
            borderRadius: 6, padding: '3px 10px',
            marginBottom: 14,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: isFounder ? '#1D9E75' : '#22c55e',
              display: 'inline-block',
            }} />
            {isFounder ? "Founder's Access" : 'Pro'}
          </div>

          <div style={{
            fontSize: 20, fontWeight: 700,
            color: isFounder ? '#fff' : 'var(--text)',
            letterSpacing: '-0.02em', marginBottom: 6,
          }}>
            {isFounder ? 'Lifetime Pro access.' : 'You\'re on Pro.'}
          </div>

          <div style={{ fontSize: 13, color: isFounder ? '#555' : 'var(--muted)', lineHeight: 1.55 }}>
            {isFounder
              ? 'You were here first. Every feature — now and everything we ship — is yours permanently.'
              : renewDate
                ? `Renews ${renewDate}.`
                : 'Your Pro access is active.'}
          </div>
        </div>

        {/* ── Feature list ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
            color: 'var(--muted)', marginBottom: 12,
          }}>
            INCLUDED IN YOUR PLAN
          </div>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            overflow: 'hidden',
          }}>
            {PRO_FEATURES.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '13px 16px',
                borderBottom: i < PRO_FEATURES.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{f.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>{f.desc}</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 13, color: '#22c55e', flexShrink: 0, marginTop: 2 }}>✓</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Manage billing (paid pro only) ── */}
        {isPaidPro && (
          <div style={{ textAlign: 'center' }}>
            <a
              href="https://billing.stripe.com/p/login/test_..."
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: 13, color: 'var(--muted)',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
            >
              Manage billing →
            </a>
          </div>
        )}
      </div>
    )
  }

  // ── Purchase screen (free / expired trial users) ──────────────────────────
  return (
    <div style={{ padding: '20px 16px 40px', maxWidth: 480, margin: '0 auto' }}>

      {/* ── Trial status banner ── */}
      {isTrialing && (
        <div style={{
          background: 'rgba(245,166,35,0.1)',
          border: '1px solid rgba(245,166,35,0.3)',
          borderRadius: 10, padding: '10px 14px',
          fontSize: 13, color: '#f5a623',
          marginBottom: 16, textAlign: 'center',
        }}>
          {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} left in your trial — upgrade to keep access.
        </div>
      )}

      {/* ── Pro plan card ── */}
      <div style={{
        border: '1.5px solid var(--text)',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 14,
      }}>
        {/* Header band */}
        <div style={{
          background: 'var(--text)', color: 'var(--bg)',
          padding: '16px 18px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        }}>
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', opacity: 0.5, marginBottom: 6,
            }}>
              Pro Plan
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>
              $9.99
              <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.55 }}> / month</span>
            </div>
          </div>
          {isTrialing && (
            <div style={{ fontSize: 11, color: '#f5a623', fontWeight: 600 }}>
              {trialDaysLeft}d trial left
            </div>
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
              <span style={{ fontSize: 17, flexShrink: 0, marginTop: 1 }}>{f.icon}</span>
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
              background: 'rgba(226,75,74,0.1)',
              border: '1px solid rgba(226,75,74,0.3)',
              color: '#E24B4A', borderRadius: 8,
              padding: '10px 12px', fontSize: 13, marginBottom: 10,
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
                ? `Subscribe · ${trialDaysLeft}d trial active`
                : 'Subscribe to Pro →'}
          </button>
          <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 8 }}>
            Cancel anytime. No commitment.
          </p>
        </div>
      </div>

      {/* ── Founders card ── */}
      {spotsLeft !== 0 && (
        <div
          onClick={() => setShowFoundersModal(true)}
          style={{
            background: '#0a0a0a',
            border: '1px solid #1f1f1f',
            borderRadius: 16, padding: '18px',
            cursor: 'pointer', position: 'relative',
            overflow: 'hidden', transition: 'border-color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#1D9E75'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#1f1f1f'}
        >
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

      {/* ── Founders modal ── */}
      {showFoundersModal && (
        <FoundersModal
          spotsLeft={spotsLeft}
          onClose={() => setShowFoundersModal(false)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Founders bottom-sheet modal
// ─────────────────────────────────────────────────────────────────────────────
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
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460, margin: '0 auto',
          background: '#0c0c0c',
          borderRadius: '22px 22px 0 0',
          border: '1px solid #1a1a1a', borderBottom: 'none',
          padding: '20px 24px 44px',
          animation: 'slideUp 0.25s ease',
        }}
      >
        <div style={{ width: 36, height: 4, background: '#2a2a2a', borderRadius: 2, margin: '0 auto 22px' }} />

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 9, fontWeight: 700, letterSpacing: '0.15em',
          color: '#1D9E75', textTransform: 'uppercase',
          border: '1px solid rgba(29,158,117,0.4)',
          borderRadius: 6, padding: '4px 10px', marginBottom: 18,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1D9E75', display: 'inline-block' }} />
          {spotsLeft !== null
            ? `${spotsLeft} of ${FOUNDER_CAP} spots left`
            : "Founders' Access"}
        </div>

        <div style={{
          fontSize: 24, fontWeight: 700, color: '#fff',
          letterSpacing: '-0.03em', marginBottom: 8, lineHeight: 1.2,
        }}>
          Lock in Pro forever.
        </div>

        <div style={{ fontSize: 14, color: '#666', lineHeight: 1.65, marginBottom: 22 }}>
          One payment. Every Pro feature, now and everything we ship — permanently.
        </div>

        <div style={{ marginBottom: 24 }}>
          {PERKS.map((perk, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '9px 0',
              borderBottom: i < PERKS.length - 1 ? '1px solid #1a1a1a' : 'none',
            }}>
              <span style={{ color: '#1D9E75', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
              <span style={{ fontSize: 13, color: '#aaa', lineHeight: 1.45 }}>{perk}</span>
            </div>
          ))}
        </div>

        {isFull ? (
          <div style={{ textAlign: 'center', color: '#555', fontSize: 13 }}>
            All founder spots have been claimed.
          </div>
        ) : (
          <a
            href={FOUNDERS_PAYMENT_LINK}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'block', width: '100%', padding: '14px',
              background: '#1D9E75', color: '#fff',
              border: 'none', borderRadius: 12,
              fontSize: 15, fontWeight: 700,
              textAlign: 'center', textDecoration: 'none',
              letterSpacing: '-0.01em',
            }}
          >
            Claim Founder Access →
          </a>
        )}
      </div>
    </div>
  )
}
