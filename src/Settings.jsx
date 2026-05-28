import { useState } from 'react'
import { supabase } from './supabase'
import { calculateGoals } from './macros'

export default function Settings({ session, settings, onUpdate, onClose }) {
  // Convert stored height_cm back into feet + inches for display
  const heightToFeetInches = (cm) => {
    if (!cm) return { ft: '', in: '' }
    const totalInches = cm / 2.54
    const ft = Math.floor(totalInches / 12)
    const inches = Math.round(totalInches - ft * 12)
    return { ft: String(ft), in: String(inches) }
  }
  const initialHeight = heightToFeetInches(settings?.height_cm)

  const [form, setForm] = useState({
    display_name: settings?.display_name || '',
    calorie_goal: settings?.calorie_goal || 2000,
    protein_goal: settings?.protein_goal || 150,
    carbs_goal: settings?.carbs_goal || 250,
    fat_goal: settings?.fat_goal || 65,
    age: settings?.age || '',
    sex: settings?.sex || '',
    height_ft: initialHeight.ft,
    height_in: initialHeight.in,
    weight_lbs: settings?.weight_kg ? Math.round(settings.weight_kg * 2.20462) : '',
    activity_level: settings?.activity_level || '',
    goal: settings?.goal || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [recalcFlash, setRecalcFlash] = useState(false)
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('theme') || 'system')

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

  // Can we run a recalc? Need every input the formula touches.
  const canRecalculate = Boolean(
    form.age && form.sex &&
    form.height_ft && form.height_in &&
    form.weight_lbs &&
    form.activity_level && form.goal
  )

  const recalculate = () => {
    if (!canRecalculate) return
    const height_cm = (parseInt(form.height_ft) * 12 + parseInt(form.height_in)) * 2.54
    const weight_kg = parseFloat(form.weight_lbs) * 0.453592
    const goals = calculateGoals({
      age: parseInt(form.age),
      sex: form.sex,
      height_cm,
      weight_kg,
      activity_level: form.activity_level,
      goal: form.goal,
    })
    setForm(f => ({
      ...f,
      calorie_goal: goals.calorie_goal,
      protein_goal: goals.protein_goal,
      carbs_goal: goals.carbs_goal,
      fat_goal: goals.fat_goal,
    }))
    setRecalcFlash(true)
    setTimeout(() => setRecalcFlash(false), 1500)
  }

  const save = async () => {
    setSaving(true)
    const updates = {
      display_name: form.display_name,
      calorie_goal: parseInt(form.calorie_goal),
      protein_goal: parseInt(form.protein_goal),
      carbs_goal: parseInt(form.carbs_goal),
      fat_goal: parseInt(form.fat_goal),
      activity_level: form.activity_level,
      goal: form.goal,
    }
    if (form.age) updates.age = parseInt(form.age)
    if (form.sex) updates.sex = form.sex
    if (form.height_ft && form.height_in) {
      const height_cm = (parseInt(form.height_ft) * 12 + parseInt(form.height_in)) * 2.54
      updates.height_cm = Math.round(height_cm * 10) / 10
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

  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    fontSize: 15,
    borderRadius: 10,
    border: '1px solid var(--border)',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'sans-serif',
    background: 'var(--surface)',
    color: 'var(--text)',
  }

  const labelStyle = {
    fontSize: 12,
    color: 'var(--muted)',
    letterSpacing: '0.04em',
    marginBottom: 6,
    display: 'block',
  }

  const sectionStyle = { marginBottom: 28 }

  const sectionHeading = {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text)',
    marginBottom: 14,
    paddingBottom: 8,
    borderBottom: '1px solid var(--border)',
  }

  const optionRow = (selected) => ({
    flex: 1,
    padding: '10px 8px',
    borderRadius: 8,
    border: selected ? '1.5px solid var(--text)' : '1px solid var(--border)',
    background: selected ? 'var(--text)' : 'none',
    color: selected ? 'var(--bg)' : 'var(--muted)',
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: 'sans-serif',
    textAlign: 'center',
  })

  const themeBtn = (t) => ({
    flex: 1,
    padding: '10px 8px',
    borderRadius: 8,
    border: currentTheme === t ? '1.5px solid var(--text)' : '1px solid var(--border)',
    background: currentTheme === t ? 'var(--text)' : 'none',
    color: currentTheme === t ? 'var(--bg)' : 'var(--muted)',
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: 'sans-serif',
    textAlign: 'center',
  })

  // Daily goals input style — flash background briefly after recalc so the user sees what changed
  const goalInputStyle = recalcFlash
    ? { ...inputStyle, background: 'rgba(29, 158, 117, 0.12)', transition: 'background 0.4s' }
    : { ...inputStyle, transition: 'background 0.4s' }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 24px 80px', fontFamily: 'sans-serif', background: 'var(--bg)', minHeight: '100vh' }}>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--muted)', marginRight: 12, padding: 0 }}>←</button>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>Settings</h1>
      </div>

      <div style={sectionStyle}>
        <div style={sectionHeading}>PROFILE</div>
        <label style={labelStyle}>NAME</label>
        <input
          style={inputStyle}
          value={form.display_name}
          onChange={e => update('display_name', e.target.value)}
          placeholder="First name"
        />
      </div>

      <div style={sectionStyle}>
        <div style={sectionHeading}>DAILY GOALS</div>
        <label style={labelStyle}>CALORIES</label>
        <input style={{ ...goalInputStyle, marginBottom: 12 }} type="number" value={form.calorie_goal} onChange={e => update('calorie_goal', e.target.value)} />
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>PROTEIN (g)</label>
            <input style={goalInputStyle} type="number" value={form.protein_goal} onChange={e => update('protein_goal', e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>CARBS (g)</label>
            <input style={goalInputStyle} type="number" value={form.carbs_goal} onChange={e => update('carbs_goal', e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>FAT (g)</label>
            <input style={goalInputStyle} type="number" value={form.fat_goal} onChange={e => update('fat_goal', e.target.value)} />
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
          Tweak these manually, or use "Recalculate macros" below to regenerate them from your profile.
        </p>
      </div>

      <div style={sectionStyle}>
        <div style={sectionHeading}>ABOUT YOU</div>

        <label style={labelStyle}>AGE</label>
        <input
          style={{ ...inputStyle, marginBottom: 12 }}
          type="number"
          value={form.age}
          onChange={e => update('age', e.target.value)}
          placeholder="years"
        />

        <label style={labelStyle}>SEX</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {['male', 'female'].map(s => (
            <button key={s} style={optionRow(form.sex === s)} onClick={() => update('sex', s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <label style={labelStyle}>HEIGHT</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            style={{ ...inputStyle, marginBottom: 0 }}
            type="number"
            placeholder="Feet"
            value={form.height_ft}
            onChange={e => update('height_ft', e.target.value)}
          />
          <input
            style={{ ...inputStyle, marginBottom: 0 }}
            type="number"
            placeholder="Inches"
            value={form.height_in}
            onChange={e => update('height_in', e.target.value)}
          />
        </div>

        <label style={labelStyle}>CURRENT WEIGHT (lbs)</label>
        <input
          style={{ ...inputStyle, marginBottom: 12 }}
          type="number"
          value={form.weight_lbs}
          onChange={e => update('weight_lbs', e.target.value)}
          placeholder="lbs"
        />

        <label style={labelStyle}>ACTIVITY LEVEL</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[
            { key: 'sedentary', label: 'Sedentary' },
            { key: 'light', label: 'Light' },
            { key: 'moderate', label: 'Moderate' },
            { key: 'very', label: 'Very active' },
          ].map(a => (
            <button key={a.key} style={optionRow(form.activity_level === a.key)} onClick={() => update('activity_level', a.key)}>
              {a.label}
            </button>
          ))}
        </div>

        <label style={labelStyle}>GOAL</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { key: 'lose', label: 'Lose weight' },
            { key: 'maintain', label: 'Maintain' },
            { key: 'gain', label: 'Gain muscle' },
          ].map(g => (
            <button key={g.key} style={optionRow(form.goal === g.key)} onClick={() => update('goal', g.key)}>
              {g.label}
            </button>
          ))}
        </div>

        <button
          onClick={recalculate}
          disabled={!canRecalculate}
          style={{
            width: '100%',
            padding: '11px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'none',
            color: canRecalculate ? 'var(--text)' : 'var(--muted)',
            fontSize: 13,
            fontWeight: 500,
            cursor: canRecalculate ? 'pointer' : 'default',
            opacity: canRecalculate ? 1 : 0.6,
            fontFamily: 'sans-serif',
          }}
        >
          Recalculate macros
        </button>
        {!canRecalculate && (
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, textAlign: 'center' }}>
            Fill in every field above to recalculate.
          </p>
        )}
      </div>

      <div style={sectionStyle}>
        <div style={sectionHeading}>APPEARANCE</div>
        <label style={labelStyle}>THEME</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['system', 'light', 'dark'].map(t => (
            <button key={t} style={themeBtn(t)} onClick={() => setTheme(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionHeading}>ACCOUNT</div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>Signed in as</p>
        <p style={{ fontSize: 14, color: 'var(--text)', marginBottom: 16 }}>{session.user.email}</p>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '10px 16px',
            fontSize: 13,
            color: 'var(--muted)',
            cursor: 'pointer',
            fontFamily: 'sans-serif',
            width: '100%',
          }}
        >
          Sign out
        </button>
      </div>

      <button
        onClick={save}
        disabled={saving}
        style={{
          width: '100%',
          padding: 14,
          fontSize: 16,
          borderRadius: 10,
          border: 'none',
          background: saved ? '#22c55e' : 'var(--text)',
          color: saved ? '#fff' : 'var(--bg)',
          cursor: 'pointer',
          transition: 'background 0.3s',
        }}
      >
        {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save changes'}
      </button>

    </div>
  )
}