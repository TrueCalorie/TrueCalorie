export default function LoadingScreen() {
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
    }}>
      <style>{`
        @keyframes tc-sweep {
          0%   { stroke-dashoffset: 339.292; }
          50%  { stroke-dashoffset: 84.823; }
          100% { stroke-dashoffset: 339.292; transform: rotate(360deg); }
        }
        @keyframes tc-rotate {
          to { transform: rotate(360deg); }
        }
        @keyframes tc-pulse {
          0%, 100% { opacity: 0.9; }
          50%      { opacity: 1; }
        }
        .tc-ring-track  { stroke: var(--border); }
        .tc-ring-sweep  {
          stroke: var(--text);
          stroke-linecap: round;
          stroke-dasharray: 339.292;
          transform-origin: center;
          animation: tc-rotate 1.4s linear infinite;
        }
        .tc-ring-sweep-inner {
          stroke-dasharray: 339.292;
          stroke-dashoffset: 254.469; /* 75% gap, 25% visible arc */
        }
        .tc-logo {
          animation: tc-pulse 1.8s ease-in-out infinite;
        }
      `}</style>

      <div style={{ position: 'relative', width: 140, height: 140 }}>
        {/* Ring backdrop + sweep — echoes the dashboard calorie ring */}
        <svg
          width="140"
          height="140"
          viewBox="0 0 140 140"
          style={{ position: 'absolute', inset: 0 }}
        >
          {/* Static track */}
          <circle cx="70" cy="70" r="54" fill="none" strokeWidth="3" className="tc-ring-track" />

          {/* Rotating sweep */}
          <g className="tc-ring-sweep">
            <circle
              cx="70"
              cy="70"
              r="54"
              fill="none"
              strokeWidth="3"
              className="tc-ring-sweep-inner"
            />
          </g>
        </svg>

        {/* Logo, centered inside the ring */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <img
            src="/logo.svg"
            alt="TrueCalorie"
            className="tc-logo"
            style={{
              width: 64,
              height: 64,
              objectFit: 'contain',
            }}
          />
        </div>
      </div>

      <div style={{
        marginTop: 24,
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