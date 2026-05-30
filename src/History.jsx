import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const ACHIEVEMENT_DEFS = [
  { key: 'first_log',    label: 'First Step',   desc: 'Logged your first meal',          icon: '🌱' },
  { key: 'streak_3',     label: '3 Day Streak',  desc: 'Logged meals 3 days in a row',    icon: '🔥' },
  { key: 'streak_7',     label: 'Week Warrior',  desc: 'Logged meals 7 days in a row',    icon: '⭐' },
  { key: 'streak_30',    label: 'Unstoppable',   desc: 'Logged meals 30 days in a row',   icon: '💪' },
  { key: 'goal_hit',     label: 'On Target',     desc: 'Hit your calorie goal for the first time', icon: '🎯' },
  { key: 'goal_5',       label: 'Consistent',    desc: 'Hit your calorie goal 5 days in a row',    icon: '✅' },
]

export default function History({ session, settings, onClose }) {
  const [history, setHistory]           = useState([])
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading]           = useState(true)

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
      const days = Object.entries(grouped).map(([date, meals]) => ({
        date,
        calories: meals.reduce((s, m) => s + Number(m.calories), 0),
        protein:  meals.reduce((s, m) => s + Number(m.protein),  0),
        carbs:    meals.reduce((s, m) => s + Number(m.carbs),    0),
        fat:      meals.reduce((s, m) => s + Number(m.fat),      0),
        meals,
      })).sort((a, b) => new Date(b.date) - new Date(a.date))
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

  const hitGoal = (cal) => Math.abs(cal - calorieGoal) <= 100

  const currentStreak = (() => {
    if (!history.length) return 0
    let streak = 0
    const today = new Date().toISOString().split('T')[0]
    const dates = history.map(d => d.date)
    let check = today
    for (let i = 0; i < 60; i++) {
      if (dates.includes(check)) {
        streak++
        const d = new Date(check + 'T12:00:00')
        d.setDate(d.getDate() - 1)
        check = d.toISOString().split('T')[0]
      } else {
        break
      }
    }
    return streak
  })()

  const daysOnGoal    = history.filter(d => hitGoal(d.calories)).length
  const avgCalories   = history.length
    ? Math.round(history.reduce((s, d) => s + d.calories, 0) / history.length)
    : 0

  const formatDate = (dateStr) => {
    const date      = new Date(dateStr + 'T12:00:00')
    const today     = new Date().toISOString().split('T')[0]
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yd = yesterday.toISOString().split('T')[0]
    if (dateStr === today) return 'Today'
    if (dateStr === yd)    return 'Yesterday'
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  }

  const unlockedKeys = new Set(achievements.map(a => a.achievement_key))

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    // This component renders inside a position:fixed overflowY:auto wrapper in App.jsx.
    // Do NOT add overflowY here — that creates a nested scroll context and breaks scrolling.
    // paddingTop accounts for the tab bar height (56px) so content isn't hidden behind it.
    <div style={{
      paddingTop: 56,        // ← tab bar height; content starts below the tab bar
      paddingBottom: 40,
      maxWidth: 480,
      margin: '0 auto',
      padding: '56px 16px 40px',
    }}>

      {/* ── Section header ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
          History
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
          Last 30 days
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: 10, marginBottom: 24,
      }}>
        {[
          { label: 'current streak', value: `${currentStreak}d` },
          { label: 'days on goal',   value: daysOnGoal },
          { label: 'avg calories',   value: avgCalories },
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

      {/* ── Achievements ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 12 }}>
          ACHIEVEMENTS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {ACHIEVEMENT_DEFS.map(a => {
            const unlocked = unlockedKeys.has(a.key)
            return (
              <div key={a.key} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                opacity: unlocked ? 1 : 0.45,
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

      {/* ── Day cards ── */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 12 }}>
          LOG
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 14 }}>
            loading...
          </div>
        ) : history.length === 0 ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', marginTop: 40, fontSize: 14 }}>
            no history yet — start logging!
          </p>
        ) : (
          history.map(day => (
            <div key={day.date} style={{
              marginBottom: 10,
              padding: 16,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              borderLeft: hitGoal(day.calories) ? '3px solid #22c55e' : '3px solid transparent',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                  {formatDate(day.date)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {hitGoal(day.calories) && (
                    <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 500 }}>✓ goal hit</span>
                  )}
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                    {Math.round(day.calories)} cal
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                {[
                  { label: 'protein', val: Math.round(day.protein), goal: proteinGoal },
                  { label: 'carbs',   val: Math.round(day.carbs),   goal: carbsGoal   },
                  { label: 'fat',     val: Math.round(day.fat),      goal: fatGoal     },
                ].map(m => (
                  <div key={m.label}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{m.val}g</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
