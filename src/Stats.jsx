import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { ACHIEVEMENTS } from './achievements'

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
export default function Stats({ session, settings, onClose }) {
  const [range,        setRange]        = useState(7)
  const [history,      setHistory]      = useState([])   // [{date, calories, protein, carbs, fat}]
  const [weightPoints, setWeightPoints] = useState([])   // [{date, weight}]
  const [waterByDate,  setWaterByDate]  = useState({})   // {date: oz}
  const [mealTiming,   setMealTiming]   = useState({})   // {Breakfast: {cal, count}, ...}
  const [achievements, setAchievements] = useState([])
  const [loading,      setLoading]      = useState(true)

  const calorieGoal = settings?.calorie_goal || 2000
  const proteinGoal = settings?.protein_goal || 150
  const carbsGoal   = settings?.carbs_goal   || 250
  const fatGoal     = settings?.fat_goal     || 65
  const WATER_GOAL  = 80 // oz

  useEffect(() => {
    fetchAll()
  }, [range])

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
              No water data yet — start logging on the Today tab
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

      </div>
    </div>
  )
}
