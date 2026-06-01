import { useState } from 'react'

// ─── CombineMealModal ─────────────────────────────────────────────────────────
// Opened from MealEditModal when user taps "Combine".
// Shows all other meals logged today. User picks which ones to merge
// with the current meal, gives the result a name, and submits.
// onCombine(selectedIds, name) is called — App.jsx handles the DB operations.

export default function CombineMealModal({ meal, allMeals, onClose, onCombine }) {
  const [selected, setSelected]   = useState(new Set())
  const [mealName, setMealName]   = useState(meal.name)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep]           = useState('select') // 'select' | 'name'

  if (!meal) return null

  // Other meals from today (exclude the anchor meal itself)
  const otherMeals = allMeals.filter(m => m.id !== meal.id)

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Combined macro totals (anchor + all selected)
  const selectedMeals = allMeals.filter(m => selected.has(m.id))
  const allCombined   = [meal, ...selectedMeals]

  const totalCal = Math.round(allCombined.reduce((s, m) => s + (m.calories || 0), 0))
  const totalP   = Math.round(allCombined.reduce((s, m) => s + (m.protein  || 0), 0))
  const totalC   = Math.round(allCombined.reduce((s, m) => s + (m.carbs    || 0), 0))
  const totalF   = Math.round(allCombined.reduce((s, m) => s + (m.fat      || 0), 0))

  const canProceed = selected.size > 0

  const handleSubmit = async () => {
    if (!mealName.trim() || submitting) return
    setSubmitting(true)
    await onCombine([...selected], mealName.trim(), {
      calories: totalCal,
      protein:  totalP,
      carbs:    totalC,
      fat:      totalF,
    })
    onClose()
  }

  const labelStyle = { fontSize: 10, color: 'var(--muted)', letterSpacing: '0.06em', marginBottom: 6 }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 210,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        animation: 'fadeIn 0.2s ease both',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 400,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 16, padding: 24,
          fontFamily: 'sans-serif',
          maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          animation: 'modalEnter 0.25s cubic-bezier(0.34, 1.2, 0.64, 1) both',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              {step === 'select' ? 'Combine meals' : 'Name this meal'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {step === 'select'
                ? `Starting with: ${meal.name}`
                : 'Give the combined meal a name'}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 20, color: 'var(--muted)', lineHeight: 1, padding: 6,
          }}>×</button>
        </div>

        {/* ── Step 1: Select meals to combine ── */}
        {step === 'select' && (
          <>
            {otherMeals.length === 0 ? (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', padding: '20px 0',
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🍽</div>
                <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
                  No other meals logged today to combine with.
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
                {/* Anchor meal — always included, shown as fixed */}
                <div style={{ marginBottom: 10 }}>
                  <div style={labelStyle}>ANCHOR (always included)</div>
                  <div style={{
                    padding: '11px 14px',
                    background: 'rgba(29,158,117,0.08)',
                    border: '1px solid rgba(29,158,117,0.25)',
                    borderRadius: 10,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{meal.name}</div>
                      {meal.restaurant && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{meal.restaurant}</div>}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>{Math.round(meal.calories)} cal</div>
                  </div>
                </div>

                {/* Selectable meals */}
                <div style={labelStyle}>SELECT TO COMBINE</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {otherMeals.map(m => {
                    const isSelected = selected.has(m.id)
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggle(m.id)}
                        style={{
                          padding: '11px 14px', width: '100%', textAlign: 'left',
                          borderRadius: 10,
                          border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                          background: isSelected ? 'rgba(29,158,117,0.07)' : 'var(--surface)',
                          cursor: 'pointer', fontFamily: 'inherit',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          transition: 'border-color 0.15s, background 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                            border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                            background: isSelected ? 'var(--accent)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'background 0.15s, border-color 0.15s',
                          }}>
                            {isSelected && <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>✓</span>}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{m.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                              {m.meal_time}{m.restaurant ? ` · ${m.restaurant}` : ''}
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0, marginLeft: 8 }}>
                          {Math.round(m.calories)} cal
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Live totals preview */}
            {canProceed && (
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 14, flexShrink: 0,
              }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.05em' }}>
                  COMBINED TOTAL
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  {[
                    { label: 'Cal',  val: totalCal, unit: '' },
                    { label: 'Pro',  val: totalP,   unit: 'g' },
                    { label: 'Carb', val: totalC,   unit: 'g' },
                    { label: 'Fat',  val: totalF,   unit: 'g' },
                  ].map(({ label, val, unit }) => (
                    <div key={label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{val}{unit}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => canProceed && setStep('name')}
              disabled={!canProceed}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                background: canProceed ? 'var(--text)' : 'var(--surface2)',
                color: canProceed ? 'var(--bg)' : 'var(--muted)',
                fontSize: 14, fontWeight: 600,
                cursor: canProceed ? 'pointer' : 'default',
                fontFamily: 'inherit', flexShrink: 0,
              }}
            >
              {canProceed ? `Combine ${selected.size + 1} meals →` : 'Select meals to combine'}
            </button>
          </>
        )}

        {/* ── Step 2: Name the combined meal ── */}
        {step === 'name' && (
          <>
            {/* Totals summary */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 14px', marginBottom: 20, flexShrink: 0,
            }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.05em' }}>
                COMBINED TOTAL · {allCombined.length} items
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {[
                  { label: 'Calories', val: totalCal, unit: '' },
                  { label: 'Protein',  val: totalP,   unit: 'g' },
                  { label: 'Carbs',    val: totalC,   unit: 'g' },
                  { label: 'Fat',      val: totalF,   unit: 'g' },
                ].map(({ label, val, unit }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{val}{unit}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Name input */}
            <div style={{ marginBottom: 20, flexShrink: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Meal name</div>
              <input
                autoFocus
                value={mealName}
                onChange={e => setMealName(e.target.value)}
                placeholder="e.g. Pre-workout meal"
                style={{
                  width: '100%', padding: '12px 14px',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 10, fontSize: 15, color: 'var(--text)',
                  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                }}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
              />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                The original items will be replaced by this combined entry.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              <button
                onClick={() => setStep('select')}
                style={{
                  flex: 1, padding: '13px 0', borderRadius: 12,
                  border: '1px solid var(--border)', background: 'none',
                  color: 'var(--text)', fontSize: 14, fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >← Back</button>
              <button
                onClick={handleSubmit}
                disabled={!mealName.trim() || submitting}
                style={{
                  flex: 2, padding: '13px 0', borderRadius: 12, border: 'none',
                  background: mealName.trim() && !submitting ? 'var(--accent)' : 'var(--surface2)',
                  color: mealName.trim() && !submitting ? '#fff' : 'var(--muted)',
                  fontSize: 14, fontWeight: 600,
                  cursor: mealName.trim() && !submitting ? 'pointer' : 'default',
                  fontFamily: 'inherit',
                }}
              >
                {submitting ? 'Combining…' : 'Combine & save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
