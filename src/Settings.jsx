import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { usePro } from './hooks/usePro'
import { calculateGoals, calculateGoalsPro } from './macros'
import Purchases from './Purchases'
import StravaConnect from './components/StravaConnect'

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

// ─── Sport options ────────────────────────────────────────────────────────────
const SPORTS = [
  { value: 'running',  label: 'Distance Running', volumeType: 'miles',  volumeLabel: 'Weekly mileage'      },
  { value: 'cycling',  label: 'Cycling',           volumeType: 'miles',  volumeLabel: 'Weekly mileage (mi)' },
  { value: 'swimming', label: 'Swimming',           volumeType: 'hours',  volumeLabel: 'Training hrs/week'   },
  { value: 'strength', label: 'Strength / Power',   volumeType: 'hours',  volumeLabel: 'Training hrs/week'   },
  { value: 'team',     label: 'Team Sports',        volumeType: 'hours',  volumeLabel: 'Training hrs/week'   },
  { value: 'general',  label: 'General Fitness',    volumeType: null,     volumeLabel: null                  },
]

// ─── Main component ───────────────────────────────────────────────────────────
export default function Settings({ session, settings, onUpdate, onClose, onUpgrade }) {
  const { isPro, isTrialing, trialDaysLeft, loading, source, expiresAt, cancelAtPeriodEnd } = usePro()
  const isProUser    = isPro || isTrialing
  const isFounder    = source === 'founder'
  const isMonthlyPro = isPro && !isTrialing && source === 'monthly'

  const heightToFeetInches = (cm) => {
    if (!cm) return { ft: '', in: '' }
    const totalInches = cm / 2.54
    const ft  = Math.floor(totalInches / 12)
    const ins = Math.round(totalInches - ft * 12)
    return { ft: String(ft), in: String(ins) }
  }
  const initialHeight = heightToFeetInches(settings?.height_cm)

  const [form, setForm] = useState({
    display_name:        settings?.display_name        || '',
    calorie_goal:        settings?.calorie_goal        || 2000,
    protein_goal:        settings?.protein_goal        || 150,
    carbs_goal:          settings?.carbs_goal          || 250,
    fat_goal:            settings?.fat_goal            || 65,
    age:                 settings?.age                 || '',
    sex:                 settings?.sex                 || '',
    height_ft:           initialHeight.ft,
    height_in:           initialHeight.in,
    weight_lbs:          settings?.weight_kg ? Math.round(settings.weight_kg / 0.453592) : '',
    activity_level:      settings?.activity_level      || '',
    goal:                settings?.goal                || '',
    sport:               settings?.sport               || '',
    weekly_mileage:      settings?.weekly_mileage      || '',
    training_hours_week: settings?.training_hours_week || '',
    calorie_mode:        settings?.calorie_mode        || 'fixed',
  })

  const [stravaConnected, setStravaConnected] = useState(false)

  // Check Strava connection once on mount (used for adaptive mode inline note)
  useEffect(() => {
    supabase.from('strava_tokens').select('user_id').eq('user_id', session.user.id).maybeSingle()
      .then(({ data }) => setStravaConnected(!!data))
  }, [session.user.id])

  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [bodyOpen, setBodyOpen]       = useState(false)
  const [recalcFlash, setRecalcFlash] = useState(false)
  const [proCalcResult, setProCalcResult] = useState(null)
  const [showPurchases, setShowPurchases] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError]     = useState(null)
  const [currentTheme, setCurrentThemeState] = useState(
    () => localStorage.getItem('tc-theme') || 'system'
  )

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const saveCalorieMode = async (val) => {
    update('calorie_mode', val)
    await supabase.from('user_settings').update({ calorie_mode: val }).eq('user_id', session.user.id)
    onUpdate?.()
  }

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
    const height_cm = form.height_ft && form.height_in
      ? (parseInt(form.height_ft) * 12 + parseInt(form.height_in)) * 2.54
      : settings?.height_cm || null
    const weight_kg = form.weight_lbs
      ? parseFloat(form.weight_lbs) * 0.453592
      : settings?.weight_kg || null

    const { error } = await supabase
      .from('user_settings')
      .update({
        display_name:        form.display_name,
        calorie_goal:        parseInt(form.calorie_goal),
        protein_goal:        parseInt(form.protein_goal),
        carbs_goal:          parseInt(form.carbs_goal),
        fat_goal:            parseInt(form.fat_goal),
        age:                 form.age ? parseInt(form.age) : null,
        sex:                 form.sex || null,
        height_cm:           height_cm ? Math.round(height_cm * 10) / 10 : null,
        weight_kg:           weight_kg ? Math.round(weight_kg * 10) / 10 : null,
        activity_level:      form.activity_level || null,
        goal:                form.goal || null,
        sport:               form.sport || null,
        weekly_mileage:      form.weekly_mileage ? parseFloat(form.weekly_mileage) : null,
        training_hours_week: form.training_hours_week ? parseFloat(form.training_hours_week) : null,
        calorie_mode:        form.calorie_mode || 'fixed',
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

  const canRecalculate = !!(
    form.age && form.sex && form.height_ft && form.height_in &&
    form.weight_lbs && form.activity_level && form.goal
  )

  const selectedSport = SPORTS.find(s => s.value === form.sport)
  const canRecalculatePro = !!(
    canRecalculate && form.sport && (
      !selectedSport?.volumeType ||
      (selectedSport?.volumeType === 'miles' && form.weekly_mileage) ||
      (selectedSport?.volumeType === 'hours' && form.training_hours_week)
    )
  )

  const getProParams = () => {
    const height_cm = (parseInt(form.height_ft) * 12 + parseInt(form.height_in)) * 2.54
    const weight_kg = parseFloat(form.weight_lbs) * 0.453592
    return {
      age:                 parseInt(form.age),
      sex:                 form.sex,
      height_cm,
      weight_kg,
      activity_level:      form.activity_level,
      goal:                form.goal,
      sport:               form.sport,
      weekly_mileage:      parseFloat(form.weekly_mileage)      || 0,
      training_hours_week: parseFloat(form.training_hours_week) || 0,
    }
  }

  const recalculate = () => {
    if (!canRecalculate) return
    const height_cm = (parseInt(form.height_ft) * 12 + parseInt(form.height_in)) * 2.54
    const weight_kg = parseFloat(form.weight_lbs) * 0.453592
    const goals = calculateGoals({
      age: parseInt(form.age), sex: form.sex, height_cm, weight_kg,
      activity_level: form.activity_level, goal: form.goal,
    })
    setForm(f => ({ ...f, ...goals }))
    setRecalcFlash(true)
    setTimeout(() => setRecalcFlash(false), 1500)
  }

  const recalculatePro = () => {
    if (!canRecalculatePro) return
    const result = calculateGoalsPro(getProParams())
    setProCalcResult(result)
  }

  const applyProResult = () => {
    if (!proCalcResult || !isProUser) return
    setForm(f => ({
      ...f,
      calorie_goal: proCalcResult.calorie_goal,
      protein_goal: proCalcResult.protein_goal,
      carbs_goal:   proCalcResult.carbs_goal,
      fat_goal:     proCalcResult.fat_goal,
    }))
    setProCalcResult(null)
    setRecalcFlash(true)
    setTimeout(() => setRecalcFlash(false), 1500)
  }

  const goalInputStyle = (key) => ({
    type:     'number',
    value:    form[key],
    onChange: e => update(key, e.target.value),
    style: {
      width: 72, textAlign: 'right',
      background: recalcFlash ? 'rgba(29,158,117,0.12)' : 'none',
      border: 'none', outline: 'none', fontSize: 15, color: 'var(--text)',
      fontFamily: 'inherit', padding: 0, borderRadius: 4,
      transition: 'background 0.4s', MozAppearance: 'textfield',
    },
  })

  const inlineInputStyle = {
    background: 'none', border: 'none', outline: 'none',
    fontSize: 15, color: 'var(--text)', fontFamily: 'inherit',
    MozAppearance: 'textfield',
  }

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
          <button onClick={() => setBodyOpen(o => !o)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', background: 'none', border: 'none',
            padding: '0 4px', marginBottom: 8, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <SectionLabel>Body & Fitness</SectionLabel>
            <span style={{
              fontSize: 12, color: 'var(--muted)',
              transform: bodyOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s', lineHeight: 1,
            }}>▾</span>
          </button>

          {bodyOpen && (
            <div style={{ animation: 'fadeIn 0.15s ease both', display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Body data */}
              <Card>
                <Row label="Name">
                  <input value={form.display_name} onChange={e => update('display_name', e.target.value)}
                    placeholder="First name"
                    style={{ ...inlineInputStyle, textAlign: 'right', width: 160 }} />
                </Row>
                <Row label="Age">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="number" value={form.age} onChange={e => update('age', e.target.value)}
                      placeholder="—" style={{ ...inlineInputStyle, textAlign: 'right', width: 50 }} />
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>yrs</span>
                  </div>
                </Row>
                <Row label="Sex">
                  <Segmented value={form.sex} onChange={v => update('sex', v)}
                    options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} />
                </Row>
                <Row label="Height">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="number" value={form.height_ft} onChange={e => update('height_ft', e.target.value)}
                      placeholder="—" style={{ ...inlineInputStyle, textAlign: 'right', width: 36 }} />
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>ft</span>
                    <input type="number" value={form.height_in} onChange={e => update('height_in', e.target.value)}
                      placeholder="—" style={{ ...inlineInputStyle, textAlign: 'right', width: 36 }} />
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>in</span>
                  </div>
                </Row>
                <Row label="Weight">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="number" value={form.weight_lbs} onChange={e => update('weight_lbs', e.target.value)}
                      placeholder="—" style={{ ...inlineInputStyle, textAlign: 'right', width: 60 }} />
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>lbs</span>
                  </div>
                </Row>
                <Row label="Activity">
                  <select value={form.activity_level} onChange={e => update('activity_level', e.target.value)}
                    style={{ background: 'none', border: 'none', outline: 'none', fontSize: 15,
                      color: form.activity_level ? 'var(--text)' : 'var(--muted)',
                      fontFamily: 'inherit', cursor: 'pointer', textAlign: 'right', maxWidth: 180 }}>
                    <option value="" disabled>Select…</option>
                    <option value="sedentary">Sedentary</option>
                    <option value="light">Lightly active</option>
                    <option value="moderate">Moderately active</option>
                    <option value="very">Very active</option>
                  </select>
                </Row>
                <Row label="Goal" last>
                  <select value={form.goal} onChange={e => update('goal', e.target.value)}
                    style={{ background: 'none', border: 'none', outline: 'none', fontSize: 15,
                      color: form.goal ? 'var(--text)' : 'var(--muted)',
                      fontFamily: 'inherit', cursor: 'pointer', textAlign: 'right', maxWidth: 180 }}>
                    <option value="" disabled>Select…</option>
                    <option value="lose">Lose weight</option>
                    <option value="maintain">Maintain weight</option>
                    <option value="gain">Gain muscle</option>
                  </select>
                </Row>
              </Card>

              {/* Standard recalculate */}
              <button onClick={recalculate} disabled={!canRecalculate} style={{
                width: '100%', padding: '11px', background: 'none',
                border: '1px solid var(--border)', borderRadius: 12, fontSize: 13,
                fontWeight: 500, color: canRecalculate ? 'var(--text)' : 'var(--muted)',
                cursor: canRecalculate ? 'pointer' : 'default', fontFamily: 'inherit',
                opacity: canRecalculate ? 1 : 0.6,
              }}>
                {recalcFlash ? '✓ Goals updated' : 'Calculate standard targets'}
              </button>

              {/* ── PRO: Athletic Calculation ──────────────────────────────── */}
              <div style={{ marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.09em', textTransform: 'uppercase' }}>
                    Athletic Targets
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    color: isProUser ? '#1D9E75' : 'var(--muted)',
                    background: isProUser ? 'rgba(29,158,117,0.1)' : 'var(--surface2)',
                    border: `1px solid ${isProUser ? 'rgba(29,158,117,0.25)' : 'var(--border)'}`,
                    borderRadius: 5, padding: '2px 6px', letterSpacing: '0.06em',
                  }}>PRO</span>
                </div>

                {/* ── Locked state for free users ── */}
                {!isProUser && !loading && (
                  <div style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '20px 16px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>🏃</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                      Athletic targets are a Pro feature
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16 }}>
                      Enter your sport and training volume to get calorie and macro targets built around your actual training load — not a generic activity multiplier.
                    </div>
                    <button
                      onClick={() => setShowPurchases(true)}
                      style={{
                        padding: '10px 20px', background: 'var(--accent)', border: 'none',
                        borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#fff',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      Start free trial →
                    </button>
                  </div>
                )}

                {/* ── Full calculator for Pro/Trial users ── */}
                {isProUser && (
                  <Card>
                    {/* Sport selector */}
                    <Row label="Sport">
                      <select
                        value={form.sport}
                        onChange={e => { update('sport', e.target.value); setProCalcResult(null) }}
                        style={{ background: 'none', border: 'none', outline: 'none', fontSize: 15,
                          color: form.sport ? 'var(--text)' : 'var(--muted)',
                          fontFamily: 'inherit', cursor: 'pointer', textAlign: 'right', maxWidth: 200 }}>
                        <option value="" disabled>Select sport…</option>
                        {SPORTS.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </Row>

                    {/* Volume input — shown when sport has a volumeType */}
                    {selectedSport?.volumeType && (
                      <Row label={selectedSport.volumeLabel} last={!proCalcResult}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input
                            type="number"
                            value={selectedSport.volumeType === 'miles' ? form.weekly_mileage : form.training_hours_week}
                            onChange={e => {
                              update(selectedSport.volumeType === 'miles' ? 'weekly_mileage' : 'training_hours_week', e.target.value)
                              setProCalcResult(null)
                            }}
                            placeholder="0"
                            style={{ ...inlineInputStyle, textAlign: 'right', width: 60 }}
                          />
                          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                            {selectedSport.volumeType === 'miles' ? 'mi/wk' : 'hrs/wk'}
                          </span>
                        </div>
                      </Row>
                    )}

                    {/* Results panel */}
                    {proCalcResult && (
                      <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
                        {/* Breakdown */}
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em', marginBottom: 8 }}>
                            BREAKDOWN
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {[
                              { label: 'Base metabolic rate', value: proCalcResult.bmr },
                              { label: 'Training load',       value: proCalcResult.training_cal },
                              { label: 'Total TDEE',          value: proCalcResult.tdee, bold: true },
                            ].map(r => (
                              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                <span style={{ color: 'var(--muted)' }}>{r.label}</span>
                                <span style={{ color: 'var(--text)', fontWeight: r.bold ? 600 : 400 }}>{r.value} cal</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Recommended targets */}
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.06em', marginBottom: 8 }}>
                            RECOMMENDED TARGETS
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                            {[
                              { label: 'Cal',     value: proCalcResult.calorie_goal, unit: '' },
                              { label: 'Protein', value: proCalcResult.protein_goal, unit: 'g' },
                              { label: 'Carbs',   value: proCalcResult.carbs_goal,   unit: 'g' },
                              { label: 'Fat',     value: proCalcResult.fat_goal,     unit: 'g' },
                            ].map(m => (
                              <div key={m.label} style={{ textAlign: 'center', background: 'var(--surface)', borderRadius: 8, padding: '8px 4px' }}>
                                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{m.value}{m.unit}</div>
                                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{m.label}</div>
                              </div>
                            ))}
                          </div>
                          {proCalcResult.sport && ['running', 'cycling', 'swimming'].includes(proCalcResult.sport) && (
                            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
                              High-carb split ({Math.round(proCalcResult.carbs_goal * 4 / proCalcResult.calorie_goal * 100)}% carbs) — optimized for glycogen-dependent endurance performance.
                            </p>
                          )}
                          {proCalcResult.sport === 'strength' && (
                            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
                              High-protein split (2.4g/kg) — optimized for muscle protein synthesis and strength adaptation.
                            </p>
                          )}
                        </div>

                        {/* Apply button */}
                        <button onClick={applyProResult} style={{
                          width: '100%', padding: '11px', background: 'var(--accent)', border: 'none',
                          borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#fff',
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                          Apply these targets
                        </button>
                      </div>
                    )}

                    {/* Calculate button */}
                    <div style={{ padding: '12px 16px', borderTop: proCalcResult ? 'none' : '1px solid var(--border)' }}>
                      <button
                        onClick={recalculatePro}
                        disabled={!canRecalculatePro}
                        style={{
                          width: '100%', padding: '10px',
                          background: canRecalculatePro ? 'var(--accent)' : 'var(--surface2)',
                          border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
                          color: canRecalculatePro ? '#fff' : 'var(--muted)',
                          cursor: canRecalculatePro ? 'pointer' : 'default',
                          fontFamily: 'inherit', opacity: canRecalculatePro ? 1 : 0.6,
                        }}
                      >
                        {proCalcResult ? 'Recalculate' : 'Calculate athletic targets'}
                      </button>
                      {!canRecalculatePro && form.sport && (
                        <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 6 }}>
                          Fill in body data and goal above
                        </p>
                      )}
                    </div>
                  </Card>
                )}
              </div>

              {/* ── TRAINING ADJUSTMENT (Pro + sport selected only) ── */}
              {(isProUser || isFounder) && form.sport && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.09em', textTransform: 'uppercase' }}>
                      Training Adjustment
                    </span>
                  </div>
                  <Card>
                    {[
                      { value: 'fixed',    label: 'Steady',   desc: 'Same target every day. Training is already included.' },
                      { value: 'adaptive', label: 'Adaptive', desc: 'Your target adjusts to your recent training.' },
                    ].map((opt, i) => (
                      <div
                        key={opt.value}
                        onClick={() => saveCalorieMode(opt.value)}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 12,
                          padding: '13px 16px', cursor: 'pointer',
                          borderBottom: i === 0 ? '1px solid var(--border)' : 'none',
                        }}
                      >
                        <div style={{
                          width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                          border: `2px solid ${form.calorie_mode === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                          background: form.calorie_mode === opt.value ? 'var(--accent)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'border-color 0.15s, background 0.15s',
                        }}>
                          {form.calorie_mode === opt.value && (
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>{opt.label}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{opt.desc}</div>
                        </div>
                      </div>
                    ))}
                    {form.calorie_mode === 'adaptive' && !stravaConnected && (
                      <div style={{
                        padding: '10px 16px', borderTop: '1px solid var(--border)',
                        fontSize: 12, color: 'var(--muted)', lineHeight: 1.55,
                        background: 'rgba(245,166,35,0.06)',
                      }}>
                        Connect Strava for daily adjustment. Until then your target uses your estimated training.
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </div>
          )}
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
