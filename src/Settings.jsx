import { useState } from 'react'
import { supabase } from './supabase'
import { calculateGoals } from './macros'
import { usePro } from './hooks/usePro'

// ─── Row component — label left, control/value right ─────────────────────────
function Row({ label, children, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '13px 16px',
      borderBottom: last ? 'none' : '1px solid var(--border)',
      gap: 12,
    }}>
      <span style={{ fontSize: 15, color: 'var(--text)', flexShrink: 0 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flex: 1 }}>
        {children}
      </div>
    </div>
  )
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: 'var(--muted)',
      letterSpacing: '0.09em', textTransform: 'uppercase',
      padding: '0 4px', marginBottom: 8,
    }}>
      {children}
    </div>
  )
}

// ─── Inline number input ──────────────────────────────────────────────────────
function NumInput({ value, onChange, suffix }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <input
        type="number"
        value={value}
        onChange={onChange}
        style={{
          width: 72, textAlign: 'right',
          background: 'none', border: 'none', outline: 'none',
          fontSize: 15, color: 'var(--text)',
          fontFamily: 'inherit', padding: 0,
          MozAppearance: 'textfield',
        }}
      />
      {suffix && <span style={{ fontSize: 13, color: 'var(--muted)' }}>{suffix}</span>}
    </div>
  )
}

