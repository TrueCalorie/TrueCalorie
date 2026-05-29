import { useState, useEffect, useRef } from 'react'
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
import MealEditModal from './components/MealEditModal'
import LogFoodSheet from './components/LogFoodSheet'
import LoadingScreen from './components/LoadingScreen'
import TabBar from './components/TabBar'
import Purchases from './Purchases'
import { usePro } from './hooks/usePro'
import { useCountUp } from './hooks/useCountUp'

function App() {
  const [session, setSession]               = useState(null)
  const [loading, setLoading]               = useState(true)
  const [settings, setSettings]             = useState(null)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [meals, setMeals]                   = useState([])
  const [savedFoods, setSavedFoods]         = useState([])
  const [showSettings, setShowSettings]     = useState(false)
  const [showHistory, setShowHistory]       = useState(false)
  const [showFounders, setShowFounders]     = useState(false)
  const [showPrivacy, setShowPrivacy]       = useState(false)
  const [showTerms, setShowTerms]           = useState(false)
  const [showLogFood, setShowLogFood]       = useState(false)
  const [selectedItem, setSelectedItem]     = useState(null)
  const [selectedMealTime, setSelectedMealTime] = useState('Lunch')
  const [editingMeal, setEditingMeal]       = useState(null)
  const [toastQueue, setToastQueue]         = useState([])
  const [currentToast, setCurrentToast]     = useState(null)
  const [activeTab, setActiveTab]           = useState('today')
  const [ringFlash, setRingFlash]           = useState(false)
  const [logBtnPressed, setLogBtnPressed]   = useState(false)
  const ringFlashTimer                      = useRef(null)
  const { isPro, isTrialing, trialDaysLeft, source } = usePro()
  const isFounder = source === 'founder'

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
    if (session) { fetchSettings(); fetchMeals(); fetchSavedFoods() }
  }, [session])

  useEffect(() => {
    if (toastQueue.length > 0 && !currentToast) {
      setCurrentToast(toastQueue[0])
      setToastQueue(q => q.slice(1))
    }
  }, [toastQueue, currentToast])

  const fetchSettings = async () => {
    if (!session) return
    const { data } = await supabase.from('user_settings').select('*').eq('user_id', session.user.id).single()
    if (data) {
      setSettings(data)
      if (data.theme) document.documentElement.setAttribute('data-theme', data.theme)
    }
    setSettingsLoaded(true)
  }

  const fetchMeals = async () => {
    if (!session) return
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('meal_logs').select('*').eq('user_id', session.user.id)
      .gte('logged_at', `${today}T00:00:00`).lte('logged_at', `${today}T23:59:59`)
      .order('logged_at', { ascending: true })
    if (data) setMeals(data)
  }

  const fetchSavedFoods = async () => {
    if (!session) return
    const { data } = await supabase.from('saved_foods').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false })
    if (data) setSavedFoods(data)
  }

  const checkAndAwardAchievements = async () => {
    if (!session || !settings) return
    const { data: earnedRows } = await supabase.from('achievements').select('key').eq('user_id', session.user.id)
    const earned = (earnedRows || []).map(r => r.key)
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data: logs } = await supabase.from('meal_logs').select('logged_at, calories').eq('user_id', session.user.id).gte('logged_at', thirtyDaysAgo.toISOString())
    const grouped = {};
    (logs || []).forEach(m => {
      const date = m.logged_at.split('T')[0]
      if (!grouped[date]) grouped[date] = 0
      grouped[date] += Number(m.calories)
    })
    const history = Object.entries(grouped).map(([date, calories]) => ({ date, calories, logged: true }))
    const newKeys = checkAchievements(history, settings.calorie_goal || 2000, earned)
    if (newKeys.length > 0) {
      await supabase.from('achievements').insert(newKeys.map(key => ({ user_id: session.user.id, key })))
      setToastQueue(q => [...q, ...newKeys.map(key => ACHIEVEMENTS.find(a => a.key === key)).filter(Boolean)])
    }
  }

  const logItem = async (item, servings = 1, mealTime = selectedMealTime) => {
    await supabase.from('meal_logs').insert({
      user_id: session.user.id, name: item.food_name, restaurant: item.brand_name || null,
      calories: (item.nf_calories || 0) * servings, protein: (item.nf_protein || 0) * servings,
      carbs: (item.nf_total_carbohydrate || 0) * servings, fat: (item.nf_total_fat || 0) * servings,
      meal_time: mealTime,
    })
    setSelectedItem(null)
    await fetchMeals()
    checkAndAwardAchievements()
    clearTimeout(ringFlashTimer.current)
    setRingFlash(true)
    ringFlashTimer.current = setTimeout(() => setRingFlash(false), 900)
  }

  const deleteItem = async (id) => { await supabase.from('meal_logs').delete().eq('id', id); fetchMeals() }
  const updateMeal = async (id, fields) => { await supabase.from('meal_logs').update(fields).eq('id', id); fetchMeals() }

  const toggleSaveFood = async (item) => {
    const existing = savedFoods.find(f => f.food_name === item.food_name && f.brand_name === item.brand_name)
    if (existing) {
      await supabase.from('saved_foods').delete().eq('id', existing.id)
    } else {
      await supabase.from('saved_foods').insert({
        user_id: session.user.id, food_name: item.food_name, brand_name: item.brand_name || null,
        nf_calories: item.nf_calories || 0, nf_protein: item.nf_protein || 0,
        nf_total_carbohydrate: item.nf_total_carbohydrate || 0, nf_total_fat: item.nf_total_fat || 0,
      })
    }
    fetchSavedFoods()
  }

  const isFoodSaved = (item) => savedFoods.some(f => f.food_name === item.food_name && f.brand_name === item.brand_name)
  const handleFoodSelect = (item, mealTime) => { setSelectedMealTime(mealTime); setSelectedItem(item); setShowLogFood(false) }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'history') { setShowHistory(true); setShowSettings(false) }
    else if (tab === 'settings') { setShowSettings(true); setShowHistory(false) }
    else { setShowHistory(false); setShowSettings(false) }
  }

  const totalCalories = meals.reduce((s, m) => s + Number(m.calories), 0)
  const totalProtein  = meals.reduce((s, m) => s + Number(m.protein),  0)
  const totalCarbs    = meals.reduce((s, m) => s + Number(m.carbs),    0)
  const totalFat      = meals.reduce((s, m) => s + Number(m.fat),      0)

  const displayCalories = useCountUp(Math.round(totalCalories))
  const displayProtein  = useCountUp(Math.round(totalProtein))
  const displayCarbs    = useCountUp(Math.round(totalCarbs))
  const displayFat      = useCountUp(Math.round(totalFat))

  const calorieGoal   = settings?.calorie_goal || 2000
  const circumference = 2 * Math.PI * 62
  const ringPercent   = Math.min(totalCalories / calorieGoal, 1)
  const offset        = circumference * (1 - ringPercent)

  const groupedMeals = ['Breakfast', 'Lunch', 'Snack', 'Dinner'].reduce((acc, time) => {
    const group = meals.filter(m => m.meal_time === time)
    if (group.length > 0) acc[time] = group
    return acc
  }, {})
  const hasMeals = Object.keys(groupedMeals).length > 0

  const goHome = () => { setShowFounders(false); setShowPrivacy(false); setShowTerms(false); window.history.pushState({}, '', '/') }

  if (showPrivacy)  return <Privacy  onBack={goHome} />
  if (showTerms)    return <Terms    onBack={goHome} />
  if (showFounders) return <Founders onBack={goHome} />
  if (loading || (session && !settingsLoaded)) return <LoadingScreen />
  if (!session) return <Auth />
  if (!settings || !settings.onboarding_complete) return <Onboarding session={session} onComplete={fetchSettings} />

  return (
    <div style={{ position: 'relative', fontFamily: 'sans-serif', background: 'var(--bg)', minHeight: '100vh' }}>

      {currentToast && <AchievementToast achievement={currentToast} onDone={() => setCurrentToast(null)} />}

      {/* Sticky header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 10px' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
              Hey, {settings.display_name}
            </div>
            <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
              {isFounder && (
                <div style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 4, background: '#0a0a0a', border: '1px solid #1D9E75', color: '#1D9E75', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', animation: 'badgePop 0.4s ease both' }}>FOUNDER</div>
              )}
              {(isFounder || (isPro && !isTrialing)) && (
                <div style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 4, background: '#1D9E75', color: '#fff', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', animation: 'badgePop 0.4s ease 0.05s both' }}>PRO</div>
              )}
              {isTrialing && (
                <div style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 4, background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.5)', color: '#f5a623', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', animation: 'badgePop 0.4s ease both' }}>TRIAL · {trialDaysLeft}d left</div>
              )}
            </div>
          </div>
          <img src="/logo.png" style={{ height: 28, filter: 'var(--logo-filter)', opacity: 0.7 }} alt="TrueCalorie" />
        </div>
        <TabBar activeTab={activeTab} onChange={handleTabChange} />
      </div>

      {/* Main content — key triggers fadeIn on tab switch */}
      <div key={activeTab} style={{ padding: '20px 16px 80px', animation: 'fadeIn 0.2s ease both' }}>

        {activeTab === 'pro' && <Purchases session={session} />}

        {activeTab !== 'pro' && (
          <>
            {/* Calorie Ring */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40 }}>
              <div style={{ position: 'relative', width: 160, height: 160 }}>
                <svg width="160" height="160" viewBox="0 0 160 160"
                  style={{ transform: 'rotate(-90deg)', animation: ringFlash ? 'ringFlash 0.9s ease forwards' : 'none' }}>
                  <circle cx="80" cy="80" r="62" fill="none" stroke="var(--border)" strokeWidth="11" />
                  <circle cx="80" cy="80" r="62" fill="none" stroke="var(--text)" strokeWidth="11"
                    strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', lineHeight: 1, animation: ringFlash ? 'numberAccent 0.7s ease forwards' : 'none' }}>
                    {displayCalories}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>of {calorieGoal} cal</span>
                </div>
              </div>

              {/* Macro pills */}
              <div style={{ display: 'flex', gap: 0, marginTop: 24, background: 'var(--surface)', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
                {[
                  { label: 'protein', val: displayProtein },
                  { label: 'carbs',   val: displayCarbs   },
                  { label: 'fat',     val: displayFat     },
                ].map((m, i) => (
                  <div key={m.label} style={{ textAlign: 'center', padding: '12px 28px', borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', animation: ringFlash ? `numberAccent 0.7s ease ${i * 0.06}s forwards` : 'none' }}>
                      {m.val}g
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Log Food button */}
            <button
              onClick={() => setShowLogFood(true)}
              onMouseDown={() => setLogBtnPressed(true)}
              onMouseUp={() => setLogBtnPressed(false)}
              onMouseLeave={() => setLogBtnPressed(false)}
              onTouchStart={() => setLogBtnPressed(true)}
              onTouchEnd={() => setLogBtnPressed(false)}
              style={{
                width: '100%', padding: '15px 0', borderRadius: 14, border: 'none',
                background: 'var(--text)', color: 'var(--bg)',
                fontSize: 15, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.01em', marginBottom: 36,
                animation: !hasMeals ? 'logBtnPulse 2.5s ease-in-out infinite' : 'none',
                transform: logBtnPressed ? 'scale(0.97)' : 'scale(1)',
                transition: 'transform 0.1s ease',
              }}
            >
              + Log Food
            </button>

            {/* Meal log — key={meals.length} re-mounts list only when count changes */}
            <div key={meals.length}>
              {!hasMeals ? (
                <p style={{ color: 'var(--muted)', textAlign: 'center', marginTop: 48, fontSize: 14 }}>no meals logged today</p>
              ) : (
                (() => {
                  let itemIndex = 0
                  return Object.entries(groupedMeals).map(([time, items]) => (
                    <div key={time} style={{ marginBottom: 28 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 4, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
                        {time.toUpperCase()}
                      </div>
                      {items.map(meal => {
                        const delay = (itemIndex++) * 0.045
                        return (
                          <div
                            key={meal.id}
                            onClick={() => setEditingMeal(meal)}
                            style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '12px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                              borderRadius: 6,
                              animation: `slideInUp 0.35s ease both`,
                              animationDelay: `${delay}s`,
                              transition: 'background 0.15s, padding-left 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.paddingLeft = '8px' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.paddingLeft = '0px' }}
                          >
                            <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                              <div style={{ fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meal.name}</div>
                              {meal.restaurant && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{meal.restaurant}</div>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{Math.round(meal.calories)} cal</span>
                              <span style={{ fontSize: 12, color: 'var(--muted)' }}>›</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))
                })()
              )}
            </div>
          </>
        )}
      </div>

      {/* Settings overlay */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 10, overflowY: 'auto', animation: 'fadeIn 0.2s ease both' }}>
          <Settings session={session} settings={settings} onUpdate={fetchSettings} onClose={() => { setShowSettings(false); setActiveTab('today') }} />
        </div>
      )}

      {/* History overlay */}
      {showHistory && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 10, overflowY: 'auto', animation: 'fadeIn 0.2s ease both' }}>
          <History session={session} settings={settings} onClose={() => { setShowHistory(false); setActiveTab('today') }} />
        </div>
      )}

      <LogFoodSheet open={showLogFood} onClose={() => setShowLogFood(false)} onSelect={handleFoodSelect} savedFoods={savedFoods} />

      {selectedItem && (
        <FoodDetailModal item={selectedItem} mealTime={selectedMealTime} onClose={() => setSelectedItem(null)}
          onLog={logItem} userId={session.user.id} isSaved={isFoodSaved(selectedItem)} onToggleSave={toggleSaveFood} />
      )}

      {editingMeal && (
        <MealEditModal
          meal={editingMeal}
          onClose={() => setEditingMeal(null)}
          onUpdate={updateMeal}
          onDelete={deleteItem}
          isSaved={isFoodSaved({
            food_name:  editingMeal.name,
            brand_name: editingMeal.restaurant,
          })}
          onToggleSave={() => toggleSaveFood({
            food_name:             editingMeal.name,
            brand_name:            editingMeal.restaurant,
            nf_calories:           editingMeal.calories,
            nf_protein:            editingMeal.protein,
            nf_total_carbohydrate: editingMeal.carbs,
            nf_total_fat:          editingMeal.fat,
          })}
    />
  )}
    </div>
  )
}

export default App
