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
          Built for athletes who actually train
        </div>

        <h1 className="fade-up" style={{
          fontSize: 'clamp(36px, 6vw, 54px)', fontWeight: 700,
          lineHeight: 1.12, letterSpacing: '-0.03em',
          marginBottom: 28, textAlign: 'center',
        }}>
          Every calorie tracker<br />
          you have tried was built<br />
          <span style={{ color: '#555' }}>for someone who trains less.</span>
        </h1>

        <p className="fade-up" style={{
          fontSize: 17, color: '#666', lineHeight: 1.75,
          marginBottom: 40, fontFamily: 'sans-serif',
          maxWidth: 520, margin: '0 auto 40px',
        }}>
          Standard formulas cap out around 3,200 calories a day. If you are
          running 70 miles a week, training twice a day, or competing in season,
          that number can leave you 700 calories short every single day.
          TrueCalorie calculates your targets from your actual sport and training load.
        </p>

        <div className="fade-up">
          <button
            onClick={onGetStarted}
            style={{
              background: '#fff', color: '#000', border: 'none',
              padding: '16px 40px', borderRadius: 10, fontSize: 15,
              fontWeight: 600, fontFamily: 'sans-serif', cursor: 'pointer',
              transition: 'all 0.2s', letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => { e.target.style.background = '#e5e5e5' }}
            onMouseLeave={e => { e.target.style.background = '#fff' }}
          >Start free</button>
          <div style={{ fontSize: 12, color: '#444', marginTop: 12, fontFamily: 'sans-serif' }}>
            7-day trial. No credit card.
          </div>
        </div>
      </div>

      {/* Three pillars */}
      <div className="fade-up" style={{
        maxWidth: 760, margin: '0 auto 80px', padding: '0 32px',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24,
      }}>
        {[
          {
            title: 'Log your meal in 10 seconds',
            desc: 'Just say it. Voice logging turns a full meal into a few words. No searching, no barcodes, no tapping through menus.',
          },
          {
            title: 'Targets built for your training',
            desc: 'Choose your sport and enter your weekly volume. Get calorie and macro targets that reflect what your body is actually doing, not a formula that stops at 3,200.',
          },
          {
            title: 'Any chain restaurant, instantly',
            desc: 'Chipotle, Chick-fil-A, Sweetgreen and 25 more. Find any menu item in a few taps. Log a real meal before you finish eating it.',
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
                {/* 3,280 of 3,550 = 92% full. offset = 263.9 * 0.08 = 21 */}
                <circle cx="55" cy="55" r="42" fill="none" stroke="#1D9E75" strokeWidth="8"
                  strokeDasharray="263.9" strokeDashoffset="21" strokeLinecap="round" />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 18, fontWeight: 600 }}>3,280</span>
                <span style={{ fontSize: 10, color: '#555', marginTop: 1 }}>of 3,550 cal</span>
              </div>
            </div>
            {/* Macro pills */}
            <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
              {[
                { l: 'protein', v: '128g' },
                { l: 'carbs',   v: '518g' },
                { l: 'fat',     v: '86g'  },
              ].map(m => (
                <div key={m.l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{m.v}</div>
                  <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{m.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Search bar mockup */}
          <div style={{
            background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8,
            padding: '10px 14px', fontSize: 13, color: '#444',
            marginBottom: 20, fontFamily: 'sans-serif',
          }}>
            search any food or restaurant...
          </div>

          {/* Meal log items */}
          {[
            { name: 'Overnight oats',        rest: null,       cal: 620,  time: 'BREAKFAST'    },
            { name: 'Burrito bowl',          rest: 'Chipotle', cal: 870,  time: 'LUNCH'        },
            { name: 'Pasta + chicken',       rest: null,       cal: 730,  time: 'DINNER'       },
            { name: 'Banana and peanut butter', rest: null,    cal: 280,  time: 'SNACK'        },
          ].map((item, i) => (
            <div key={i}>
              <div style={{
                fontSize: 9, color: '#444', letterSpacing: '0.08em',
                marginBottom: 6, marginTop: i > 0 ? 12 : 0, fontFamily: 'sans-serif',
              }}>
                {item.time}
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: '1px solid #1a1a1a',
              }}>
                <div>
                  <div style={{ fontSize: 13 }}>{item.name}</div>
                  {item.rest && <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{item.rest}</div>}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{item.cal} cal</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Social proof */}
      <div className="fade-up" style={{
        maxWidth: 760, margin: '0 auto 80px', padding: '0 32px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 13, color: '#444', fontFamily: 'sans-serif' }}>
          Used by athletes at South Dakota School of Mines and Technology
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
              Founders Membership · Limited spots
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              Lock in Pro for $79 a year, forever.
            </div>
            <div style={{ fontSize: 13, color: '#888', fontFamily: 'sans-serif' }}>
              100 spots total. Public price starts at $119/year.
            </div>
          </div>
          <div style={{ fontSize: 13, color: '#fff', fontFamily: 'sans-serif', fontWeight: 500, whiteSpace: 'nowrap' }}>
            Learn more →
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fade-up" style={{
        textAlign: 'center', padding: '60px 32px 80px', borderTop: '1px solid #1a1a1a',
      }}>
        <h2 style={{
          fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700,
          letterSpacing: '-0.03em', marginBottom: 16,
        }}>
          Start training with<br />
          <span style={{ color: '#555' }}>the right numbers.</span>
        </h2>
        <p style={{
          fontSize: 15, color: '#555', fontFamily: 'sans-serif',
          marginBottom: 32, lineHeight: 1.6,
        }}>
          7-day free trial. No credit card required.
        </p>
        <button
          onClick={onGetStarted}
          style={{
            background: '#fff', color: '#000', border: 'none',
            padding: '16px 40px', borderRadius: 10, fontSize: 15,
            fontWeight: 600, fontFamily: 'sans-serif', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.target.style.background = '#e5e5e5' }}
          onMouseLeave={e => { e.target.style.background = '#fff' }}
        >Get started free</button>
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #1a1a1a', padding: '24px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: 'sans-serif', flexWrap: 'wrap', gap: 12,
      }}>
        <span style={{ fontSize: 13, color: '#333' }}>© 2026 TrueCalorie LLC</span>
        <div style={{ display: 'flex', gap: 18, fontSize: 12, alignItems: 'center' }}>
          <button onClick={goToPrivacy}  style={{ background: 'none', border: 'none', color: '#666', fontSize: 12, cursor: 'pointer', fontFamily: 'sans-serif', padding: 0 }}>Privacy Policy</button>
          <button onClick={goToTerms}    style={{ background: 'none', border: 'none', color: '#666', fontSize: 12, cursor: 'pointer', fontFamily: 'sans-serif', padding: 0 }}>Terms of Service</button>
          <button onClick={onGetStarted} style={{ background: 'none', border: 'none', color: '#333', fontSize: 13, cursor: 'pointer', fontFamily: 'sans-serif', padding: 0 }}>Get started →</button>
        </div>
      </footer>

    </div>
  )
}
