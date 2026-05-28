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
import RestaurantSearch from './components/RestaurantSearch'
import { ACHIEVEMENTS, checkAchievements } from './achievements'
import FoodDetailModal from './components/FoodDetailModal'
import LoadingScreen from './components/LoadingScreen'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [meals, setMeals] = useState([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [mealTime, setMealTime] = useState('Lunch')
  const [activeTab, setActiveTab] = useState('grocery') // 'grocery' | 'restaurant'
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showFounders, setShowFounders] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [toastQueue, setToastQueue] = useState([])
  const [currentToast, setCurrentToast] = useState(null)
  const [resultPage, setResultPage] = useState(0)
  const [selectedItem, setSelectedItem] = useState(null)
  const RESULTS_PER_PAGE = 5

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

  const scoreResult = (item, query) => {
    let score = 0
    const name = (item.food_name || '').toLowerCase()
    const brand = (item.brand_name || '').toLowerCase()
    const q = query.toLowerCase()

    if (name === q) score += 100
    if (name.startsWith(q)) score += 50
    if (name.includes(q)) score += 25
    if (brand.includes(q)) score += 10
    if (item.nf_calories > 0) score += 20
    if (item.nf_protein > 0) score += 5
    if (item.nf_total_carbohydrate > 0) score += 5
    if (item.nf_total_fat > 0) score += 5
    score -= name.length * 0.1
    
    // Penalize non-English names — they're usually mistagged products
    const nonAsciiCount = (item.food_name || '').match(/[^\x00-\x7F]/g)?.length || 0
    score -= nonAsciiCount * 5
    
    return score
  }

  // Grocery-only search (Open Food Facts).
  // Restaurant search lives in its own component on the restaurant tab.
  const searchFood = async () => {
    if (!search.trim()) return
    setSearching(true)
    setResultPage(0)

    const TIMEOUT_MS = 8000

    const fetchWithTimeout = async (url) => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
      try {
        const res = await fetch(url, { signal: controller.signal })
        clearTimeout(timeoutId)
        if (!res.ok) throw new Error(`OFF returned ${res.status}`)
        return res.json()
      } catch (e) {
        clearTimeout(timeoutId)
        throw e
      }
    }

    const mapOFF = (data) => {
      if (!data?.products) return []
      return data.products
        .filter(p => p.product_name && p.nutriments?.['energy-kcal_serving'])
        .map(p => ({
          food_name: p.product_name,
          brand_name: p.brands || null,
          nf_calories: Math.round(p.nutriments['energy-kcal_serving'] || 0),
          nf_protein: Math.round(p.nutriments['proteins_serving'] || 0),
          nf_total_carbohydrate: Math.round(p.nutriments['carbohydrates_serving'] || 0),
          nf_total_fat: Math.round(p.nutriments['fat_serving'] || 0),
          countries: p.countries_tags || [],
          source: 'off',
        }))
    }

    // Wide net, no server-side country filter (their tag filter is too slow)
    const url =
      `https://world.openfoodfacts.org/cgi/search.pl` +
      `?search_terms=${encodeURIComponent(search)}` +
      `&search_simple=1&action=process&json=1&page_size=100` +
      `&fields=product_name,brands,nutriments,countries_tags`

    let allItems = []
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const data = await fetchWithTimeout(url)
        allItems = mapOFF(data)
        break
      } catch (e) {
        console.warn(`OFF attempt ${attempt + 1} failed:`, e)
        if (attempt === 0) await new Promise(r => setTimeout(r, 400))
      }
    }

    // Filter US-only client-side. If we don't have at least 5 US results,
    // fall back to all results so niche queries aren't stranded empty.
    const usItems = allItems.filter(p => p.countries.includes('en:united-states'))
    const pool = usItems.length >= 5 ? usItems : allItems

    const sorted = pool
      .map(item => ({ ...item, _score: scoreResult(item, search) }))
      .sort((a, b) => b._score - a._score)

    setResults(sorted)
    setSearching(false)
  }

  const logItem = async (item, servings = 1) => {
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
    setResults([])
    setSearch('')
    setResultPage(0)
    await fetchMeals()
    checkAndAwardAchievements()
  }

  const deleteItem = async (id) => {
    await supabase.from('meal_logs').delete().eq('id', id)
    fetchMeals()
  }

  const totalCalories = meals.reduce((sum, m) => sum + Number(m.calories), 0)
  const totalProtein = meals.reduce((sum, m) => sum + Number(m.protein), 0)
  const totalCarbs = meals.reduce((sum, m) => sum + Number(m.carbs), 0)
  const totalFat = meals.reduce((sum, m) => sum + Number(m.fat), 0)

  const calorieGoal = settings?.calorie_goal || 2000
  const circumference = 2 * Math.PI * 54
  const ringPercent = Math.min(totalCalories / calorieGoal, 1)
  const offset = circumference * (1 - ringPercent)

  const groupedMeals = ['Breakfast', 'Lunch', 'Snack', 'Dinner'].reduce((acc, time) => {
    const group = meals.filter(m => m.meal_time === time)
    if (group.length > 0) acc[time] = group
    return acc
  }, {})

  const pagedResults = results.slice(resultPage * RESULTS_PER_PAGE, (resultPage + 1) * RESULTS_PER_PAGE)
  const totalPages = Math.ceil(results.length / RESULTS_PER_PAGE)

  // ─────────────────────────────────────────────────────
  // Public routes (no auth required) — checked before auth
  // ─────────────────────────────────────────────────────

  const goHome = () => {
    setShowFounders(false)
    setShowPrivacy(false)
    setShowTerms(false)
    window.history.pushState({}, '', '/')
  }

  if (showPrivacy) {
    return <Privacy onBack={goHome} />
  }

  if (showTerms) {
    return <Terms onBack={goHome} />
  }

  if (showFounders) {
    return <Founders onBack={goHome} />
  }

  // ─────────────────────────────────────────────────────
  // Authenticated routes
  // ─────────────────────────────────────────────────────

  // Wait for both auth AND settings to resolve before deciding what to render.
  // Without the settingsLoaded gate, there's a render between session-resolved
  // and settings-fetched where the Onboarding screen briefly flashes.
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
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
            { label: 'carbs', val: Math.round(totalCarbs) },
            { label: 'fat', val: Math.round(totalFat) },
          ].map(m => (
            <div key={m.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{m.val}g</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => setActiveTab('grocery')}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 10,
            border: activeTab === 'grocery' ? '1.5px solid var(--text)' : '1px solid var(--border)',
            background: activeTab === 'grocery' ? 'var(--text)' : 'none',
            color: activeTab === 'grocery' ? 'var(--bg)' : 'var(--muted)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >
          grocery
        </button>
        <button
          onClick={() => setActiveTab('restaurant')}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 10,
            border: activeTab === 'restaurant' ? '1.5px solid var(--text)' : '1px solid var(--border)',
            background: activeTab === 'restaurant' ? 'var(--text)' : 'none',
            color: activeTab === 'restaurant' ? 'var(--bg)' : 'var(--muted)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          restaurant
          <span style={{
            fontSize: 9, padding: '1px 5px', borderRadius: 3,
            background: activeTab === 'restaurant' ? 'var(--bg)' : 'var(--text)',
            color: activeTab === 'restaurant' ? 'var(--text)' : 'var(--bg)',
            fontWeight: 600, letterSpacing: 0.3,
          }}>PRO</span>
        </button>
      </div>

      {/* Meal Time Selector — shared across tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {['Breakfast', 'Lunch', 'Snack', 'Dinner'].map(t => (
          <button key={t} onClick={() => setMealTime(t)} style={{
            fontSize: 12, padding: '5px 12px', borderRadius: 20,
            border: mealTime === t ? '1.5px solid var(--text)' : '1px solid var(--border)',
            background: mealTime === t ? 'var(--text)' : 'none',
            color: mealTime === t ? 'var(--bg)' : 'var(--muted)',
            cursor: 'pointer',
          }}>{t.toLowerCase()}</button>
        ))}
      </div>

      {/* Spinner keyframe — used by grocery search and elsewhere */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Tab Content */}
      {activeTab === 'restaurant' ? (
        <RestaurantSearch onSelect={setSelectedItem} />
      ) : (
        <>
          {/* Grocery Search Bar */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchFood()}
                placeholder="search any food..."
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 10,
                  border: '1px solid var(--border)', fontSize: 14, outline: 'none',
                  background: 'var(--surface)', color: 'var(--text)',
                }}
              />
              <button onClick={searchFood} style={{
                padding: '10px 18px', borderRadius: 10, border: 'none',
                background: 'var(--text)', color: 'var(--bg)', fontSize: 14, cursor: 'pointer',
                minWidth: 72, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {searching ? (
                  <span style={{
                    display: 'inline-block',
                    width: 16, height: 16,
                    border: '2px solid var(--bg)',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                ) : 'search'}
              </button>
            </div>
          </div>

          {/* Grocery Search Results */}
          {results.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--surface)' }}>
                {pagedResults.map((item, i) => (
                  <div key={i} onClick={() => setSelectedItem(item)} style={{
                    padding: '10px 14px', borderBottom: '1px solid var(--border)',
                    cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.food_name}</div>
                      {item.brand_name && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{item.brand_name}</div>}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', flexShrink: 0 }}>{Math.round(item.nf_calories || 0)} cal</div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}>
                  <button
                    onClick={() => setResultPage(p => Math.max(0, p - 1))}
                    disabled={resultPage === 0}
                    style={{
                      padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
                      background: 'none', color: resultPage === 0 ? 'var(--border)' : 'var(--text)',
                      cursor: resultPage === 0 ? 'default' : 'pointer', fontSize: 13,
                    }}
                  >←</button>

                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setResultPage(i)}
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: resultPage === i ? 'var(--text)' : 'none',
                        color: resultPage === i ? 'var(--bg)' : 'var(--muted)',
                        cursor: 'pointer', fontSize: 13, fontWeight: resultPage === i ? 600 : 400,
                      }}
                    >{i + 1}</button>
                  ))}

                  <button
                    onClick={() => setResultPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={resultPage === totalPages - 1}
                    style={{
                      padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
                      background: 'none', color: resultPage === totalPages - 1 ? 'var(--border)' : 'var(--text)',
                      cursor: resultPage === totalPages - 1 ? 'default' : 'pointer', fontSize: 13,
                    }}
                  >→</button>
                </div>
              )}
            </div>
          )}
        </>
      )}

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

      {selectedItem && (
        <FoodDetailModal
          item={selectedItem}
          mealTime={mealTime}
          onClose={() => setSelectedItem(null)}
          onLog={logItem}
        />
      )}
    </div>
  )
}

export default App