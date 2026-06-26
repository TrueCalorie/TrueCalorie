import { useState, useRef } from 'react'
import { supabase } from '../supabase'
import { usePro } from '../hooks/usePro'
import { apiFetch } from '../lib/apiFetch'

// ─── State Machine ────────────────────────────────────────────────────────────
const PHASE = {
  IDLE:       'idle',
  RECORDING:  'recording',
  PROCESSING: 'processing',
  REVIEW:     'review',
  ERROR:      'error',
}

// Catch-all / non-answer clarifying options the model sometimes emits. The UI
// already provides its own "Other…" free-text box and a "Skip" button, so these
// would be dead-end choices the user can't actually fill in. Strip them.
const CATCHALL_OPTION = /\b(other|something else|elaborate|not sure|unsure|don'?t know|none|n\/?a)\b/i

// Drop catch-all clarifying options; if nothing concrete is left, remove the
// question entirely so the card just shows the estimate.
function sanitizeFood(food) {
  const options = Array.isArray(food.clarifying_options)
    ? food.clarifying_options.filter(o => typeof o === 'string' && o.trim() && !CATCHALL_OPTION.test(o))
    : []
  return options.length > 0
    ? { ...food, clarifying_options: options }
    : { ...food, clarifying_question: null, clarifying_options: [] }
}

// ─── Waveform ─────────────────────────────────────────────────────────────────
function Waveform() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 28 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <div
          key={i}
          style={{
            width: 4, borderRadius: 2, background: '#fff',
            animation: `voiceBar 0.9s ease-in-out ${i * 0.12}s infinite alternate`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Food Card ────────────────────────────────────────────────────────────────
function FoodCard({ food, index, onRemove, onMultiplierChange, onClarify }) {
  const [clarifying, setClarifying] = useState(false)
  const [otherMode, setOtherMode]   = useState(false)   // "Other…" text input active
  const [otherText, setOtherText]   = useState('')       // value of the "Other…" input

  const multiplier = food.multiplier ?? 1
  const cal  = Math.round((food.nf_calories             || 0) * multiplier)
  const prot = Math.round((food.nf_protein              || 0) * multiplier)
  const carb = Math.round((food.nf_total_carbohydrate   || 0) * multiplier)
  const fat  = Math.round((food.nf_total_fat            || 0) * multiplier)

  const servingDisplay = food.serving_qty && food.serving_unit
    ? `${(food.serving_qty * multiplier) % 1 === 0
        ? food.serving_qty * multiplier
        : (food.serving_qty * multiplier).toFixed(1)} ${food.serving_unit}`
    : `${multiplier}× serving`

  const adjustMultiplier = (delta) => {
    const next = Math.max(0.5, Math.round((multiplier + delta) * 2) / 2)
    onMultiplierChange(index, next)
  }

  const handleClarify = async (option) => {
    setClarifying(true)
    await onClarify(index, option)
    setClarifying(false)
  }

  const handleOtherSubmit = () => {
    const val = otherText.trim()
    if (!val) return
    handleClarify(val)
    setOtherMode(false)
    setOtherText('')
  }

  const hasQuestion = food.clarifying_question &&
    Array.isArray(food.clarifying_options) &&
    food.clarifying_options.length > 0 &&
    !food.clarification_answered

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${hasQuestion ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 14, overflow: 'hidden',
      animation: 'slideInUp 0.25s ease both',
    }}>

      {/* ── Main card body ── */}
      <div style={{ padding: '12px 14px' }}>

        {/* Header row: name + calories + remove */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', marginBottom: 10,
        }}>
          <div style={{ flex: 1, paddingRight: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              {food.food_name}
            </div>
            {food.brand_name && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                {food.brand_name}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              {cal} cal
            </span>
            <button
              onClick={() => onRemove(index)}
              style={{
                width: 22, height: 22, borderRadius: '50%',
                border: '1px solid var(--border)', background: 'var(--surface2)',
                color: 'var(--muted)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontFamily: 'inherit', lineHeight: 1,
              }}
            >×</button>
          </div>
        </div>

        {/* Macro pills */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {[['P', prot], ['C', carb], ['F', fat]].map(([label, val]) => (
            <div key={label} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              background: 'var(--surface2)', borderRadius: 8,
              padding: '6px 4px', border: '1px solid var(--border)',
              minWidth: 42,
            }}>
              <span style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.06em', marginBottom: 2 }}>
                {label}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                {val}g
              </span>
            </div>
          ))}
        </div>

        {/* Portion stepper */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--surface2)', borderRadius: 10,
          border: '1px solid var(--border)', padding: '8px 12px',
        }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1 }}>
            {servingDisplay}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => adjustMultiplier(-0.5)}
              disabled={multiplier <= 0.5}
              style={{
                width: 28, height: 28, borderRadius: 7,
                border: '1px solid var(--border)', background: 'var(--surface)',
                color: multiplier <= 0.5 ? 'var(--border)' : 'var(--text)',
                fontSize: 16, cursor: multiplier <= 0.5 ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform 0.1s', fontFamily: 'inherit',
              }}
              onMouseDown={e => { if (multiplier > 0.5) e.currentTarget.style.transform = 'scale(0.88)' }}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >−</button>
            <span style={{
              fontSize: 13, fontWeight: 700, color: 'var(--text)',
              minWidth: 28, textAlign: 'center',
            }}>
              {multiplier % 1 === 0 ? multiplier : multiplier.toFixed(1)}×
            </span>
            <button
              onClick={() => adjustMultiplier(0.5)}
              style={{
                width: 28, height: 28, borderRadius: 7,
                border: '1px solid var(--border)', background: 'var(--surface)',
                color: 'var(--text)', fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform 0.1s', fontFamily: 'inherit',
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.88)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >+</button>
          </div>
        </div>
      </div>

      {/* ── Clarifying question ── */}
      {hasQuestion && (
        <div style={{
          padding: '10px 14px 14px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface2)',
        }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: 'var(--accent)',
            marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>💬</span>
            <span>{food.clarifying_question}</span>
          </div>

          {/* Loading spinner while re-fetching nutrition */}
          {clarifying ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 12 }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
                animation: 'spin 0.7s linear infinite', flexShrink: 0,
              }} />
              Updating nutrition…
            </div>

          ) : otherMode ? (
            /* "Other…" free-text input */
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                autoFocus
                value={otherText}
                onChange={e => setOtherText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleOtherSubmit()
                  if (e.key === 'Escape') { setOtherMode(false); setOtherText('') }
                }}
                placeholder="Describe it…"
                style={{
                  flex: 1, padding: '6px 10px', borderRadius: 20,
                  border: '1px solid var(--accent)', background: 'var(--surface)',
                  color: 'var(--text)', fontSize: 12, fontFamily: 'inherit', outline: 'none',
                }}
              />
              <button
                onClick={handleOtherSubmit}
                disabled={!otherText.trim()}
                style={{
                  padding: '6px 12px', borderRadius: 20, border: 'none',
                  background: 'var(--accent)', color: '#fff',
                  fontSize: 12, fontWeight: 600, cursor: otherText.trim() ? 'pointer' : 'default',
                  fontFamily: 'inherit', opacity: otherText.trim() ? 1 : 0.45,
                  transition: 'opacity 0.15s',
                }}
              >Done</button>
              <button
                onClick={() => { setOtherMode(false); setOtherText('') }}
                style={{
                  padding: '6px 10px', borderRadius: 20,
                  border: '1px solid var(--border)', background: 'none',
                  color: 'var(--muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >✕</button>
            </div>

          ) : (
            /* Predefined options + Other + Skip */
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {food.clarifying_options.map(opt => (
                <button
                  key={opt}
                  onClick={() => handleClarify(opt)}
                  style={{
                    padding: '5px 12px', borderRadius: 20,
                    border: '1px solid var(--accent)',
                    background: 'none', color: 'var(--accent)',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--accent)'
                    e.currentTarget.style.color = '#fff'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'none'
                    e.currentTarget.style.color = 'var(--accent)'
                  }}
                >{opt}</button>
              ))}

              {/* Other: opens free-text input */}
              <button
                onClick={() => setOtherMode(true)}
                style={{
                  padding: '5px 12px', borderRadius: 20,
                  border: '1px solid var(--border)',
                  background: 'none', color: 'var(--muted)',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--surface)'
                  e.currentTarget.style.color = 'var(--text)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'none'
                  e.currentTarget.style.color = 'var(--muted)'
                }}
              >Other…</button>

              {/* Skip */}
              <button
                onClick={() => onClarify(index, null)}
                style={{
                  padding: '5px 12px', borderRadius: 20,
                  border: '1px solid var(--border)',
                  background: 'none', color: 'var(--muted)',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >Skip</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
// onLogAll(foods[]) — receives all scaled foods at once; owns the sheet close.
// onLog(food)       — kept for single-item fallback / future use.
export default function VoiceLogger({ mealTime, onLog, onLogAll, onBack }) {
  const { isTrialing } = usePro()

  const [phase, setPhase]             = useState(PHASE.IDLE)
  const [transcript, setTranscript]   = useState('')
  const [interimText, setInterimText] = useState('')
  const [foods, setFoods]             = useState([])
  const [error, setError]             = useState(null)
  const [btnPressed, setBtnPressed]   = useState(false)

  const recognitionRef     = useRef(null)
  const finalTranscriptRef = useRef('')
  const interimRef         = useRef('')
  const phaseRef           = useRef(PHASE.IDLE)

  const setPhaseSync = (p) => { phaseRef.current = p; setPhase(p) }

  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  // ── Start recording ──────────────────────────────────────────────────────
  const startRecording = async () => {
    if (!supported) {
      setError('Voice logging requires Chrome on Android or Safari on iOS 16.4+.')
      setPhaseSync(PHASE.ERROR)
      return
    }

    finalTranscriptRef.current = ''
    interimRef.current = ''
    setTranscript('')
    setInterimText('')
    setError(null)

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SR()
    recognition.continuous      = true
    recognition.interimResults  = true
    recognition.lang            = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) {
          finalTranscriptRef.current += t + ' '
          setTranscript(finalTranscriptRef.current)
        } else {
          interim = t
        }
      }
      interimRef.current = interim
      setInterimText(interim)
    }

    recognition.onerror = (e) => {
      if (e.error === 'not-allowed') {
        setError('Microphone access denied. Allow microphone access in your browser settings.')
      } else if (e.error === 'no-speech') {
        setError("Didn't catch anything. Tap the mic and speak your meal.")
      } else {
        setError('Microphone error. Please try again.')
      }
      setPhaseSync(PHASE.ERROR)
    }

    recognition.onend = () => {
      if (phaseRef.current === PHASE.RECORDING) processTranscript()
    }

    recognitionRef.current = recognition
    recognition.start()
    setPhaseSync(PHASE.RECORDING)
  }

  // ── Stop + process ───────────────────────────────────────────────────────
  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    processTranscript()
  }

  const processTranscript = async () => {
    // Capture both finalized and any still-interim words (last words on stop)
    const text = (finalTranscriptRef.current + ' ' + interimRef.current).trim()
    interimRef.current = ''
    setInterimText('')

    if (!text) {
      setError("Didn't catch that. Tap the mic and speak your meal.")
      setPhaseSync(PHASE.ERROR)
      return
    }

    setPhaseSync(PHASE.PROCESSING)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await apiFetch('/api/voice-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ transcript: text }),
      })

      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()

      if (!data.foods || data.foods.length === 0) {
        setError("Couldn't match those foods. Try being more specific, e.g. '2 scrambled eggs and a cup of oatmeal'.")
        setPhaseSync(PHASE.ERROR)
        return
      }

      setFoods(data.foods.map(f => {
        const clean = sanitizeFood(f)
        return {
          ...clean,
          multiplier: 1,
          clarification_answered: !clean.clarifying_question,
        }
      }))
      setPhaseSync(PHASE.REVIEW)
    } catch {
      setError('Failed to analyze your meal. Check your connection and try again.')
      setPhaseSync(PHASE.ERROR)
    }
  }

  // ── Clarification: re-fetch with refined query ───────────────────────────
  const handleClarify = async (foodIndex, selectedOption) => {
    // null = Skip pressed — dismiss the question without re-fetching
    if (!selectedOption) {
      setFoods(prev => prev.map((f, i) =>
        i === foodIndex ? { ...f, clarification_answered: true } : f
      ))
      return
    }

    const food = foods[foodIndex]
    const refinedQuery = `${selectedOption} ${food.food_name}${
      food.serving_qty ? `, ${food.serving_qty} ${food.serving_unit}` : ''
    }`

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await apiFetch('/api/voice-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ transcript: refinedQuery }),
      })

      if (!res.ok) throw new Error('Refine failed')
      const data = await res.json()

      if (data.foods?.[0]) {
        const updated = data.foods[0]
        setFoods(prev => prev.map((f, i) =>
          i === foodIndex
            ? {
                ...f,
                ...updated,
                multiplier: f.multiplier,  // preserve user's portion choice
                clarification_answered: true,
                clarifying_question: null,
                clarifying_options: [],
              }
            : f
        ))
      } else {
        setFoods(prev => prev.map((f, i) =>
          i === foodIndex ? { ...f, clarification_answered: true } : f
        ))
      }
    } catch {
      // Silently dismiss — don't block the user from logging
      setFoods(prev => prev.map((f, i) =>
        i === foodIndex ? { ...f, clarification_answered: true } : f
      ))
    }
  }

  // ── Portion adjustment ───────────────────────────────────────────────────
  const handleMultiplierChange = (index, newMultiplier) => {
    setFoods(prev => prev.map((f, i) =>
      i === index ? { ...f, multiplier: newMultiplier } : f
    ))
  }

  // ── Remove food ──────────────────────────────────────────────────────────
  const removeFood = (index) => {
    const updated = foods.filter((_, i) => i !== index)
    if (updated.length === 0) resetToIdle()
    else setFoods(updated)
  }

  // ── Log all ──────────────────────────────────────────────────────────────
  // Bake the multiplier into the macro values before handing off.
  // Calls onLogAll with the full array — LogFoodSheet logs each item
  // and closes the sheet exactly once at the end. This prevents the
  // "only last item logged" bug caused by calling onLog (→ handleSelect
  // → handleClose) once per food in a forEach.
  const logAll = () => {
    const scaledFoods = foods.map(food => {
      const m = food.multiplier ?? 1
      return {
        food_name:             food.food_name,
        brand_name:            food.brand_name || null,
        nf_calories:           Math.round((food.nf_calories             || 0) * m),
        nf_protein:            Math.round((food.nf_protein              || 0) * m),
        nf_total_carbohydrate: Math.round((food.nf_total_carbohydrate   || 0) * m),
        nf_total_fat:          Math.round((food.nf_total_fat            || 0) * m),
        serving_qty:           (food.serving_qty || 1) * m,
        serving_unit:          food.serving_unit || 'serving',
        multiplier:            1,  // already applied — receiver should not re-apply
      }
    })
    onLogAll(scaledFoods)
  }

  const resetToIdle = () => {
    finalTranscriptRef.current = ''
    interimRef.current = ''
    setTranscript('')
    setInterimText('')
    setFoods([])
    setError(null)
    setPhaseSync(PHASE.IDLE)
  }

  // ── Totals ───────────────────────────────────────────────────────────────
  const totals = foods.reduce((acc, f) => {
    const m = f.multiplier ?? 1
    return {
      cal:     acc.cal     + (f.nf_calories             || 0) * m,
      protein: acc.protein + (f.nf_protein              || 0) * m,
      carbs:   acc.carbs   + (f.nf_total_carbohydrate   || 0) * m,
      fat:     acc.fat     + (f.nf_total_fat            || 0) * m,
    }
  }, { cal: 0, protein: 0, carbs: 0, fat: 0 })

  const pendingQuestions = foods.filter(f =>
    f.clarifying_question && !f.clarification_answered
  ).length

  // ────────────────────────────────────────────────────────────────────────
  // RENDER — REVIEW
  // ────────────────────────────────────────────────────────────────────────
  if (phase === PHASE.REVIEW) {
    return (
      <div style={{ animation: 'fadeIn 0.2s ease both' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', marginBottom: 16,
        }}>
          <div style={{ flex: 1, paddingRight: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              Review your meal
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>
              "{transcript.trim()}"
            </div>
          </div>
          <button
            onClick={resetToIdle}
            style={{
              fontSize: 12, color: 'var(--muted)', background: 'none',
              border: 'none', cursor: 'pointer', padding: '4px 8px',
              borderRadius: 8, fontFamily: 'inherit', flexShrink: 0,
            }}
          >Re-record</button>
        </div>

        {/* Pending questions hint */}
        {pendingQuestions > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', marginBottom: 12,
            background: 'rgba(var(--accent-rgb, 29,158,117), 0.08)',
            border: '1px solid var(--accent)',
            borderRadius: 10, fontSize: 12, color: 'var(--accent)',
          }}>
            💬 Answer {pendingQuestions === 1 ? 'the question' : `${pendingQuestions} questions`} below for more accurate calories
          </div>
        )}

        {/* Food cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {foods.map((food, i) => (
            <FoodCard
              key={i}
              food={food}
              index={i}
              onRemove={removeFood}
              onMultiplierChange={handleMultiplierChange}
              onClarify={handleClarify}
            />
          ))}
        </div>

        {/* Totals bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '10px 14px', marginBottom: 16,
          background: 'var(--surface)', borderRadius: 12,
          border: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1 }}>Total</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginRight: 8 }}>
            {Math.round(totals.cal)} cal
          </span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            P {Math.round(totals.protein)}g · C {Math.round(totals.carbs)}g · F {Math.round(totals.fat)}g
          </span>
        </div>

        {/* Log CTA */}
        <button
          onClick={logAll}
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
          Log {foods.length} {foods.length === 1 ? 'item' : 'items'} to {mealTime}
        </button>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────────────
  // RENDER — IDLE / RECORDING / PROCESSING / ERROR
  // ────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '24px 0 8px',
      animation: 'fadeIn 0.2s ease both',
    }}>

      {/* Mic button */}
      <button
        onClick={phase === PHASE.RECORDING ? stopRecording : startRecording}
        disabled={phase === PHASE.PROCESSING}
        onMouseDown={() => setBtnPressed(true)}
        onMouseUp={() => setBtnPressed(false)}
        onMouseLeave={() => setBtnPressed(false)}
        style={{
          width: 80, height: 80, borderRadius: '50%', border: 'none',
          cursor: phase === PHASE.PROCESSING ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: phase === PHASE.RECORDING
            ? '#E24B4A'
            : phase === PHASE.PROCESSING
            ? 'var(--surface2)'
            : 'var(--accent)',
          transform: btnPressed ? 'scale(0.93)' : 'scale(1)',
          transition: 'background 0.2s, transform 0.1s',
          boxShadow: phase === PHASE.RECORDING ? '0 0 0 0 rgba(226,75,74,0.4)' : 'none',
          animation: phase === PHASE.RECORDING ? 'voicePulse 1.4s ease-out infinite' : 'none',
        }}
      >
        {phase === PHASE.RECORDING ? (
          <Waveform />
        ) : phase === PHASE.PROCESSING ? (
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            border: '2.5px solid var(--border)', borderTopColor: 'var(--accent)',
            animation: 'spin 0.7s linear infinite',
          }} />
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="12" rx="3"/>
            <path d="M5 10a7 7 0 0 0 14 0"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
            <line x1="8" y1="22" x2="16" y2="22"/>
          </svg>
        )}
      </button>

      {/* State label */}
      <div style={{ marginTop: 18, textAlign: 'center' }}>
        {phase === PHASE.IDLE && (
          <>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
              Tap to speak your meal
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              e.g. "2 scrambled eggs, cup of oatmeal with honey"
            </div>
          </>
        )}

        {phase === PHASE.RECORDING && (
          <>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#E24B4A', marginBottom: 8 }}>
              Listening… tap to stop
            </div>
            <div style={{
              fontSize: 14, color: 'var(--text)', lineHeight: 1.5,
              minHeight: 40, maxWidth: 280, textAlign: 'center',
              padding: '8px 14px',
              background: 'var(--surface)', borderRadius: 10,
              border: '1px solid var(--border)',
            }}>
              {transcript || interimText ? (
                <>
                  <span style={{ color: 'var(--text)' }}>{transcript}</span>
                  <span style={{ color: 'var(--muted)' }}>{interimText}</span>
                </>
              ) : (
                <span style={{ color: 'var(--muted)' }}>Start speaking…</span>
              )}
            </div>
          </>
        )}

        {phase === PHASE.PROCESSING && (
          <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>
            Analyzing your meal…
          </div>
        )}

        {phase === PHASE.ERROR && (
          <>
            <div style={{
              fontSize: 13, color: '#E24B4A',
              maxWidth: 260, lineHeight: 1.5, marginBottom: 16,
            }}>
              {error}
            </div>
            <button
              onClick={resetToIdle}
              style={{
                padding: '10px 24px', borderRadius: 10, border: 'none',
                background: 'var(--accent)', color: '#fff',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >Try again</button>
          </>
        )}
      </div>

    </div>
  )
}
