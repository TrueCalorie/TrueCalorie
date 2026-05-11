import { useState } from 'react'
import { supabase } from './supabase'

const ACTIVITY_LEVELS = [
  { key: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
  { key: 'light', label: 'Lightly active', desc: '1–3 days/week' },
  { key: 'moderate', label: 'Moderately active', desc: '3–5 days/week' },
  { key: 'very', label: 'Very active', desc: '6–7 days/week' },
]

const GOALS = [
  { key: 'lose', label: 'Lose weight', desc: 'Eat in a calorie deficit' },
  { key: 'maintain', label: 'Maintain weight', desc: 'Eat at maintenance' },
  { key: 'gain', label: 'Gain muscle', desc: 'Eat in a calorie surplus' },
]

function calculateGoals({ age, sex, height_cm, weight_kg, activity_level, goal }) {
  const bmr = sex === 'male'
    ? 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    : 10 * weight_kg + 6.25 * height_cm - 5 * age - 161

  const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725 }
  const tdee = bmr * (multipliers[activity_level] || 1.2)

  const calorie_goal = Math.round(
    goal === 'lose' ? tdee - 500 :
    goal === 'gain' ? tdee + 300 :
    tdee
  )

  const protein_goal = Math.round(weight_kg * 2)
  const fat_goal = Math.round((calorie_goal * 0.25) / 9)
  const carbs_goal = Math.round((calorie_goal - protein_goal * 4 - fat_goal * 9) / 4)

  return { calorie_goal, protein_goal, fat_goal, carbs_goal }
}

