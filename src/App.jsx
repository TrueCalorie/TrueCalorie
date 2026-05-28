import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Auth from './Auth'
import Onboarding from './Onboarding'
import Settings from './Settings'
import History from './History'
import Founders from './Founders'
import Privacy from './Privacy'
import Terms from './Terms'
import AchievementToast from './AchievementToast'
import { ACHIEVEMENTS, checkAchievements } from './achievements'
import FoodDetailModal from './components/FoodDetailModal'
import LogFoodSheet from './components/LogFoodSheet'
import LoadingScreen from './components/LoadingScreen'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [meals, setMeals] = useState([])
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showFounders, setShowFounders] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [showLogFood, setShowLogFood] = useState(false)
  const [toastQueue, setToastQueue] = useState([])
  const [currentToast, setCurrentToast] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [selectedMealTime, setSelectedMealTime] = useState('Lunch')

  // Handle URL-based routing for public pages
  useEffect(() => {
    const setRouteFromPath = () => {
      const path = window.location.pathname
      setShowFounders(path === '/founders')
      setShowPrivacy(path === '/privacy')
      setShowTerms(path === '/terms')
    }
    setRouteFromPath()
    window.addEventListener('popstate', setRouteFromPath)
    return () => window.removeEventListener('popstate', setRouteFromPath)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      fetchSettings()
      fetchMeals()
    }
  }, [session])

  useEffect(() => {
    if (!currentToast && toastQueue.length > 0) {
      setCurrentToast(toastQueue[0])
      setToastQueue(q => q.slice(1))
    }
  }, [toastQueue, currentToast])

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', session.user.id)
      .single()
    if (data) setSettings(data)
    setSettingsLoaded(true)
  }

  const fetchMeals = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('meal_logs')
      .select('*')
      .gte('logged_at', today)
      .order('logged_at', { ascending: false })
    if (data) setMeals(data)
  }

  const checkAndAwardAchievements = async () => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data: logs } = await supabase
      .from('meal_logs')
      .select('logged_at, calories')
      .eq('user_id', session.user.id)
      .gte('logged_at', thirtyDaysAgo.toISOString())
    const { data: earned } = await supabase
      .from('achievements')
      .select('key')
      .eq('user_id', session.user.id)
    if (!logs || !earned) return
    const grouped = {}
    logs.forEach(m => {
      const date = m.logged_at.split('T')[0]
      if (!grouped[date]) grouped[date] = 0
      grouped[date] += Number(m.calories)
    })
    const history = Object.entries(grouped).map(([date, calories]) => ({
      date, calories, logged: true
    }))
    const newKeys = checkAchievements(history, settings?.calorie_goal || 2000, earned)
    if (newKeys.length > 0) {
      await supabase.from('achievements').insert(
        newKeys.map(key => ({ user_id: session.user.id, key }))
      )
      const newToasts = newKeys.map(key => ACHIEVEMENTS.find(a => a.key === key)).filter(Boolean)
      setToastQueue(q => [...q, ...newToasts])
    }
  }

  const logItem = async (item, servings = 1, mealTime = selectedMealTime) => {
    const entry = {
      user_id: session.user.id,
      name: item.food_name,
      restaurant: item.brand_name || null,
      calories: (item.nf_calories || 0) * servings,
      protein:  (item.nf_protein || 0) * servings,
      carbs:    (item.nf_total_carbohydrate || 0) * servings,
      fat:      (item.nf_total_fat || 0) * servings,
      meal_time: mealTime,
    }
    await supabase.from('meal_logs').insert(entry)
    setSelectedItem(null)
    await fetchMeals()
    checkAndAwardAchievements()
  }

  const deleteItem = async (id) => {
    await supabase.from('meal_logs').delete().eq('id', id)
    fetchMeals()
  }

  // Called from LogFoodSheet when user taps a result — opens FoodDetailModal
  const handleFoodSelect = (item, mealTime) => {
    setSelectedMealTime(mealTime)
    setSelectedItem(item)
    setShowLogFood(false)
  }

  const totalCalories = meals.reduce((sum, m) => sum + Number(m.calories), 0)
  const totalProtein  = meals.reduce((sum, m) => sum + Number(m.protein), 0)
  const totalCarbs    = meals.reduce((sum, m) => sum + Number(m.carbs), 0)
  const totalFat      = meals.reduce((sum, m) => sum + Number(m.fat), 0)

  const calorieGoal  = settings?.calorie_goal || 2000
  const circumference = 2 * Math.PI * 54
  const ringPercent   = Math.min(totalCalories / calorieGoal, 1)
  const offset        = circumference * (1 - ringPercent)

  const groupedMeals = ['Breakfast', 'Lunch', 'Snack', 'Dinner'].reduce((acc, time) => {
    const group = meals.filter(m => m.meal_time === time)
    if (group.length > 0) acc[time] = group
    return acc
  }, {})

  // ─────────────────────────────────────────────────────
  // Public routes (no auth required)
  // ─────────────────────────────────────────────────────
  const goHome = () => {
    setShowFounders(false)
    setShowPrivacy(false)
    setShowTerms(false)
    window.history.pushState({}, '', '/')
  }

  if (showPrivacy)  return <Privacy onBack={goHome} />
  if (showTerms)    return <Terms onBack={goHome} />
  if (showFounders) return <Founders onBack={goHome} />

  if (loading || (session && !settingsLoaded)) return <LoadingScreen />
  if (!session) return <Auth />
  if (!settings || !settings.onboarding_complete) return (
    <Onboarding session={session} onComplete={fetchSettings} />
  )

  const isFounder = settings.pro_source === 'founder'

  return (
    <div style={{ position: 'relative', maxWidth: 480, margin: '0 auto', padding: 24, fontFamily: 'sans-serif', background: 'var(--bg)', minHeight: '100vh' }}>

      {currentToast && (
        <AchievementToast achievement={currentToast} onDone={() => setCurrentToast(null)} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>
            Hey, {settings.display_name}
          </h1>
          {isFounder && (
            <div style={{
              display: 'inline-block',
              marginTop: 6,
              padding: '2px 8px',
              borderRadius: 4,
              background: '#0a0a0a',
              border: '1px solid #1D9E75',
              color: '#1D9E75',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.12em',
            }}>
              FOUNDER
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <button onClick={() => setShowHistory(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13 }}>
            history
          </button>
          <button onClick={() => setShowSettings(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13 }}>
            settings
          </button>
        </div>
      </div>

      {/* Calorie Ring */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
        <div style={{ position: 'relative', width: 140, height: 140 }}>
          <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="70" cy="70" r="54" fill="none" stroke="var(--border)" strokeWidth="10" />
            <circle cx="70" cy="70" r="54" fill="none" stroke="var(--text)" strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)' }}>{Math.round(totalCalories)}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>of {calorieGoal} cal</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
          {[
            { label: 'protein', val: Math.round(totalProtein) },
            { label: 'carbs',   val: Math.round(totalCarbs) },
            { label: 'fat',     val: Math.round(totalFat) },
          ].map(m => (
            <div key={m.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{m.val}g</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Log Food Button */}
      <button
        onClick={() => setShowLogFood(true)}
        style={{
          width: '100%',
          padding: '14px 0',
          borderRadius: 14,
          border: 'none',
          background: 'var(--text)',
          color: 'var(--bg)',
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 28,
          letterSpacing: '0.01em',
        }}
      >
        + Log Food
      </button>

      {/* Meal Log */}
      {Object.keys(groupedMeals).length === 0 ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', marginTop: 40, fontSize: 14 }}>no meals logged today</p>
      ) : (
        Object.entries(groupedMeals).map(([time, items]) => (
          <div key={time} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.05em', marginBottom: 8 }}>
              {time.toUpperCase()}
            </div>
            {items.map(meal => (
              <div key={meal.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid var(--border)'
              }}>
                <div>
                  <div style={{ fontSize: 14, color: 'var(--text)' }}>{meal.name}</div>
                  {meal.restaurant && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{meal.restaurant}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{Math.round(meal.calories)} cal</span>
                  <button onClick={() => deleteItem(meal.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 18, lineHeight: 1 }}>×</button>
                </div>
              </div>
            ))}
          </div>
        ))
      )}

      {/* Settings Overlay */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 10, overflowY: 'auto' }}>
          <Settings session={session} settings={settings} onUpdate={fetchSettings} onClose={() => setShowSettings(false)} />
        </div>
      )}

      {/* History Overlay */}
      {showHistory && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 10, overflowY: 'auto' }}>
          <History session={session} settings={settings} onClose={() => setShowHistory(false)} />
        </div>
      )}

      {/* Log Food Sheet */}
      <LogFoodSheet
        open={showLogFood}
        onClose={() => setShowLogFood(false)}
        onSelect={handleFoodSelect}
      />

      {/* Food Detail Modal — opened after selecting from LogFoodSheet */}
      {selectedItem && (
        <FoodDetailModal
          item={selectedItem}
          mealTime={selectedMealTime}
          onClose={() => setSelectedItem(null)}
          onLog={logItem}
        />
      )}
    </div>
  )
}

export default App
