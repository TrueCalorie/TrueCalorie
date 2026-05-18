import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Stripe Payment Link — replace this with your actual Payment Link URL from Stripe Dashboard
// Setup: stripe.com → Payment Links → New → $79/year recurring → copy URL here
const STRIPE_PAYMENT_LINK = import.meta.env.VITE_STRIPE_FOUNDERS_LINK || ''

// Total founder spots available — adjust as needed
const FOUNDER_CAP = 100

export default function Founders({ onBack }) {
  const [claimed, setClaimed] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fade-up animation matching Landing.jsx pattern
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

    // Fetch current founder count from Supabase
    fetchClaimedCount()
  }, [])

  const fetchClaimedCount = async () => {
    const { count, error } = await supabase
      .from('founders')
      .select('*', { count: 'exact', head: true })
    if (!error && count !== null) setClaimed(count)
    setLoading(false)
  }

  const handleClaim = () => {
    if (!STRIPE_PAYMENT_LINK) {
      alert('Stripe checkout is not configured yet. Please contact us.')
      return
    }
    // Stripe Payment Link handles checkout entirely
    // After payment, Stripe webhook updates the founders table
    window.location.href = STRIPE_PAYMENT_LINK
  }

  const spotsLeft = Math.max(0, FOUNDER_CAP - claimed)
  const isFull = spotsLeft === 0

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
        {onBack && (
          <button
            onClick={onBack}
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
            ← Back
          </button>
        )}
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
          color: '#1D9E75',
          fontFamily: 'sans-serif',
          marginBottom: 28,
          textTransform: 'uppercase',
          fontWeight: 600,
        }}>
          Founders' Membership · Limited to {FOUNDER_CAP}
        </div>

        <h1 className="fade-up" style={{
          fontSize: 42,
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.03em',
          marginBottom: 24,
          textAlign: 'center',
        }}>
          Lock in Pro<br />
          <span style={{ color: '#555' }}>before the world finds us.</span>
        </h1>

        <p className="fade-up" style={{
          fontSize: 17,
          color: '#888',
          lineHeight: 1.7,
          marginBottom: 40,
          fontFamily: 'sans-serif',
          maxWidth: 520,
          margin: '0 auto 40px',
        }}>
          We're building the calorie tracker athletes actually deserve.
          Founders get every Pro feature — forever — at a price the public will never see.
        </p>

        {/* Price card */}
        <div className="fade-up" style={{
          maxWidth: 420,
          margin: '0 auto 32px',
          padding: '32px 28px',
          border: '1px solid #1f1f1f',
          borderRadius: 16,
          background: '#111',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.03em' }}>$79</span>
            <span style={{ fontSize: 16, color: '#666', fontFamily: 'sans-serif' }}>/year</span>
          </div>
          <div style={{ fontSize: 13, color: '#666', fontFamily: 'sans-serif', marginBottom: 24 }}>
            Public price will be <span style={{ textDecoration: 'line-through' }}>$119/year</span>. Founders pay $79 forever.
          </div>

          <button
            onClick={handleClaim}
            disabled={isFull || loading}
            style={{
              width: '100%',
              background: isFull ? '#1a1a1a' : '#fff',
              color: isFull ? '#555' : '#000',
              border: 'none',
              padding: '16px 40px',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              fontFamily: 'sans-serif',
              cursor: isFull || loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => { if (!isFull && !loading) e.target.style.background = '#e5e5e5' }}
            onMouseLeave={e => { if (!isFull && !loading) e.target.style.background = '#fff' }}
          >
            {loading ? 'Loading...' : isFull ? 'All spots claimed' : 'Claim founder spot'}
          </button>

          <div style={{ fontSize: 12, color: '#666', marginTop: 14, fontFamily: 'sans-serif' }}>
            {loading ? '—' : isFull
              ? 'Join the waitlist for public launch'
              : `${spotsLeft} of ${FOUNDER_CAP} spots remaining`
            }
          </div>
        </div>

        <div className="fade-up" style={{ fontSize: 12, color: '#444', fontFamily: 'sans-serif' }}>
          Pro features launch Q3 2026. Cancel anytime before then for a full refund.
        </div>
      </div>

      {/* What you get */}
      <div className="fade-up" style={{
        maxWidth: 760,
        margin: '0 auto 80px',
        padding: '0 32px',
      }}>
        <div style={{
          fontSize: 11,
          letterSpacing: '0.15em',
          color: '#555',
          fontFamily: 'sans-serif',
          marginBottom: 24,
          textTransform: 'uppercase',
          textAlign: 'center',
        }}>
          What's included
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
        }}>
          {[
            {
              title: 'Restaurant search',
              desc: '190,000+ menu items from 800+ chains. Powered by the most accurate database in the industry.',
            },
            {
              title: 'AI nutrition insights',
              desc: 'Personalized recommendations based on your actual eating patterns and training load.',
            },
            {
              title: 'Strava integration',
              desc: 'Auto-sync workouts. Real TDEE that adjusts to your training week — not a static formula.',
            },
            {
              title: 'Unlimited history',
              desc: 'Every meal, every macro, forever. Export your data anytime, no questions asked.',
            },
            {
              title: 'Athlete mode',
              desc: 'Sport-specific calorie cycling, refeed scheduling, and macro periodization for serious training.',
            },
            {
              title: 'Meal templates',
              desc: 'Save your go-to meals. Log breakfast in three taps. Pre-workout shake in one.',
            },
          ].map((p, i) => (
            <div key={i} style={{
              padding: '20px',
              border: '1px solid #1f1f1f',
              borderRadius: 12,
              background: '#0f0f0f',
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, fontFamily: 'sans-serif' }}>
                {p.title}
              </div>
              <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, fontFamily: 'sans-serif' }}>
                {p.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Why now */}
      <div className="fade-up" style={{
        maxWidth: 640,
        margin: '0 auto 80px',
        padding: '0 32px',
      }}>
        <div style={{
          padding: '32px',
          border: '1px solid #1f1f1f',
          borderRadius: 14,
          background: '#111',
        }}>
          <div style={{ fontSize: 11, letterSpacing: '0.15em', color: '#1D9E75', fontFamily: 'sans-serif', marginBottom: 16, textTransform: 'uppercase', fontWeight: 600 }}>
            A note from the builder
          </div>
          <p style={{ fontSize: 15, color: '#bbb', lineHeight: 1.7, fontFamily: 'sans-serif', marginBottom: 16 }}>
            I'm a college athlete building TrueCalorie because every other tracker treats my diet like
            a diet, not like training. Founders' membership exists because I'm raising the capital to
            unlock the restaurant database that makes 10-second logging possible.
          </p>
          <p style={{ fontSize: 15, color: '#bbb', lineHeight: 1.7, fontFamily: 'sans-serif' }}>
            Your $79 funds the API access that powers Pro for every user. In return,
            you get founder pricing for life and a direct line to me on what to build next.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div className="fade-up" style={{
        maxWidth: 640,
        margin: '0 auto 80px',
        padding: '0 32px',
      }}>
        <div style={{
          fontSize: 11,
          letterSpacing: '0.15em',
          color: '#555',
          fontFamily: 'sans-serif',
          marginBottom: 20,
          textTransform: 'uppercase',
        }}>
          Common questions
        </div>

        {[
          {
            q: 'When does Pro actually launch?',
            a: 'Q3 2026. Founders get access the moment it goes live — and a few weeks of beta access before that.',
          },
          {
            q: 'What if it doesn\'t launch?',
            a: 'Full refund, no questions. If Pro doesn\'t ship by end of Q4 2026, you get your money back automatically.',
          },
          {
            q: 'Will the price ever go up for me?',
            a: 'Never. Founders are locked at $79/year for life. Public pricing will be $119/year ($9.99/mo monthly).',
          },
          {
            q: 'Can I cancel?',
            a: 'Anytime. Annual billing means you keep access for the full year you paid for, then it simply doesn\'t renew.',
          },
          {
            q: 'Does this include grocery + barcode?',
            a: 'Those features are already free for everyone. Founders unlock everything beyond that — restaurant search, AI insights, Strava, athlete mode, all of it.',
          },
        ].map((item, i) => (
          <div key={i} style={{
            padding: '20px 0',
            borderBottom: i < 4 ? '1px solid #1a1a1a' : 'none',
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, fontFamily: 'sans-serif' }}>
              {item.q}
            </div>
            <div style={{ fontSize: 14, color: '#777', lineHeight: 1.6, fontFamily: 'sans-serif' }}>
              {item.a}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="fade-up" style={{
        textAlign: 'center',
        padding: '60px 32px 80px',
        borderTop: '1px solid #1a1a1a',
      }}>
        <div style={{ fontSize: 11, letterSpacing: '0.15em', color: '#555', fontFamily: 'sans-serif', marginBottom: 20, textTransform: 'uppercase' }}>
          {isFull ? 'All founder spots claimed' : 'Spots are limited'}
        </div>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 32 }}>
          {isFull
            ? <>Join the waitlist for<br /><span style={{ color: '#555' }}>public launch.</span></>
            : <>Build it with us.<br /><span style={{ color: '#555' }}>Get founder pricing for life.</span></>
          }
        </h2>
        {!isFull && (
          <button
            onClick={handleClaim}
            disabled={loading}
            style={{
              background: '#fff',
              color: '#000',
              border: 'none',
              padding: '16px 40px',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              fontFamily: 'sans-serif',
              cursor: loading ? 'wait' : 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { if (!loading) e.target.style.background = '#e5e5e5' }}
            onMouseLeave={e => { if (!loading) e.target.style.background = '#fff' }}
          >
            Claim founder spot — $79/year
          </button>
        )}
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
        <span style={{ fontSize: 12, color: '#333', fontFamily: 'sans-serif' }}>
          Nutrition data provided by <a href="https://nutritionix.com" target="_blank" rel="noopener noreferrer" style={{ color: '#444', textDecoration: 'none' }}>Nutritionix.com</a>
        </span>
      </div>

    </div>
  )
}
