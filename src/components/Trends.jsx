import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import TrainingSection from './TrainingSection'

// ─── Local date helpers ───────────────────────────────────────────────────────
function toLocalDateStr(date) {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDatesInRange(days) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    return toLocalDateStr(d)
  })
}

// ─── Rolling Average + Daily Bar Chart ───────────────────────────────────────
function RollingChart({ data, goal }) {
  const W = 340, H = 160
  const PAD = { top: 16, right: 8, bottom: 24, left: 40 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom
  const n = data.length

  const maxCal    = Math.max(...data.map(d => d.calories), goal * 1.25, 500)
  const xOf       = (i) => PAD.left + (i + 0.5) * (chartW / n)
  const yOf       = (v) => PAD.top + chartH - (v / maxCal) * chartH
  const barW      = Math.max((chartW / n) * 0.55, 1.5)
  const goalY     = yOf(goal)

  // 7-day rolling average over logged days only
  const rolling = data.map((d, i) => {
    const window = data.slice(Math.max(0, i - 6), i + 1).filter(x => x.calories > 0)
    return window.length ? Math.round(window.reduce((s, x) => s + x.calories, 0) / window.length) : 0
  })

  const firstIdx  = rolling.findIndex(r => r > 0)
  const rollingPath = rolling
    .map((r, i) => r > 0 ? `${i === firstIdx ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(r).toFixed(1)}` : null)
    .filter(Boolean)
    .join(' ')

  const yTicks = [0, 0.5, 1].map(f => ({ v: Math.round(maxCal * f), y: yOf(maxCal * f) }))

  const labelInterval = Math.ceil(n / 6)
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  if (data.every(d => d.calories === 0)) return (
    <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 13, color: 'var(--muted)' }}>no data yet</span>
    </div>
  )

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
      {/* Y-axis */}
      {yTicks.map(t => (
        <g key={t.v}>
          <line x1={PAD.left} y1={t.y} x2={PAD.left + chartW} y2={t.y}
            stroke="var(--border)" strokeWidth={0.5} strokeDasharray="3,3" />
          <text x={PAD.left - 4} y={t.y + 3} textAnchor="end" fontSize={8} fill="var(--muted)">
            {t.v >= 1000 ? `${(t.v / 1000).toFixed(1)}k` : t.v}
          </text>
        </g>
      ))}

      {/* Goal line */}
      <line x1={PAD.left} y1={goalY} x2={PAD.left + chartW} y2={goalY}
        stroke="#1D9E75" strokeWidth={1} strokeDasharray="5,4" opacity={0.5} />

      {/* Daily bars */}
      {data.map((d, i) => d.calories > 0 && (
        <rect key={i}
          x={xOf(i) - barW / 2} y={yOf(d.calories)}
          width={barW} height={Math.max(yOf(0) - yOf(d.calories), 1)}
          fill="var(--text)" opacity={0.1} rx={1}
        />
      ))}

      {/* Rolling average line */}
      {rollingPath && (
        <path d={rollingPath} fill="none" stroke="#1D9E75" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* Dots on rolling line */}
      {rolling.map((r, i) => r > 0 && (
        <circle key={i} cx={xOf(i)} cy={yOf(r)} r={2}
          fill="#1D9E75" stroke="var(--bg)" strokeWidth={1} />
      ))}

      {/* X-axis labels */}
      {data.map((d, i) => {
        if (i % labelInterval !== 0 && i !== n - 1) return null
        const date = new Date(d.date + 'T12:00:00')
        return (
          <text key={i} x={xOf(i)} y={H - 4} textAnchor="middle" fontSize={9} fill="var(--muted)">
            {`${MONTHS[date.getMonth()]} ${date.getDate()}`}
          </text>
        )
      })}
    </svg>
  )
}

