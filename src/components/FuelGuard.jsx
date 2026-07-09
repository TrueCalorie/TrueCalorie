// src/components/FuelGuard.jsx
// The product's reason to exist: protection, not optimization.
// Seven-day view pairing training load (Strava, via the existing
// /api/strava-training route) with evening check-ins. Warns when hard days
// stack up under-fueled.

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { apiFetch } from '../lib/apiFetch'
import { capture } from '../analytics'

function toLocalDateStr(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

// A day is "hard" when the training load is substantial. Same v0 threshold
// family as the morning-brief heuristic (60 min), plus a calorie floor for
// short-but-brutal sessions.
function isHardDay(day) {
  return day.minutes >= 60 || day.calories >= 600
}

const DOT_COLORS = {
  nailed:  '#1D9E75',
  mostly:  '#f5a623',
  short:   '#E24B4A',
}

const CHECKIN_LEGEND = [
  { key: 'nailed', label: 'Nailed it' },
  { key: 'mostly', label: 'Mostly' },
  { key: 'short',  label: 'Fell short' },
]

export default function FuelGuard({ session, onClose }) {
  const [days, setDays]           = useState(null)  // [{ date, dow, minutes, calories, checkin }]
  const [connected, setConnected] = useState(true)
  const [loading, setLoading]     = useState(true)
  const warnedRef                 = useRef(false)

  useEffect(() => {
    if (!session?.user?.id) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession()

        const [trainingRes, checkinsRes] = await Promise.all([
          apiFetch('/api/strava-training', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authSession?.access_token}`,
            },
            cache: 'no-store',
            body: JSON.stringify({ days: 7 }),
          }).then(r => r.json()).catch(() => null),
          supabase
            .from('fuel_checkins')
            .select('date, response')
            .eq('user_id', session.user.id)
            .order('date', { ascending: false })
            .limit(10),
        ])

        if (cancelled) return

        const byDate     = trainingRes?.connected ? (trainingRes.byDate || {}) : {}
        const checkinMap = {}
        for (const c of (checkinsRes?.data || [])) checkinMap[c.date] = c.response

        const week = []
        for (let i = 6; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const dateStr = toLocalDateStr(d)
          const dayData = byDate[dateStr]
          week.push({
            date:     dateStr,
            dow:      ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()],
            isToday:  i === 0,
            minutes:  dayData ? Math.round((dayData.movingTimeSec || 0) / 60) : 0,
            calories: dayData ? (dayData.calories || 0) : 0,
            checkin:  checkinMap[dateStr] || null,
          })
        }

        setDays(week)
        setConnected(!!trainingRes?.connected)
      } catch {
        if (!cancelled) { setDays([]); setConnected(false) }
      }
      if (!cancelled) setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [session?.user?.id])

  // ── Warning math ───────────────────────────────────────────────────────────
  // Hard days that came back "short" or were never checked in. Today is
  // excluded from "missing" (the evening check-in hasn't happened yet), but
  // an explicit "short" today still counts.
  const hardDays = (days || []).filter(isHardDay)
  const underfueled = hardDays.filter(d =>
    d.checkin === 'short' || (!d.checkin && !d.isToday)
  )
  const showWarning = hardDays.length >= 2 && underfueled.length >= 2

  useEffect(() => {
    if (showWarning && !warnedRef.current) {
      warnedRef.current = true
      capture('guard_warning_shown', {
        hard_days:  hardDays.length,
        short_days: underfueled.length,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWarning])

  const maxMinutes = Math.max(60, ...(days || []).map(d => d.minutes))

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: 'var(--bg)', minHeight: '100vh', fontFamily: 'inherit' }}>

      {/* Sticky header (same pattern as Stats/Settings) */}
      <div style={{
        display: 'flex', alignItems: 'center',
        paddingTop: 'calc(16px + env(safe-area-inset-top))',
        paddingRight: 16, paddingBottom: 14, paddingLeft: 16,
        borderBottom: '1px solid var(--border)', position: 'sticky', top: 0,
        background: 'var(--bg)', zIndex: 1,
      }}>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          color: 'var(--text)', fontSize: 20, lineHeight: 1, marginRight: 12,
        }}>←</button>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em', flex: 1 }}>
          Fuel Guard
        </span>
      </div>

      <div style={{ padding: '20px 16px 48px' }}>

        {loading && (
          <p style={{ color: 'var(--muted)', textAlign: 'center', fontSize: 14, marginTop: 40 }}>
            Reading your week...
          </p>
        )}

        {!loading && !connected && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 20, textAlign: 'center',
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
              Connect Strava and Fuel Guard starts watching your week.
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
              Training load on top, fueling underneath. You'll see exactly which hard days went under-fueled. Connect in Settings, under Integrations.
            </div>
          </div>
        )}

        {!loading && connected && days && (
          <>
            {/* Warning card */}
            {showWarning && (
              <div style={{
                background: 'rgba(226,75,74,0.08)',
                border: '1px solid rgba(226,75,74,0.35)',
                borderRadius: 16, padding: '16px 18px', marginBottom: 24,
                animation: 'slideInUp 0.3s ease both',
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                  color: '#E24B4A', textTransform: 'uppercase', marginBottom: 8,
                }}>
                  Under-fueling pattern
                </div>
                <p style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.55, margin: 0 }}>
                  {underfueled.length} of {hardDays.length} hard days under fueled. This is how plateaus and stress injuries start. Tomorrow's brief adjusts up.
                </p>
              </div>
            )}

            {/* Week view */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 16, padding: '18px 14px 14px', marginBottom: 16,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 16, paddingLeft: 4,
              }}>
                Training load · last 7 days
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
                {days.map(d => {
                  const hard = isHardDay(d)
                  const barH = d.minutes > 0 ? Math.max(8, (d.minutes / maxMinutes) * 100) : 3
                  return (
                    <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      {d.minutes > 0 && (
                        <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 3 }}>
                          {d.minutes}m
                        </div>
                      )}
                      <div style={{
                        width: '100%', maxWidth: 34,
                        height: `${barH}%`,
                        borderRadius: 6,
                        background: hard ? 'var(--accent)' : 'var(--surface2)',
                        border: hard ? 'none' : '1px solid var(--border)',
                        boxSizing: 'border-box',
                        transition: 'height 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                      }} />
                    </div>
                  )
                })}
              </div>

              {/* Check-in dots + day labels */}
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {days.map(d => (
                  <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: 4,
                      background: d.checkin ? DOT_COLORS[d.checkin] : 'transparent',
                      border: d.checkin ? 'none' : '1px solid var(--border)',
                      boxSizing: 'border-box',
                    }} />
                    <div style={{
                      fontSize: 10,
                      color: d.isToday ? 'var(--text)' : 'var(--muted)',
                      fontWeight: d.isToday ? 700 : 400,
                    }}>
                      {d.dow}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
              {CHECKIN_LEGEND.map(l => (
                <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: DOT_COLORS[l.key] }} />
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{l.label}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, border: '1px solid var(--border)', boxSizing: 'border-box' }} />
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>No check-in</span>
              </div>
            </div>

            {/* Quiet state when the week looks good */}
            {!showWarning && (
              <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.6, padding: '0 12px' }}>
                {hardDays.length === 0
                  ? 'An easy week so far. When the hard days come, this is where you make sure the fueling keeps up.'
                  : 'Fueling is holding up against the training. Keep answering the evening check-in and Fuel Guard keeps watch.'}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
