import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { ACHIEVEMENTS } from './achievements'
import TrainingSection from './components/TrainingSection'

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

// ─── Calorie Trend Chart ──────────────────────────────────────────────────────
function CalorieTrendChart({ data, goal, range }) {
  const W = 340, H = 140
  const PAD = { top: 12, right: 32, bottom: 28, left: 36 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top  - PAD.bottom
  const months  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  if (!data.length) return (
    <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 13, color: 'var(--muted)' }}>no data yet</span>
    </div>
  )

  const maxCal     = Math.max(...data.map(d => d.calories), goal * 1.2, 500)
  const xScale     = (i) => PAD.left + (i / Math.max(data.length - 1, 1)) * chartW
  const yScale     = (v) => PAD.top + chartH - (v / maxCal) * chartH
  const points     = data.map((d, i) => ({ x: xScale(i), y: yScale(d.calories), ...d }))
  const pathD      = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaD      = `${pathD} L${points[points.length-1].x.toFixed(1)},${(PAD.top+chartH).toFixed(1)} L${points[0].x.toFixed(1)},${(PAD.top+chartH).toFixed(1)} Z`
  const goalY      = yScale(goal)
  const labelEvery = range === 7 ? 1 : 5

  // Y-axis ticks
  const yTicks = [0, 0.5, 1].map(f => ({
    val: Math.round(maxCal * f),
    y:   yScale(maxCal * f),
  }))

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
      {/* Area fill */}
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--text)" stopOpacity={0.08} />
          <stop offset="100%" stopColor="var(--text)" stopOpacity={0}    />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#areaGrad)" />

      {/* Y-axis ticks */}
      {yTicks.map(t => (
        <g key={t.val}>
          <line x1={PAD.left} y1={t.y} x2={PAD.left + chartW} y2={t.y}
            stroke="var(--border)" strokeWidth={0.5} strokeDasharray="3,3" />
          <text x={PAD.left - 4} y={t.y + 3} textAnchor="end" fontSize={8} fill="var(--muted)">
            {t.val >= 1000 ? `${(t.val/1000).toFixed(1)}k` : t.val}
          </text>
        </g>
      ))}

      {/* Goal line */}
      <line x1={PAD.left} y1={goalY} x2={PAD.left + chartW} y2={goalY}
        stroke="#1D9E75" strokeWidth={1} strokeDasharray="5,4" opacity={0.6} />
      <text x={PAD.left + chartW + 3} y={goalY + 3} fontSize={8} fill="#1D9E75" opacity={0.8}>
        goal
      </text>

      {/* Line */}
      <path d={pathD} fill="none" stroke="var(--text)" strokeWidth={1.5}
        strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots — green on goal-hit days */}
      {points.map((p, i) => {
        const hit = Math.abs(p.calories - goal) <= 100
        return (
          <circle key={i} cx={p.x} cy={p.y} r={3}
            fill={hit ? '#1D9E75' : '#22c55e'}
            stroke="var(--bg)" strokeWidth={1.5} />
        )
      })}

      {/* X-axis labels */}
      {data.map((d, i) => {
        if (i % labelEvery !== 0 && i !== data.length - 1) return null
        const date  = new Date(d.date + 'T12:00:00')
        const label = range === 7
          ? date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)
          : `${months[date.getMonth()]} ${date.getDate()}`
        return (
          <text key={i} x={xScale(i)} y={H - 4} textAnchor="middle" fontSize={9} fill="var(--muted)">
            {label}
          </text>
        )
      })}
    </svg>
  )
}

