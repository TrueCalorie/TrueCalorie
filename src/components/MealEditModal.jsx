import { useState } from 'react'

export default function MealEditModal({ meal, onClose, onUpdate, onDelete, isSaved, onToggleSave }) {
  const [multiplier, setMultiplier] = useState(1)
  const [deleting, setDeleting]     = useState(false)
  const [saving, setSaving]         = useState(false)
  const [starAnim, setStarAnim]     = useState(false)

  if (!meal) return null

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
    onUpdate(meal.id, { calories: totalCal, protein: totalP, carbs: totalC, fat: totalF })
    onClose()
  }

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete(meal.id)
    onClose()
  }

  const handleStar = async () => {
    if (!onToggleSave || saving) return
    setSaving(true)
    setStarAnim(true)
    await onToggleSave()
    setSaving(false)
    setTimeout(() => setStarAnim(false), 400)
  }

  const labelStyle = { fontSize: 10, color: 'var(--muted)', letterSpacing: '0.06em', marginBottom: 8 }
  const unchanged  = multiplier === 1

  const stepBtn = (label, delta) => (
    <button
      onClick={() => adjust(delta)}
      style={{
        width: 32, height: 32, borderRadius: 8,
        border: '1px solid var(--border)', background: 'var(--surface2)',
        color: 'var(--text)', fontSize: 18, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'transform 0.1s', fontFamily: 'inherit',
      }}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
    >{label}</button>
  )

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
          borderRadius: 16, padding: 24,
          fontFamily: 'sans-serif', position: 'relative',
          animation: 'modalEnter 0.25s cubic-bezier(0.34, 1.2, 0.64, 1) both',
        }}
      >
        {/* Star — save this food */}
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
          style={{
            position: 'absolute', top: 12, right: 12,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 20, color: 'var(--muted)', lineHeight: 1, padding: 6,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
        >×</button>

        {/* Name + meal time */}
        <div style={{ marginBottom: 18, paddingLeft: onToggleSave ? 32 : 0, paddingRight: 32 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>
            {meal.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
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

        {/* Macro grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'CALORIES', val: totalCal, unit: '' },
            { label: 'PROTEIN',  val: totalP,   unit: 'g' },
            { label: 'CARBS',    val: totalC,   unit: 'g' },
            { label: 'FAT',      val: totalF,   unit: 'g' },
          ].map(({ label, val, unit }) => (
            <div key={label} style={{
              background: 'var(--surface2)', borderRadius: 10,
              padding: '10px 12px', border: '1px solid var(--border)',
            }}>
              <div style={labelStyle}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
                {val}{unit}
              </div>
            </div>
          ))}
        </div>

        {/* Multiplier stepper */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 20, background: 'var(--surface)', borderRadius: 10,
          border: '1px solid var(--border)', padding: '10px 14px',
        }}>
          <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Multiplier</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {stepBtn('−', -0.5)}
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', minWidth: 28, textAlign: 'center' }}>
              {multiplier}×
            </span>
            {stepBtn('+', 0.5)}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 12,
              border: '1px solid var(--border)', background: 'none',
              color: deleting ? 'var(--muted)' : '#E24B4A',
              fontSize: 14, fontWeight: 600,
              cursor: deleting ? 'default' : 'pointer',
              fontFamily: 'inherit', transition: 'background 0.15s, transform 0.1s',
            }}
            onMouseEnter={e => { if (!deleting) e.currentTarget.style.background = 'rgba(226,75,74,0.08)' }}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >{deleting ? 'Deleting…' : 'Delete'}</button>

          <button
            onClick={handleUpdate}
            disabled={unchanged}
            style={{
              flex: 2, padding: '13px 0', borderRadius: 12, border: 'none',
              background: unchanged ? 'var(--surface2)' : 'var(--text)',
              color: unchanged ? 'var(--muted)' : 'var(--bg)',
              fontSize: 14, fontWeight: 600,
              cursor: unchanged ? 'default' : 'pointer',
              fontFamily: 'inherit', transition: 'background 0.2s, color 0.2s, transform 0.1s',
            }}
            onMouseDown={e => { if (!unchanged) e.currentTarget.style.transform = 'scale(0.98)' }}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >{unchanged ? 'No changes' : 'Update'}</button>
        </div>
      </div>
    </div>
  )
}
