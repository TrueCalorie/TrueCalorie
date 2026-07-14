// src/components/Today.jsx
// The v2 front door: renders the brief state machine from /api/brief-today.
// States: window-open (recovery countdown + the order), before-training
// (morning brief), day-complete (check-in prompt / result), rest-day (quiet).
// The athlete never reports to the app; this screen reports to the athlete.

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { apiFetch } from '../lib/apiFetch'
import { capture } from '../analytics'
import { ensurePushRegistration } from '../lib/pushTokens'

function toLocalDateStr(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

// "Works right now" food suggestions, keyed by fuel_profiles.dining_situation.
const SUGGESTIONS = {
  dining_hall: [
    'Chocolate milk on the way out. Fastest carbs and protein in the building.',
    'Rice bowl with chicken. Go back for seconds on the rice.',
    'Bagel with peanut butter and a yogurt cup.',
  ],
  apartment: [
    'Big bowl of cereal with milk. Two bowls is fine.',
    'PB&J and a glass of milk.',
    'Eggs and toast. Three eggs, double the toast.',
  ],
  mixed: [
    'Chocolate milk plus a banana.',
    'Rice, chicken, whatever sauce you like.',
    'Bagel with peanut butter, yogurt on the side.',
  ],
}

const CHECKIN_RESPONSES = [
  { key: 'nailed', label: 'Nailed it' },
  { key: 'mostly', label: 'Mostly' },
  { key: 'short',  label: 'Fell short' },
]

const CHECKIN_CONFIRM = {
  nailed: "Nailed it. That's how you absorb the work.",
  mostly: 'Mostly there. Good. Tomorrow, tighten it up.',
  short:  "Fell short today. Happens. Tomorrow's brief adjusts up.",
}

// ── Ask: quick fueling Q&A (text or voice) against /api/voice-log ask mode ──
function AskBar() {
  const [question, setQuestion]   = useState('')
  const [answer, setAnswer]       = useState(null)
  const [asking, setAsking]       = useState(false)
  const [askError, setAskError]   = useState(null)
  const [listening, setListening] = useState(false)
  const recognitionRef            = useRef(null)

  const micSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const ask = async (q) => {
    const text = (q ?? question).trim()
    if (!text || asking) return
    setAsking(true)
    setAskError(null)
    setAnswer(null)
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const res = await apiFetch('/api/voice-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authSession?.access_token}`,
        },
        body: JSON.stringify({ mode: 'ask', question: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'ask failed')
      setAnswer(data.answer)
      capture('ask_used')
    } catch {
      setAskError("Couldn't get an answer right now. Try again in a minute.")
    }
    setAsking(false)
  }

  // Single-shot voice capture into the input, then ask immediately.
  const startMic = () => {
    if (!micSupported || listening) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onresult = (e) => {
      const text = e.results?.[0]?.[0]?.transcript || ''
      setListening(false)
      if (text) {
        setQuestion(text)
        ask(text)
      }
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  useEffect(() => () => { try { recognitionRef.current?.stop() } catch {} }, [])

  return (
    <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') ask() }}
          placeholder={listening ? 'Listening...' : 'Ask anything. "Will a burrito work?"'}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 10,
            border: '1px solid var(--border)', outline: 'none',
            background: 'var(--surface2)', color: 'var(--text)',
            fontSize: 16, fontFamily: 'inherit', boxSizing: 'border-box',
            minWidth: 0,
          }}
        />
        {micSupported && (
          <button
            onClick={startMic}
            aria-label="Ask by voice"
            style={{
              width: 42, borderRadius: 10, border: '1px solid var(--border)',
              background: listening ? 'var(--accent)' : 'var(--surface2)',
              color: listening ? '#fff' : 'var(--text)',
              fontSize: 16, cursor: 'pointer', flexShrink: 0,
            }}
          >
            🎙
          </button>
        )}
        <button
          onClick={() => ask()}
          disabled={asking || !question.trim()}
          style={{
            padding: '0 16px', borderRadius: 10, border: 'none',
            background: asking || !question.trim() ? 'var(--surface2)' : 'var(--text)',
            color: asking || !question.trim() ? 'var(--muted)' : 'var(--bg)',
            fontSize: 13, fontWeight: 600, cursor: asking ? 'default' : 'pointer',
            fontFamily: 'inherit', flexShrink: 0,
          }}
        >
          {asking ? '...' : 'Ask'}
        </button>
      </div>
      {answer && (
        <p style={{
          fontSize: 14, color: 'var(--text)', lineHeight: 1.55,
          margin: '12px 0 0', padding: '10px 12px',
          background: 'var(--surface2)', borderRadius: 10,
          animation: 'slideInUp 0.25s ease both',
        }}>
          {answer}
        </p>
      )}
      {askError && (
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '10px 0 0' }}>{askError}</p>
      )}
    </div>
  )
}