// ─── Weight Trend Chart ───────────────────────────────────────────────────────
function WeightTrendChart({ points }) {
  if (points.length < 2) return (
    <div style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
        {points.length === 1 ? 'Log more days to see trend' : 'No weight data in this range'}
      </span>
    </div>
  )

  const W = 340, H = 72
  const PAD = { top: 8, right: 8, bottom: 8, left: 8 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top  - PAD.bottom

  const weights  = points.map(p => p.weight)
  const minW     = Math.min(...weights)
  const maxW     = Math.max(...weights)
  const wRange   = maxW - minW || 1

  const xScale = (i) => PAD.left + (i / (points.length - 1)) * chartW
  const yScale = (w) => PAD.top  + chartH - ((w - minW) / wRange) * chartH

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(p.weight).toFixed(1)}`).join(' ')

  const netChange = points[points.length - 1].weight - points[0].weight
  const lineColor = netChange <= 0.1 ? '#1D9E75' : 'var(--muted)'

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <path d={pathD} fill="none" stroke={lineColor} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={xScale(i)} cy={yScale(p.weight)} r={2.5}
          fill={lineColor} stroke="var(--bg)" strokeWidth={1} />
      ))}
    </svg>
  )
}

// ─── Macro Bar ────────────────────────────────────────────────────────────────
function MacroBar({ label, value, goal, color }) {
  const pct = Math.min(value / (goal || 1), 1)
  const over = value > goal
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, color: over ? '#f5a623' : 'var(--muted)' }}>
          {Math.round(value)}g <span style={{ opacity: 0.5 }}>/ {goal}g</span>
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct * 100}%`,
          background: over ? '#f5a623' : color,
          borderRadius: 3, transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}

