import { useEffect } from 'react'
import { usePro } from '../hooks/usePro'

const FEATURES = [
  'Full macros for 200,000+ restaurant menu items',
  '858+ restaurant chains covered',
  'AI voice logging — speak your meal to log it',
  'Meal templates for your go-to foods',
  'Advanced trend analysis',
  'Strava integration',
]

export default function UpgradeModal({ open, onClose, onCheckout }) {
  const { isTrialing, trialDaysLeft, source } = usePro()

  useEffect(() => {
    if (!open) return
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  // Determine which header state to show
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
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          {trialExpired && (
            <div style={{
              display: 'inline-block', marginBottom: 10,
              padding: '3px 10px', borderRadius: 20,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.06em',
            }}>
              TRIAL ENDED
            </div>
          )}
          {inTrial && (
            <div style={{
              display: 'inline-block', marginBottom: 10,
              padding: '3px 10px', borderRadius: 20,
              background: 'rgba(245,166,35,0.1)',
              border: '1px solid rgba(245,166,35,0.3)',
              color: '#f5a623', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.06em',
            }}>
              TRIAL ACTIVE
            </div>
          )}
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>
            {headline}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
            {subtext}
          </p>
        </div>

        {/* Feature list */}
        <div style={{ marginBottom: 24 }}>
          {FEATURES.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '5px 0', fontSize: 13, color: 'var(--text)' }}>
              <span style={{ color: '#1D9E75', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
              {f}
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div style={{
          display: 'flex', gap: 10, marginBottom: 20,
        }}>
          {/* Monthly */}
          <button
            onClick={() => onCheckout?.('monthly')}
            style={{
              flex: 1, padding: '14px 12px', borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              cursor: 'pointer', textAlign: 'center',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>$9.99</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>per month</div>
          </button>

          {/* Annual — highlighted */}
          <button
            onClick={() => onCheckout?.('annual')}
            style={{
              flex: 1, padding: '14px 12px', borderRadius: 12,
              border: '2px solid var(--text)',
              background: 'var(--text)',
              cursor: 'pointer', textAlign: 'center',
              position: 'relative',
            }}
          >
            <div style={{
              position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
              background: '#1D9E75', color: '#fff',
              fontSize: 10, fontWeight: 700, padding: '2px 8px',
              borderRadius: 10, letterSpacing: '0.04em', whiteSpace: 'nowrap',
            }}>
              SAVE 42%
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--bg)' }}>$69.99</div>
            <div style={{ fontSize: 11, color: 'var(--bg)', opacity: 0.7, marginTop: 2 }}>per year · $5.83/mo</div>
          </button>
        </div>

        {/* No card during trial note */}
        <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', margin: '0 0 16px', lineHeight: 1.5 }}>
          {inTrial
            ? 'You won\'t be charged until your trial ends.'
            : 'Cancel anytime. No hidden fees.'}
        </p>

        {/* Dismiss */}
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '10px 0',
            borderRadius: 10, border: '1px solid var(--border)',
            background: 'none', color: 'var(--muted)',
            fontSize: 13, cursor: 'pointer', fontFamily: 'sans-serif',
          }}
        >
          {inTrial ? 'keep exploring for now' : 'maybe later'}
        </button>
      </div>
    </div>
  )
}