export default function Onboarding({ session, onComplete }) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState({
    display_name: '',
    age: '',
    sex: '',
    height_ft: '',
    height_in: '',
    weight_lbs: '',
    activity_level: '',
    goal: '',
  })
  const [calculated, setCalculated] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const update = (key, value) => setData(d => ({ ...d, [key]: value }))

  const next = () => {
    if (step === 6) {
      const height_cm = (parseInt(data.height_ft) * 12 + parseInt(data.height_in)) * 2.54
      const weight_kg = parseFloat(data.weight_lbs) * 0.453592
      const goals = calculateGoals({
        age: parseInt(data.age),
        sex: data.sex,
        height_cm,
        weight_kg,
        activity_level: data.activity_level,
        goal: data.goal,
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
        display_name: data.display_name,
        age: parseInt(data.age),
        sex: data.sex,
        height_cm: Math.round(height_cm * 10) / 10,
        weight_kg: Math.round(weight_kg * 10) / 10,
        activity_level: data.activity_level,
        goal: data.goal,
        calorie_goal: calculated.calorie_goal,
        protein_goal: calculated.protein_goal,
        carbs_goal: calculated.carbs_goal,
        fat_goal: calculated.fat_goal,
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

  const container = {
    maxWidth: 480,
    margin: '0 auto',
    padding: '60px 24px 24px',
    fontFamily: 'sans-serif',
    minHeight: '100vh',
  }

  const heading = {
    fontSize: 26,
    fontWeight: 600,
    marginBottom: 8,
    color: '#111',
  }

  const sub = {
    fontSize: 15,
    color: '#888',
    marginBottom: 32,
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    fontSize: 16,
    borderRadius: 10,
    border: '1px solid #ddd',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 12,
  }

  const btn = (disabled) => ({
    width: '100%',
    padding: 14,
    fontSize: 16,
    borderRadius: 10,
    border: 'none',
    background: disabled ? '#eee' : '#111',
    color: disabled ? '#aaa' : '#fff',
    cursor: disabled ? 'default' : 'pointer',
    marginTop: 8,
  })

  const option = (selected) => ({
    width: '100%',
    padding: '14px 16px',
    borderRadius: 10,
    border: selected ? '2px solid #111' : '1px solid #ddd',
    background: selected ? '#f5f5f5' : '#fff',
    cursor: 'pointer',
    textAlign: 'left',
    marginBottom: 10,
    display: 'block',
  })

  if (step === 0) return (
    <div style={container}>
      <div style={{ fontSize: 32, marginBottom: 16 }}>👋</div>
      <div style={heading}>Welcome to TrueCalorie</div>
      <div style={sub}>Answer a few quick questions and we'll set everything up for you. Takes about 60 seconds.</div>
      <button style={btn(false)} onClick={next}>Let's go</button>
    </div>
  )

  if (step === 1) return (
    <div style={container}>
      <div style={sub}>1 of 6</div>
      <div style={heading}>What's your name?</div>
      <input
        style={inputStyle}
        placeholder="First name"
        value={data.display_name}
        onChange={e => update('display_name', e.target.value)}
        autoFocus
      />
      <button style={btn(!data.display_name)} disabled={!data.display_name} onClick={next}>Continue</button>
    </div>
  )

  if (step === 2) return (
    <div style={container}>
      <div style={sub}>2 of 6</div>
      <div style={heading}>How old are you?</div>
      <input
        style={inputStyle}
        type="number"
        placeholder="Age"
        value={data.age}
        onChange={e => update('age', e.target.value)}
        autoFocus
      />
      <button style={btn(!data.age)} disabled={!data.age} onClick={next}>Continue</button>
    </div>
  )

  if (step === 3) return (
    <div style={container}>
      <div style={sub}>3 of 6</div>
      <div style={heading}>Biological sex?</div>
      <div style={{ ...sub, marginBottom: 16 }}>Used for calorie calculations</div>
      {['male', 'female'].map(s => (
        <button key={s} style={option(data.sex === s)} onClick={() => update('sex', s)}>
          <div style={{ fontWeight: 500, fontSize: 15 }}>{s.charAt(0).toUpperCase() + s.slice(1)}</div>
        </button>
      ))}
      <button style={btn(!data.sex)} disabled={!data.sex} onClick={next}>Continue</button>
    </div>
  )

  if (step === 4) return (
    <div style={container}>
      <div style={sub}>4 of 6</div>
      <div style={heading}>Height and weight?</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          style={{ ...inputStyle, marginBottom: 0 }}
          type="number"
          placeholder="Feet"
          value={data.height_ft}
          onChange={e => update('height_ft', e.target.value)}
        />
        <input
          style={{ ...inputStyle, marginBottom: 0 }}
          type="number"
          placeholder="Inches"
          value={data.height_in}
          onChange={e => update('height_in', e.target.value)}
        />
      </div>
      <input
        style={inputStyle}
        type="number"
        placeholder="Weight (lbs)"
        value={data.weight_lbs}
        onChange={e => update('weight_lbs', e.target.value)}
      />
      <button
        style={btn(!data.height_ft || !data.height_in || !data.weight_lbs)}
        disabled={!data.height_ft || !data.height_in || !data.weight_lbs}
        onClick={next}
      >Continue</button>
    </div>
  )

  if (step === 5) return (
    <div style={container}>
      <div style={sub}>5 of 6</div>
      <div style={heading}>How active are you?</div>
      {ACTIVITY_LEVELS.map(a => (
        <button key={a.key} style={option(data.activity_level === a.key)} onClick={() => update('activity_level', a.key)}>
          <div style={{ fontWeight: 500, fontSize: 15 }}>{a.label}</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{a.desc}</div>
        </button>
      ))}
      <button style={btn(!data.activity_level)} disabled={!data.activity_level} onClick={next}>Continue</button>
    </div>
  )

  if (step === 6) return (
    <div style={container}>
      <div style={sub}>6 of 6</div>
      <div style={heading}>What's your goal?</div>
      {GOALS.map(g => (
        <button key={g.key} style={option(data.goal === g.key)} onClick={() => update('goal', g.key)}>
          <div style={{ fontWeight: 500, fontSize: 15 }}>{g.label}</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{g.desc}</div>
        </button>
      ))}
      <button style={btn(!data.goal)} disabled={!data.goal} onClick={next}>Continue</button>
    </div>
  )

  if (step === 7 && calculated) return (
    <div style={container}>
      <div style={{ fontSize: 32, marginBottom: 16 }}>🎯</div>
      <div style={heading}>Here's your plan, {data.display_name}</div>
      <div style={sub}>Based on your info we've calculated your daily targets. You can adjust these anytime in settings.</div>

      <div style={{ background: '#f5f5f5', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 42, fontWeight: 700 }}>{calculated.calorie_goal}</div>
          <div style={{ fontSize: 14, color: '#888' }}>calories per day</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          {[
            { label: 'Protein', val: calculated.protein_goal },
            { label: 'Carbs', val: calculated.carbs_goal },
            { label: 'Fat', val: calculated.fat_goal },
          ].map(m => (
            <div key={m.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{m.val}g</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {error && <p style={{ color: 'red', marginBottom: 12, fontSize: 14 }}>{error}</p>}

      <button style={btn(saving)} onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Start tracking'}
      </button>
    </div>
  )
}