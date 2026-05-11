import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function Settings({ session, settings, onUpdate, onClose }) {
  const [form, setForm] = useState({
    display_name: settings?.display_name || '',
    calorie_goal: settings?.calorie_goal || 2000,
    protein_goal: settings?.protein_goal || 150,
    carbs_goal: settings?.carbs_goal || 250,
    fat_goal: settings?.fat_goal || 65,
    weight_lbs: settings?.weight_kg ? Math.round(settings.weight_kg * 2.20462) : '',
    activity_level: settings?.activity_level || '',
    goal: settings?.goal || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const update = (key, value) => setForm(f => ({ ...f, [key]: value }))

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
    border: '1px solid #ddd',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'sans-serif',
  }

  const labelStyle = {
    fontSize: 12,
    color: '#aaa',
    letterSpacing: '0.04em',
    marginBottom: 6,
    display: 'block',
  }

  const sectionStyle = {
    marginBottom: 28,
  }

  const sectionHeading = {
    fontSize: 13,
    fontWeight: 600,
    color: '#111',
    marginBottom: 14,
    paddingBottom: 8,
    borderBottom: '1px solid #f0f0f0',
  }

  const optionRow = (selected) => ({
    flex: 1,
    padding: '10px 8px',
    borderRadius: 8,
    border: selected ? '1.5px solid #111' : '1px solid #ddd',
    background: selected ? '#111' : 'none',
    color: selected ? '#fff' : '#888',
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: 'sans-serif',
    textAlign: 'center',
  })

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 24px 80px', fontFamily: 'sans-serif' }}>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#aaa', marginRight: 12, padding: 0 }}>←</button>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Settings</h1>
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
        <input style={{ ...inputStyle, marginBottom: 12 }} type="number" value={form.calorie_goal} onChange={e => update('calorie_goal', e.target.value)} />
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>PROTEIN (g)</label>
            <input style={inputStyle} type="number" value={form.protein_goal} onChange={e => update('protein_goal', e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>CARBS (g)</label>
            <input style={inputStyle} type="number" value={form.carbs_goal} onChange={e => update('carbs_goal', e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>FAT (g)</label>
            <input style={inputStyle} type="number" value={form.fat_goal} onChange={e => update('fat_goal', e.target.value)} />
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionHeading}>ABOUT YOU</div>
        <label style={labelStyle}>CURRENT WEIGHT (lbs)</label>
        <input style={{ ...inputStyle, marginBottom: 12 }} type="number" value={form.weight_lbs} onChange={e => update('weight_lbs', e.target.value)} placeholder="lbs" />

        <label style={labelStyle}>GOAL</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
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

        <label style={labelStyle}>ACTIVITY LEVEL</label>
        <div style={{ display: 'flex', gap: 8 }}>
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
      </div>

      <div style={sectionStyle}>
        <div style={sectionHeading}>ACCOUNT</div>
        <p style={{ fontSize: 13, color: '#aaa', marginBottom: 4 }}>Signed in as</p>
        <p style={{ fontSize: 14, color: '#111' }}>{session.user.email}</p>
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
          background: saved ? '#22c55e' : '#111',
          color: '#fff',
          cursor: 'pointer',
          transition: 'background 0.3s',
        }}
      >
        {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save changes'}
      </button>

    </div>
  )
}