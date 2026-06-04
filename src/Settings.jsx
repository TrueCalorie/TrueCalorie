import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { usePro } from './hooks/usePro'
import Purchases from './Purchases'
import StravaConnect from './components/StravaConnect'
import BodyFitnessPage from './components/BodyFitnessPage'

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.09em',
      color: 'var(--muted)', textTransform: 'uppercase',
      marginBottom: 8, padding: '0 4px',
    }}>
      {children}
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, overflow: 'hidden', ...style,
    }}>
      {children}
    </div>
  )
}

function Row({ label, children, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '13px 16px',
      borderBottom: last ? 'none' : '1px solid var(--border)',
      gap: 12,
    }}>
      <span style={{ fontSize: 15, color: 'var(--text)', flexShrink: 0 }}>{label}</span>
      {children}
    </div>
  )
}

function Segmented({ value, onChange, options }) {
  return (
    <div style={{
      display: 'flex', background: 'var(--surface2)',
      borderRadius: 8, padding: 2, gap: 2,
    }}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: '5px 12px', borderRadius: 6, border: 'none',
            background: value === o.value ? 'var(--text)' : 'transparent',
            color: value === o.value ? 'var(--bg)' : 'var(--muted)',
            fontSize: 12, fontWeight: value === o.value ? 600 : 400,
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'background 0.15s, color 0.15s',
          }}
        >{o.label}</button>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Settings({ session, settings, onUpdate, onClose, onUpgrade }) {
  const { isPro, isTrialing, trialDaysLeft, loading, source, expiresAt, cancelAtPeriodEnd } = usePro()
  const isProUser    = isPro || isTrialing
  const isFounder    = source === 'founder'
  const isMonthlyPro = isPro && !isTrialing && source === 'monthly'

  const [form, setForm] = useState({
    calorie_goal: settings?.calorie_goal || 2000,
    protein_goal: settings?.protein_goal || 150,
    carbs_goal:   settings?.carbs_goal   || 250,
    fat_goal:     settings?.fat_goal     || 65,
  })

  // Keep nutrition goal form in sync when BodyFitnessPage applies calculated targets
  useEffect(() => {
    setForm(f => ({
      ...f,
      calorie_goal: settings?.calorie_goal ?? f.calorie_goal,
      protein_goal: settings?.protein_goal ?? f.protein_goal,
      carbs_goal:   settings?.carbs_goal   ?? f.carbs_goal,
      fat_goal:     settings?.fat_goal     ?? f.fat_goal,
    }))
  }, [settings?.calorie_goal, settings?.protein_goal, settings?.carbs_goal, settings?.fat_goal])

  const [saving, setSaving]               = useState(false)
  const [saved, setSaved]                 = useState(false)
  const [showBodyFitness, setShowBodyFitness] = useState(false)
  const [showPurchases, setShowPurchases] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError]     = useState(null)
  const [currentTheme, setCurrentThemeState] = useState(
    () => localStorage.getItem('tc-theme') || 'system'
  )

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const setTheme = (val) => {
    setCurrentThemeState(val)
    localStorage.setItem('tc-theme', val)
    const root = document.documentElement
    if (val === 'dark')   { root.setAttribute('data-theme', 'dark') }
    else if (val === 'light') { root.setAttribute('data-theme', 'light') }
    else { root.removeAttribute('data-theme') }
  }

  const save = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('user_settings')
      .update({
        calorie_goal: parseInt(form.calorie_goal),
        protein_goal: parseInt(form.protein_goal),
        carbs_goal:   parseInt(form.carbs_goal),
        fat_goal:     parseInt(form.fat_goal),
      })
      .eq('user_id', session.user.id)

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      if (onUpdate) onUpdate()
    }
  }

  const openPortal = async () => {
    setPortalLoading(true)
    setPortalError(null)
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const res  = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession?.access_token}` },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data?.url) window.location.href = data.url
      else setPortalError(data?.error || 'Something went wrong. Try again.')
    } catch {
      setPortalError('Something went wrong. Try again.')
    } finally {
      setPortalLoading(false)
    }
  }

  const renewDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const goalInputStyle = (key) => ({
    type:     'number',
    value:    form[key],
    onChange: e => update(key, e.target.value),
    style: {
      width: 72, textAlign: 'right',
      background: 'none',
      border: 'none', outline: 'none', fontSize: 15, color: 'var(--text)',
      fontFamily: 'inherit', padding: 0, borderRadius: 4,
      MozAppearance: 'textfield',
    },
  })

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: 'var(--bg)', minHeight: '100vh', fontFamily: 'inherit' }}>

      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '16px 16px 14px',
        borderBottom: '1px solid var(--border)', position: 'sticky', top: 0,
        background: 'var(--bg)', zIndex: 1,
      }}>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          color: 'var(--text)', fontSize: 20, lineHeight: 1, marginRight: 12,
        }}>←</button>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em', flex: 1 }}>
          Settings
        </span>
        <button onClick={save} disabled={saving} style={{
          background: 'none', border: 'none', fontSize: 15, fontWeight: 600,
          color: saved ? '#22c55e' : 'var(--accent)',
          cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit',
          padding: '4px 8px', transition: 'color 0.2s', opacity: saving ? 0.5 : 1,
        }}>
          {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div style={{ padding: '20px 16px 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── SUBSCRIPTION ───────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Subscription</SectionLabel>
          <Card>
            <button onClick={() => setShowPurchases(true)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
              borderBottom: isMonthlyPro ? '1px solid var(--border)' : 'none',
              opacity: loading ? 0 : 1, transition: 'opacity 0.3s',
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', textAlign: 'left',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>Plan</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {isFounder && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
                      color: '#1D9E75', background: 'rgba(29,158,117,0.1)',
                      border: '1px solid rgba(29,158,117,0.25)',
                      borderRadius: 4, padding: '2px 6px',
                    }}>FOUNDER</span>
                  )}
                  {isPro && !isFounder && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
                      color: '#1D9E75', background: 'rgba(29,158,117,0.1)',
                      border: '1px solid rgba(29,158,117,0.25)',
                      borderRadius: 4, padding: '2px 6px',
                    }}>PRO</span>
                  )}
                  {isTrialing && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                      color: '#f5a623', background: 'rgba(245,166,35,0.1)',
                      border: '1px solid rgba(245,166,35,0.25)',
                      borderRadius: 4, padding: '2px 6px',
                    }}>TRIAL · {trialDaysLeft}d left</span>
                  )}
                  {!isPro && !isTrialing && !loading && (
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>Free</span>
                  )}
                </div>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: 16, opacity: 0.4 }}>›</span>
            </button>

            {isMonthlyPro && (
              <div>
                {renewDate && (
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--muted)' }}>
                    {cancelAtPeriodEnd ? `Pro until ${renewDate}, won't renew` : `Renews ${renewDate}`}
                  </div>
                )}
                <button onClick={openPortal} disabled={portalLoading} style={{
                  width: '100%', padding: '13px 16px', background: 'none', border: 'none',
                  borderBottom: 'none', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', cursor: portalLoading ? 'default' : 'pointer',
                  fontFamily: 'inherit', opacity: portalLoading ? 0.6 : 1,
                }}>
                  <span style={{ fontSize: 15, color: 'var(--text)' }}>
                    {portalLoading ? 'Opening…' : 'Manage billing'}
                  </span>
                  <span style={{ color: 'var(--muted)', fontSize: 16, opacity: 0.5 }}>›</span>
                </button>
                {portalError && (
                  <p style={{ fontSize: 12, color: '#ef4444', padding: '0 16px 12px', margin: 0 }}>
                    {portalError}
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* ── NUTRITION GOALS ─────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Nutrition Goals</SectionLabel>
          <Card>
            <Row label="Calories">
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input {...goalInputStyle('calorie_goal')} style={{ ...goalInputStyle('calorie_goal').style, width: 80 }} />
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>cal</span>
              </div>
            </Row>
            <Row label="Protein">
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input {...goalInputStyle('protein_goal')} />
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>g</span>
              </div>
            </Row>
            <Row label="Carbs">
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input {...goalInputStyle('carbs_goal')} />
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>g</span>
              </div>
            </Row>
            <Row label="Fat" last>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input {...goalInputStyle('fat_goal')} />
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>g</span>
              </div>
            </Row>
          </Card>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, padding: '0 4px' }}>
            Edit manually, or use the calculators below to set targets from your profile.
          </p>
        </div>

        {/* ── BODY & FITNESS ──────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Body & Fitness</SectionLabel>
          <Card>
            <button onClick={() => setShowBodyFitness(true)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '14px 16px', background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            }}>
              <span style={{ fontSize: 15, color: 'var(--text)' }}>Profile, targets, sport</span>
              <span style={{ color: 'var(--muted)', fontSize: 16, opacity: 0.4 }}>›</span>
            </button>
          </Card>
        </div>

        {/* ── INTEGRATIONS ── */}
        <div>
          <SectionLabel>Integrations</SectionLabel>
          <Card style={{ padding: 0 }}>
            <StravaConnect session={session} />
          </Card>
        </div>

        {/* ── APPEARANCE ──────────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Appearance</SectionLabel>
          <Card>
            <Row label="Theme" last>
              <Segmented value={currentTheme} onChange={setTheme}
                options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
            </Row>
          </Card>
        </div>

        {/* ── ACCOUNT ──────────────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Account</SectionLabel>
          <Card>
            <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>Signed in as</div>
              <div style={{ fontSize: 14, color: 'var(--text)' }}>{session.user.email}</div>
            </div>
            {[
              { label: 'Sign out',        action: () => supabase.auth.signOut() },
              { label: 'Privacy Policy',  action: () => window.open('/privacy', '_blank') },
              { label: 'Terms of Service', action: () => window.open('/terms', '_blank') },
            ].map((item, i, arr) => (
              <button key={item.label} onClick={item.action} style={{
                width: '100%', padding: '13px 16px', background: 'none', border: 'none',
                borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <span style={{ fontSize: 15, color: 'var(--text)' }}>{item.label}</span>
                <span style={{ color: 'var(--muted)', fontSize: 16, opacity: 0.4 }}>›</span>
              </button>
            ))}
          </Card>
        </div>

        <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: -8 }}>
          TrueCalorie · truecalorie.net
        </p>

      </div>

      {/* ── Body & Fitness overlay ───────────────────────────────────────── */}
      {showBodyFitness && (
        <BodyFitnessPage
          session={session}
          settings={settings}
          onUpdate={onUpdate}
          onClose={() => setShowBodyFitness(false)}
          isPro={isPro}
          isTrialing={isTrialing}
        />
      )}

      {/* ── Purchases overlay ────────────────────────────────────────────── */}
      {showPurchases && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'var(--bg)', overflowY: 'auto', fontFamily: 'inherit',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '16px 16px 14px', borderBottom: '1px solid var(--border)',
            position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1,
          }}>
            <button onClick={() => setShowPurchases(false)} style={{
              background: 'none', border: 'none', padding: 0,
              cursor: 'pointer', color: 'var(--text)', fontSize: 20, lineHeight: 1,
            }}>←</button>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
              Subscription
            </span>
          </div>
          <Purchases session={session} onClose={() => setShowPurchases(false)} />
        </div>
      )}
    </div>
  )
}
