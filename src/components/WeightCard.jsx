// src/components/WeightCard.jsx
//
// Before using this component, run in Supabase SQL editor:
//
// CREATE TABLE public.weight_logs (
//   id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
//   weight_lbs numeric NOT NULL,
//   logged_at  timestamptz DEFAULT now() NOT NULL
// );
// ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Users manage own weight logs"
//   ON public.weight_logs FOR ALL
//   USING (auth.uid() = user_id)
//   WITH CHECK (auth.uid() = user_id);

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

function toLocalDateStr(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function lastNDates(n) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    return toLocalDateStr(d)
  })
}

// ─── Tiny 7-day sparkline ─────────────────────────────────────────────────────
function Sparkline({ data, today }) {
  const W = 100, H = 32, PAD = 3
  const values = data.filter(d => d.weight !== null).map(d => d.weight)
  if (values.length < 2) return null

  const min = Math.min(...values) - 0.5
  const max = Math.max(...values) + 0.5
  const xScale = i => PAD + (i / (data.length - 1)) * (W - PAD * 2)
  const yScale = v => H - PAD - ((v - min) / (max - min)) * (H - PAD * 2)

  // Build path segments, skip over days with no data
  const segments = []
  let current = []
  data.forEach((d, i) => {
    if (d.weight !== null) {
      current.push({ x: xScale(i), y: yScale(d.weight), date: d.date })
    } else {
      if (current.length > 1) segments.push([...current])
      else current = []
      current = []
    }
  })
  if (current.length > 1) segments.push(current)

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}>
      {segments.map((seg, si) => (
        <polyline
          key={si}
          points={seg.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
          fill="none"
          stroke="var(--text)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.5}
        />
      ))}
      {data.map((d, i) => {
        if (d.weight === null) return null
        const isToday = d.date === today
        return (
          <circle
            key={i}
            cx={xScale(i).toFixed(1)}
            cy={yScale(d.weight).toFixed(1)}
            r={isToday ? 3 : 2}
            fill={isToday ? '#1D9E75' : 'var(--text)'}
            opacity={isToday ? 1 : 0.45}
          />
        )
      })}
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WeightCard({ session }) {
  const [logs, setLogs]         = useState({}) // { 'YYYY-MM-DD': weight_lbs }
  const [input, setInput]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [editing, setEditing]   = useState(false)
  const [loaded, setLoaded]     = useState(false)
  const inputRef                = useRef(null)

  const today     = toLocalDateStr(new Date())
  const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return toLocalDateStr(d) })()
  const dates     = lastNDates(7)

  useEffect(() => { fetchWeights() }, [])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const fetchWeights = async () => {
    try {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 8)
      const { data } = await supabase
        .from('weight_logs')
        .select('weight_lbs, logged_at')
        .eq('user_id', session.user.id)
        .gte('logged_at', cutoff.toISOString())
        .order('logged_at', { ascending: true })

      if (data) {
        const grouped = {}
        data.forEach(row => {
          const date = toLocalDateStr(row.logged_at)
          grouped[date] = Number(row.weight_lbs)
        })
        setLogs(grouped)
      }
    } catch {}
    setLoaded(true)
  }

  const logWeight = async () => {
    const val = parseFloat(input)
    if (!val || val < 50 || val > 800) return
    setSaving(true)

    // Build local-midnight boundaries for today so we update rather than duplicate
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    const { data: existing } = await supabase
      .from('weight_logs')
      .select('id')
      .eq('user_id', session.user.id)
      .gte('logged_at', startOfDay.toISOString())
      .lte('logged_at', endOfDay.toISOString())
      .maybeSingle()

    if (existing?.id) {
      await supabase.from('weight_logs').update({ weight_lbs: val }).eq('id', existing.id)
    } else {
      await supabase.from('weight_logs').insert({ user_id: session.user.id, weight_lbs: val })
    }

    await fetchWeights()
    setInput('')
    setEditing(false)
    setSaving(false)
  }

  if (!loaded) return null

  const todayWeight     = logs[today]     ?? null
  const yesterdayWeight = logs[yesterday] ?? null
  const trend           = todayWeight !== null && yesterdayWeight !== null
    ? +(todayWeight - yesterdayWeight).toFixed(1)
    : null
  const hasHistory      = Object.keys(logs).length > 0
  const sparkData       = dates.map(date => ({ date, weight: logs[date] ?? null }))
  const showInput       = !todayWeight || editing

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '12px 16px', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>

        {/* Left: weight display or input */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--muted)',
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6,
          }}>Weight</div>

          {/* Logged state */}
          {todayWeight !== null && !editing && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                {todayWeight}
              </span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>lbs</span>
              {trend !== null && (
                <span style={{
                  fontSize: 12, fontWeight: 600, marginLeft: 2,
                  color: trend < 0 ? '#1D9E75' : trend > 0 ? '#f5a623' : 'var(--muted)',
                }}>
                  {trend > 0 ? '+' : ''}{trend}
                </span>
              )}
              <button
                onClick={() => { setEditing(true); setInput(String(todayWeight)) }}
                style={{
                  background: 'none', border: 'none', fontSize: 12, color: 'var(--muted)',
                  cursor: 'pointer', fontFamily: 'inherit', padding: '0 0 0 4px',
                }}
              >edit</button>
            </div>
          )}

          {/* Input state */}
          {showInput && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                ref={inputRef}
                type="number"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') logWeight() }}
                placeholder={todayWeight ? String(todayWeight) : '0.0'}
                style={{
                  width: 70, padding: '6px 10px',
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 8, fontSize: 15, color: 'var(--text)',
                  fontFamily: 'inherit', outline: 'none', MozAppearance: 'textfield',
                }}
              />
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>lbs</span>
              <button
                onClick={logWeight}
                disabled={saving || !input.trim()}
                style={{
                  padding: '6px 14px', borderRadius: 8, background: 'var(--text)',
                  border: 'none', color: 'var(--bg)', fontSize: 13, fontWeight: 600,
                  cursor: saving || !input.trim() ? 'default' : 'pointer',
                  fontFamily: 'inherit', opacity: saving || !input.trim() ? 0.4 : 1,
                }}
              >{saving ? '...' : 'Log'}</button>
              {editing && (
                <button
                  onClick={() => { setEditing(false); setInput('') }}
                  style={{
                    background: 'none', border: 'none', fontSize: 13, color: 'var(--muted)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >cancel</button>
              )}
            </div>
          )}
        </div>

        {/* Right: sparkline */}
        {hasHistory && (
          <div style={{ flexShrink: 0 }}>
            <Sparkline data={sparkData} today={today} />
            <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center', marginTop: 3 }}>
              7 days
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
