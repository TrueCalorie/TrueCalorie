import { useState, useEffect } from 'react'

export default function FoodDetailModal({ item, mealTime, onClose, onLog, userId, isSaved, onToggleSave }) {
  const [servings, setServings] = useState(1)
  const [saving, setSaving]     = useState(false)
  const [starAnim, setStarAnim] = useState(false)

  useEffect(() => { setServings(1) }, [item])

  if (!item) return null

  const baseCal = Math.round(item.nf_calories             || 0)
  const baseP   = Math.round(item.nf_protein              || 0)
  const baseC   = Math.round(item.nf_total_carbohydrate   || 0)
  const baseF   = Math.round(item.nf_total_fat            || 0)

  const totalCal = Math.round(baseCal * servings)
  const totalP   = Math.round(baseP   * servings)
  const totalC   = Math.round(baseC   * servings)
  const totalF   = Math.round(baseF   * servings)

  const adjust = (delta) => {
    const next = Math.max(0.5, Math.round((servings + delta) * 2) / 2)
    setServings(next)
  }

  const submit = () => { onLog(item, servings); onClose() }

  const handleStar = async () => {
    if (!onToggleSave || saving) return
    setSaving(true)
    setStarAnim(true)
    await onToggleSave(item)
    setSaving(false)
    setTimeout(() => setStarAnim(false), 400)
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
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        animation: 'fadeIn 0.2s ease both',
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
          // Scale + fade entrance
          animation: 'modalEnter 0.25s cubic-bezier(0.34, 1.2, 0.64, 1) both',
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
              transition: 'color 0.2s',
              // Pop animation when toggled
              animation: starAnim ? 'starPop 0.35s ease forwards' : 'none',
              transformOrigin: 'center',
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
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
        >×</button>

        {/* Name + brand */}
        <div style={{ marginBottom: 18, paddingLeft: onToggleSave ? 32 : 0, paddingRight: 32 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>
            {item.food_name}
          </div>
          {item.brand_name && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{item.brand_name}</div>
          )}
        </div>

        {/* Macro breakdown */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 8, marginBottom: 20,
        }}>
          {[
            { label: 'CALORIES', val: totalCal, unit: '' },
            { label: 'PROTEIN',  val: totalP,   unit: 'g' },
            { label: 'CARBS',    val: totalC,   unit: 'g' },
            { label: 'FAT',      val: totalF,   unit: 'g' },
          ].map(({ label, val, unit }) => (
            <div key={label} style={{
              background: 'var(--surface2)',
              borderRadius: 10, padding: '10px 12px',
              border: '1px solid var(--border)',
            }}>
              <div style={labelStyle}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
                {val}{unit}
              </div>
            </div>
          ))}
        </div>

        {/* Servings stepper */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 20,
          background: 'var(--surface)', borderRadius: 10,
          border: '1px solid var(--border)', padding: '10px 14px',
        }}>
          <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Servings</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => adjust(-0.5)}
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--surface2)',
                color: 'var(--text)', fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s, transform 0.1s',
                fontFamily: 'inherit',
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >−</button>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', minWidth: 28, textAlign: 'center' }}>
              {servings}
            </span>
            <button
              onClick={() => adjust(0.5)}
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--surface2)',
                color: 'var(--text)', fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s, transform 0.1s',
                fontFamily: 'inherit',
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >+</button>
          </div>
        </div>

        {/* Add CTA */}
        <button
          onClick={submit}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
            background: 'var(--accent)', color: '#fff',
            fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            letterSpacing: '0.01em',
            transition: 'opacity 0.15s, transform 0.1s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          Add to {mealTime}
        </button>
      </div>
    </div>
  )
}
