import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Auth from './Auth'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
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
    if (session) fetchMeals()
  }, [session])

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

  if (loading) return <p style={{ padding: 24 }}>Loading...</p>
  if (!session) return <Auth />

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24, fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>TrueCalorie</h1>
        <button onClick={() => supabase.auth.signOut()} style={{ padding: '6px 12px', cursor: 'pointer' }}>
          Sign Out
        </button>
      </div>

      {/* Daily Summary */}
      <div style={{ background: '#f5f5f5', borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <div style={{ fontSize: 36, fontWeight: 700, textAlign: 'center' }}>{Math.round(totalCalories)} cal</div>
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 8, fontSize: 13, color: '#555' }}>
          <span>Protein {Math.round(totalProtein)}g</span>
          <span>Carbs {Math.round(totalCarbs)}g</span>
          <span>Fat {Math.round(totalFat)}g</span>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <select
          value={mealTime}
          onChange={e => setMealTime(e.target.value)}
          style={{ padding: 8, marginBottom: 8, width: '100%', borderRadius: 8, border: '1px solid #ddd' }}
        >
          <option>Breakfast</option>
          <option>Lunch</option>
          <option>Snack</option>
          <option>Dinner</option>
        </select>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchFood()}
            placeholder="Search any food or restaurant..."
            style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
          />
          <button onClick={searchFood} style={{ padding: '10px 16px', borderRadius: 8, cursor: 'pointer' }}>
            {searching ? '...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Search Results */}
      {results.length > 0 && (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, marginBottom: 24, overflow: 'hidden' }}>
          {results.map((item, i) => (
            <div
              key={i}
              onClick={() => logItem(item)}
              style={{ padding: '10px 14px', borderBottom: '1px solid #eee', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <div style={{ fontWeight: 500 }}>{item.food_name}</div>
                {item.brand_name && <div style={{ fontSize: 12, color: '#888' }}>{item.brand_name}</div>}
              </div>
              <div style={{ fontWeight: 600, color: '#333' }}>{Math.round(item.nf_calories || 0)} cal</div>
            </div>
          ))}
        </div>
      )}

      {/* Meal Log */}
      {meals.length === 0 ? (
        <p style={{ color: '#999', textAlign: 'center' }}>No meals logged today. Search above to get started.</p>
      ) : (
        meals.map(meal => (
          <div key={meal.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eee' }}>
            <div>
              <div style={{ fontWeight: 500 }}>{meal.name}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{meal.meal_time}{meal.restaurant ? ` · ${meal.restaurant}` : ''}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 600 }}>{Math.round(meal.calories)} cal</span>
              <button onClick={() => deleteItem(meal.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 16 }}>✕</button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export default App