export default function Today({ session }) {
  const [data, setData]             = useState(null)   // { state, brief, checkin }
  const [profile, setProfile]       = useState(null)   // fuel_profiles row
  const [failed, setFailed]         = useState(false)
  const [nowMs, setNowMs]           = useState(Date.now())
  const [submitting, setSubmitting] = useState(false)
  const openedIdsRef                = useRef(new Set())

  // ── Fetch brief state (poll: mount, 60s interval, tab refocus) ────────────
  const fetchBriefState = async () => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const res = await apiFetch('/api/brief-today', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authSession?.access_token}`,
        },
        cache: 'no-store',
        body: JSON.stringify({
          date: toLocalDateStr(new Date()),
          tz:   Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      })
      if (!res.ok) throw new Error(`brief-today ${res.status}`)
      const json = await res.json()
      setData(json)
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }

  useEffect(() => {
    if (!session?.user?.id) return
    fetchBriefState()
    const interval = setInterval(fetchBriefState, 60_000)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchBriefState()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  // ── Fuel profile (dining situation for suggestions) ───────────────────────
  useEffect(() => {
    if (!session?.user?.id) return
    supabase
      .from('fuel_profiles')
      .select('dining_situation')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setProfile(data) })
  }, [session?.user?.id])

  // ── Countdown tick while a window is open ─────────────────────────────────
  const windowOpen = data?.state === 'window-open'
  useEffect(() => {
    if (!windowOpen) return
    const t = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(t)
  }, [windowOpen])

  // ── Device push registration ──────────────────────────────────────────────
  // Ask for notification permission only once a brief exists — the user can
  // see what pushes are for. Native only; degrades silently (Phase 1 stores
  // tokens, Phase 2 delivers via APNs).
  useEffect(() => {
    if (data?.brief && session?.user?.id) ensurePushRegistration(session.user.id)
  }, [data?.brief, session?.user?.id])

  // ── Mark the visible brief opened (once per brief) ────────────────────────
  useEffect(() => {
    const brief = data?.brief
    if (!brief || brief.opened_at || openedIdsRef.current.has(brief.id)) return
    openedIdsRef.current.add(brief.id)
    supabase
      .from('fuel_briefs')
      .update({ opened_at: new Date().toISOString() })
      .eq('id', brief.id)
      .then(() => {})
    capture('brief_opened', { kind: brief.kind })
  }, [data?.brief])

  // ── Check-in submit ────────────────────────────────────────────────────────
  const submitCheckin = async (response) => {
    if (submitting) return
    setSubmitting(true)
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const res = await apiFetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authSession?.access_token}`,
        },
        body: JSON.stringify({ date: toLocalDateStr(new Date()), response }),
      })
      if (res.ok) {
        capture('checkin_submitted', { response })
        await fetchBriefState()
      }
    } catch {}
    setSubmitting(false)
  }

  // Quietly disappear while loading or when the brief system is unreachable;
  // the rest of the home screen still works without it.
  if (failed || !data) return null

  const { state, brief, checkin } = data

  // ── Shared styles ──────────────────────────────────────────────────────────
  const card = {
    background: 'var(--surface)',
    border: '1px solid var(--pro-border, var(--border))',
    borderRadius: 16,
    padding: '18px 18px 20px',
    marginBottom: 28,
    animation: 'slideInUp 0.35s ease both',
  }
  const kicker = (color) => ({
    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
    color: color || 'var(--accent)', textTransform: 'uppercase',
    marginBottom: 10,
  })
  const bodyText = {
    fontSize: 15, color: 'var(--text)', lineHeight: 1.55, margin: 0,
  }

  // ── Recovery countdown ─────────────────────────────────────────────────────
  const msLeft  = brief?.window_ends_at ? new Date(brief.window_ends_at) - nowMs : 0
  const secLeft = Math.max(0, Math.floor(msLeft / 1000))
  const countdown = `${Math.floor(secLeft / 60)}:${String(secLeft % 60).padStart(2, '0')}`

  const suggestions = SUGGESTIONS[profile?.dining_situation] || SUGGESTIONS.mixed

  // ── The check-in block (shown in day-complete) ─────────────────────────────
  const checkinBlock = checkin ? (
    <p style={{ ...bodyText, marginTop: 14 }}>{CHECKIN_CONFIRM[checkin.response]}</p>
  ) : (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
        Did you fuel today's work?
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {CHECKIN_RESPONSES.map(r => (
          <button
            key={r.key}
            onClick={() => submitCheckin(r.key)}
            disabled={submitting}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'var(--surface2)', color: 'var(--text)',
              fontSize: 13, fontWeight: 600, cursor: submitting ? 'default' : 'pointer',
              fontFamily: 'inherit', opacity: submitting ? 0.6 : 1,
              transition: 'background 0.15s',
            }}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  )

  // ── States ─────────────────────────────────────────────────────────────────
  if (state === 'window-open') {
    const m = brief?.macros || {}
    return (
      <div style={card}>
        <div style={kicker('#1D9E75')}>Recovery window</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 40, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {countdown}
          </span>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>left in the window</span>
        </div>
        {(m.carbs_g || m.protein_g) ? (
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em', marginBottom: 12 }}>
            {m.carbs_g ? `${m.carbs_g}g carbs` : ''}{m.carbs_g && m.protein_g ? ' · ' : ''}{m.protein_g ? `${m.protein_g}g protein` : ''}
          </div>
        ) : null}
        {brief?.body && <p style={bodyText}>{brief.body}</p>}

        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>
            Works right now
          </div>
          {suggestions.map((s, i) => (
            <div key={i} style={{
              fontSize: 14, color: 'var(--text)', lineHeight: 1.5,
              padding: '8px 0',
              borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              {s}
            </div>
          ))}
        </div>

        <AskBar />
      </div>
    )
  }

  if (state === 'before-training') {
    const m = brief?.macros || {}
    return (
      <div style={card}>
        <div style={kicker()}>Today's fuel plan</div>
        {brief?.body && <p style={{ ...bodyText, fontSize: 16 }}>{brief.body}</p>}
        {(m.kcal || m.carbs_g) ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {m.kcal ? (
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', background: 'var(--surface2)', borderRadius: 8, padding: '5px 10px' }}>
                ~{Number(m.kcal).toLocaleString()} kcal
              </span>
            ) : null}
            {m.carbs_g ? (
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', background: 'var(--surface2)', borderRadius: 8, padding: '5px 10px' }}>
                {m.carbs_g}g carbs
              </span>
            ) : null}
            {m.protein_g ? (
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', background: 'var(--surface2)', borderRadius: 8, padding: '5px 10px' }}>
                {m.protein_g}g protein
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

  if (state === 'day-complete') {
    return (
      <div style={card}>
        <div style={kicker()}>Today's work</div>
        {brief?.body && <p style={bodyText}>{brief.body}</p>}
        {checkinBlock}
      </div>
    )
  }

  // rest-day
  return (
    <div style={card}>
      <div style={kicker('var(--muted)')}>Rest day</div>
      <p style={bodyText}>
        Nothing to chase today. Eat normal, sleep big. Days like this are where the week's work settles in.
      </p>
    </div>
  )
}
