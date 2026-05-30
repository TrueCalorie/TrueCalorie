import { useState, useRef } from 'react'

// ─── State Machine ────────────────────────────────────────────────────────────
const PHASE = {
  IDLE:       'idle',
  RECORDING:  'recording',
  PROCESSING: 'processing',
  REVIEW:     'review',
  ERROR:      'error',
}

// ─── Waveform — animated bars shown while recording ──────────────────────────
function Waveform() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 28 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <div
          key={i}
          style={{
            width: 4,
            borderRadius: 2,
            background: '#fff',
            animation: `voiceBar 0.9s ease-in-out ${i * 0.12}s infinite alternate`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Macro pill ───────────────────────────────────────────────────────────────
function MacroPill({ label, value, unit = 'g' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: 'var(--surface2)', borderRadius: 8,
      padding: '6px 10px', border: '1px solid var(--border)',
      minWidth: 54,
    }}>
      <span style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.06em', marginBottom: 2 }}>
        {label}
      </span>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
        {Math.round(value)}{unit}
      </span>
    </div>
  )
}

// ─── Single food card in review ───────────────────────────────────────────────
function FoodCard({ food, index, onRemove }) {
  const [pressed, setPressed] = useState(false)

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '14px 14px 12px',
      animation: `slideInUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) ${index * 0.06}s both`,
    }}>
      {/* Name row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ flex: 1, paddingRight: 8 }}>
          <div style={{
            fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3,
            textTransform: 'capitalize',
          }}>
            {food.food_name}
          </div>
          {food.serving_qty && food.serving_unit && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {food.serving_qty} {food.serving_unit}
            </div>
          )}
        </div>

        {/* Calorie badge + remove */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: 'var(--accent)',
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '3px 9px',
          }}>
            {Math.round(food.nf_calories)} cal
          </div>
          <button
            onClick={() => onRemove(index)}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
            onMouseLeave={() => setPressed(false)}
            aria-label="Remove item"
            style={{
              width: 28, height: 28, borderRadius: 8,
              border: '1px solid var(--border)',
              background: pressed ? 'rgba(226,75,74,0.12)' : 'var(--surface2)',
              color: pressed ? '#E24B4A' : 'var(--muted)',
              fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s, transform 0.1s',
              transform: pressed ? 'scale(0.88)' : 'scale(1)',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Macro pills */}
      <div style={{ display: 'flex', gap: 6 }}>
        <MacroPill label="PROTEIN" value={food.nf_protein} />
        <MacroPill label="CARBS"   value={food.nf_total_carbohydrate} />
        <MacroPill label="FAT"     value={food.nf_total_fat} />
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VoiceLogger({ mealTime, onLog, onBack }) {
  const [phase, setPhase]           = useState(PHASE.IDLE)
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [foods, setFoods]           = useState([])
  const [error, setError]           = useState(null)
  const [btnPressed, setBtnPressed] = useState(false)

  const recognitionRef      = useRef(null)
  const finalTranscriptRef  = useRef('')
  // Track phase in a ref so recognition callbacks always have fresh value
  const phaseRef            = useRef(PHASE.IDLE)

  const setPhaseSync = (p) => { phaseRef.current = p; setPhase(p) }

  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  // ── Start recording ──────────────────────────────────────────────────────
  const startRecording = () => {
    if (!supported) {
      setError('Voice logging requires a modern browser. Try Chrome on Android or Safari on iOS 16.4+.')
      setPhaseSync(PHASE.ERROR)
      return
    }

    finalTranscriptRef.current = ''
    setTranscript('')
    setInterimText('')
    setError(null)

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SR()
    recognition.continuous     = true
    recognition.interimResults = true
    recognition.lang           = 'en-US'
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
      setInterimText(interim)
    }

    recognition.onerror = (e) => {
      if (e.error === 'not-allowed') {
        setError('Microphone access denied. Allow microphone access in your browser settings and try again.')
      } else if (e.error === 'no-speech') {
        setError("Didn't catch anything. Tap the mic and speak your meal.")
      } else {
        setError('Microphone error. Please try again.')
      }
      setPhaseSync(PHASE.ERROR)
    }

    // iOS Safari auto-stops recognition — process whatever was captured
    recognition.onend = () => {
      if (phaseRef.current === PHASE.RECORDING) {
        processTranscript()
      }
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
    const text = finalTranscriptRef.current.trim()
    setInterimText('')

    if (!text) {
      setError("Didn't catch that. Tap the mic and speak your meal.")
      setPhaseSync(PHASE.ERROR)
      return
    }

    setPhaseSync(PHASE.PROCESSING)

    try {
      const res = await fetch('/api/voice-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      })

      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()

      if (!data.foods || data.foods.length === 0) {
        setError("Couldn't match those foods to nutrition data. Try being more specific, like '2 scrambled eggs and a cup of oatmeal'.")
        setPhaseSync(PHASE.ERROR)
        return
      }

      setFoods(data.foods)
      setPhaseSync(PHASE.REVIEW)
    } catch {
      setError('Failed to analyze your meal. Check your connection and try again.')
      setPhaseSync(PHASE.ERROR)
    }
  }

  // ── Review actions ───────────────────────────────────────────────────────
  const removeFood = (index) => {
    const updated = foods.filter((_, i) => i !== index)
    if (updated.length === 0) resetToIdle()
    else setFoods(updated)
  }

  const logAll = () => {
    foods.forEach(food => onLog(food, 1))
  }

  const resetToIdle = () => {
    finalTranscriptRef.current = ''
    setTranscript('')
    setInterimText('')
    setFoods([])
    setError(null)
    setPhaseSync(PHASE.IDLE)
  }

  // ── Totals for review footer ─────────────────────────────────────────────
  const totals = foods.reduce((acc, f) => ({
    cal:     acc.cal  + (f.nf_calories             || 0),
    protein: acc.protein + (f.nf_protein            || 0),
    carbs:   acc.carbs   + (f.nf_total_carbohydrate || 0),
    fat:     acc.fat     + (f.nf_total_fat          || 0),
  }), { cal: 0, protein: 0, carbs: 0, fat: 0 })

  // ────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────

  // ── REVIEW phase ─────────────────────────────────────────────────────────
  if (phase === PHASE.REVIEW) {
    return (
      <div style={{ animation: 'fadeIn 0.2s ease both' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              Review your meal
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              "{transcript.trim()}"
            </div>
          </div>
          <button
            onClick={resetToIdle}
            style={{
              fontSize: 12, color: 'var(--muted)', background: 'none',
              border: 'none', cursor: 'pointer', padding: '4px 8px',
              borderRadius: 8, fontFamily: 'inherit',
            }}
          >
            Re-record
          </button>
        </div>

        {/* Food cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {foods.map((food, i) => (
            <FoodCard key={i} food={food} index={i} onRemove={removeFood} />
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

  // ── IDLE / RECORDING / PROCESSING / ERROR ─────────────────────────────────
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
          position: 'relative',
          background: phase === PHASE.RECORDING
            ? '#E24B4A'
            : phase === PHASE.PROCESSING
            ? 'var(--surface2)'
            : 'var(--accent)',
          transform: btnPressed ? 'scale(0.93)' : 'scale(1)',
          transition: 'background 0.2s, transform 0.1s',
          // Outer pulse ring while recording
          boxShadow: phase === PHASE.RECORDING
            ? '0 0 0 0 rgba(226,75,74,0.4)'
            : 'none',
          animation: phase === PHASE.RECORDING ? 'voicePulse 1.4s ease-out infinite' : 'none',
        }}
      >
        {phase === PHASE.RECORDING ? (
          <Waveform />
        ) : phase === PHASE.PROCESSING ? (
          <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2.5px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
        ) : (
          // Mic icon (SVG)
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
            {/* Live transcript */}
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
              maxWidth: 260, lineHeight: 1.5, marginBottom: 16, textAlign: 'center',
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
            >
              Try again
            </button>
          </>
        )}
      </div>

      {/* Back link */}
      {(phase === PHASE.IDLE || phase === PHASE.ERROR) && (
        <button
          onClick={onBack}
          style={{
            marginTop: 28, fontSize: 13, color: 'var(--muted)',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', padding: '4px 8px',
          }}
        >
          ← Back
        </button>
      )}
    </div>
  )
}
