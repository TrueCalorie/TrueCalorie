import { useState } from 'react'
import { supabase } from './supabase'
import { calculateGoals } from './macros'

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

export default function Onboarding({ session, onComplete }) {
  const [step, setStep]           = useState(0)
  const [data, setData]           = useState({
    display_name: '', age: '', sex: '',
    height_ft: '', height_in: '', weight_lbs: '',
    activity_level: '', goal: '',
  })
  const [calculated, setCalculated] = useState(null)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const update = (key, value) => setData(d => ({ ...d, [key]: value }))

  const next = () => {
    if (step === 6) {
      const height_cm = (parseInt(data.height_ft) * 12 + parseInt(data.height_in)) * 2.54
      const weight_kg = parseFloat(data.weight_lbs) * 0.453592
      const goals = calculateGoals({
        age: parseInt(data.age), sex: data.sex,
        height_cm, weight_kg,
        activity_level: data.activity_level, goal: data.goal,
      })
      setCalculated(goals)
    }
    setStep(s => s + 1)
  }

  const save = async () => {
    setSaving(true)
    setError('')
    const height_cm = (parseInt(data.height_ft) * 12 + parseInt(data.height_in)) * 2.54
    const weight_kg = parseFloat(data.weight_lbs) * 0.453592
    const { error } = await supabase
      .from('user_settings')
      .update({
        display_name:       data.display_name,
        age:                parseInt(data.age),
        sex:                data.sex,
        height_cm:          Math.round(height_cm * 10) / 10,
        weight_kg:          Math.round(weight_kg * 10) / 10,
        activity_level:     data.activity_level,
        goal:               data.goal,
        calorie_goal:       calculated.calorie_goal,
        protein_goal:       calculated.protein_goal,
        carbs_goal:         calculated.carbs_goal,
        fat_goal:           calculated.fat_goal,
        onboarding_complete: true,
      })
      .eq('user_id', session.user.id)
    if (error) {
      console.error(error)
      setError('Something went wrong. Please try again.')
      setSaving(false)
      return
    }
    setSaving(false)
    onComplete()
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  const c = {
    maxWidth: 480, margin: '0 auto', padding: '60px 24px 24px',
    fontFamily: 'sans-serif', minHeight: '100vh', background: 'var(--bg)',
  }
  const heading   = { fontSize: 26, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }
  const sub       = { fontSize: 15, color: 'var(--muted)', marginBottom: 32 }
  const counter   = { fontSize: 13, color: 'var(--muted)', marginBottom: 24 }
  const inputStyle = {
    width: '100%', padding: '12px 14px', fontSize: 16, borderRadius: 10,
    border: '1px solid var(--border)', outline: 'none', boxSizing: 'border-box',
    marginBottom: 12, background: 'var(--surface)', color: 'var(--text)',
    fontFamily: 'sans-serif', WebkitTextFillColor: 'var(--text)',
  }
  const btn = (disabled) => ({
    width: '100%', padding: 14, fontSize: 16, borderRadius: 10, border: 'none',
    background: disabled ? 'var(--surface2)' : 'var(--text)',
    color: disabled ? 'var(--muted)' : 'var(--bg)',
    cursor: disabled ? 'default' : 'pointer', marginTop: 8, fontFamily: 'sans-serif',
  })
  const option = (selected) => ({
    width: '100%', padding: '14px 16px', borderRadius: 10,
    border: selected ? '2px solid var(--text)' : '1px solid var(--border)',
    background: selected ? 'var(--text)' : 'var(--surface)',
    cursor: 'pointer', textAlign: 'left', marginBottom: 10, display: 'block',
  })
  const optionLabel = (selected) => ({ fontWeight: 500, fontSize: 15, color: selected ? 'var(--bg)' : 'var(--text)' })
  const optionDesc  = (selected) => ({ fontSize: 13, color: selected ? 'var(--bg)' : 'var(--muted)', marginTop: 2, opacity: selected ? 0.8 : 1 })

  // ── Steps ────────────────────────────────────────────────────────────────────

  if (step === 0) return (
    <div style={c}>
      <div style={{ fontSize: 32, marginBottom: 16 }}>👋</div>
      <div style={heading}>Welcome to TrueCalorie</div>
      <div style={sub}>Answer a few quick questions and we'll set everything up for you.</div>
      <button style={btn(false)} onClick={next}>Get started</button>
    </div>
  )

  if (step === 1) return (
    <div style={c}>
      <div style={counter}>1 of 6</div>
      <div style={heading}>What's your name?</div>
      <input
        style={inputStyle} type="text" placeholder="First name"
        value={data.display_name} onChange={e => update('display_name', e.target.value)}
        autoFocus
      />
      <button style={btn(!data.display_name)} disabled={!data.display_name} onClick={next}>Continue</button>
    </div>
  )

  if (step === 2) return (
    <div style={c}>
      <div style={counter}>2 of 6</div>
      <div style={heading}>How old are you?</div>
      <input
        style={inputStyle} type="number" placeholder="Age"
        value={data.age} onChange={e => update('age', e.target.value)}
      />
      <button style={btn(!data.age)} disabled={!data.age} onClick={next}>Continue</button>
    </div>
  )

  if (step === 3) return (
    <div style={c}>
      <div style={counter}>3 of 6</div>
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
    <div style={c}>
      <div style={counter}>4 of 6</div>
      <div style={heading}>Height and weight?</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input style={{ ...inputStyle, marginBottom: 0 }} type="number" placeholder="Feet"
          value={data.height_ft} onChange={e => update('height_ft', e.target.value)} />
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
    <div style={c}>
      <div style={counter}>5 of 6</div>
      <div style={heading}>How active are you?</div>
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
    <div style={c}>
      <div style={counter}>6 of 6</div>
      <div style={heading}>What's your goal?</div>
      {GOALS.map(g => (
        <button key={g.key} style={option(data.goal === g.key)} onClick={() => update('goal', g.key)}>
          <div style={optionLabel(data.goal === g.key)}>{g.label}</div>
          <div style={optionDesc(data.goal === g.key)}>{g.desc}</div>
        </button>
      ))}
      <button style={btn(!data.goal)} disabled={!data.goal} onClick={next}>Continue</button>
    </div>
  )

  if (step === 7 && calculated) return (
    <div style={c}>
      <div style={{ fontSize: 32, marginBottom: 16 }}>🎯</div>
      <div style={heading}>Here's your plan, {data.display_name}</div>
      <div style={sub}>Based on your info we've calculated your daily targets. You can adjust these anytime in settings.</div>

      {/* Calculated targets card */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 20, marginBottom: 16,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 42, fontWeight: 700, color: 'var(--text)' }}>{calculated.calorie_goal}</div>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>calories per day</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
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

      {/* Athletic targets teaser */}
      <div style={{
        background: 'rgba(29,158,117,0.06)',
        border: '1px solid rgba(29,158,117,0.2)',
        borderRadius: 12, padding: '14px 16px', marginBottom: 24,
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>🏃</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
            Train seriously? Get more accurate targets.
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
            TrueCalorie Pro includes sport-specific calorie and macro targets built around your training volume — not a generic activity multiplier. Set them in Settings → Body & Fitness after you sign up.
          </div>
        </div>
      </div>

      {error && <p style={{ color: '#ef4444', marginBottom: 12, fontSize: 14 }}>{error}</p>}

      <button style={btn(saving)} onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Start tracking'}
      </button>
    </div>
  )
}
