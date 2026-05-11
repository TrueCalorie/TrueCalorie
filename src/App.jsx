import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Auth from './Auth'
import Onboarding from './Onboarding'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)
  const [meals, setMeals] = useState([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [mealTime, setMealTime] = useState('Lunch')

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

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', session.user.id)
      .single()
    if (data) setSettings(data)
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

  const searchFood = async () => {
    if (!search.trim()) return
    setSearching(true)
    const res = await fetch(
      `https://trackapi.nutritionix.com/v2/search/instant?query=${search}`,
      {
        headers: {
          'x-app-id': import.meta.env.VITE_NUTRITIONIX_APP_ID,
          'x-app-key': import.meta.env.VITE_NUTRITIONIX_APP_KEY,
        }
      }
    )
    const data = await res.json()
    const items = [...(data.branded || []), ...(data.common || [])].slice(0, 10)
    setResults(items)
    setSearching(false)
  }

  const logItem = async (item) => {
    const entry = {
      user_id: session.user.id,
      name: item.food_name,
      restaurant: item.brand_name || null,
      calories: item.nf_calories || 0,
      protein: item.nf_protein || 0,
      carbs: item.nf_total_carbohydrate || 0,
      fat: item.nf_total_fat || 0,
      meal_time: mealTime,
    }
    await supabase.from('meal_logs').insert(entry)
    setResults([])
    setSearch('')
    fetchMeals()
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
  const ringPercent = Math.min(totalCalories / calorieGoal, 1)
  const circumference = 2 * Math.PI * 54
  const offset = circumference * (1 - ringPercent)

  const groupedMeals = ['Breakfast', 'Lunch', 'Snack', 'Dinner'].reduce((acc, time) => {
    const group = meals.filter(m => m.meal_time === time)
    if (group.length > 0) acc[time] = group
    return acc
  }, {})

  if (loading) return <p style={{ padding: 24 }}>Loading...</p>
  if (!session) return <Auth />
  if (!settings || !settings.onboarding_complete) return (
    <Onboarding session={session} onComplete={fetchSettings} />
  )

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24, fontFamily: 'sans-serif' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>
          Hey, {settings.display_name} 👋
        </h1>
        <button onClick={() => supabase.auth.signOut()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: 13 }}>
          sign out
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
        <div style={{ position: 'relative', width: 140, height: 140 }}>
          <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="70" cy="70" r="54" fill="none" stroke="#f0f0f0" strokeWidth="10" />
            <circle cx="70" cy="70" r="54" fill="none" stroke="#111" strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 24, fontWeight: 600 }}>{Math.round(totalCalories)}</span>
            <span style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>of {calorieGoal} cal</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
          {[
            { label: 'protein', val: Math.round(totalProtein), goal: settings.protein_goal },
            { label: 'carbs', val: Math.round(totalCarbs), goal: settings.carbs_goal },
            { label: 'fat', val: Math.round(totalFat), goal: settings.fat_goal },
          ].map(m => (
            <div key={m.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{m.val}g</div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {['Breakfast', 'Lunch', 'Snack', 'Dinner'].map(t => (
            <button key={t} onClick={() => setMealTime(t)} style={{
              fontSize: 12, padding: '5px 12px', borderRadius: 20,
              border: mealTime === t ? '1.5px solid #111' : '1px solid #ddd',
              background: mealTime === t ? '#111' : 'none',
              color: mealTime === t ? '#fff' : '#888',
              cursor: 'pointer',
            }}>{t.toLowerCase()}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchFood()}
            placeholder="search any food or restaurant..."
            style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14, outline: 'none' }}
          />
          <button onClick={searchFood} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: '#111', color: '#fff', fontSize: 14, cursor: 'pointer' }}>
            {searching ? '...' : 'search'}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div style={{ border: '1px solid #eee', borderRadius: 10, marginBottom: 20, overflow: 'hidden' }}>
          {results.map((item, i) => (
            <div key={i} onClick={() => logItem(item)} style={{
              padding: '10px 14px', borderBottom: '1px solid #f5f5f5',
              cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{item.food_name}</div>
                {item.brand_name && <div style={{ fontSize: 12, color: '#aaa' }}>{item.brand_name}</div>}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{Math.round(item.nf_calories || 0)} cal</div>
            </div>
          ))}
        </div>
      )}

      {Object.keys(groupedMeals).length === 0 ? (
        <p style={{ color: '#ccc', textAlign: 'center', marginTop: 40, fontSize: 14 }}>no meals logged today</p>
      ) : (
        Object.entries(groupedMeals).map(([time, items]) => (
          <div key={time} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#aaa', letterSpacing: '0.05em', marginBottom: 8 }}>
              {time.toUpperCase()}
            </div>
            {items.map(meal => (
              <div key={meal.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid #f5f5f5'
              }}>
                <div>
                  <div style={{ fontSize: 14 }}>{meal.name}</div>
                  {meal.restaurant && <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{meal.restaurant}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{Math.round(meal.calories)} cal</span>
                  <button onClick={() => deleteItem(meal.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ddd', fontSize: 18, lineHeight: 1 }}>×</button>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}

export default App