// ─── Calendar Heat Map ────────────────────────────────────────────────────────
function CalendarHeatMap({ calByDate, proteinByDate, goal, proteinGoal }) {
  const now          = new Date()
  const year         = now.getFullYear()
  const month        = now.getMonth()
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const firstDow     = new Date(year, month, 1).getDay()
  const MONTHS       = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December']

  const dayColor = (dateStr) => {
    const cal = calByDate[dateStr]
    if (!cal) return null
    const diff = (cal - goal) / goal
    if (Math.abs(diff) <= 0.1) return '#1D9E75'
    if (diff >  0.1)           return '#f59e0b'
    return '#3b82f6'
  }

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 10, textAlign: 'center' }}>
        {MONTHS[month]} {year}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 9, color: 'var(--muted)', fontWeight: 600, paddingBottom: 2 }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const dateStr  = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
          const color    = dayColor(dateStr)
          const isToday  = d === now.getDate()
          const isFuture = new Date(year, month, d) > now
          return (
            <div key={i} style={{
              aspectRatio: '1', borderRadius: 4,
              background: isFuture ? 'transparent' : color || 'var(--surface2)',
              border: isToday ? '1.5px solid var(--text)' : isFuture ? '1px dashed var(--border)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 9, color: isFuture ? 'var(--border)' : color ? 'rgba(255,255,255,0.85)' : 'var(--muted)', fontWeight: 500 }}>
                {d}
              </span>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        {[
          { color: '#1D9E75',          label: 'On target'  },
          { color: '#f59e0b',          label: 'Over'       },
          { color: '#3b82f6',          label: 'Under'      },
          { color: 'var(--surface2)',  label: 'Not logged' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color, border: '1px solid var(--border)' }} />
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Delta chip ───────────────────────────────────────────────────────────────
function Delta({ value, unit = '', invert = false }) {
  if (value === null || value === undefined) return <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>
  const pos  = value >= 0
  const good = invert ? !pos : pos
  const zero = Math.abs(value) < 0.5
  const color = zero ? 'var(--muted)' : good ? '#1D9E75' : '#f59e0b'
  return (
    <span style={{ fontSize: 12, fontWeight: 600, color }}>
      {!zero && (pos ? '+' : '')}{typeof value === 'number' ? value : value}{unit}
    </span>
  )
}

// ─── Locked state ─────────────────────────────────────────────────────────────
function LockedTrends({ onUpgrade }) {
  return (
    <div style={{ padding: '32px 20px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '32px 24px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📈</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 8, letterSpacing: '-0.01em' }}>
          Advanced Trends
        </div>
        <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.65, marginBottom: 28 }}>
          Built for athletes who want to understand their data, not just record it.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28, textAlign: 'left' }}>
          {[
            { icon: '〰️', title: 'Rolling 7-day average',    desc: 'Cut through daily noise. See your real calorie trend.' },
            { icon: '📊', title: 'Week-over-week comparison', desc: 'Are your calories, protein, and consistency improving?' },
            { icon: '🎯', title: 'Consistency score trend',   desc: 'Weekly breakdown of how often you hit your goals.' },
            { icon: '⚖️', title: 'Weight projection',        desc: 'Where will you be in 4 weeks at your current pace?' },
            { icon: '🗓️', title: 'Monthly heat map',         desc: 'Every day of the month at a glance — patterns emerge.' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{f.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={onUpgrade} style={{
          width: '100%', padding: '14px',
          background: 'var(--text)', color: 'var(--bg)',
          border: 'none', borderRadius: 12,
          fontSize: 15, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
          letterSpacing: '-0.01em',
        }}>
          Upgrade to Pro
        </button>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
          $9.99/month · cancel anytime
        </div>
      </div>
    </div>
  )
}

// ─── Section card wrapper ─────────────────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '16px', marginBottom: 14, ...style,
    }}>
      {children}
    </div>
  )
}

