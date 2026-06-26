export default function ConnectionError({ onRetry }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      fontFamily: 'sans-serif',
      padding: '0 32px',
    }}>
      <img
        src="/logo.svg"
        alt="TrueCalorie"
        style={{ width: 56, height: 56, objectFit: 'contain', opacity: 0.85 }}
      />

      <div style={{
        marginTop: 28,
        fontSize: 19,
        fontWeight: 700,
        color: 'var(--text)',
        textAlign: 'center',
        letterSpacing: '-0.01em',
      }}>
        Check your connection
      </div>

      <p style={{
        marginTop: 12,
        fontSize: 14,
        lineHeight: 1.5,
        color: 'var(--muted)',
        textAlign: 'center',
        maxWidth: 300,
      }}>
        TrueCalorie needs internet to load your data. Reconnect and try again.
      </p>

      <button
        onClick={onRetry}
        style={{
          marginTop: 28,
          padding: '12px 28px',
          borderRadius: 12,
          border: 'none',
          background: 'var(--text)',
          color: 'var(--bg)',
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
          letterSpacing: '0.01em',
        }}
      >
        Try again
      </button>

      <div style={{
        marginTop: 36,
        fontSize: 13,
        letterSpacing: '0.18em',
        color: 'var(--muted)',
        fontWeight: 500,
      }}>
        TRUECALORIE
      </div>
    </div>
  )
}
