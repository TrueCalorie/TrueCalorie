import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function History({ session, settings, onClose }) {
  const [history, setHistory] = useState([])
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)

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
        logged: true,
        calories: meals.reduce((s, m) => s + Number(m.calories), 0),
        protein: meals.reduce((s, m) => s + Number(m.protein), 0),
        carbs: meals.reduce((s, m) => s + Number(m.carbs), 0),
        fat: meals.reduce((s, m) => s + Number(m.fat), 0),
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
  const carbsGoal = settings?.carbs_goal || 250
  const fatGoal = settings?.fat_goal || 65

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T12:00:00')
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)

    if (dateStr === today.toISOString().split('T')[0]) return 'Today'
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday'
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  }

  const hitGoal = (calories) => Math.abs(calories - calorieGoal) <= 100

  const ACHIEVEMENT_DEFS = [
    { key: 'first_log', label: 'First Step', desc: 'Logged your first meal', icon: '🌱' },
    { key: 'streak_3', label: '3 Day Streak', desc: 'Logged meals 3 days in a row', icon: '🔥' },
    { key: 'streak_7', label: 'Week Warrior', desc: 'Logged meals 7 days in a row', icon: '⭐' },
    { key: 'streak_30', label: 'Unstoppable', desc: 'Logged meals 30 days in a row', icon: '💪' },
    { key: 'goal_hit_1', label: 'On Target', desc: 'Hit your calorie goal for the first time', icon: '🎯' },
    { key: 'goal_hit_5', label: 'Consistent', desc: 'Hit your calorie goal 5 days in a row', icon: '✅' },
    { key: 'goal_hit_10', label: 'Locked In', desc: 'Hit your calorie goal 10 days in a row', icon: '🏆' },
  ]

  const earnedKeys = new Set(achievements.map(a => a.key))

  const currentStreak = (() => {
    let streak = 0
    const today = new Date().toISOString().split('T')[0]
    let checking = today
    for (let i = 0; i < 30; i++) {
      const found = history.find(d => d.date === checking)
      if (found) {
        streak++
        const d = new Date(checking)
        d.setDate(d.getDate() - 1)
        checking = d.toISOString().split('T')[0]
      } else break
    }
    return streak
  })()

  const daysHitGoal = history.filter(d => hitGoal(d.calories)).length
  const avgCalories = history.length > 0
    ? Math.round(history.reduce((s, d) => s + d.calories, 0) / history.length)
    : 0

  if (loading) return (
    <div style={{ padding: 24, fontFamily: 'sans-serif', textAlign: 'center', color: '#aaa', marginTop: 80 }}>
      Loading...
    </div>
  )

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 24px 80px', fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#aaa', marginRight: 12, padding: 0 }}>←</button>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>History</h1>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        {[
          { label: 'current streak', val: `${currentStreak}d` },
          { label: 'days on goal', val: daysHitGoal },
          { label: 'avg calories', val: avgCalories },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, background: '#f7f7f7', borderRadius: 12,
            padding: '14px 10px', textAlign: 'center'
          }}>
            <div style={{ fontSize: 22, fontWeight: 600 }}>{s.val}</div>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: '#aaa', letterSpacing: '0.05em', marginBottom: 12 }}>ACHIEVEMENTS</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ACHIEVEMENT_DEFS.map(a => {
            const earned = earnedKeys.has(a.key)
            return (
              <div key={a.key} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: 10,
                border: '1px solid #eee',
                background: earned ? '#f7f7f7' : 'none',
                opacity: earned ? 1 : 0.35,
                flex: '1 1 calc(50% - 4px)',
              }}>
                <span style={{ fontSize: 20 }}>{a.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: '#aaa' }}>{a.desc}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Day by Day */}
      <div style={{ fontSize: 11, color: '#aaa', letterSpacing: '0.05em', marginBottom: 12 }}>PAST 30 DAYS</div>
      {history.length === 0 ? (
        <p style={{ color: '#ccc', textAlign: 'center', marginTop: 40, fontSize: 14 }}>no history yet — start logging!</p>
      ) : (
        history.map(day => (
          <div key={day.date} style={{
            marginBottom: 16, padding: 16,
            background: '#f7f7f7', borderRadius: 12,
            borderLeft: hitGoal(day.calories) ? '3px solid #22c55e' : '3px solid transparent',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{formatDate(day.date)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {hitGoal(day.calories) && (
                  <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 500 }}>✓ goal hit</span>
                )}
                <span style={{ fontSize: 15, fontWeight: 600 }}>{Math.round(day.calories)} cal</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { label: 'protein', val: Math.round(day.protein), goal: proteinGoal },
                { label: 'carbs', val: Math.round(day.carbs), goal: carbsGoal },
                { label: 'fat', val: Math.round(day.fat), goal: fatGoal },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{m.val}g</div>
                  <div style={{ fontSize: 11, color: '#aaa' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}