function SectionHead({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 14 }}>
      {children}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Trends({ session, settings, isPro, onUpgrade, onClose }) {
  const [range,        setRange]        = useState(30)
  const [allData,      setAllData]      = useState([])   // [{date, calories, protein}]
  const [calByDate,    setCalByDate]    = useState({})   // { date: calories }
  const [weightPoints, setWeightPoints] = useState([])   // [{date, weight}]
  const [loading,      setLoading]      = useState(true)

  const calorieGoal = settings?.calorie_goal || 2000
  const proteinGoal = settings?.protein_goal || 150

  useEffect(() => {
    if (isPro) fetchData()
  }, [range, isPro])

  const fetchData = async () => {
    setLoading(true)
    const now       = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (range - 1), 0, 0, 0)

    // Meal logs
    const { data: meals } = await supabase
      .from('meal_logs')
      .select('logged_at, calories, protein')
      .eq('user_id', session.user.id)
      .gte('logged_at', startDate.toISOString())
      .order('logged_at', { ascending: true })

    const byDate = {}
    ;(meals || []).forEach(m => {
      const date = toLocalDateStr(new Date(m.logged_at))
      if (!byDate[date]) byDate[date] = { calories: 0, protein: 0 }
      byDate[date].calories += Number(m.calories)
      byDate[date].protein  += Number(m.protein)
    })

    setAllData(getDatesInRange(range).map(date => ({
      date,
      calories: byDate[date]?.calories || 0,
      protein:  byDate[date]?.protein  || 0,
    })))
    setCalByDate(byDate)  // byDate is already built in fetchData

    // Weight logs — always fetch 90d for projection regression
    const wStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89, 0, 0, 0)
    const { data: weights } = await supabase
      .from('weight_logs')
      .select('weight_lbs, logged_at')
      .eq('user_id', session.user.id)
      .gte('logged_at', wStart.toISOString())
      .order('logged_at', { ascending: true })

    const wByDate = {}
    ;(weights || []).forEach(w => {
      const date = toLocalDateStr(new Date(w.logged_at))
      wByDate[date] = Number(w.weight_lbs)
    })
    setWeightPoints(
      getDatesInRange(90).filter(d => wByDate[d] !== undefined).map(d => ({ date: d, weight: wByDate[d] }))
    )

    setLoading(false)
  }

  // ── Computed ────────────────────────────────────────────────────────────────
  const now        = new Date()
  const loggedDays = allData.filter(d => d.calories > 0)

  const calByDate     = {}
  const proteinByDate = {}
  allData.forEach(d => {
    if (d.calories > 0) { calByDate[d.date] = d.calories; proteinByDate[d.date] = d.protein }
  })

  // Week-over-week
  const weekFilter = (minDays, maxDays) => allData.filter(d => {
    const diff = Math.floor((now - new Date(d.date + 'T12:00:00')) / 86400000)
    return diff >= minDays && diff < maxDays && d.calories > 0
  })
  const thisWeek = weekFilter(0, 7)
  const lastWeek = weekFilter(7, 14)

  const weekAvg   = (days, key) => days.length ? Math.round(days.reduce((s, d) => s + d[key], 0) / days.length) : null
  const goalHitPct = (days) => days.length
    ? Math.round(days.filter(d => Math.abs(d.calories - calorieGoal) <= 100).length / 7 * 100)
    : null

  const thisCalAvg   = weekAvg(thisWeek, 'calories')
  const lastCalAvg   = weekAvg(lastWeek, 'calories')
  const thisProtAvg  = weekAvg(thisWeek, 'protein')
  const lastProtAvg  = weekAvg(lastWeek, 'protein')
  const thisGoalHit  = goalHitPct(thisWeek)
  const lastGoalHit  = goalHitPct(lastWeek)
  const thisLogged   = thisWeek.length || null
  const lastLogged   = lastWeek.length || null

  const wowRows = [
    { label: 'Avg calories', thisV: thisCalAvg,                     lastV: lastCalAvg,  delta: thisCalAvg  && lastCalAvg  ? thisCalAvg  - lastCalAvg  : null, unit: ''  },
    { label: 'Avg protein',  thisV: thisProtAvg ? `${thisProtAvg}g` : null, lastV: lastProtAvg ? `${lastProtAvg}g` : null, delta: thisProtAvg && lastProtAvg ? thisProtAvg - lastProtAvg : null, unit: 'g' },
    { label: 'Goal hit rate',thisV: thisGoalHit !== null ? `${thisGoalHit}%` : null, lastV: lastGoalHit !== null ? `${lastGoalHit}%` : null, delta: thisGoalHit !== null && lastGoalHit !== null ? thisGoalHit - lastGoalHit : null, unit: '%' },
    { label: 'Days logged',  thisV: thisLogged,                      lastV: lastLogged,  delta: thisLogged  && lastLogged  ? thisLogged  - lastLogged  : null, unit: ''  },
  ]

  // Consistency per week (oldest → newest so chart reads left → right)
  const numWeeks = Math.min(Math.ceil(range / 7), 12)
  const weeks = []
  for (let w = numWeeks - 1; w >= 0; w--) {
    const wDays  = allData.filter(d => {
      const diff = Math.floor((now - new Date(d.date + 'T12:00:00')) / 86400000)
      return diff >= w * 7 && diff < (w + 1) * 7
    })
    const logged = wDays.filter(d => d.calories > 0)
    const hits   = logged.filter(d => Math.abs(d.calories - calorieGoal) <= 100)
    weeks.push({
      label:  w === 0 ? 'This wk' : w === 1 ? 'Last wk' : `${w + 1}w ago`,
      pct:    Math.round((hits.length / 7) * 100),
      logged: logged.length,
    })
  }
  const scoredWeeks = weeks.filter(w => w.logged > 0)
  const consTrend   = scoredWeeks.length >= 2
    ? scoredWeeks[scoredWeeks.length - 1].pct - scoredWeeks[0].pct
    : null

  // Weight projection — linear regression on last 14 logged weight points
  const currentWeight  = weightPoints.length > 0 ? weightPoints[weightPoints.length - 1].weight : null
  const weightProjection = (() => {
    const pts = weightPoints.slice(-14)
    if (pts.length < 4) return null
    const n   = pts.length
    const sumX  = pts.reduce((s, _, i) => s + i, 0)
    const sumY  = pts.reduce((s, p)    => s + p.weight, 0)
    const sumXY = pts.reduce((s, p, i) => s + i * p.weight, 0)
    const sumX2 = pts.reduce((s, _, i) => s + i * i, 0)
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) // lbs/day
    return {
      in4Weeks:    Math.round((currentWeight + slope * 28) * 10) / 10,
      weeklyChange: Math.round(slope * 7 * 100) / 100,
    }
  })()

  // ── Non-Pro gate ─────────────────────────────────────────────────────────────
  if (!isPro) return <LockedTrends onUpgrade={onUpgrade} />

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>

      {/* Sticky header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '18px 16px 14px',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1,
      }}>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', padding: 0,
          cursor: 'pointer', color: 'var(--text)', fontSize: 20, lineHeight: 1,
        }}>←</button>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em', flex: 1 }}>
          Trends
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#1D9E75',
          background: 'rgba(29,158,117,0.1)', border: '1px solid rgba(29,158,117,0.25)',
          borderRadius: 5, padding: '2px 7px', letterSpacing: '0.06em',
        }}>PRO</span>
      </div>

      <div style={{ padding: '20px 16px 48px' }}>

        {/* ── Training Section (Strava) — shown only when connected ── */}
        <TrainingSection calByDate={calByDate} />

        {/* Range toggle — 14d / 30d / 90d (different from Stats' 7d/30d) */}
        <div style={{
          display: 'inline-flex',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 3, marginBottom: 20, gap: 3,
        }}>
          {[14, 30, 90].map(r => (
            <button key={r} onClick={() => setRange(r)} style={{
              padding: '5px 14px', borderRadius: 7, border: 'none',
              background: range === r ? 'var(--text)' : 'transparent',
              color:      range === r ? 'var(--bg)'   : 'var(--muted)',
              fontSize: 13, fontWeight: range === r ? 600 : 400,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 0.15s, color 0.15s',
            }}>{r}d</button>
          ))}
        </div>

        {/* ── Rolling Average Chart ── */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <SectionHead>CALORIE TREND</SectionHead>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: -10, marginBottom: 4 }}>
                Bars = daily · Line = 7-day rolling avg
              </div>
            </div>
            {loggedDays.length > 0 && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#1D9E75', letterSpacing: '-0.02em' }}>
                  {Math.round(loggedDays.reduce((s, d) => s + d.calories, 0) / loggedDays.length).toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>avg/day</div>
              </div>
            )}
          </div>
          {loading
            ? <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 13, color: 'var(--muted)' }}>loading…</span></div>
            : <RollingChart data={allData} goal={calorieGoal} />
          }
        </Card>

        {/* ── Week-over-Week ── */}
        <Card>
          <SectionHead>WEEK-OVER-WEEK</SectionHead>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
            {/* Column headers */}
            <div />
            {['This week', 'Last week', 'Δ'].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textAlign: 'center', paddingBottom: 10 }}>{h}</div>
            ))}
            {/* Data rows */}
            {wowRows.map((row, i) => (
              <React.Fragment key={i}>
                <div style={{ fontSize: 12, color: 'var(--muted)', padding: '10px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center' }}>
                  {row.label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textAlign: 'center', padding: '10px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {row.thisV ?? '—'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '10px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {row.lastV ?? '—'}
                </div>
                <div style={{ textAlign: 'center', padding: '10px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Delta value={row.delta} unit={row.unit} />
                </div>
              </React.Fragment>
            ))}
          </div>
        </Card>

        {/* ── Consistency Score by Week ── */}
        <Card>
          <SectionHead>CONSISTENCY SCORE BY WEEK</SectionHead>
          {scoredWeeks.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '8px 0' }}>no data yet</div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 80, marginBottom: 4 }}>
                {weeks.map((w, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 3 }}>
                    {w.logged > 0 && (
                      <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 600, lineHeight: 1 }}>
                        {w.pct}%
                      </div>
                    )}
                    <div style={{
                      width: '100%',
                      height: w.logged > 0 ? `${Math.max(w.pct, 4)}%` : '4%',
                      background: w.logged === 0 ? 'var(--surface2)'
                        : w.pct >= 70 ? '#1D9E75'
                        : w.pct >= 40 ? '#f59e0b'
                        : 'var(--border)',
                      borderRadius: '3px 3px 0 0',
                      transition: 'height 0.4s ease',
                      opacity: w.logged === 0 ? 0.4 : 1,
                    }} />
                  </div>
                ))}
              </div>
              {/* X labels */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                {weeks.map((w, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 8, color: 'var(--muted)', lineHeight: 1.3 }}>
                    {w.label}
                  </div>
                ))}
              </div>
              {/* Trend line */}
              {consTrend !== null && (
                <div style={{
                  paddingTop: 10, borderTop: '1px solid var(--border)',
                  fontSize: 12, fontWeight: 500,
                  color: consTrend > 5 ? '#1D9E75' : consTrend < -5 ? '#f59e0b' : 'var(--muted)',
                }}>
                  {consTrend > 5
                    ? `↑ Consistency up ${consTrend}% over this period — keep it going`
                    : consTrend < -5
                      ? `↓ Consistency down ${Math.abs(consTrend)}% over this period`
                      : '→ Consistency holding steady'}
                </div>
              )}
            </>
          )}
        </Card>

        {/* ── Weight Projection ── */}
        <Card>
          <SectionHead>WEIGHT PROJECTION</SectionHead>
          {!currentWeight ? (
            <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '8px 0', lineHeight: 1.6 }}>
              Log your weight on the Today tab to see your trajectory here
            </div>
          ) : !weightProjection ? (
            <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '8px 0', lineHeight: 1.6 }}>
              Log weight for at least 4 days to see your 4-week projection
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Now</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em' }}>
                    {currentWeight.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>lbs</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, color: 'var(--border)' }}>→</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                    {weightProjection.weeklyChange > 0.05 ? `+${weightProjection.weeklyChange}` : weightProjection.weeklyChange < -0.05 ? weightProjection.weeklyChange : '~0'}/wk
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>In 4 weeks</div>
                  <div style={{
                    fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em',
                    color: weightProjection.weeklyChange < -0.05 ? '#1D9E75'
                         : weightProjection.weeklyChange >  0.05 ? '#f59e0b'
                         : 'var(--text)',
                  }}>
                    {weightProjection.in4Weeks.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>lbs</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', paddingTop: 10, borderTop: '1px solid var(--border)', lineHeight: 1.5 }}>
                Based on your last {Math.min(weightPoints.length, 14)} weight entries. Projection assumes current trend continues — not a medical estimate.
              </div>
            </>
          )}
        </Card>

        {/* ── Monthly Heat Map ── */}
        <Card>
          <SectionHead>MONTHLY OVERVIEW</SectionHead>
          <CalendarHeatMap calByDate={calByDate} goal={calorieGoal} />
        </Card>

      </div>
    </div>
  )
}

// Required for JSX Fragment with key inside map

