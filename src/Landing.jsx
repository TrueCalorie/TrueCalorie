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

  const navigateTo = (path) => {
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const goToFounders = () => navigateTo('/founders')
  const goToPrivacy  = () => navigateTo('/privacy')
  const goToTerms    = () => navigateTo('/terms')

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
        padding: '24px 32px', borderBottom: '1px solid #1f1f1f',
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>TrueCalorie</span>
        <button
          onClick={onGetStarted}
          style={{
            background: 'none', border: '1px solid #333', color: '#aaa',
            padding: '8px 18px', borderRadius: 8, cursor: 'pointer',
            fontSize: 13, fontFamily: 'sans-serif', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.target.style.borderColor = '#fff'; e.target.style.color = '#fff' }}
          onMouseLeave={e => { e.target.style.borderColor = '#333'; e.target.style.color = '#aaa' }}
        >Sign in</button>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center' }}>

        <div className="fade-up" style={{
          display: 'inline-block', fontSize: 11, letterSpacing: '0.15em',
          color: '#555', fontFamily: 'sans-serif', marginBottom: 28,
          textTransform: 'uppercase',
        }}>
          Free to try. No card required.
        </div>

        <h1 className="fade-up" style={{
          fontSize: 'clamp(36px, 6vw, 54px)', fontWeight: 700,
          lineHeight: 1.12, letterSpacing: '-0.03em',
          marginBottom: 28, textAlign: 'center',
        }}>
          The calorie tracker<br />
          that finally gets<br />
          <span style={{ color: '#555' }}>the numbers right.</span>
        </h1>

        <p className="fade-up" style={{
          fontSize: 17, color: '#666', lineHeight: 1.75,
          marginBottom: 40, fontFamily: 'sans-serif',
          maxWidth: 520, margin: '0 auto 40px',
        }}>
          Log meals in seconds, get targets built around your body and your goals,
          and actually understand your nutrition. For anyone who takes what they eat seriously.
        </p>

        <div className="fade-up" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onGetStarted}
            style={{
              background: '#fff', color: '#000',
              border: 'none', padding: '14px 32px', borderRadius: 10,
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'sans-serif', transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => e.target.style.opacity = 0.88}
            onMouseLeave={e => e.target.style.opacity = 1}
          >
            Start for free
          </button>
          <button
            onClick={goToFounders}
            style={{
              background: 'none', border: '1px solid #1D9E75', color: '#1D9E75',
              padding: '14px 32px', borderRadius: 10,
              fontSize: 15, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'sans-serif', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.target.style.background = 'rgba(29,158,117,0.08)' }}
            onMouseLeave={e => { e.target.style.background = 'none' }}
          >
            Founders pricing
          </button>
        </div>
      </div>

      {/* Features */}
      <div className="fade-up" style={{
        maxWidth: 760, margin: '0 auto 80px', padding: '0 32px',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16,
      }}>
        {[
          {
            title: 'Log a meal in under 10 seconds',
            desc: 'Say what you ate and TrueCalorie figures out the rest. No searching, no typing, no tapping through menus.',
          },
          {
            title: 'Targets built around you',
            desc: 'Calorie and macro goals calculated from your body, your activity, and your goals. Including athletic targets for high-volume training.',
          },
          {
            title: 'Any restaurant, instantly',
            desc: 'Search 800+ restaurant menus before you order. Log a real meal without guessing what is in it.',
          },
        ].map((p, i) => (
          <div key={i} style={{
            padding: '24px', border: '1px solid #1f1f1f',
            borderRadius: 14, background: '#111',
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, fontFamily: 'sans-serif' }}>{p.title}</div>
            <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, fontFamily: 'sans-serif' }}>{p.desc}</div>
          </div>
        ))}
      </div>

      {/* App mockup */}
      <div className="fade-up" style={{ maxWidth: 360, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{
          background: '#111', border: '1px solid #222', borderRadius: 24,
          padding: '28px 24px', boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Hey, Jordan</span>
            <span style={{ fontSize: 12, color: '#444' }}>stats</span>
          </div>

          {/* Calorie ring */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ position: 'relative', width: 110, height: 110 }}>
              <svg width="110" height="110" viewBox="0 0 110 110" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="55" cy="55" r="42" fill="none" stroke="#1a1a1a" strokeWidth="8" />
                <circle cx="55" cy="55" r="42" fill="none" stroke="#1D9E75" strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 42 * 0.92} ${2 * Math.PI * 42}`}
                  strokeLinecap="round" />
              </svg>
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>3,280</div>
                <div style={{ fontSize: 10, color: '#555', fontFamily: 'sans-serif', marginTop: 1 }}>of 3,550 cal</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
              {[{ label: 'Protein', val: '182g' }, { label: 'Carbs', val: '420g' }, { label: 'Fat', val: '88g' }].map(m => (
                <div key={m.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{m.val}</div>
                  <div style={{ fontSize: 10, color: '#555', fontFamily: 'sans-serif', marginTop: 1 }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Meal log */}
          <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 16 }}>
            {[
              { time: 'Breakfast', name: 'Oatmeal with banana', cal: 480 },
              { time: 'Lunch', name: 'Chipotle chicken bowl', cal: 850, rest: 'with rice, black beans' },
              { time: 'Snack', name: 'Greek yogurt', cal: 180 },
              { time: 'Dinner', name: 'Salmon + rice + broccoli', cal: 720 },
              { time: 'Snack', name: 'Protein shake', cal: 240 },
            ].map((item, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{
                  fontSize: 9, color: '#444', textTransform: 'uppercase',
                  letterSpacing: '0.08em', marginBottom: i > 0 && item.time !== [
                    'Breakfast','Lunch','Snack','Dinner','Snack'][i-1] ? 8 : 0,
                  fontFamily: 'sans-serif',
                }}>
                  {item.time}
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: '1px solid #1a1a1a',
                }}>
                  <div>
                    <div style={{ fontSize: 13 }}>{item.name}</div>
                    {item.rest && <div style={{ fontSize: 11, color: '#555', marginTop: 2, fontFamily: 'sans-serif' }}>{item.rest}</div>}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, fontFamily: 'sans-serif' }}>{item.cal}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Social proof */}
      <div className="fade-up" style={{
        maxWidth: 760, margin: '0 auto 80px', padding: '0 32px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 13, color: '#444', fontFamily: 'sans-serif' }}>
          Used by athletes, runners, and fitness enthusiasts who want accurate nutrition data
        </div>
      </div>

      {/* Founders banner */}
      <div className="fade-up" style={{ maxWidth: 760, margin: '0 auto 60px', padding: '0 32px' }}>
        <div
          onClick={goToFounders}
          style={{
            padding: '20px 28px',
            border: '1px solid #1a5c3a',
            borderRadius: 14,
            background: 'linear-gradient(135deg, #0d2e22 0%, #0a1f17 100%)',
            cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: 16, flexWrap: 'wrap', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#1D9E75' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a5c3a' }}
        >
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{
              fontSize: 10, letterSpacing: '0.15em', color: '#1D9E75',
              fontFamily: 'sans-serif', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600,
            }}>
              Founders Membership. Limited spots.
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              Lock in Pro for $79.99 a year, forever.
            </div>
            <div style={{ fontSize: 13, color: '#888', fontFamily: 'sans-serif' }}>
              100 spots total. Price locks in permanently when you join.
            </div>
          </div>
          <div style={{ fontSize: 22, color: '#1D9E75', flexShrink: 0 }}>›</div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #1a1a1a', padding: '32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12,
      }}>
        <span style={{ fontSize: 13, color: '#444', fontFamily: 'sans-serif' }}>
          TrueCalorie LLC
        </span>
        <div style={{ display: 'flex', gap: 24 }}>
          {[
            { label: 'Privacy', action: goToPrivacy },
            { label: 'Terms', action: goToTerms },
            { label: 'Sign in', action: onGetStarted },
          ].map(l => (
            <button key={l.label} onClick={l.action} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: '#444', fontFamily: 'sans-serif',
              transition: 'color 0.15s', padding: 0,
            }}
            onMouseEnter={e => e.target.style.color = '#fff'}
            onMouseLeave={e => e.target.style.color = '#444'}
            >{l.label}</button>
          ))}
        </div>
      </footer>

    </div>
  )
}
