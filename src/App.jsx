import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { Capacitor } from '@capacitor/core'
import { capture, identify, reset } from './analytics'
import Auth from './Auth'
import Onboarding from './Onboarding'
import Settings from './Settings'
import Stats from './Stats'
import Trends from './components/Trends'
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
import { apiFetch } from './lib/apiFetch'
import { useCountUp } from './hooks/useCountUp'
import { calculateGoalsPro, computeMacros } from './macros'
import WeightCard from './components/WeightCard'
import WaterCard from './components/WaterCard'
import StravaCard from './components/StravaCard'
import BodyFitnessPage from './components/BodyFitnessPage'

function toLocalDateStr(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function computeTrailingBurn(byDate) {
  let sum = 0
  for (let i = 1; i <= 3; i++) {
    const d = new Date(); d.setDate(d.getDate() - i)
    sum += byDate?.[toLocalDateStr(d)]?.calories || 0
  }
  return Math.round(sum / 3)
}

function App() {
  const [session, setSession]               = useState(null)
  const [loading, setLoading]               = useState(true)
  const [settings, setSettings]             = useState(null)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [meals, setMeals]                   = useState([])
  const [savedFoods, setSavedFoods]         = useState([])
  const [recipes, setRecipes]               = useState([])
  const [pageHistory, setPageHistory]       = useState([])
  const [showFounders, setShowFounders]     = useState(false)
  const [showPrivacy, setShowPrivacy]       = useState(false)
  const [showTerms, setShowTerms]           = useState(false)
  const [passwordResetMode, setPasswordResetMode] = useState(false)
  const [showLogFood, setShowLogFood]       = useState(false)
  const [selectedItem, setSelectedItem]     = useState(null)
  const [selectedMealTime, setSelectedMealTime] = useState('Lunch')
  const [editingMeal, setEditingMeal]       = useState(null)
  const [stravaCalsBurned, setStravaCalsBurned] = useState(0)
  const [stravaRefreshKey, setStravaRefreshKey] = useState(0)
  const [trailingBurn, setTrailingBurn]         = useState(0)
  const [stravaTrainingConnected, setStravaTrainingConnected] = useState(false)
  const lastStravaFetchRef = useRef(0)
  const [toastQueue, setToastQueue]         = useState([])
  const [currentToast, setCurrentToast]     = useState(null)
  const [ringFlash, setRingFlash]           = useState(false)
  const [logBtnPressed, setLogBtnPressed]   = useState(false)
  const [selectedMethod, setSelectedMethod] = useState('search')
  const ringFlashTimer                      = useRef(null)
  const appOpenedRef                        = useRef(false)

  const { isPro, isTrialing, trialDaysLeft, source, refresh: refreshPro } = usePro()
  const isFounder = source === 'founder'
  const refreshProRef = useRef(refreshPro)
  refreshProRef.current = refreshPro

  // Register push SW early so it can receive pushes even before Settings opens
  useEffect(() => {
    if (window.Capacitor) return
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw-push.js').catch(() => {})
    }
  }, [])

  // ── Page navigation ────────────────────────────────────────────────────────
  const navigateTo   = (page) => setPageHistory(h => [...h, page])
  const navigateBack = ()     => setPageHistory(h => h.slice(0, -1))
  const currentPage  = pageHistory[pageHistory.length - 1] || null

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [currentPage, showPrivacy, showTerms, showFounders, session?.user?.id])

  // ── Session ────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    }).catch(() => { setLoading(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordResetMode(true)
        setSession(session)
      } else {
        setSession(session)
        if (event !== 'INITIAL_SESSION') {
          setPasswordResetMode(false)
        }
      }
      if (event === 'SIGNED_IN' && session?.user) {
        identify(session.user.id, { email: session.user.email })
      }
      if (event === 'SIGNED_OUT') {
        reset()
        setPageHistory([])
        setShowFounders(false)
        setShowPrivacy(false)
        setShowTerms(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!window.Capacitor?.isNativePlatform?.()) return
    let handle
    const setup = async () => {
      const { App: CapApp } = await import('@capacitor/app')
      handle = await CapApp.addListener('appUrlOpen', async ({ url }) => {
        const hash = url.includes('#') ? url.split('#')[1] : ''
        const hp = new URLSearchParams(hash)
        const access_token = hp.get('access_token')
        const refresh_token = hp.get('refresh_token')
        let code = null
        try { code = new URL(url).searchParams.get('code') } catch {}

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token })
          if (error) return
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) return
        } else {
          return
        }
        const { data } = await supabase.auth.getSession()
        if (data?.session) setSession(data.session)
      })
    }
    setup()
    return () => { handle?.remove() }
  }, [])

  // ── Native: refresh Pro on foreground ──────────────────────────────────────
  // A user who completes Stripe payment in the in-app browser sheet and taps
  // Done re-activates the app. Re-check Pro status so it reflects immediately.
  useEffect(() => {
    if (!window.Capacitor?.isNativePlatform?.()) return
    let handle
    const setup = async () => {
      const { App: CapApp } = await import('@capacitor/app')
      handle = await CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) refreshProRef.current?.()
      })
    }
    setup()
    return () => { handle?.remove() }
  }, [])

  // ── Routing ────────────────────────────────────────────────────────────────
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
    const params = new URLSearchParams(window.location.search)
    if (params.get('strava')) {
      setPageHistory(['settings'])
    }
  }, [])

  // ── Fetch on session ───────────────────────────────────────────────────────
  useEffect(() => {
    if (session && !appOpenedRef.current) {
      appOpenedRef.current = true
      capture('app_opened')
    }
  }, [session])

  useEffect(() => {
    if (session) { fetchSettings(); fetchMeals(); fetchSavedFoods(); fetchRecipes() }
  }, [session])

  useEffect(() => {
    if (session) fetchStravaToday()
  }, [session])

  useEffect(() => {
    if (session) fetchStravaTrailing()
  }, [session])

  // Refetch Strava on app focus / visibility restore, throttled to 60 s
  useEffect(() => {
    if (!session) return
    const THROTTLE_MS = 60_000
    const tryRefresh = () => {
      if (Date.now() - lastStravaFetchRef.current < THROTTLE_MS) return
      // Both fetch fns are stable for a given session (only use session.user.id)
      fetchStravaToday()
      fetchStravaTrailing()
      setStravaRefreshKey(k => k + 1)
    }
    const onVisibility = () => { if (document.visibilityState === 'visible') tryRefresh() }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', tryRefresh)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', tryRefresh)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  // ── Toast queue ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (toastQueue.length > 0 && !currentToast) {
      setCurrentToast(toastQueue[0])
      setToastQueue(q => q.slice(1))
    }
  }, [toastQueue, currentToast])

  // ── Pro green accents ──────────────────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement
    if (isPro || isFounder) {
      root.style.setProperty('--pro-ring-track', 'rgba(29, 158, 117, 0.18)')
      root.style.setProperty('--pro-border',     'rgba(29, 158, 117, 0.22)')
      root.style.setProperty('--pro-btn-shadow', '0 0 0 1px rgba(29,158,117,0.2), 0 4px 18px rgba(29,158,117,0.1)')
    } else {
      root.style.removeProperty('--pro-ring-track')
      root.style.removeProperty('--pro-border')
      root.style.removeProperty('--pro-btn-shadow')
    }
  }, [isPro, isFounder])

  // ── Data fetchers ──────────────────────────────────────────────────────────
  const fetchSettings = async () => {
    if (!session) return
    try {
      const { data } = await supabase
        .from('user_settings').select('*').eq('user_id', session.user.id).single()
      if (data) {
        setSettings(data)
        if (data.theme) document.documentElement.setAttribute('data-theme', data.theme)
      }
    } catch {}
    setSettingsLoaded(true)
  }

  const fetchMeals = async () => {
    if (!session) return
    try {
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

      const { data } = await supabase
        .from('meal_logs').select('*').eq('user_id', session.user.id)
        .gte('logged_at', startOfDay.toISOString())
        .lte('logged_at', endOfDay.toISOString())
        .order('logged_at', { ascending: true })

      if (data) setMeals(data)
    } catch {}
  }

  const fetchSavedFoods = async () => {
    if (!session) return
    try {
      const { data } = await supabase
        .from('saved_foods').select('*').eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      if (data) setSavedFoods(data)
    } catch {}
  }

  const fetchRecipes = async () => {
    if (!session) return
    try {
      const { data: recipeRows } = await supabase
        .from('recipes')
        .select('*, recipe_ingredients(*)')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false })
      if (recipeRows) setRecipes(recipeRows)
    } catch {}
  }

  const fetchStravaToday = async () => {
    lastStravaFetchRef.current = Date.now()
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const res = await apiFetch('/api/strava-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession?.access_token}` },
        cache: 'no-store',
        body: JSON.stringify({ date: toLocalDateStr(new Date()) }),
      })
      const data = await res.json()
      if (data.connected) {
        setStravaCalsBurned(data.totalCalories || 0)
      }
    } catch {
      // Strava not connected or fetch failed — silent, non-blocking
    }
  }

  const fetchStravaTrailing = async () => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const res = await apiFetch('/api/strava-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession?.access_token}` },
        cache: 'no-store',
        body: JSON.stringify({ days: 7 }),
      })
      const data = await res.json()
      if (data.connected && data.byDate) {
        setStravaTrainingConnected(true)
        setTrailingBurn(computeTrailingBurn(data.byDate))
      } else {
        setStravaTrainingConnected(false)
      }
    } catch {
      setStravaTrainingConnected(false)
    }
  }

  const handleStravaSync = () => {
    fetchStravaToday()
    fetchStravaTrailing()
    setStravaRefreshKey(k => k + 1)
  }

  const checkAndAwardAchievements = async () => {
    if (!session || !settings) return
    const { data: earnedRows } = await supabase
      .from('achievements').select('key').eq('user_id', session.user.id)
    const earned = (earnedRows || []).map(r => r.key)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data: logs } = await supabase
      .from('meal_logs').select('logged_at, calories').eq('user_id', session.user.id)
      .gte('logged_at', thirtyDaysAgo.toISOString())
    const grouped = {}
    ;(logs || []).forEach(m => {
      const d = new Date(m.logged_at)
      const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      if (!grouped[date]) grouped[date] = 0
      grouped[date] += Number(m.calories)
    })
    const history = Object.entries(grouped).map(([date, calories]) => ({ date, calories, logged: true }))
    const newKeys = checkAchievements(history, settings.calorie_goal || 2000, earned)
    if (newKeys.length > 0) {
      await supabase.from('achievements').insert(
        newKeys.map(key => ({ user_id: session.user.id, key }))
      )
      setToastQueue(q => [
        ...q,
        ...newKeys.map(key => ACHIEVEMENTS.find(a => a.key === key)).filter(Boolean),
      ])
    }
  }

  // ── Meal actions ───────────────────────────────────────────────────────────
  const logItem = async (item, servings = 1, mealTime = selectedMealTime) => {
    await supabase.from('meal_logs').insert({
      user_id:  session.user.id,
      name:     item.food_name,
      restaurant: item.brand_name || null,
      calories: (item.nf_calories            || 0) * servings,
      protein:  (item.nf_protein             || 0) * servings,
      carbs:    (item.nf_total_carbohydrate  || 0) * servings,
      fat:      (item.nf_total_fat           || 0) * servings,
      meal_time: mealTime,
    })
    capture('meal_logged', { method: selectedMethod })
    setSelectedItem(null)
    await fetchMeals()
    checkAndAwardAchievements()
    clearTimeout(ringFlashTimer.current)
    setRingFlash(true)
    ringFlashTimer.current = setTimeout(() => setRingFlash(false), 900)
  }

  const handleBatchLog = async (items, method = 'search') => {
    for (const item of items) {
      await supabase.from('meal_logs').insert({
        user_id:    session.user.id,
        name:       item.food_name,
        restaurant: item.brand_name || null,
        calories:   item.nf_calories             || 0,
        protein:    item.nf_protein              || 0,
        carbs:      item.nf_total_carbohydrate   || 0,
        fat:        item.nf_total_fat            || 0,
        meal_time:  item.meal_time,
      })
      capture('meal_logged', { method })
    }
    await fetchMeals()
    checkAndAwardAchievements()
    clearTimeout(ringFlashTimer.current)
    setRingFlash(true)
    ringFlashTimer.current = setTimeout(() => setRingFlash(false), 900)
  }

  const deleteItem = async (id) => {
    await supabase.from('meal_logs').delete().eq('id', id)
    fetchMeals()
  }

  const updateMeal = async (id, fields) => {
    await supabase.from('meal_logs').update(fields).eq('id', id)
    fetchMeals()
  }

  const moveMealTime = async (id, newMealTime) => {
    await supabase
      .from('meal_logs')
      .update({ meal_time: newMealTime })
      .eq('id', id)
      .eq('user_id', session.user.id)
    fetchMeals()
  }

  const combineMeals = async (anchorId, selectedIds, name, totals, mealTime) => {
    // 1. Delete all component meals (anchor + selected)
    const allIds = [anchorId, ...selectedIds]
    await supabase
      .from('meal_logs')
      .delete()
      .in('id', allIds)
      .eq('user_id', session.user.id)

    // 2. Insert the single combined entry
    await supabase.from('meal_logs').insert({
      user_id:   session.user.id,
      name:      name,
      restaurant: null,
      calories:  totals.calories,
      protein:   totals.protein,
      carbs:     totals.carbs,
      fat:       totals.fat,
      meal_time: mealTime,
    })

    fetchMeals()
  }

  // ── Saved foods ────────────────────────────────────────────────────────────
  const toggleSaveFood = async (item) => {
    const existing = savedFoods.find(
      f => f.food_name === item.food_name && f.brand_name === item.brand_name
    )
    if (existing) {
      await supabase.from('saved_foods').delete().eq('id', existing.id)
    } else {
      await supabase.from('saved_foods').insert({
        user_id:              session.user.id,
        food_name:            item.food_name,
        brand_name:           item.brand_name || null,
        nf_calories:          item.nf_calories           || 0,
        nf_protein:           item.nf_protein            || 0,
        nf_total_carbohydrate: item.nf_total_carbohydrate || 0,
        nf_total_fat:         item.nf_total_fat          || 0,
      })
    }
    fetchSavedFoods()
  }

  const isFoodSaved = (item) =>
    savedFoods.some(f => f.food_name === item.food_name && f.brand_name === item.brand_name)

  // ── Recipes ────────────────────────────────────────────────────────────────
  const saveRecipe = async ({ id, name, servings, ingredients }) => {
    if (id) {
      await supabase.from('recipes').update({ name, servings, updated_at: new Date().toISOString() }).eq('id', id)
      await supabase.from('recipe_ingredients').delete().eq('recipe_id', id)
      if (ingredients.length > 0) {
        await supabase.from('recipe_ingredients').insert(
          ingredients.map((ing, i) => ({ recipe_id: id, ...ing, sort_order: i }))
        )
      }
    } else {
      const { data: newRecipe } = await supabase
        .from('recipes')
        .insert({ user_id: session.user.id, name, servings })
        .select()
        .maybeSingle()
      if (newRecipe && ingredients.length > 0) {
        await supabase.from('recipe_ingredients').insert(
          ingredients.map((ing, i) => ({ recipe_id: newRecipe.id, ...ing, sort_order: i }))
        )
      }
    }
    fetchRecipes()
  }

  const deleteRecipe = async (id) => {
    await supabase.from('recipes').delete().eq('id', id)
    fetchRecipes()
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleFoodSelect = (item, mealTime, method = 'search') => {
    setSelectedMealTime(mealTime)
    setSelectedItem(item)
    setSelectedMethod(method)
    setShowLogFood(false)
  }

  const handleTabChange = (tab) => {
    if (tab === 'history')       navigateTo('stats')
    else if (tab === 'settings') navigateTo('settings')
    else if (tab === 'trends')   navigateTo('trends')
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const totalCalories = meals.reduce((s, m) => s + Number(m.calories), 0)
  const totalProtein  = meals.reduce((s, m) => s + Number(m.protein),  0)
  const totalCarbs    = meals.reduce((s, m) => s + Number(m.carbs),    0)
  const totalFat      = meals.reduce((s, m) => s + Number(m.fat),      0)

  const displayCalories = useCountUp(Math.round(totalCalories))
  const displayProtein  = useCountUp(Math.round(totalProtein))
  const displayCarbs    = useCountUp(Math.round(totalCarbs))
  const displayFat      = useCountUp(Math.round(totalFat))
  const calorieGoal = settings?.calorie_goal || 2000

  // Adaptive mode: Pro/Founder + sport set + mode = 'adaptive'
  const isAthletic = (isPro || isFounder) && !!settings?.sport
  const isAdaptive = isAthletic && settings?.calorie_mode === 'adaptive'

  // Decompose stored settings into rest-day baseline + training estimate
  let restDayBaseline, estimatedDailyTraining, proteinPerKg, fatPct
  if (isAdaptive && settings.weight_kg && settings.age && settings.sex && settings.height_cm) {
    try {
      const pr = calculateGoalsPro({
        age:                 settings.age,
        sex:                 settings.sex,
        height_cm:           settings.height_cm,
        weight_kg:           settings.weight_kg,
        activity_level:      settings.activity_level,
        goal:                settings.goal,
        sport:               settings.sport,
        weekly_mileage:      settings.weekly_mileage      || 0,
        training_hours_week: settings.training_hours_week || 0,
      })
      restDayBaseline       = pr.restDayBaseline
      estimatedDailyTraining = pr.estimatedDailyTraining
      proteinPerKg          = pr.proteinPerKg
      fatPct                = pr.fatPct
    } catch { /* fall through to fixed */ }
  }
  const adaptiveReady = isAdaptive && restDayBaseline !== undefined

  const effectiveCalorieGoal = adaptiveReady
    ? (stravaTrainingConnected
        ? restDayBaseline + trailingBurn
        : restDayBaseline + estimatedDailyTraining)
    : calorieGoal

  const adaptiveMacros = adaptiveReady
    ? computeMacros(effectiveCalorieGoal, settings.weight_kg, proteinPerKg, fatPct)
    : null
  const proteinGoal = adaptiveMacros?.protein ?? (settings?.protein_goal || 150)
  const carbsGoal   = adaptiveMacros?.carbs   ?? (settings?.carbs_goal   || 250)
  const fatGoal     = adaptiveMacros?.fat      ?? (settings?.fat_goal     || 65)
  const circumference = 2 * Math.PI * 62
  const ringPercent   = Math.min(totalCalories / effectiveCalorieGoal, 1)
  const offset        = circumference * (1 - ringPercent)

  const groupedMeals = ['Breakfast', 'Lunch', 'Snack', 'Dinner'].reduce((acc, time) => {
    const group = meals.filter(m => m.meal_time === time)
    if (group.length > 0) acc[time] = group
    return acc
  }, {})
  const hasMeals = Object.keys(groupedMeals).length > 0

  const goHome = () => {
    setShowFounders(false)
    setShowPrivacy(false)
    setShowTerms(false)
    window.history.pushState({}, '', '/')
  }

  // ── Early returns ──────────────────────────────────────────────────────────
  if (showPrivacy)  return <Privacy  onBack={goHome} />
  if (showTerms)    return <Terms    onBack={goHome} />
  if (showFounders) return <Founders onBack={goHome} />
  if (loading || (session && !settingsLoaded)) return <LoadingScreen />
  if (passwordResetMode) return <Auth resetMode={true} />
  if (!session) return <Auth />
  if (!settings || !settings.onboarding_complete) return <Onboarding session={session} onComplete={fetchSettings} />

  // ── Page routing ───────────────────────────────────────────────────────────
  const renderPage = () => {
    switch (currentPage) {
      case 'settings':
        return <Settings session={session} settings={settings} onUpdate={fetchSettings} onClose={navigateBack} onNavigate={navigateTo} />
      case 'stats':
        return <Stats session={session} settings={settings} onClose={navigateBack} />
      case 'trends':
        return <Trends session={session} settings={settings} isPro={isPro} onUpgrade={() => navigateTo('subscription')} onClose={navigateBack} />
      case 'body-fitness':
        return <BodyFitnessPage session={session} settings={settings} onUpdate={fetchSettings} onClose={navigateBack} isPro={isPro} isTrialing={isTrialing} />
      case 'subscription':
        return <Purchases session={session} onClose={navigateBack} />
      default:
        return null
    }
  }

  if (currentPage) {
    return (
      <div style={{ fontFamily: 'sans-serif', background: 'var(--bg)', minHeight: '100vh' }}>
        {currentToast && (
          <AchievementToast achievement={currentToast} onDone={() => setCurrentToast(null)} />
        )}
        {renderPage()}
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', fontFamily: 'sans-serif', background: 'var(--bg)', minHeight: '100vh' }}>

      {currentToast && (
        <AchievementToast achievement={currentToast} onDone={() => setCurrentToast(null)} />
      )}

      {/* ── Sticky header ── */}
      <div style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--pro-border, var(--border))',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 'calc(14px + env(safe-area-inset-top))', paddingRight: 16, paddingBottom: 10, paddingLeft: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
              Hey, {settings.display_name}
            </div>
            <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
              {isFounder && (
                <div style={{
                  display: 'inline-block', padding: '2px 7px', borderRadius: 4,
                  background: '#0a0a0a', border: '1px solid #1D9E75', color: '#1D9E75',
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
                  animation: 'badgePop 0.4s ease both',
                }}>FOUNDER</div>
              )}
              {(isFounder || (isPro && !isTrialing)) && (
                <div style={{
                  display: 'inline-block', padding: '2px 7px', borderRadius: 4,
                  background: '#1D9E75', color: '#fff',
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
                  animation: 'badgePop 0.4s ease 0.05s both',
                }}>PRO</div>
              )}
              {isTrialing && (
                <div style={{
                  display: 'inline-block', padding: '2px 7px', borderRadius: 4,
                  background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.5)',
                  color: '#f5a623', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
                  animation: 'badgePop 0.4s ease both',
                }}>TRIAL · {trialDaysLeft}d left</div>
              )}
            </div>
          </div>
          <img src="/logo.svg" style={{ height: 28, opacity: 0.85 }} alt="TrueCalorie" />
        </div>
        <TabBar activeTab="today" onChange={handleTabChange} />
      </div>

      {/* ── Main content ── */}
      <div style={{ padding: '20px 16px 80px', animation: 'fadeIn 0.2s ease both' }}>

        {(
          <>
            {/* Calorie ring */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40 }}>
              <div style={{ position: 'relative', width: 160, height: 160 }}>
                <svg
                  width="160" height="160" viewBox="0 0 160 160"
                  style={{
                    transform: 'rotate(-90deg)',
                    animation: ringFlash ? 'ringFlash 0.9s ease forwards' : 'none',
                  }}
                >
                  {/* Track — faint green tint for pro users */}
                  <circle
                    cx="80" cy="80" r="62"
                    fill="none"
                    stroke="var(--pro-ring-track, var(--border))"
                    strokeWidth="11"
                  />
                  {/* Fill — green for pro, dark for free */}
                  <circle
                    cx="80" cy="80" r="62"
                    fill="none"
                    stroke={isPro || isFounder ? '#1D9E75' : 'var(--text)'}
                    strokeWidth="11"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{
                    fontSize: 28, fontWeight: 700, color: 'var(--text)', lineHeight: 1,
                    animation: ringFlash ? 'numberAccent 0.7s ease forwards' : 'none',
                  }}>
                    {displayCalories}
                  </span>
                  <span style={{
                    fontSize: 11, color: 'var(--muted)', marginTop: 4,
                    textAlign: 'center', lineHeight: 1.4, maxWidth: 104,
                  }}>
                    of {effectiveCalorieGoal.toLocaleString()} cal
                    {adaptiveReady && stravaTrainingConnected && trailingBurn > 0 && (
                      <><br/>+{trailingBurn} training</>
                    )}
                  </span>
                </div>
              </div>

              {/* Macro pills */}
              <div style={{
                display: 'flex', gap: 0, marginTop: 24,
                background: 'var(--surface)', borderRadius: 14, overflow: 'hidden',
                border: '1px solid var(--pro-border, var(--border))',
              }}>
                {[
                  { label: 'Protein', val: displayProtein, goal: proteinGoal, color: '#378ADD' },
                  { label: 'Carbs',   val: displayCarbs,   goal: carbsGoal,   color: '#EF9F27' },
                  { label: 'Fat',     val: displayFat,     goal: fatGoal,     color: '#D4537E' },
                ].map((m, i) => {
                  const pct  = m.goal > 0 ? Math.min((m.val / m.goal) * 100, 100) : 0
                  const over = m.val > m.goal
                  return (
                    <div key={m.label} style={{
                      flex: 1, textAlign: 'center', padding: '12px 8px 10px',
                      borderRight: i < 2 ? '1px solid var(--border)' : 'none',
                    }}>
                      <div style={{
                        fontSize: 16, fontWeight: 600,
                        color: over ? '#f59e0b' : 'var(--text)',
                        animation: ringFlash ? 'numberAccent 0.7s ease forwards' : 'none',
                      }}>
                        {m.val}g
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, marginBottom: 7 }}>
                        {m.label}
                      </div>
                      <div style={{ height: 3, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden', margin: '0 6px' }}>
                        <div style={{
                          height: '100%', width: `${pct}%`, borderRadius: 2,
                          background: over ? '#f59e0b' : m.color,
                          transition: 'width 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
                        }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 5 }}>
                        of {m.goal}g
                      </div>
                    </div>
                  )
                })}
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
                fontSize: 15, fontWeight: 600, cursor: 'pointer',
                letterSpacing: '0.01em', marginBottom: 36,
                animation: !hasMeals ? 'logBtnPulse 2.5s ease-in-out infinite' : 'none',
                transform: logBtnPressed ? 'scale(0.97)' : 'scale(1)',
                transition: 'transform 0.1s ease',
                boxShadow: isPro || isFounder ? 'var(--pro-btn-shadow)' : 'none',
              }}
            >
              + Log Food
            </button>

            {/* Meal log */}
            <div key={meals.length}>
              {!hasMeals ? (
                <p style={{ color: 'var(--muted)', textAlign: 'center', marginTop: 48, fontSize: 14 }}>
                  no meals logged today
                </p>
              ) : (
                (() => {
                  let itemIndex = 0
                  return Object.entries(groupedMeals).map(([time, items]) => (
                    <div key={time} style={{ marginBottom: 28 }}>
                      <div style={{
                        fontSize: 11, fontWeight: 600, color: 'var(--muted)',
                        letterSpacing: '0.08em', marginBottom: 4,
                        paddingBottom: 6, borderBottom: '1px solid var(--border)',
                      }}>
                        {time.toUpperCase()}
                      </div>
                      {items.map(meal => {
                        const delay = (itemIndex++) * 0.045
                        return (
                          <div
                            key={meal.id}
                              onClick={(e) => { e.stopPropagation(); setEditingMeal(meal) }}                            style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '12px 0', borderBottom: '1px solid var(--border)',
                              cursor: 'pointer', borderRadius: 6,
                              animation: `slideInUp 0.35s ease both`,
                              animationDelay: `${delay}s`,
                              transition: 'background 0.15s, padding-left 0.15s',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'var(--surface)'
                              e.currentTarget.style.paddingLeft = '8px'
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'transparent'
                              e.currentTarget.style.paddingLeft = '0px'
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                              <div style={{
                                fontSize: 14, color: 'var(--text)',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              }}>
                                {meal.name}
                              </div>
                              {meal.restaurant && (
                                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                                  {meal.restaurant}
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                                {Math.round(meal.calories)} cal
                              </span>
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

            {/* TRAINING section */}
            <div style={{ marginBottom: 24 }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: 'var(--muted)',
                letterSpacing: '0.08em', marginBottom: 12,
              }}>
                TRAINING
              </div>
              <StravaCard session={session} refreshKey={stravaRefreshKey} onSync={handleStravaSync} />
            </div>

            {/* Weight */}
            <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: 'var(--muted)',
                letterSpacing: '0.08em', marginBottom: 12,
              }}>
                WEIGHT
              </div>
              <WeightCard session={session} />
            </div>

            {/* Water */}
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: 'var(--muted)',
                letterSpacing: '0.08em', marginBottom: 12,
              }}>
                WATER
              </div>
              <WaterCard session={session} />
            </div>

          </>
        )}
      </div>

      {/* ── Log Food sheet ── */}
      <LogFoodSheet
        open={showLogFood}
        onClose={() => setShowLogFood(false)}
        onSelect={handleFoodSelect}
        onBatchLog={handleBatchLog}
        savedFoods={savedFoods}
        onToggleSave={toggleSaveFood}
        recipes={recipes}
        onSaveRecipe={saveRecipe}
        onDeleteRecipe={deleteRecipe}
      />

      {/* ── Food detail modal ── */}
      {selectedItem && (
        <FoodDetailModal
          item={selectedItem}
          mealTime={selectedMealTime}
          onClose={() => setSelectedItem(null)}
          onLog={logItem}
          userId={session.user.id}
          isSaved={isFoodSaved(selectedItem)}
          onToggleSave={toggleSaveFood}
        />
      )}

      {/* ── Meal edit modal ── */}
      {editingMeal && (
        <MealEditModal
          meal={editingMeal}
          allMeals={meals}
          onClose={() => setEditingMeal(null)}
          onUpdate={updateMeal}
          onDelete={deleteItem}
          onMove={moveMealTime}
          onCombine={combineMeals}
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
