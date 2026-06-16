import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../supabase'
import { calculateGoals, calculateGoalsPro } from '../macros'
import { requestHealthKitPermissions, syncWeightToHealthKit } from '../hooks/useHealthKit'

// Apple Health Connect is hidden for launch: the connect flow is broken. The UI
// and underlying HealthKit code are intentionally kept so this can be flipped
// back on once the flow is fixed. Set to true to re-enable.
const APPLE_HEALTH_ENABLED = false

// ─── Sub-components ───────────────────────────────────────────────────────────
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

// Segmented control — buttons wrap naturally, no stretching
function Segmented({ value, onChange, options }) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap',
      background: 'var(--surface2)',
      borderRadius: 8, padding: 2, gap: 4,
    }}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            flex: '0 0 auto', padding: '5px 12px', borderRadius: 6, border: 'none',
            background: value === o.value ? 'var(--text)' : 'transparent',
            color: value === o.value ? 'var(--bg)' : 'var(--muted)',
            fontSize: 12, fontWeight: value === o.value ? 600 : 400,
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'background 0.15s, color 0.15s',
            whiteSpace: 'nowrap',
          }}
        >{o.label}</button>
      ))}
    </div>
  )
}

// Stacked field — label above, segmented control below (full-width, no overflow risk)
function SegmentedField({ label, value, onChange, options, last }) {
  return (
    <div style={{
      padding: '12px 16px',
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontWeight: 500 }}>{label}</div>
      <Segmented value={value} onChange={onChange} options={options} />
    </div>
  )
}

// ─── Sport options ────────────────────────────────────────────────────────────
const SPORTS = [
  { value: 'running',  label: 'Distance Running', volumeType: 'miles',  volumeLabel: 'Weekly mileage'      },
  { value: 'cycling',  label: 'Cycling',           volumeType: 'miles',  volumeLabel: 'Weekly mileage (mi)' },
  { value: 'swimming', label: 'Swimming',           volumeType: 'hours',  volumeLabel: 'Training hrs/week'   },
  { value: 'strength', label: 'Strength / Power',   volumeType: 'days',   volumeLabel: 'Days/week lifting'   },
  { value: 'team',     label: 'Team Sports',        volumeType: 'hours',  volumeLabel: 'Training hrs/week'   },
  { value: 'general',  label: 'General Fitness',    volumeType: null,     volumeLabel: null                  },
]

