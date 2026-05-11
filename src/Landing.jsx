import { useEffect, useRef } from 'react'

export default function Landing({ onGetStarted }) {
  const heroRef = useRef(null)

  useEffect(() => {
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
  }, [])

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
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 32px',
        borderBottom: '1px solid #1f1f1f',
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Georgia, serif', letterSpacing: '-0.02em' }}>
          TrueCalorie
        </span>
        <button
          onClick={onGetStarted}
          style={{
            background: 'none',
            border: '1px solid #333',
            color: '#aaa',
            padding: '8px 18px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13,
            fontFamily: 'sans-serif',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.target.style.borderColor = '#fff'; e.target.style.color = '#fff' }}
          onMouseLeave={e => { e.target.style.borderColor = '#333'; e.target.style.color = '#aaa' }}
        >
          Sign in
        </button>
      </nav>

      {/* Hero */}
      <div style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: '80px 32px 60px',
        textAlign: 'center',
      }}>
        <div className="fade-up" style={{
          display: 'inline-block',
          fontSize: 11,
          letterSpacing: '0.15em',
          color: '#555',
          fontFamily: 'sans-serif',
          marginBottom: 28,
          textTransform: 'uppercase',
        }}>
          Restaurant · Grocery · Anywhere
        </div>

        <h1 className="fade-up" style={{
          fontSize: 'clamp(36px, 6vw, 68px)',
          fontWeight: 700,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          marginBottom: 24,
          fontFamily: 'Georgia, serif',
        }}>
          Finally, a calorie tracker<br />
          <span style={{ color: '#555' }}>that doesn't suck.</span>
        </h1>

        <p className="fade-up" style={{
          fontSize: 17,
          color: '#666',
          lineHeight: 1.7,
          marginBottom: 40,
          fontFamily: 'sans-serif',
          maxWidth: 480,
          margin: '0 auto 40px',
        }}>
          Search any restaurant, scan any barcode, log any meal — in under 10 seconds.
          No bloat. No guilt. Just clarity.
        </p>

        <div className="fade-up">
          <button
            onClick={onGetStarted}
            style={{
              background: '#fff',
              color: '#000',
              border: 'none',
              padding: '16px 40px',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              fontFamily: 'sans-serif',
              cursor: 'pointer',
              transition: 'all 0.2s',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => { e.target.style.background = '#e5e5e5' }}
            onMouseLeave={e => { e.target.style.background = '#fff' }}
          >
            Get started free
          </button>
          <div style={{ fontSize: 12, color: '#444', marginTop: 12, fontFamily: 'sans-serif' }}>
            No credit card required
          </div>
        </div>
      </div>

      {/* App Screenshot Mockup */}
      <div className="fade-up" style={{
        maxWidth: 360,
        margin: '0 auto 80px',
        padding: '0 24px',
      }}>
        <div style={{
          background: '#111',
          border: '1px solid #222',
          borderRadius: 24,
          padding: '28px 24px',
          boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
        }}>
          {/* Mock header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Hey, Alex 👋</span>
            <span style={{ fontSize: 12, color: '#444' }}>history</span>
          </div>

          {/* Mock ring */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ position: 'relative', width: 110, height: 110 }}>
              <svg width="110" height="110" viewBox="0 0 110 110" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="55" cy="55" r="42" fill="none" stroke="#1f1f1f" strokeWidth="8" />
                <circle cx="55" cy="55" r="42" fill="none" stroke="#fff" strokeWidth="8"
                  strokeDasharray="263.9"
                  strokeDashoffset="92"
                  strokeLinecap="round"
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 18, fontWeight: 600 }}>1,480</span>
                <span style={{ fontSize: 10, color: '#555', marginTop: 1 }}>of 1,950 cal</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
              {[{ l: 'protein', v: '84g' }, { l: 'carbs', v: '162g' }, { l: 'fat', v: '38g' }].map(m => (
                <div key={m.l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{m.v}</div>
                  <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{m.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Mock search */}
          <div style={{
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13,
            color: '#444',
            marginBottom: 20,
            fontFamily: 'sans-serif',
          }}>
            search any food or restaurant...
          </div>

          {/* Mock meal log */}
          {[
            { name: 'Egg McMuffin', rest: "McDonald's", cal: 310, time: 'BREAKFAST' },
            { name: 'Chicken Burrito Bowl', rest: 'Chipotle', cal: 935, time: 'LUNCH' },
            { name: 'Greek Yogurt', rest: 'Chobani', cal: 90, time: 'SNACK' },
          ].map((item, i) => (
            <div key={i}>
              {(i === 0 || item.time !== [
                { name: 'Egg McMuffin', rest: "McDonald's", cal: 310, time: 'BREAKFAST' },
                { name: 'Chicken Burrito Bowl', rest: 'Chipotle', cal: 935, time: 'LUNCH' },
                { name: 'Greek Yogurt', rest: 'Chobani', cal: 90, time: 'SNACK' },
              ][i - 1]?.time) && (
                <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.08em', marginBottom: 6, marginTop: i > 0 ? 12 : 0, fontFamily: 'sans-serif' }}>
                  {item.time}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1a1a1a' }}>
                <div>
                  <div style={{ fontSize: 13 }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{item.rest}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{item.cal} cal</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid #1a1a1a',
        padding: '24px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 13, color: '#333', fontFamily: 'sans-serif' }}>
          © 2026 TrueCalorie
        </span>
        <button
          onClick={onGetStarted}
          style={{
            background: 'none',
            border: 'none',
            color: '#333',
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'sans-serif',
          }}
        >
          Get started →
        </button>
      </div>

    </div>
  )
}