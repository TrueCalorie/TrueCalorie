import { useState } from 'react'

export default function MealEditModal({ meal, onClose, onUpdate, onDelete }) {
  const [multiplier, setMultiplier] = useState(1)
  const [deleting, setDeleting] = useState(false)

  if (!meal) return null

  // Stored values are totals at the time of logging — treat as 1x baseline
  const baseCal = Math.round(meal.calories || 0)
  const baseP   = Math.round(meal.protein  || 0)
  const baseC   = Math.round(meal.carbs    || 0)
  const baseF   = Math.round(meal.fat      || 0)

  const totalCal = Math.round(baseCal * multiplier)
  const totalP   = Math.round(baseP   * multiplier)
  const totalC   = Math.round(baseC   * multiplier)
  const totalF   = Math.round(baseF   * multiplier)

  const adjust = (delta) => {
    const next = Math.max(0.5, Math.round((multiplier + delta) * 2) / 2)
    setMultiplier(next)
  }

  const handleUpdate = () => {
    onUpdate(meal.id, {
      calories: totalCal,
      protein:  totalP,
      carbs:    totalC,
      fat:      totalF,
    })
    onClose()
  }

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete(meal.id)
    onClose()
  }

  const labelStyle = { fontSize: 10, color: 'var(--muted)', letterSpacing: '0.06em', marginBottom: 8 }
  const unchanged = multiplier === 1

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 380,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 24,
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 20, color: 'var(--muted)', lineHeight: 1, padding: 6,
          }}
        >×</button>

        {/* Name + meal time */}
        <div style={{ marginBottom: 18, paddingRight: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>
            {meal.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            {meal.restaurant && (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{meal.restaurant}</span>
            )}
            <span style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 4,
              border: '1px solid var(--border)', color: 'var(--muted)',
              letterSpacing: '0.05em',
            }}>
              {meal.meal_time?.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Macro breakdown */}
        <div style={{
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          padding: '14px 0',
          marginBottom: 16,
        }}>
          <div style={labelStyle}>LOGGED</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>{baseCal}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 6 }}>cal</span>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { label: 'protein', val: baseP },
                { label: 'carbs',   val: baseC },
                { label: 'fat',     val: baseF },
              ].map(m => (
                <div key={m.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{m.val}g</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Multiplier stepper */}
        <div style={{ marginBottom: 16 }}>
          <div style={labelStyle}>ADJUST AMOUNT</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => adjust(-0.5)}
              disabled={multiplier <= 0.5}
              style={{
                width: 36, height: 36, borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--text)',
                fontSize: 18, cursor: multiplier <= 0.5 ? 'default' : 'pointer',
                opacity: multiplier <= 0.5 ? 0.4 : 1,
              }}
            >−</button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
              {multiplier % 1 === 0 ? multiplier : multiplier.toFixed(1)}×
            </div>
            <button
              onClick={() => adjust(0.5)}
              style={{
                width: 36, height: 36, borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--text)',
                fontSize: 18, cursor: 'pointer',
              }}
            >+</button>
          </div>
        </div>

        {/* Updated total — only show when multiplier changed */}
        {!unchanged && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 16,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ ...labelStyle, marginBottom: 4 }}>UPDATED TOTAL</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                {totalP}p · {totalC}c · {totalF}f
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>
              {totalCal} <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400 }}>cal</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              flex: 1, padding: 12, borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'none', color: 'var(--muted)',
              fontSize: 14, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'sans-serif',
            }}
          >
            {deleting ? '...' : 'delete'}
          </button>
          <button
            onClick={unchanged ? onClose : handleUpdate}
            style={{
              flex: 2, padding: 12, borderRadius: 10, border: 'none',
              background: 'var(--text)', color: 'var(--bg)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'sans-serif',
            }}
          >
            {unchanged ? 'done' : 'save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
