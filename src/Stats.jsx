import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const ACHIEVEMENT_DEFS = [
  { key: 'first_log',  label: 'First Step',   desc: 'Logged your first meal',                   icon: '🌱' },
  { key: 'streak_3',   label: '3 Day Streak',  desc: 'Logged meals 3 days in a row',             icon: '🔥' },
  { key: 'streak_7',   label: 'Week Warrior',  desc: 'Logged meals 7 days in a row',             icon: '⭐' },
  { key: 'streak_30',  label: 'Unstoppable',   desc: 'Logged meals 30 days in a row',            icon: '💪' },
  { key: 'goal_hit',   label: 'On Target',     desc: 'Hit your calorie goal for the first time', icon: '🎯' },
  { key: 'goal_5',     label: 'Consistent',    desc: 'Hit your calorie goal 5 days in a row',    icon: '✅' },
]

function getDatesInRange(days) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    return d.toISOString().split('T')[0]
  })
}

// ─── Calorie Trend Chart ──────────────────────────────────────────────────────

function CalorieTrendChart({ data, goal, range }) {
  const W = 340
  const H = 140
  const PAD = { top: 12, right: 32, bottom: 28, left: 36 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  if (!data.length) {
    return (
      <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>no data yet</span>
      </div>
    )
  }

  const maxCal = Math.max(...data.map(d => d.calories), goal * 1.2, 500)
  const xScale = (i) => PAD.left + (i / Math.max(data.length - 1, 1)) * chartW
  const yScale = (v) => PAD.top + chartH - (v / maxCal) * chartH

  const points  = data.map((d, i) => ({ x: xScale(i), y: yScale(d.calories), ...d }))
  const pathD   = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaD   = `${pathD} L${points[points.length - 1].x.toFixed(1)},${(PAD.top + chartH).toFixed(1)} L${points[0].x.toFixed(1)},${(PAD.top + chartH).toFixed(1)} Z`
  const goalY   = yScale(goal)
  const labelEvery = range === 7 ? 1 : 6
  const months  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1D9E75" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#1D9E75" stopOpacity="0" />
        </linearGradient>
        <clipPath id="chartClip">
          <rect x={PAD.left} y={PAD.top} width={chartW} height={chartH} />
        </clipPath>
      </defs>

      {[0.25, 0.5, 0.75, 1].map(t => {
        const y   = PAD.top + chartH * (1 - t)
        const val = Math.round(maxCal * t)
        return (
          <g key={t}>
            <line x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y}
              stroke="var(--border)" strokeWidth={0.5} strokeDasharray="3,3" />
            <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize={9} fill="var(--muted)">{val}</text>
          </g>
        )
      })}

      <line x1={PAD.left} y1={goalY} x2={PAD.left + chartW} y2={goalY}
        stroke="#1D9E75" strokeWidth={1} strokeDasharray="4,3" opacity={0.6} />
      <text x={PAD.left + chartW + 4} y={goalY + 4} fontSize={9} fill="#1D9E75" opacity={0.8}>goal</text>

      <path d={areaD} fill="url(#calGrad)" clipPath="url(#chartClip)" />
      <path d={pathD} fill="none" stroke="#1D9E75" strokeWidth={2}
        strokeLinejoin="round" strokeLinecap="round" clipPath="url(#chartClip)" />

      {points.map((p, i) => p.calories > 0 && (
        <circle key={i} cx={p.x} cy={p.y} r={3}
          fill={Math.abs(p.calories - goal) <= 100 ? '#22c55e' : '#1D9E75'}
          stroke="var(--bg)" strokeWidth={1.5} />
      ))}

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
          height: '100%',
          width: `${pct * 100}%`,
          background: over ? '#f5a623' : color,
          borderRadius: 3,
          transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }} />
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Stats({ session, settings, onClose }) {
  const [history,      setHistory]      = useState([])
  const [achievements, setAchievements] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [range,        setRange]        = useState(7)

  useEffect(() => {
    fetchHistory()
    fetchAchievements()
  }, [])

  const fetchHistory = async () => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('logged_at', thirtyDaysAgo.toISOString())
      .order('logged_at', { ascending: false })
    if (data) {
      const grouped = {}
      data.forEach(meal => {
        const date = meal.logged_at.split('T')[0]
        if (!grouped[date]) grouped[date] = []
        grouped[date].push(meal)
      })
      const days = Object.entries(grouped)
        .map(([date, meals]) => ({
          date,
          calories: meals.reduce((s, m) => s + Number(m.calories), 0),
          protein:  meals.reduce((s, m) => s + Number(m.protein),  0),
          carbs:    meals.reduce((s, m) => s + Number(m.carbs),    0),
          fat:      meals.reduce((s, m) => s + Number(m.fat),      0),
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
      setHistory(days)
    }
    setLoading(false)
  }

  const fetchAchievements = async () => {
    const { data } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', session.user.id)
    if (data) setAchievements(data)
  }

  const calorieGoal = settings?.calorie_goal || 2000
  const proteinGoal = settings?.protein_goal || 150
  const carbsGoal   = settings?.carbs_goal   || 250
  const fatGoal     = settings?.fat_goal      || 65

  const chartData = getDatesInRange(range).map(date => {
    const found = history.find(d => d.date === date)
    return { date, calories: found?.calories || 0 }
  })

  const cutoff     = new Date()
  cutoff.setDate(cutoff.getDate() - range)
  const loggedDays = history.filter(d =>
    new Date(d.date + 'T12:00:00') >= cutoff && d.calories > 0
  )

  const avg = (key) => loggedDays.length
    ? loggedDays.reduce((s, d) => s + d[key], 0) / loggedDays.length
    : 0

  const avgCalories  = Math.round(avg('calories'))
  const avgProtein   = avg('protein')
  const avgCarbs     = avg('carbs')
  const avgFat       = avg('fat')
  const goalHits     = loggedDays.filter(d => Math.abs(d.calories - calorieGoal) <= 100).length
  const goalHitRate  = loggedDays.length ? Math.round((goalHits / loggedDays.length) * 100) : 0

  const currentStreak = (() => {
    let streak = 0
    const dates = history.map(d => d.date)
    let check   = new Date().toISOString().split('T')[0]
    for (let i = 0; i < 60; i++) {
      if (dates.includes(check)) {
        streak++
        const d = new Date(check + 'T12:00:00')
        d.setDate(d.getDate() - 1)
        check = d.toISOString().split('T')[0]
      } else break
    }
    return streak
  })()

  const longestStreak = (() => {
    if (!history.length) return 0
    const dates = history.map(d => d.date).sort()
    let max = 1, cur = 1
    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i] + 'T12:00:00') - new Date(dates[i - 1] + 'T12:00:00')) / 86400000
      cur = diff === 1 ? cur + 1 : 1
      max = Math.max(max, cur)
    }
    return max
  })()

  const unlockedKeys = new Set(achievements.map(a => a.achievement_key))

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>

      {/* Back button header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '18px 16px 14px',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        background: 'var(--bg)',
        zIndex: 1,
      }}>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'var(--text)',
            fontSize: 20,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          ←
        </button>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
          Stats
        </span>
      </div>

      {/* Scrollable content */}
      <div style={{ padding: '20px 16px 40px' }}>

        {/* Range toggle */}
        <div style={{
          display: 'inline-flex',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 3,
          marginBottom: 20,
          gap: 3,
        }}>
          {[7, 30].map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                padding: '5px 16px',
                borderRadius: 7,
                border: 'none',
                background: range === r ? 'var(--text)' : 'transparent',
                color: range === r ? 'var(--bg)' : 'var(--muted)',
                fontSize: 13,
                fontWeight: range === r ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {r}d
            </button>
          ))}
        </div>

        {/* Calorie trend */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '16px 16px 12px',
          marginBottom: 14,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 12 }}>
            CALORIE TREND
          </div>
          {loading ? (
            <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>loading...</span>
            </div>
          ) : (
            <CalorieTrendChart data={chartData} goal={calorieGoal} range={range} />
          )}
        </div>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'avg calories',  value: avgCalories || '—' },
            { label: 'goal hit rate', value: loggedDays.length ? `${goalHitRate}%` : '—' },
            { label: 'days logged',   value: loggedDays.length },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '12px 10px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Streaks */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'current streak', value: `${currentStreak}d`, accent: currentStreak > 0, emoji: '🔥' },
            { label: 'longest streak', value: `${longestStreak}d`, accent: false,              emoji: '📅' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'var(--surface)',
              border: stat.accent ? '1px solid rgba(29,158,117,0.4)' : '1px solid var(--border)',
              borderRadius: 12,
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <span style={{ fontSize: 24 }}>{stat.emoji}</span>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: stat.accent ? '#1D9E75' : 'var(--text)', letterSpacing: '-0.02em' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Avg macros */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '16px',
          marginBottom: 14,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 14 }}>
            AVG MACROS ({range}D) VS GOAL
          </div>
          {loggedDays.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '10px 0' }}>
              no data yet
            </div>
          ) : (
            <>
              <MacroBar label="Protein" value={avgProtein} goal={proteinGoal} color="#3b82f6" />
              <MacroBar label="Carbs"   value={avgCarbs}   goal={carbsGoal}   color="#f59e0b" />
              <MacroBar label="Fat"     value={avgFat}     goal={fatGoal}     color="#ef4444" />
            </>
          )}
        </div>

        {/* Achievements */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 12 }}>
            ACHIEVEMENTS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {ACHIEVEMENT_DEFS.map(a => {
              const unlocked = unlockedKeys.has(a.key)
              return (
                <div key={a.key} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  background: 'var(--surface)',
                  border: unlocked ? '1px solid rgba(29,158,117,0.3)' : '1px solid var(--border)',
                  borderRadius: 12,
                  opacity: unlocked ? 1 : 0.4,
                }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{a.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>
                      {a.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4, marginTop: 2 }}>
                      {a.desc}
                    </div>
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
