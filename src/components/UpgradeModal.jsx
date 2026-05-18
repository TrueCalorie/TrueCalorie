import { useEffect } from 'react'

export default function UpgradeModal({ open, onClose }) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 28,
          maxWidth: 400, width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', margin: 0, marginBottom: 6 }}>
          Unlock Restaurant Tracking
        </h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0, marginBottom: 20, lineHeight: 1.5 }}>
          Get accurate macros for 200,000+ menu items across 800+ restaurant chains.
        </p>

        <div style={{ marginBottom: 20 }}>
          {[
            'Full macros for every restaurant item',
            'Location-aware suggestions',
            'Unlimited history',
            'AI-powered insights',
            'Strava integration',
          ].map(feature => (
            <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 14, color: 'var(--text)' }}>
              <span style={{ color: '#10b981', fontWeight: 600 }}>✓</span>
              {feature}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 20 }}>
          <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)' }}>$9.99</span>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>/ month</span>
        </div>

        <button
          onClick={() => {
            // TODO: wire to Stripe checkout
            alert('Stripe coming soon!')
          }}
          style={{
            width: '100%', padding: 14, borderRadius: 10, border: 'none',
            background: 'var(--text)', color: 'var(--bg)',
            fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 8,
          }}
        >
          Upgrade to Pro
        </button>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: 12, borderRadius: 10,
            border: '1px solid var(--border)', background: 'none',
            color: 'var(--muted)', fontSize: 14, cursor: 'pointer',
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}