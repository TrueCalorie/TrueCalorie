import { useState, useEffect } from 'react'

export default function FoodDetailModal({ item, mealTime, onClose, onLog, userId, isSaved, onToggleSave }) {
  const [servings, setServings] = useState(1)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setServings(1) }, [item])

  if (!item) return null

  const baseCal = Math.round(item.nf_calories || 0)
  const baseP   = Math.round(item.nf_protein || 0)
  const baseC   = Math.round(item.nf_total_carbohydrate || 0)
  const baseF   = Math.round(item.nf_total_fat || 0)

  const totalCal = Math.round(baseCal * servings)
  const totalP   = Math.round(baseP   * servings)
  const totalC   = Math.round(baseC   * servings)
  const totalF   = Math.round(baseF   * servings)

  const adjust = (delta) => {
    const next = Math.max(0.5, Math.round((servings + delta) * 2) / 2)
    setServings(next)
  }

  const submit = () => {
    onLog(item, servings)
    onClose()
  }

  const handleStar = async () => {
    if (!onToggleSave || saving) return
    setSaving(true)
    await onToggleSave(item)
    setSaving(false)
  }

  const labelStyle = { fontSize: 10, color: 'var(--muted)', letterSpacing: '0.06em', marginBottom: 8 }

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
        {/* Star — save food */}
        {onToggleSave && (
          <button
            onClick={handleStar}
            disabled={saving}
            aria-label={isSaved ? 'Unsave food' : 'Save food'}
            style={{
              position: 'absolute', top: 12, left: 12,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 22, lineHeight: 1, padding: 6,
              color: isSaved ? '#f5a623' : 'var(--border)',
              transition: 'color 0.15s',
            }}
          >
            {isSaved ? '★' : '☆'}
          </button>
        )}

        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: 12, right: 12,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 20, color: 'var(--muted)', lineHeight: 1, padding: 6,
          }}
        >×</button>

        {/* Name + brand */}
        <div style={{ marginBottom: 18, paddingLeft: onToggleSave ? 28 : 0, paddingRight: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>
            {item.food_name}
          </div>
          {item.brand_name && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              {item.brand_name}
            </div>
          )}
        </div>

        {/* Per serving */}
        <div style={{
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          padding: '14px 0',
          marginBottom: 16,
        }}>
          <div style={labelStyle}>PER SERVING</div>
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

        {/* Servings stepper */}
        <div style={{ marginBottom: 16 }}>
          <div style={labelStyle}>SERVINGS</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => adjust(-0.5)}
              disabled={servings <= 0.5}
              style={{
                width: 36, height: 36, borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--text)',
                fontSize: 18, cursor: servings <= 0.5 ? 'default' : 'pointer',
                opacity: servings <= 0.5 ? 0.4 : 1,
              }}
            >−</button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
              {servings % 1 === 0 ? servings : servings.toFixed(1)}
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

        {/* Total */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '12px 14px',
          marginBottom: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ ...labelStyle, marginBottom: 4 }}>TOTAL</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              {totalP}p · {totalC}c · {totalF}f
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>
            {totalCal} <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400 }}>cal</span>
          </div>
        </div>

        <button
          onClick={submit}
          style={{
            width: '100%', padding: 12,
            borderRadius: 10, border: 'none',
            background: 'var(--text)', color: 'var(--bg)',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'sans-serif',
          }}
        >
          add to {mealTime.toLowerCase()}
        </button>
      </div>
    </div>
  )
}
