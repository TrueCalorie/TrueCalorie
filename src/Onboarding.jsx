import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { calculateGoals, calculateGoalsPro } from './macros'
import { capture } from './analytics'

const ACTIVITY_LEVELS = [
  { key: 'sedentary', label: 'Sedentary',         desc: 'Little or no exercise' },
  { key: 'light',     label: 'Lightly active',     desc: '1–3 days/week' },
  { key: 'moderate',  label: 'Moderately active',  desc: '3–5 days/week' },
  { key: 'very',      label: 'Very active',         desc: '6–7 days/week' },
]

const GOALS = [
  { key: 'lose',     label: 'Lose weight',  desc: 'Eat in a calorie deficit' },
  { key: 'maintain', label: 'Maintain',     desc: 'Eat at maintenance' },
  { key: 'gain',     label: 'Gain muscle',  desc: 'Eat in a calorie surplus' },
]

const SPORTS = [
  { key: 'running',  label: 'Distance Running' },
  { key: 'cycling',  label: 'Cycling' },
  { key: 'swimming', label: 'Swimming' },
  { key: 'strength', label: 'Strength' },
  { key: 'team',     label: 'Team Sports' },
]

const TOTAL_STEPS = 7

export default function Onboarding({ session, onComplete }) {
  const [step, setStep]             = useState(0)
  const [data, setData]             = useState({
    display_name: '', age: '', sex: '',
    height_ft: '', height_in: '', weight_lbs: '',
    activity_level: '', goal: '',
    sport: '', weekly_mileage: '', training_hours_week: '',
  })
  const [athleteChoice, setAthleteChoice] = useState(null)
  const [calculated, setCalculated]       = useState(null)
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState('')

  useEffect(() => { capture('onboarding_started') }, [])

  const update = (key, value) => setData(d => ({ ...d, [key]: value }))

  const next = () => setStep(s => s + 1)
  const back = () => setStep(s => Math.max(0, s - 1))

  const goToResults = (useAthlete) => {
    const height_cm = (parseInt(data.height_ft) * 12 + parseInt(data.height_in)) * 2.54
    const weight_kg = parseFloat(data.weight_lbs) * 0.453592
    const base = {
      age: parseInt(data.age), sex: data.sex, height_cm, weight_kg,
      activity_level: data.activity_level, goal: data.goal,
    }
    const goals = useAthlete
      ? calculateGoalsPro({
          ...base,
          sport: data.sport,
          weekly_mileage: parseFloat(data.weekly_mileage) || 0,
          training_hours_week: parseFloat(data.training_hours_week) || 0,
        })
      : calculateGoals(base)
    setCalculated(goals)
    setStep(8)
  }

  const save = async () => {
    setSaving(true)
    setError('')
    const height_cm = (parseInt(data.height_ft) * 12 + parseInt(data.height_in)) * 2.54
    const weight_kg = parseFloat(data.weight_lbs) * 0.453592
    const payload = {
      display_name:        data.display_name,
      age:                 parseInt(data.age),
      sex:                 data.sex,
      height_cm:           Math.round(height_cm * 10) / 10,
      weight_kg:           Math.round(weight_kg * 10) / 10,
      activity_level:      data.activity_level,
      goal:                data.goal,
      calorie_goal:        calculated.calorie_goal,
      protein_goal:        calculated.protein_goal,
      carbs_goal:          calculated.carbs_goal,
      fat_goal:            calculated.fat_goal,
      onboarding_complete: true,
    }
    if (data.sport) {
      payload.sport = data.sport
      if (data.weekly_mileage)      payload.weekly_mileage      = parseFloat(data.weekly_mileage)
      if (data.training_hours_week) payload.training_hours_week = parseFloat(data.training_hours_week)
    }
    const { error } = await supabase
      .from('user_settings')
      .update(payload)
      .eq('user_id', session.user.id)
    if (error) {
      console.error(error)
      setError('Something went wrong. Please try again.')
      setSaving(false)
      return
    }
    setSaving(false)
    capture('onboarding_completed')
    onComplete()
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  const page = {
    maxWidth: 480, margin: '0 auto',
    paddingTop: 'calc(28px + env(safe-area-inset-top))',
    paddingRight: 24,
    paddingBottom: 'calc(28px + env(safe-area-inset-bottom))',
    paddingLeft: 24,
    fontFamily: 'inherit', minHeight: '100dvh', background: 'var(--bg)',
    display: 'flex', flexDirection: 'column',
    animation: 'fadeIn 0.32s ease',
  }
  const centered  = { ...page, justifyContent: 'center', textAlign: 'center' }
  const heading   = { fontSize: 27, fontWeight: 600, marginBottom: 10, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.2 }
  const sub       = { fontSize: 15, color: 'var(--muted)', marginBottom: 32, lineHeight: 1.55 }
  const inputStyle = {
    width: '100%', padding: '14px 16px', fontSize: 16, borderRadius: 12,
    border: '1px solid var(--border)', outline: 'none', boxSizing: 'border-box',
    marginBottom: 12, background: 'var(--surface)', color: 'var(--text)',
    fontFamily: 'inherit', WebkitTextFillColor: 'var(--text)',
  }
  const btn = (disabled) => ({
    width: '100%', padding: 15, fontSize: 16, fontWeight: 600,
    borderRadius: 12, border: 'none',
    background: disabled ? 'var(--surface2)' : 'var(--text)',
    color: disabled ? 'var(--muted)' : 'var(--bg)',
    cursor: disabled ? 'default' : 'pointer', marginTop: 8, fontFamily: 'inherit',
    transition: 'background 0.15s',
  })
  const option = (selected) => ({
    width: '100%', padding: '15px 16px', borderRadius: 12,
    border: selected ? '1.5px solid var(--text)' : '1px solid var(--border)',
    background: selected ? 'var(--text)' : 'var(--surface)',
    cursor: 'pointer', textAlign: 'left', marginBottom: 10, display: 'block',
    fontFamily: 'inherit', transition: 'border-color 0.15s, background 0.15s',
  })
  const optionLabel = (selected) => ({ fontWeight: 500, fontSize: 15, color: selected ? 'var(--bg)' : 'var(--text)' })
  const optionDesc  = (selected) => ({ fontSize: 13, color: selected ? 'var(--bg)' : 'var(--muted)', marginTop: 2, opacity: selected ? 0.8 : 1 })

  // Progress header: green fill bar + back chevron. Plain function (not a
  // component) so it never remounts the inputs below it or steals focus.
  const progress = (n) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 36 }}>
      <button
        onClick={back}
        aria-label="Back"
        style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          color: 'var(--muted)', fontSize: 20, lineHeight: 1, flexShrink: 0,
          fontFamily: 'inherit',
        }}
      >
        ←
      </button>
      <div style={{ flex: 1, height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${(n / TOTAL_STEPS) * 100}%`,
          background: 'var(--accent)', borderRadius: 2, transition: 'width 0.4s ease',
        }} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0, minWidth: 30, textAlign: 'right' }}>
        {n} / {TOTAL_STEPS}
      </div>
    </div>
  )

  // ── Steps ────────────────────────────────────────────────────────────────────

  if (step === 0) return (
    <div style={centered} key={step}>
      <img src="/logo.svg" alt="TrueCalorie" style={{ height: 48, marginBottom: 22, alignSelf: 'center' }} />
      <div style={heading}>Welcome to TrueCalorie</div>
      <div style={{ fontSize: 16, fontStyle: 'italic', color: 'var(--accent)', marginBottom: 18 }}>
        Eating is training.
      </div>
      <div style={{ ...sub, maxWidth: 340, margin: '0 auto 32px' }}>
        Answer a few quick questions and we'll build your daily targets. Takes about a minute.
      </div>
      <button style={{ ...btn(false), maxWidth: 360, margin: '0 auto' }} onClick={next}>Get started</button>
    </div>
  )

  if (step === 1) return (
    <div style={page} key={step}>
      {progress(1)}
      <div style={heading}>What's your name?</div>
      <div style={sub}>So we can make the app feel like yours.</div>
      <input
        style={inputStyle} type="text" placeholder="First name"
        value={data.display_name} onChange={e => update('display_name', e.target.value)}
        autoFocus
      />
      <button style={btn(!data.display_name)} disabled={!data.display_name} onClick={next}>Continue</button>
    </div>
  )

  if (step === 2) return (
    <div style={page} key={step}>
      {progress(2)}
      <div style={heading}>How old are you?</div>
      <div style={sub}>Used to calculate your calorie needs accurately.</div>
      <input
        style={inputStyle} type="number" placeholder="Age"
        value={data.age} onChange={e => update('age', e.target.value)}
        autoFocus
      />
      <button style={btn(!data.age)} disabled={!data.age} onClick={next}>Continue</button>
    </div>
  )

  if (step === 3) return (
    <div style={page} key={step}>
      {progress(3)}
      <div style={heading}>Biological sex?</div>
      <div style={sub}>Used for calorie calculation accuracy.</div>
      {['male', 'female'].map(s => (
        <button key={s} style={option(data.sex === s)} onClick={() => update('sex', s)}>
          <div style={optionLabel(data.sex === s)}>{s.charAt(0).toUpperCase() + s.slice(1)}</div>
        </button>
      ))}
      <button style={btn(!data.sex)} disabled={!data.sex} onClick={next}>Continue</button>
    </div>
  )

  if (step === 4) return (
    <div style={page} key={step}>
      {progress(4)}
      <div style={heading}>Height and weight?</div>
      <div style={sub}>This sets your baseline. You can update it anytime.</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input style={{ ...inputStyle, marginBottom: 0 }} type="number" placeholder="Feet"
          value={data.height_ft} onChange={e => update('height_ft', e.target.value)} autoFocus />
        <input style={{ ...inputStyle, marginBottom: 0 }} type="number" placeholder="Inches"
          value={data.height_in} onChange={e => update('height_in', e.target.value)} />
      </div>
      <input style={inputStyle} type="number" placeholder="Weight (lbs)"
        value={data.weight_lbs} onChange={e => update('weight_lbs', e.target.value)} />
      <button style={btn(!data.height_ft || !data.height_in || !data.weight_lbs)}
        disabled={!data.height_ft || !data.height_in || !data.weight_lbs} onClick={next}>Continue</button>
    </div>
  )

  if (step === 5) return (
    <div style={page} key={step}>
      {progress(5)}
      <div style={heading}>How active are you?</div>
      <div style={sub}>Day to day, outside of focused training.</div>
      {ACTIVITY_LEVELS.map(a => (
        <button key={a.key} style={option(data.activity_level === a.key)} onClick={() => update('activity_level', a.key)}>
          <div style={optionLabel(data.activity_level === a.key)}>{a.label}</div>
          <div style={optionDesc(data.activity_level === a.key)}>{a.desc}</div>
        </button>
      ))}
      <button style={btn(!data.activity_level)} disabled={!data.activity_level} onClick={next}>Continue</button>
    </div>
  )

  if (step === 6) return (
    <div style={page} key={step}>
      {progress(6)}
      <div style={heading}>What's your goal?</div>
      <div style={sub}>We'll shape your targets around it.</div>
      {GOALS.map(g => (
        <button key={g.key} style={option(data.goal === g.key)} onClick={() => update('goal', g.key)}>
          <div style={optionLabel(data.goal === g.key)}>{g.label}</div>
          <div style={optionDesc(data.goal === g.key)}>{g.desc}</div>
        </button>
      ))}
      <button style={btn(!data.goal)} disabled={!data.goal} onClick={next}>Continue</button>
    </div>
  )

  if (step === 7) {
    const usesMileage  = data.sport === 'running' || data.sport === 'cycling'
    const volumeKey    = usesMileage ? 'weekly_mileage' : 'training_hours_week'
    const volumeLabel  = usesMileage ? 'Miles per week' : 'Hours per week'
    const volumeValue  = usesMileage ? data.weekly_mileage : data.training_hours_week
    const canContinue  = data.sport && volumeValue

    const handleSportSelect = (sportKey) => {
      const isMileage = sportKey === 'running' || sportKey === 'cycling'
      setData(d => ({
        ...d,
        sport: sportKey,
        weekly_mileage:      isMileage ? d.weekly_mileage : '',
        training_hours_week: isMileage ? '' : d.training_hours_week,
      }))
    }

    return (
      <div style={page} key={step}>
        {progress(7)}
        <div style={heading}>Are you a competitive athlete?</div>
        <div style={sub}>We'll calculate targets built around your training load, not a generic activity multiplier.</div>

        <button style={option(athleteChoice === 'yes')} onClick={() => setAthleteChoice('yes')}>
          <div style={optionLabel(athleteChoice === 'yes')}>Yes, I train seriously</div>
        </button>
        <button style={option(false)} onClick={() => goToResults(false)}>
          <div style={optionLabel(false)}>No, general fitness</div>
        </button>

        {athleteChoice === 'yes' && (
          <div style={{ marginTop: 4 }}>
            <div style={{
              display: 'flex', borderRadius: 10, overflow: 'hidden',
              border: '1px solid var(--border)', marginBottom: 16,
            }}>
              {SPORTS.map((s, i) => (
                <button
                  key={s.key}
                  onClick={() => handleSportSelect(s.key)}
                  style={{
                    flex: 1, padding: '10px 4px', fontSize: 11, fontWeight: 500,
                    lineHeight: 1.3, textAlign: 'center', border: 'none',
                    borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer', fontFamily: 'inherit',
                    background: data.sport === s.key ? 'var(--text)' : 'var(--surface)',
                    color: data.sport === s.key ? 'var(--bg)' : 'var(--muted)',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {data.sport && (
              <>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{volumeLabel}</div>
                <input
                  style={inputStyle}
                  type="number"
                  placeholder="0"
                  value={volumeValue}
                  onChange={e => update(volumeKey, e.target.value)}
                />
              </>
            )}

            <button style={btn(!canContinue)} disabled={!canContinue} onClick={() => goToResults(true)}>
              Continue
            </button>
          </div>
        )}
      </div>
    )
  }

  if (step === 8 && calculated) return (
    <div style={{ ...page, justifyContent: 'center' }} key={step}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>
        You're all set
      </div>
      <div style={heading}>Here's your plan, {data.display_name}</div>
      <div style={sub}>Based on your info, here are your daily targets. You can adjust these anytime in settings.</div>

      <div style={{
        background: 'var(--accent-light)', border: '1px solid var(--success-border)',
        borderRadius: 16, padding: 24, marginBottom: 24,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          {data.sport && (
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--accent)',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
            }}>
              Athletic targets
            </div>
          )}
          <div style={{ fontSize: 46, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1 }}>
            {calculated.calorie_goal}
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>calories per day</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid var(--success-border)', paddingTop: 16 }}>
          {[
            { label: 'Protein', val: calculated.protein_goal },
            { label: 'Carbs',   val: calculated.carbs_goal },
            { label: 'Fat',     val: calculated.fat_goal },
          ].map(m => (
            <div key={m.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>{m.val}g</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {error && <p style={{ color: 'var(--danger)', marginBottom: 12, fontSize: 14 }}>{error}</p>}

      <button style={btn(saving)} onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Start tracking'}
      </button>
    </div>
  )
}
