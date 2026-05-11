import { useEffect } from 'react'

export default function Landing({ onGetStarted }) {

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
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
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
        padding: '80px 24px 60px',
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
          Precision tracking for serious athletes.
        </div>

        <h1 className="fade-up" style={{
          fontSize: 42,
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.03em',
          marginBottom: 24,
          textAlign: 'center',
        }}>
          Fuel your<br />
          performance.<br />
          <span style={{ color: '#555' }}>Track what actually matters.</span>
        </h1>

        <p className="fade-up" style={{
          fontSize: 17,
          color: '#666',
          lineHeight: 1.7,
          marginBottom: 40,
          fontFamily: 'sans-serif',
          maxWidth: 500,
          margin: '0 auto 40px',
        }}>
          Most calorie trackers are built for weight loss. TrueCalorie is built for performance —
          athletes and dedicated fitness users who treat their diet like training.
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
            Start tracking free
          </button>
          <div style={{ fontSize: 12, color: '#444', marginTop: 12, fontFamily: 'sans-serif' }}>
            No credit card. No fluff. Just clarity.
          </div>
        </div>
      </div>

      {/* Three pillars */}
      <div className="fade-up" style={{
        maxWidth: 760,
        margin: '0 auto 80px',
        padding: '0 32px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 24,
      }}>
        {[
          {
            title: 'Restaurant-first',
            desc: 'Log a meal from any major restaurant chain in under 10 seconds. Built for people who eat on the go.',
          },
          {
            title: 'Athlete calibrated',
            desc: 'Calorie and macro targets calculated for your sport, training load, and performance goals. Not a generic formula.',
          },
          {
            title: 'Zero noise',
            desc: 'No social feed. No guilt scores. No bloat. Just your numbers, your goals, and your progress.',
          },
        ].map((p, i) => (
          <div key={i} style={{
            padding: '24px',
            border: '1px solid #1f1f1f',
            borderRadius: 14,
            background: '#111',
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, fontFamily: 'sans-serif' }}>{p.title}</div>
            <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, fontFamily: 'sans-serif' }}>{p.desc}</div>
          </div>
        ))}
      </div>

      {/* App mockup */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Hey, Alex 👋</span>
            <span style={{ fontSize: 12, color: '#444' }}>history</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ position: 'relative', width: 110, height: 110 }}>
              <svg width="110" height="110" viewBox="0 0 110 110" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="55" cy="55" r="42" fill="none" stroke="#1f1f1f" strokeWidth="8" />
                <circle cx="55" cy="55" r="42" fill="none" stroke="#fff" strokeWidth="8"
                  strokeDasharray="263.9"
                  strokeDashoffset="79"
                  strokeLinecap="round"
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 18, fontWeight: 600 }}>2,840</span>
                <span style={{ fontSize: 10, color: '#555', marginTop: 1 }}>of 3,200 cal</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
              {[{ l: 'protein', v: '187g' }, { l: 'carbs', v: '310g' }, { l: 'fat', v: '72g' }].map(m => (
                <div key={m.l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{m.v}</div>
                  <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{m.l}</div>
                </div>
              ))}
            </div>
          </div>

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

          {[
            { name: 'Chicken Rice Bowl', rest: 'Chipotle', cal: 810, time: 'LUNCH' },
            { name: 'Protein Shake', rest: 'MyProtein', cal: 220, time: 'POST WORKOUT' },
            { name: 'Grilled Salmon', rest: 'Home', cal: 480, time: 'DINNER' },
          ].map((item, i) => (
            <div key={i}>
              <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.08em', marginBottom: 6, marginTop: i > 0 ? 12 : 0, fontFamily: 'sans-serif' }}>
                {item.time}
              </div>
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

      {/* Bottom CTA */}
      <div className="fade-up" style={{
        textAlign: 'center',
        padding: '60px 32px 80px',
        borderTop: '1px solid #1a1a1a',
      }}>
        <div style={{ fontSize: 11, letterSpacing: '0.15em', color: '#555', fontFamily: 'sans-serif', marginBottom: 20, textTransform: 'uppercase' }}>
          Ready to take it seriously?
        </div>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 32 }}>
          Your diet is part of your training.<br />
          <span style={{ color: '#555' }}>Start treating it that way.</span>
        </h2>
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
          }}
          onMouseEnter={e => { e.target.style.background = '#e5e5e5' }}
          onMouseLeave={e => { e.target.style.background = '#fff' }}
        >
          Get started free
        </button>
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