const inlineInputStyle = {
  background: 'none', border: 'none', outline: 'none',
  fontSize: 15, color: 'var(--text)', fontFamily: 'inherit',
  MozAppearance: 'textfield',
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function BodyFitnessPage({ session, settings, onUpdate, onClose, isPro, isTrialing }) {
  const isProUser = isPro || isTrialing

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
    // New runner fields
    training_phase:      settings?.training_phase      || 'build',
    run_type_split:      settings?.run_type_split      || 'mixed',
    race_distance:       settings?.race_distance       || 'half_marathon',
    // New strength fields
    lifting_days_week:   settings?.lifting_days_week   || 4,
    lifting_goal:        settings?.lifting_goal        || 'athletic',
  })

  const [saving, setSaving]             = useState(false)
  const [saved, setSaved]               = useState(false)
  const [recalcFlash, setRecalcFlash]   = useState(false)
  const [proCalcResult, setProCalcResult] = useState(null)
  const [stravaConnected, setStravaConnected] = useState(false)
  const [showPurchases, setShowPurchases] = useState(false)

  useEffect(() => {
    supabase.from('strava_tokens').select('user_id').eq('user_id', session.user.id).maybeSingle()
      .then(({ data }) => setStravaConnected(!!data))
      .catch(() => {})
  }, [session.user.id])

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const saveCalorieMode = async (val) => {
    update('calorie_mode', val)
    await supabase.from('user_settings').update({ calorie_mode: val }).eq('user_id', session.user.id)
    onUpdate?.()
  }

  // ── Save body fields ───────────────────────────────────────────────────────
  const save = async () => {
    setSaving(true)
    const height_cm = form.height_ft && form.height_in
      ? (parseInt(form.height_ft) * 12 + parseInt(form.height_in)) * 2.54
      : settings?.height_cm || null
    const weight_kg = form.weight_lbs
      ? parseFloat(form.weight_lbs) * 0.453592
      : settings?.weight_kg || null

    const { error } = await supabase.from('user_settings').update({
      display_name:        form.display_name,
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
      training_phase:      form.training_phase || 'build',
      run_type_split:      form.run_type_split || 'mixed',
      race_distance:       form.race_distance  || 'half_marathon',
      lifting_days_week:   form.lifting_days_week ? parseInt(form.lifting_days_week) : 4,
      lifting_goal:        form.lifting_goal   || 'athletic',
    }).eq('user_id', session.user.id)

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      if (weight_kg) syncWeightToHealthKit(weight_kg)
      onUpdate?.()
    }
  }

  // ── Apply calculated targets (writes goals + sport config to DB) ──────────
  const applyProResult = async () => {
    if (!proCalcResult) return
    const height_cm = form.height_ft && form.height_in
      ? (parseInt(form.height_ft) * 12 + parseInt(form.height_in)) * 2.54
      : settings?.height_cm || null
    const weight_kg = form.weight_lbs
      ? parseFloat(form.weight_lbs) * 0.453592
      : settings?.weight_kg || null

    await supabase.from('user_settings').update({
      // Calculated nutrition goals
      calorie_goal: proCalcResult.calorie_goal,
      protein_goal: proCalcResult.protein_goal,
      carbs_goal:   proCalcResult.carbs_goal,
      fat_goal:     proCalcResult.fat_goal,
      // Body fields (persist the inputs that generated the result)
      display_name:        form.display_name,
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
      training_phase:      form.training_phase  || 'build',
      run_type_split:      form.run_type_split   || 'mixed',
      race_distance:       form.race_distance    || 'half_marathon',
      lifting_days_week:   form.lifting_days_week ? parseInt(form.lifting_days_week) : 4,
      lifting_goal:        form.lifting_goal     || 'athletic',
    }).eq('user_id', session.user.id)

    setProCalcResult(null)
    setRecalcFlash(true)
    setTimeout(() => setRecalcFlash(false), 2000)
    onUpdate?.()
  }

  // ── Standard calculate → writes to DB directly ───────────────────────────
  const canRecalculate = !!(
    form.age && form.sex && form.height_ft && form.height_in &&
    form.weight_lbs && form.activity_level && form.goal
  )

  const recalculate = async () => {
    if (!canRecalculate) return
    const height_cm = (parseInt(form.height_ft) * 12 + parseInt(form.height_in)) * 2.54
    const weight_kg = parseFloat(form.weight_lbs) * 0.453592
    const goals = calculateGoals({
      age: parseInt(form.age), sex: form.sex, height_cm, weight_kg,
      activity_level: form.activity_level, goal: form.goal,
    })
    await supabase.from('user_settings').update(goals).eq('user_id', session.user.id)
    setRecalcFlash(true)
    setTimeout(() => setRecalcFlash(false), 2000)
    onUpdate?.()
  }

  const selectedSport = SPORTS.find(s => s.value === form.sport)

  // Strength accepts days OR hours; other sports need their volumeType field
  const hasVolume = !selectedSport?.volumeType || (
    form.sport === 'strength'
      ? (form.training_hours_week || form.lifting_days_week)
      : selectedSport.volumeType === 'miles'
        ? form.weekly_mileage
        : form.training_hours_week
  )
  const canRecalculatePro = !!(canRecalculate && form.sport && hasVolume)

  const getProParams = () => {
    const height_cm = (parseInt(form.height_ft) * 12 + parseInt(form.height_in)) * 2.54
    const weight_kg = parseFloat(form.weight_lbs) * 0.453592
    return {
      age: parseInt(form.age), sex: form.sex,
      height_cm, weight_kg,
      activity_level:      form.activity_level,
      goal:                form.goal,
      sport:               form.sport,
      weekly_mileage:      parseFloat(form.weekly_mileage)      || 0,
      training_hours_week: parseFloat(form.training_hours_week) || 0,
      training_phase:      form.training_phase,
      run_type_split:      form.run_type_split,
      race_distance:       form.race_distance,
      lifting_days_week:   parseInt(form.lifting_days_week) || 4,
      lifting_goal:        form.lifting_goal,
    }
  }

  const recalculatePro = () => {
    if (!canRecalculatePro) return
    setProCalcResult(calculateGoalsPro(getProParams()))
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg)',
      overflowY: 'auto', fontFamily: 'inherit',
    }}>

      {/* Sticky header */}
      <div style={{
        display: 'flex', alignItems: 'center', paddingTop: 'calc(16px + env(safe-area-inset-top))', paddingRight: 16, paddingBottom: 14, paddingLeft: 16,
        borderBottom: '1px solid var(--border)', position: 'sticky', top: 0,
        background: 'var(--bg)', zIndex: 1,
      }}>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          color: 'var(--text)', fontSize: 20, lineHeight: 1, marginRight: 12,
        }}>←</button>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em', flex: 1 }}>
          Body & Fitness
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

      <div style={{ padding: '20px 16px 48px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* ── Body data ── */}
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

        {/* ── Standard calculate ── */}
        <button onClick={recalculate} disabled={!canRecalculate} style={{
          width: '100%', padding: '11px', background: 'none',
          border: '1px solid var(--border)', borderRadius: 12, fontSize: 13,
          fontWeight: 500, color: canRecalculate ? 'var(--text)' : 'var(--muted)',
          cursor: canRecalculate ? 'pointer' : 'default', fontFamily: 'inherit',
          opacity: canRecalculate ? 1 : 0.6,
        }}>
          {recalcFlash ? '✓ Goals applied' : 'Calculate standard targets'}
        </button>

        {/* ── Athletic Targets ── */}
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

          {!isProUser && (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '20px 16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🏃</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                Athletic targets are a Pro feature
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16 }}>
                Enter your sport and training volume to get calorie and macro targets built around your actual training load.
              </div>
            </div>
          )}

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
                  {SPORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Row>

              {/* Running: mileage + 3 new segmented fields */}
              {form.sport === 'running' && (
                <>
                  <Row label="Weekly mileage">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input type="number" value={form.weekly_mileage}
                        onChange={e => { update('weekly_mileage', e.target.value); setProCalcResult(null) }}
                        placeholder="0" style={{ ...inlineInputStyle, textAlign: 'right', width: 60 }} />
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>mi/wk</span>
                    </div>
                  </Row>
                  <SegmentedField
                    label="Training phase"
                    value={form.training_phase}
                    onChange={v => { update('training_phase', v); setProCalcResult(null) }}
                    options={[
                      { value: 'base',      label: 'Base'    },
                      { value: 'build',     label: 'Build'   },
                      { value: 'peak',      label: 'Peak'    },
                      { value: 'taper',     label: 'Taper'   },
                      { value: 'offseason', label: 'Off-szn' },
                    ]}
                  />
                  <SegmentedField
                    label="Workout mix"
                    value={form.run_type_split}
                    onChange={v => { update('run_type_split', v); setProCalcResult(null) }}
                    options={[
                      { value: 'easy',  label: 'Easy'  },
                      { value: 'mixed', label: 'Mixed' },
                      { value: 'hard',  label: 'Hard'  },
                    ]}
                  />
                  <SegmentedField
                    label="Race focus"
                    value={form.race_distance}
                    onChange={v => { update('race_distance', v); setProCalcResult(null) }}
                    options={[
                      { value: '5k_10k',       label: '5K-10K' },
                      { value: 'half_marathon', label: 'Half'   },
                      { value: 'marathon',      label: 'Full'   },
                      { value: 'ultra',         label: 'Ultra'  },
                    ]}
                    last={!proCalcResult}
                  />
                </>
              )}

              {/* Strength: days/week + goal */}
              {form.sport === 'strength' && (
                <>
                  <Row label="Days per week">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input type="number" value={form.lifting_days_week} min={1} max={7}
                        onChange={e => { update('lifting_days_week', e.target.value); setProCalcResult(null) }}
                        placeholder="4" style={{ ...inlineInputStyle, textAlign: 'right', width: 40 }} />
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>days</span>
                    </div>
                  </Row>
                  <SegmentedField
                    label="Primary goal"
                    value={form.lifting_goal}
                    onChange={v => { update('lifting_goal', v); setProCalcResult(null) }}
                    options={[
                      { value: 'strength',    label: 'Strength'    },
                      { value: 'hypertrophy', label: 'Hypertrophy' },
                      { value: 'athletic',    label: 'Athletic'    },
                    ]}
                    last={!proCalcResult}
                  />
                </>
              )}

              {/* Other sports with volume (cycling, swimming, team) */}
              {form.sport && form.sport !== 'running' && form.sport !== 'strength' && selectedSport?.volumeType && (
                <Row label={selectedSport.volumeLabel} last={!proCalcResult}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="number"
                      value={selectedSport.volumeType === 'miles' ? form.weekly_mileage : form.training_hours_week}
                      onChange={e => {
                        update(selectedSport.volumeType === 'miles' ? 'weekly_mileage' : 'training_hours_week', e.target.value)
                        setProCalcResult(null)
                      }}
                      placeholder="0" style={{ ...inlineInputStyle, textAlign: 'right', width: 60 }} />
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                      {selectedSport.volumeType === 'miles' ? 'mi/wk' : 'hrs/wk'}
                    </span>
                  </div>
                </Row>
              )}

              {/* Results panel */}
              {proCalcResult && (
                <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
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

                    {proCalcResult.sport === 'running' && (
                      <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
                        {Math.round(proCalcResult.carbs_goal * 4 / proCalcResult.calorie_goal * 100)}% carbs —
                        {form.race_distance === 'ultra' ? ' fat-adapted split for ultra endurance.' : ' glycogen-focused for endurance performance.'}
                      </p>
                    )}
                    {proCalcResult.sport === 'cycling' || proCalcResult.sport === 'swimming' ? (
                      <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
                        High-carb split ({Math.round(proCalcResult.carbs_goal * 4 / proCalcResult.calorie_goal * 100)}% carbs) — optimized for endurance performance.
                      </p>
                    ) : null}
                    {proCalcResult.sport === 'strength' && (
                      <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
                        {proCalcResult.proteinPerKg}g/kg protein —
                        {form.lifting_goal === 'hypertrophy' ? ' optimized for maximum muscle protein synthesis.' : form.lifting_goal === 'strength' ? ' powerlifting split with higher fat tolerance.' : ' balanced athletic performance split.'}
                      </p>
                    )}
                  </div>

                  <button onClick={applyProResult} style={{
                    width: '100%', padding: '11px', background: recalcFlash ? '#22c55e' : 'var(--accent)',
                    border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#fff',
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.3s',
                  }}>
                    {recalcFlash ? '✓ Targets applied' : 'Apply these targets'}
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

        {/* ── Training Adjustment (Pro + sport only) ── */}
        {isProUser && form.sport && (
          <div style={{ marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.09em', textTransform: 'uppercase' }}>
                Training Adjustment
              </span>
            </div>
            <Card>
              {[
                { value: 'fixed',    label: 'Steady',   desc: 'Same target every day. Training already included.' },
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

        {/* ── Apple Health (hidden for launch, broken connect flow) ── */}
        {APPLE_HEALTH_ENABLED && Capacitor.isNativePlatform() && (
          <button onClick={requestHealthKitPermissions} style={{
            width: '100%', padding: '11px', background: 'none',
            border: '1px solid var(--border)', borderRadius: 12, fontSize: 13,
            fontWeight: 500, color: 'var(--text)',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Connect Apple Health
          </button>
        )}

      </div>
    </div>
  )
}