// ─── Segmented control ────────────────────────────────────────────────────────
function Segmented({ options, value, onChange }) {
  return (
    <div style={{
      display: 'inline-flex',
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
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
  const { isPro, isTrialing, trialDaysLeft, source, expiresAt } = usePro()
  const isFounder     = source === 'founder'
  const isMonthlyPro  = isPro && !isTrialing && source === 'monthly'

  // Height conversion
  const heightToFeetInches = (cm) => {
    if (!cm) return { ft: '', in: '' }
    const totalInches = cm / 2.54
    const ft = Math.floor(totalInches / 12)
    const ins = Math.round(totalInches - ft * 12)
    return { ft: String(ft), in: String(ins) }
  }
  const initialHeight = heightToFeetInches(settings?.height_cm)

  const [form, setForm] = useState({
    display_name:   settings?.display_name  || '',
    calorie_goal:   settings?.calorie_goal  || 2000,
    protein_goal:   settings?.protein_goal  || 150,
    carbs_goal:     settings?.carbs_goal    || 250,
    fat_goal:       settings?.fat_goal      || 65,
    age:            settings?.age           || '',
    sex:            settings?.sex           || '',
    height_ft:      initialHeight.ft,
    height_in:      initialHeight.in,
    weight_lbs:     settings?.weight_kg ? Math.round(settings.weight_kg * 2.20462) : '',
    activity_level: settings?.activity_level || '',
    goal:           settings?.goal           || '',
  })

  const [saving,        setSaving]        = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [recalcFlash,   setRecalcFlash]   = useState(false)
  const [bodyOpen,      setBodyOpen]      = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError,   setPortalError]   = useState('')
  const [currentTheme,  setCurrentTheme]  = useState(
    localStorage.getItem('theme') || 'system'
  )

  const update = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const setTheme = (t) => {
    setCurrentTheme(t)
    if (t === 'system') {
      document.documentElement.removeAttribute('data-theme')
      localStorage.removeItem('theme')
    } else {
      document.documentElement.setAttribute('data-theme', t)
      localStorage.setItem('theme', t)
    }
  }

  const canRecalculate = Boolean(
    form.age && form.sex &&
    form.height_ft && form.height_in &&
    form.weight_lbs && form.activity_level && form.goal
  )

  const recalculate = () => {
    if (!canRecalculate) return
    const height_cm = (parseInt(form.height_ft) * 12 + parseInt(form.height_in)) * 2.54
    const weight_kg = parseFloat(form.weight_lbs) * 0.453592
    const goals = calculateGoals({
      age:            parseInt(form.age),
      sex:            form.sex,
      height_cm,
      weight_kg,
      activity_level: form.activity_level,
      goal:           form.goal,
    })
    setForm(f => ({ ...f, ...goals }))
    setRecalcFlash(true)
    setTimeout(() => setRecalcFlash(false), 1500)
    // Auto-open goals section so user sees what changed
  }

  const save = async () => {
    setSaving(true)
    const updates = {
      display_name:   form.display_name,
      calorie_goal:   parseInt(form.calorie_goal),
      protein_goal:   parseInt(form.protein_goal),
      carbs_goal:     parseInt(form.carbs_goal),
      fat_goal:       parseInt(form.fat_goal),
      activity_level: form.activity_level,
      goal:           form.goal,
    }
    if (form.age)                            updates.age        = parseInt(form.age)
    if (form.sex)                            updates.sex        = form.sex
    if (form.height_ft && form.height_in) {
      const cm = (parseInt(form.height_ft) * 12 + parseInt(form.height_in)) * 2.54
      updates.height_cm = Math.round(cm * 10) / 10
    }
    if (form.weight_lbs) {
      updates.weight_kg = Math.round(parseFloat(form.weight_lbs) * 0.453592 * 10) / 10
    }

    await supabase.from('user_settings').update(updates).eq('user_id', session.user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    onUpdate()
  }

  const openPortal = async () => {
    setPortalLoading(true)
    setPortalError('')
    try {
      const res  = await fetch('/api/create-portal-session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: session.user.id }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setPortalError(data.error || 'Could not open billing portal.')
      }
    } catch {
      setPortalError('Something went wrong. Try again.')
    } finally {
      setPortalLoading(false)
    }
  }

  // Subscription card content
  const renewDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const goalInput = (key, suffix) => ({
    type:     'number',
    value:    form[key],
    onChange: e => update(key, e.target.value),
    style: {
      width: 72, textAlign: 'right',
      background: recalcFlash ? 'rgba(29,158,117,0.12)' : 'none',
      border: 'none', outline: 'none',
      fontSize: 15, color: 'var(--text)',
      fontFamily: 'inherit', padding: 0,
      borderRadius: 4,
      transition: 'background 0.4s',
      MozAppearance: 'textfield',
    },
  })

  return (
    <div style={{
      maxWidth: 480, margin: '0 auto',
      background: 'var(--bg)', minHeight: '100vh',
      fontFamily: 'inherit',
    }}>

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '16px 16px 14px',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0,
        background: 'var(--bg)', zIndex: 1,
      }}>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', padding: 0,
            cursor: 'pointer', color: 'var(--text)',
            fontSize: 20, lineHeight: 1, marginRight: 12,
          }}
        >←</button>
        <span style={{
          fontSize: 18, fontWeight: 700, color: 'var(--text)',
          letterSpacing: '-0.01em', flex: 1,
        }}>Settings</span>
        <button
          onClick={save}
          disabled={saving}
          style={{
            background: 'none', border: 'none',
            fontSize: 15, fontWeight: 600,
            color: saved ? '#22c55e' : 'var(--accent)',
            cursor: saving ? 'default' : 'pointer',
            fontFamily: 'inherit', padding: '4px 8px',
            transition: 'color 0.2s',
            opacity: saving ? 0.5 : 1,
          }}
        >
          {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* ── Scrollable content ────────────────────────────────────────────── */}
      <div style={{ padding: '20px 16px 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── SUBSCRIPTION ── */}
        <div>
          <SectionLabel>Subscription</SectionLabel>
          <Card>
            {/* Status row */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px',
              borderBottom: (isMonthlyPro || isTrialing || (!isPro && !isTrialing)) ? '1px solid var(--border)' : 'none',
            }}>
              {/* Badge */}
              <div style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                letterSpacing: '0.06em',
                background: isFounder
                  ? 'rgba(251,191,36,0.15)'
                  : isPro
                  ? 'rgba(29,158,117,0.12)'
                  : isTrialing
                  ? 'rgba(245,158,11,0.12)'
                  : 'var(--surface2)',
                color: isFounder
                  ? '#d97706'
                  : isPro
                  ? '#1D9E75'
                  : isTrialing
                  ? '#d97706'
                  : 'var(--muted)',
                border: `1px solid ${
                  isFounder ? 'rgba(217,119,6,0.3)'
                  : isPro    ? 'rgba(29,158,117,0.25)'
                  : isTrialing ? 'rgba(245,158,11,0.3)'
                  : 'var(--border)'
                }`,
                flexShrink: 0,
              }}>
                {isFounder ? '✦ FOUNDER' : isPro ? 'PRO' : isTrialing ? 'TRIAL' : 'FREE'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                  {isFounder
                    ? 'Lifetime Pro access'
                    : isMonthlyPro
                    ? `Pro${renewDate ? ` · renews ${renewDate}` : ''}`
                    : isTrialing
                    ? `Trial · ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left`
                    : 'Free plan'}
                </div>
                {isFounder && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    You were here first — every feature, permanently.
                  </div>
                )}
              </div>
            </div>

            {/* Action row */}
            {isMonthlyPro && (
              <div style={{ padding: '4px 0' }}>
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', padding: '13px 16px',
                    background: 'none', border: 'none',
                    cursor: portalLoading ? 'default' : 'pointer',
                    fontFamily: 'inherit', opacity: portalLoading ? 0.6 : 1,
                  }}
                >
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

            {(isTrialing || (!isPro && !isTrialing)) && (
              <button
                onClick={onUpgrade || onClose}
                style={{
                  width: '100%', padding: '13px 16px',
                  background: 'none', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: 15, color: 'var(--accent)', fontWeight: 500 }}>
                  {isTrialing ? 'Subscribe before trial ends' : 'Upgrade to Pro'}
                </span>
                <span style={{ color: 'var(--accent)', fontSize: 16, opacity: 0.7 }}>›</span>
              </button>
            )}
          </Card>
        </div>

        {/* ── NUTRITION GOALS ── */}
        <div>
          <SectionLabel>Nutrition Goals</SectionLabel>
          <Card>
            <Row label="Calories">
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input {...goalInput('calorie_goal')} style={{ ...goalInput('calorie_goal').style, width: 80 }} />
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>cal</span>
              </div>
            </Row>
            <Row label="Protein">
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input {...goalInput('protein_goal')} />
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>g</span>
              </div>
            </Row>
            <Row label="Carbs">
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input {...goalInput('carbs_goal')} />
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>g</span>
              </div>
            </Row>
            <Row label="Fat" last>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input {...goalInput('fat_goal')} />
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>g</span>
              </div>
            </Row>
          </Card>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, padding: '0 4px' }}>
            Edit manually, or fill in Body & Fitness below to auto-calculate.
          </p>
        </div>

        {/* ── BODY & FITNESS ── */}
        <div>
          <button
            onClick={() => setBodyOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', background: 'none', border: 'none',
              padding: '0 4px', marginBottom: 8, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <SectionLabel>Body & Fitness</SectionLabel>
            <span style={{
              fontSize: 12, color: 'var(--muted)',
              transform: bodyOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s', lineHeight: 1,
            }}>▾</span>
          </button>

          {bodyOpen && (
            <div style={{ animation: 'fadeIn 0.15s ease both', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Card>
                {/* Name */}
                <Row label="Name">
                  <input
                    value={form.display_name}
                    onChange={e => update('display_name', e.target.value)}
                    placeholder="First name"
                    style={{
                      background: 'none', border: 'none', outline: 'none',
                      fontSize: 15, color: 'var(--text)', textAlign: 'right',
                      fontFamily: 'inherit', width: 160,
                    }}
                  />
                </Row>
                {/* Age */}
                <Row label="Age">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="number"
                      value={form.age}
                      onChange={e => update('age', e.target.value)}
                      placeholder="—"
                      style={{
                        background: 'none', border: 'none', outline: 'none',
                        fontSize: 15, color: 'var(--text)', textAlign: 'right',
                        fontFamily: 'inherit', width: 50,
                        MozAppearance: 'textfield',
                      }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>yrs</span>
                  </div>
                </Row>
                {/* Sex */}
                <Row label="Sex">
                  <Segmented
                    value={form.sex}
                    onChange={v => update('sex', v)}
                    options={[
                      { value: 'male',   label: 'Male'   },
                      { value: 'female', label: 'Female' },
                    ]}
                  />
                </Row>
                {/* Height */}
                <Row label="Height">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="number"
                      value={form.height_ft}
                      onChange={e => update('height_ft', e.target.value)}
                      placeholder="—"
                      style={{
                        background: 'none', border: 'none', outline: 'none',
                        fontSize: 15, color: 'var(--text)', textAlign: 'right',
                        fontFamily: 'inherit', width: 36,
                        MozAppearance: 'textfield',
                      }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>ft</span>
                    <input
                      type="number"
                      value={form.height_in}
                      onChange={e => update('height_in', e.target.value)}
                      placeholder="—"
                      style={{
                        background: 'none', border: 'none', outline: 'none',
                        fontSize: 15, color: 'var(--text)', textAlign: 'right',
                        fontFamily: 'inherit', width: 36,
                        MozAppearance: 'textfield',
                      }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>in</span>
                  </div>
                </Row>
                {/* Weight */}
                <Row label="Weight">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="number"
                      value={form.weight_lbs}
                      onChange={e => update('weight_lbs', e.target.value)}
                      placeholder="—"
                      style={{
                        background: 'none', border: 'none', outline: 'none',
                        fontSize: 15, color: 'var(--text)', textAlign: 'right',
                        fontFamily: 'inherit', width: 60,
                        MozAppearance: 'textfield',
                      }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>lbs</span>
                  </div>
                </Row>
                {/* Activity */}
                <Row label="Activity">
                  <select
                    value={form.activity_level}
                    onChange={e => update('activity_level', e.target.value)}
                    style={{
                      background: 'none', border: 'none', outline: 'none',
                      fontSize: 15, color: form.activity_level ? 'var(--text)' : 'var(--muted)',
                      fontFamily: 'inherit', cursor: 'pointer',
                      textAlign: 'right', maxWidth: 180,
                    }}
                  >
                    <option value="" disabled>Select…</option>
                    <option value="sedentary">Sedentary</option>
                    <option value="light">Lightly active</option>
                    <option value="moderate">Moderately active</option>
                    <option value="very">Very active</option>
                  </select>
                </Row>
                {/* Goal */}
                <Row label="Goal" last>
                  <select
                    value={form.goal}
                    onChange={e => update('goal', e.target.value)}
                    style={{
                      background: 'none', border: 'none', outline: 'none',
                      fontSize: 15, color: form.goal ? 'var(--text)' : 'var(--muted)',
                      fontFamily: 'inherit', cursor: 'pointer',
                      textAlign: 'right', maxWidth: 180,
                    }}
                  >
                    <option value="" disabled>Select…</option>
                    <option value="lose">Lose weight</option>
                    <option value="maintain">Maintain weight</option>
                    <option value="gain">Gain muscle</option>
                  </select>
                </Row>
              </Card>

              {/* Recalculate */}
              <button
                onClick={recalculate}
                disabled={!canRecalculate}
                style={{
                  width: '100%', padding: '13px',
                  background: canRecalculate ? 'var(--accent)' : 'var(--surface)',
                  color: canRecalculate ? '#fff' : 'var(--muted)',
                  border: canRecalculate ? 'none' : '1px solid var(--border)',
                  borderRadius: 12, fontSize: 14, fontWeight: 600,
                  cursor: canRecalculate ? 'pointer' : 'default',
                  fontFamily: 'inherit',
                  opacity: canRecalculate ? 1 : 0.6,
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {recalcFlash ? '✓ Goals updated' : 'Calculate my goals'}
              </button>
              {!canRecalculate && (
                <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', margin: '-4px 0 0' }}>
                  Fill in all fields above to calculate
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── APPEARANCE ── */}
        <div>
          <SectionLabel>Appearance</SectionLabel>
          <Card>
            <Row label="Theme" last>
              <Segmented
                value={currentTheme}
                onChange={setTheme}
                options={[
                  { value: 'system', label: 'System' },
                  { value: 'light',  label: 'Light'  },
                  { value: 'dark',   label: 'Dark'   },
                ]}
              />
            </Row>
          </Card>
        </div>

        {/* ── ACCOUNT ── */}
        <div>
          <SectionLabel>Account</SectionLabel>
          <Card>
            {/* Email */}
            <div style={{
              padding: '13px 16px',
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>Signed in as</div>
              <div style={{ fontSize: 14, color: 'var(--text)' }}>{session.user.email}</div>
            </div>

            {/* Sign out */}
            <button
              onClick={() => supabase.auth.signOut()}
              style={{
                width: '100%', padding: '13px 16px',
                background: 'none', border: 'none',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 15, color: 'var(--text)' }}>Sign out</span>
              <span style={{ color: 'var(--muted)', fontSize: 16, opacity: 0.4 }}>›</span>
            </button>

            {/* Privacy */}
            <button
              onClick={() => window.open('/privacy', '_blank')}
              style={{
                width: '100%', padding: '13px 16px',
                background: 'none', border: 'none',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 15, color: 'var(--text)' }}>Privacy Policy</span>
              <span style={{ color: 'var(--muted)', fontSize: 16, opacity: 0.4 }}>›</span>
            </button>

            {/* Terms */}
            <button
              onClick={() => window.open('/terms', '_blank')}
              style={{
                width: '100%', padding: '13px 16px',
                background: 'none', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 15, color: 'var(--text)' }}>Terms of Service</span>
              <span style={{ color: 'var(--muted)', fontSize: 16, opacity: 0.4 }}>›</span>
            </button>
          </Card>
        </div>

        {/* Version */}
        <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: -8 }}>
          TrueCalorie · truecalorie.net
        </p>

      </div>
    </div>
  )
}