// ─── Meal Timing Bar ─────────────────────────────────────────────────────────
function MealTimingBar({ label, value, max, color }) {
  const pct = max > 0 ? value / max : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--text)' }}>{label}</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{Math.round(value)} cal avg</span>
      </div>
      <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct * 100}%`,
          background: color, borderRadius: 3, transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  )
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

// ─── Inline Pro upsell card ───────────────────────────────────────────────────
function TrendsUpsellCard({ onUpgrade }) {
  return (
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
          { icon: 'ti-wave-sine',      title: 'Rolling 7-day average',    desc: 'Cut through daily noise. See your real calorie trend.' },
          { icon: 'ti-chart-bar',      title: 'Week-over-week comparison', desc: 'Are your calories, protein, and consistency improving?' },
          { icon: 'ti-target',         title: 'Consistency score trend',   desc: 'Weekly breakdown of how often you hit your goals.' },
          { icon: 'ti-scale',          title: 'Weight projection',        desc: 'Where will you be in 4 weeks at your current pace?' },
          { icon: 'ti-calendar-month', title: 'Monthly heat map',         desc: 'Every day of the month at a glance. Patterns emerge.' },
        ].map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <i className={`ti ${f.icon}`} style={{ fontSize: 18, flexShrink: 0, marginTop: 1, color: '#1D9E75' }} />
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
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHead({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
      color: 'var(--muted)', marginBottom: 12,
    }}>
      {children}
    </div>
  )
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
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

// ─── Stat tile ────────────────────────────────────────────────────────────────
function StatTile({ value, label, accent, sub }) {
  return (
    <div style={{
      background: 'var(--surface)', border: accent ? '1px solid rgba(29,158,117,0.35)' : '1px solid var(--border)',
      borderRadius: 12, padding: '12px 10px', textAlign: 'center',
    }}>
      <div style={{
        fontSize: 18, fontWeight: 700, color: accent ? '#1D9E75' : 'var(--text)',
        letterSpacing: '-0.02em', lineHeight: 1.1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: accent ? '#1D9E75' : 'var(--muted)', marginTop: 1 }}>{sub}</div>
      )}
      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>{label}</div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Stats({ session, settings, isPro, onUpgrade, onClose }) {
  const [range,        setRange]        = useState(7)
  const [history,      setHistory]      = useState([])   // [{date, calories, protein, carbs, fat}]
  const [weightPoints, setWeightPoints] = useState([])   // [{date, weight}]
  const [waterByDate,  setWaterByDate]  = useState({})   // {date: oz}
  const [mealTiming,   setMealTiming]   = useState({})   // {Breakfast: {cal, count}, ...}
  const [achievements, setAchievements] = useState([])
  const [loading,      setLoading]      = useState(true)

  // Trends (Pro) state — independent range from the Stats toggle above
  const [trendsRange,       setTrendsRange]       = useState(30)
  const [allData,           setAllData]           = useState([])   // [{date, calories, protein}]
  const [trendWeightPoints, setTrendWeightPoints] = useState([])   // [{date, weight}] — 90d for projection
  const [trendsLoading,     setTrendsLoading]     = useState(true)

  const calorieGoal = settings?.calorie_goal || 2000
  const proteinGoal = settings?.protein_goal || 150
  const carbsGoal   = settings?.carbs_goal   || 250
  const fatGoal     = settings?.fat_goal     || 65
  const WATER_GOAL  = 80 // oz

  useEffect(() => {
    fetchAll()
  }, [range])

  useEffect(() => {
    if (isPro) fetchTrends()
  }, [trendsRange, isPro])

  const fetchAll = async () => {
    setLoading(true)

    const now       = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (range - 1), 0, 0, 0)

    // ── Meal logs ────────────────────────────────────────────────────────────
    const { data: mealData } = await supabase
      .from('meal_logs')
      .select('logged_at, calories, protein, carbs, fat, meal_time')
      .eq('user_id', session.user.id)
      .gte('logged_at', startDate.toISOString())
      .order('logged_at', { ascending: true })

    // Group by local date
    const byDate = {}
    const byTime = {}
    ;(mealData || []).forEach(m => {
      const date = toLocalDateStr(new Date(m.logged_at))
      if (!byDate[date]) byDate[date] = { calories: 0, protein: 0, carbs: 0, fat: 0 }
      byDate[date].calories += Number(m.calories)
      byDate[date].protein  += Number(m.protein)
      byDate[date].carbs    += Number(m.carbs)
      byDate[date].fat      += Number(m.fat)

      // Meal timing
      const t = m.meal_time || 'Other'
      if (!byTime[t]) byTime[t] = { total: 0, count: 0 }
      byTime[t].total += Number(m.calories)
      byTime[t].count += 1
    })

    const dates    = getDatesInRange(range)
    const hist     = dates
      .filter(d => byDate[d])
      .map(d => ({ date: d, ...byDate[d] }))

    // Avg calories per meal time (across days that had that meal)
    const timingAvg = {}
    Object.entries(byTime).forEach(([t, v]) => {
      // count unique days that had this meal time
      const daysWithMeal = (mealData || [])
        .filter(m => (m.meal_time || 'Other') === t)
        .map(m => toLocalDateStr(new Date(m.logged_at)))
      const uniqueDays = new Set(daysWithMeal).size
      timingAvg[t] = uniqueDays > 0 ? v.total / uniqueDays : 0
    })

    // ── Weight logs ──────────────────────────────────────────────────────────
    const { data: weightData } = await supabase
      .from('weight_logs')
      .select('weight_lbs, logged_at')
      .eq('user_id', session.user.id)
      .gte('logged_at', startDate.toISOString())
      .order('logged_at', { ascending: true })

    // Last entry per local date
    const weightByDate = {}
    ;(weightData || []).forEach(w => {
      const date = toLocalDateStr(new Date(w.logged_at))
      weightByDate[date] = Number(w.weight_lbs)
    })
    const wPoints = dates
      .filter(d => weightByDate[d] !== undefined)
      .map(d => ({ date: d, weight: weightByDate[d] }))

    // ── Water logs ───────────────────────────────────────────────────────────
    const { data: waterData } = await supabase
      .from('water_logs')
      .select('amount_oz, logged_at')
      .eq('user_id', session.user.id)
      .gte('logged_at', startDate.toISOString())

    const wByDate = {}
    ;(waterData || []).forEach(w => {
      const date = toLocalDateStr(new Date(w.logged_at))
      wByDate[date] = (wByDate[date] || 0) + Number(w.amount_oz)
    })

    // ── Achievements ─────────────────────────────────────────────────────────
    const { data: achData } = await supabase
      .from('achievements')
      .select('key')
      .eq('user_id', session.user.id)

    setHistory(hist)
    setWeightPoints(wPoints)
    setWaterByDate(wByDate)
    setMealTiming(timingAvg)
    setAchievements(achData || [])
    setLoading(false)
  }

  const fetchTrends = async () => {
    setTrendsLoading(true)
    const now       = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (trendsRange - 1), 0, 0, 0)

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

    setAllData(getDatesInRange(trendsRange).map(date => ({
      date,
      calories: byDate[date]?.calories || 0,
      protein:  byDate[date]?.protein  || 0,
    })))

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
    setTrendWeightPoints(
      getDatesInRange(90).filter(d => wByDate[d] !== undefined).map(d => ({ date: d, weight: wByDate[d] }))
    )

    setTrendsLoading(false)
  }

  // ── Computed values ──────────────────────────────────────────────────────────
  const loggedDays = history
  const chartData  = getDatesInRange(range).map(date => ({
    date,
    calories: loggedDays.find(d => d.date === date)?.calories || 0,
  })).filter(d => d.calories > 0)

  const avg = (key) => loggedDays.length
    ? loggedDays.reduce((s, d) => s + d[key], 0) / loggedDays.length
    : 0

  const avgCalories = Math.round(avg('calories'))
  const avgProtein  = Math.round(avg('protein'))
  const avgCarbs    = Math.round(avg('carbs'))
  const avgFat      = Math.round(avg('fat'))

  const goalHits       = loggedDays.filter(d => Math.abs(d.calories - calorieGoal) <= 100).length
  const goalHitRate    = loggedDays.length ? Math.round((goalHits / loggedDays.length) * 100) : 0
  const proteinHits    = loggedDays.filter(d => d.protein >= proteinGoal * 0.9).length
  const proteinHitRate = loggedDays.length ? Math.round((proteinHits / loggedDays.length) * 100) : 0

  const deficitSurplus = loggedDays.length ? Math.round(avgCalories - calorieGoal) : null

  // ── Streaks (all-time, not range-limited) ────────────────────────────────────
  const currentStreak = (() => {
    let streak = 0
    const dates = history.map(d => d.date)
    let check   = toLocalDateStr(new Date())
    for (let i = 0; i < 60; i++) {
      if (dates.includes(check)) {
        streak++
        const d = new Date(check + 'T12:00:00')
        d.setDate(d.getDate() - 1)
        check = toLocalDateStr(d)
      } else break
    }
    return streak
  })()

  const longestStreak = (() => {
    if (!history.length) return 0
    const dates = history.map(d => d.date).sort()
    let max = 1, cur = 1
    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i] + 'T12:00:00') - new Date(dates[i-1] + 'T12:00:00')) / 86400000
      cur = diff === 1 ? cur + 1 : 1
      max = Math.max(max, cur)
    }
    return max
  })()

  // ── Weight metrics ───────────────────────────────────────────────────────────
  const currentWeight = weightPoints.length > 0 ? weightPoints[weightPoints.length - 1].weight : null
  const weightChange  = weightPoints.length >= 2
    ? weightPoints[weightPoints.length - 1].weight - weightPoints[0].weight
    : null

  // ── Water metrics ────────────────────────────────────────────────────────────
  const waterDates        = getDatesInRange(range)
  const daysWithWater     = waterDates.filter(d => waterByDate[d] !== undefined)
  const avgWater          = daysWithWater.length
    ? Math.round(daysWithWater.reduce((s, d) => s + waterByDate[d], 0) / daysWithWater.length)
    : 0
  const daysHitWaterGoal  = daysWithWater.filter(d => waterByDate[d] >= WATER_GOAL).length

  // ── Meal timing ──────────────────────────────────────────────────────────────
  const MEAL_ORDER  = ['Breakfast', 'Lunch', 'Snack', 'Dinner']
  const MEAL_COLORS = {
    Breakfast: '#f59e0b',
    Lunch:     '#3b82f6',
    Snack:     '#8b5cf6',
    Dinner:    '#ef4444',
  }
  const timingMax = Math.max(...Object.values(mealTiming), 1)

  // ── Achievements ─────────────────────────────────────────────────────────────
  const unlockedKeys = new Set(achievements.map(a => a.key))

  // ── Trends (Pro) computed ────────────────────────────────────────────────────
  const now             = new Date()
  const trendLoggedDays = allData.filter(d => d.calories > 0)

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
  const numWeeks = Math.min(Math.ceil(trendsRange / 7), 12)
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
  const trendCurrentWeight = trendWeightPoints.length > 0 ? trendWeightPoints[trendWeightPoints.length - 1].weight : null
  const weightProjection = (() => {
    const pts = trendWeightPoints.slice(-14)
    if (pts.length < 4) return null
    const n   = pts.length
    const sumX  = pts.reduce((s, _, i) => s + i, 0)
    const sumY  = pts.reduce((s, p)    => s + p.weight, 0)
    const sumXY = pts.reduce((s, p, i) => s + i * p.weight, 0)
    const sumX2 = pts.reduce((s, _, i) => s + i * i, 0)
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) // lbs/day
    return {
      in4Weeks:    Math.round((trendCurrentWeight + slope * 28) * 10) / 10,
      weeklyChange: Math.round(slope * 7 * 100) / 100,
    }
  })()

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100dvh', background: 'var(--bg)' }}>

      {/* Sticky header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        paddingTop: 'calc(18px + env(safe-area-inset-top))', paddingRight: 16, paddingBottom: 14, paddingLeft: 16,
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1,
      }}>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', padding: 0,
          cursor: 'pointer', color: 'var(--text)', fontSize: 20, lineHeight: 1,
        }}>←</button>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
          Stats
        </span>
      </div>

      <div style={{ padding: '20px 16px 48px' }}>

        {/* Range toggle */}
        <div style={{
          display: 'inline-flex',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 3, marginBottom: 20, gap: 3,
        }}>
          {[7, 30].map(r => (
            <button key={r} onClick={() => setRange(r)} style={{
              padding: '5px 16px', borderRadius: 7, border: 'none',
              background: range === r ? 'var(--text)' : 'transparent',
              color: range === r ? 'var(--bg)' : 'var(--muted)',
              fontSize: 13, fontWeight: range === r ? 600 : 400,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 0.15s, color 0.15s',
            }}>{r}d</button>
          ))}
        </div>

        {/* ── Calorie Trend ── */}
        <Card>
          <SectionHead>CALORIE TREND</SectionHead>
          {loading ? (
            <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>loading…</span>
            </div>
          ) : (
            <CalorieTrendChart data={chartData} goal={calorieGoal} range={range} />
          )}
        </Card>

        {/* ── Summary stats (2 rows × 3 cols) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
          <StatTile
            value={loggedDays.length ? avgCalories.toLocaleString() : '—'}
            label="avg calories"
          />
          <StatTile
            value={loggedDays.length ? `${goalHitRate}%` : '—'}
            label="goal hit rate"
            accent={goalHitRate >= 70}
          />
          <StatTile
            value={loggedDays.length}
            label="days logged"
          />
          <StatTile
            value={loggedDays.length ? `${avgProtein}g` : '—'}
            label="avg protein"
          />
          <StatTile
            value={`${currentStreak}d`}
            label="current streak"
            accent={currentStreak > 0}
            sub={currentStreak > 0 ? '🔥' : null}
          />
          <StatTile
            value={`${longestStreak}d`}
            label="best streak"
          />
        </div>

        {/* ── Deficit / Surplus ── */}
        {deficitSurplus !== null && loggedDays.length > 0 && (
          <Card style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 6 }}>
                  AVG DAILY BALANCE
                </div>
                <div style={{
                  fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em',
                  color: Math.abs(deficitSurplus) <= 100
                    ? '#1D9E75'
                    : deficitSurplus < 0 ? '#3b82f6' : '#f59e0b',
                }}>
                  {deficitSurplus > 0 ? '+' : ''}{deficitSurplus.toLocaleString()} cal
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                  {Math.abs(deficitSurplus) <= 100
                    ? 'On track with goal'
                    : deficitSurplus < 0
                      ? `${Math.abs(deficitSurplus).toLocaleString()} cal under goal/day`
                      : `${deficitSurplus.toLocaleString()} cal over goal/day`}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>goal</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
                  {calorieGoal.toLocaleString()}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* ── Nutrition: Macros vs Goal ── */}
        <Card>
          <SectionHead>AVG MACROS ({range}D) VS GOAL</SectionHead>
          {loggedDays.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '10px 0' }}>
              no data yet
            </div>
          ) : (
            <>
              <MacroBar label="Protein" value={avgProtein} goal={proteinGoal} color="#378ADD" />
              <MacroBar label="Carbs"   value={avgCarbs}   goal={carbsGoal}   color="#EF9F27" />
              <MacroBar label="Fat"     value={avgFat}     goal={fatGoal}     color="#D4537E" />

              {/* Protein hit rate */}
              <div style={{
                marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    Protein goal hit
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    ≥90% of {proteinGoal}g target
                  </div>
                </div>
                <div style={{
                  fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em',
                  color: proteinHitRate >= 70 ? '#1D9E75' : proteinHitRate >= 40 ? '#f59e0b' : 'var(--text)',
                }}>
                  {loggedDays.length ? `${proteinHitRate}%` : '—'}
                </div>
              </div>

              {/* Macro calorie split */}
              {avgCalories > 0 && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 10 }}>
                    CALORIE SPLIT
                  </div>
                  <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 1 }}>
                    {[
                      { pct: (avgProtein * 4) / avgCalories, color: '#378ADD' },
                      { pct: (avgCarbs   * 4) / avgCalories, color: '#EF9F27' },
                      { pct: (avgFat     * 9) / avgCalories, color: '#D4537E' },
                    ].map((m, i) => (
                      <div key={i} style={{
                        flex: m.pct, background: m.color, minWidth: 2,
                        transition: 'flex 0.6s ease',
                      }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    {[
                      { label: 'Protein', pct: Math.round((avgProtein * 4) / avgCalories * 100), color: '#378ADD' },
                      { label: 'Carbs',   pct: Math.round((avgCarbs   * 4) / avgCalories * 100), color: '#EF9F27' },
                      { label: 'Fat',     pct: Math.round((avgFat     * 9) / avgCalories * 100), color: '#D4537E' },
                    ].map(m => (
                      <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: m.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{m.label} {m.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {/* ── Meal Timing ── */}
        {Object.keys(mealTiming).length > 0 && (
          <Card>
            <SectionHead>CALORIES BY MEAL TIME ({range}D AVG)</SectionHead>
            {MEAL_ORDER.filter(t => mealTiming[t]).map(t => (
              <MealTimingBar
                key={t}
                label={t}
                value={mealTiming[t]}
                max={timingMax}
                color={MEAL_COLORS[t] || 'var(--muted)'}
              />
            ))}
            {/* Other meal times not in MEAL_ORDER */}
            {Object.keys(mealTiming)
              .filter(t => !MEAL_ORDER.includes(t))
              .map(t => (
                <MealTimingBar
                  key={t}
                  label={t}
                  value={mealTiming[t]}
                  max={timingMax}
                  color="var(--muted)"
                />
              ))}
          </Card>
        )}

        {/* ── Weight Trend ── */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <SectionHead>WEIGHT ({range}D)</SectionHead>
            {currentWeight && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                  {currentWeight.toFixed(1)} lbs
                </div>
                {weightChange !== null && (
                  <div style={{
                    fontSize: 12,
                    color: weightChange <= 0 ? '#1D9E75' : '#f59e0b',
                    marginTop: 1,
                  }}>
                    {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} lbs
                  </div>
                )}
              </div>
            )}
          </div>
          <WeightTrendChart points={weightPoints} />
          {weightPoints.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', paddingTop: 8 }}>
              Log your weight on the Today tab to see trends here
            </div>
          )}
        </Card>

        {/* ── Hydration ── */}
        <Card>
          <SectionHead>HYDRATION ({range}D)</SectionHead>
          {daysWithWater.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '8px 0' }}>
              No water data yet. Start logging on the Today tab
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                  {avgWater}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>avg oz/day</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em',
                  color: daysHitWaterGoal > 0 ? '#38bdf8' : 'var(--text)',
                }}>
                  {daysHitWaterGoal}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>days hit goal</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                  {daysWithWater.length}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>days tracked</div>
              </div>
            </div>
          )}
          {daysWithWater.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3, background: '#38bdf8',
                  width: `${Math.min((avgWater / WATER_GOAL) * 100, 100)}%`,
                  transition: 'width 0.6s ease',
                }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, textAlign: 'right' }}>
                avg {avgWater} / {WATER_GOAL} oz goal
              </div>
            </div>
          )}
        </Card>

        {/* ── Achievements ── */}
        <div>
          <SectionHead>ACHIEVEMENTS</SectionHead>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {ACHIEVEMENTS.map(a => {
              const unlocked = unlockedKeys.has(a.key)
              return (
                <div key={a.key} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px',
                  background: 'var(--surface)',
                  border: unlocked ? '1px solid rgba(29,158,117,0.3)' : '1px solid var(--border)',
                  borderRadius: 12,
                  opacity: unlocked ? 1 : 0.4,
                  transition: 'opacity 0.3s',
                }}>
                  <span style={{
                    fontSize: 22,
                    filter: unlocked ? 'none' : 'grayscale(1)',
                  }}>{a.emoji}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{a.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{a.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Advanced Trends divider (Pro) ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginTop: 32, marginBottom: 20, paddingTop: 24,
          borderTop: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            Advanced Trends
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#1D9E75',
            background: 'rgba(29,158,117,0.1)', border: '1px solid rgba(29,158,117,0.25)',
            borderRadius: 5, padding: '2px 7px', letterSpacing: '0.06em',
          }}>PRO</span>
        </div>

        {!isPro ? (
          <TrendsUpsellCard onUpgrade={onUpgrade} />
        ) : (
          <>
            {/* ── Training Section (Strava) — shown only when connected ── */}
            <TrainingSection session={session} range={trendsRange} calByDate={calByDate} calorieGoal={calorieGoal} />

            {/* Range toggle — 14d / 30d / 90d (independent from the Stats toggle) */}
            <div style={{
              display: 'inline-flex',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 3, marginBottom: 20, gap: 3,
            }}>
              {[14, 30, 90].map(r => (
                <button key={r} onClick={() => setTrendsRange(r)} style={{
                  padding: '5px 14px', borderRadius: 7, border: 'none',
                  background: trendsRange === r ? 'var(--text)' : 'transparent',
                  color:      trendsRange === r ? 'var(--bg)'   : 'var(--muted)',
                  fontSize: 13, fontWeight: trendsRange === r ? 600 : 400,
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
                {trendLoggedDays.length > 0 && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: '#1D9E75', letterSpacing: '-0.02em' }}>
                      {Math.round(trendLoggedDays.reduce((s, d) => s + d.calories, 0) / trendLoggedDays.length).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>avg/day</div>
                  </div>
                )}
              </div>
              {trendsLoading
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
                        ? `↑ Consistency up ${consTrend}% over this period. Keep it going`
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
              {!trendCurrentWeight ? (
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
                        {trendCurrentWeight.toFixed(1)}
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
                    Based on your last {Math.min(trendWeightPoints.length, 14)} weight entries. Projection assumes current trend continues. This is not a medical estimate.
                  </div>
                </>
              )}
            </Card>

            {/* ── Monthly Heat Map ── */}
            <Card>
              <SectionHead>MONTHLY OVERVIEW</SectionHead>
              <CalendarHeatMap calByDate={calByDate} goal={calorieGoal} />
            </Card>
          </>
        )}

      </div>
    </div>
  )
}
