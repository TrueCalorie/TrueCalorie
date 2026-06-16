import { useState, useEffect, useRef } from 'react'
import { usePro } from '../hooks/usePro'
import { searchUSDA } from '../services/usda'
import BarcodeScanner    from './BarcodeScanner'
import RestaurantSearch  from './RestaurantSearch'
import VoiceLogger       from './VoiceLogger'
import UpgradeModal      from './UpgradeModal'

const SHEET_ANIM_MS    = 300
const RESULTS_PER_PAGE = 8
const MEAL_TIMES       = ['Breakfast', 'Lunch', 'Snack', 'Dinner']
const DEBOUNCE_MS      = 400

// ─── Mode tile ────────────────────────────────────────────────────────────────
function ModeTile({ icon, label, animDelay, onClick, badge, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        position: 'relative',
        flex: '1 1 calc(50% - 6px)',
        minHeight: 90,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8,
        borderRadius: 14,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.15s, transform 0.12s',
        animation: `slideInUp 0.3s ease both`,
        animationDelay: `${animDelay}s`,
        fontFamily: 'inherit',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'var(--surface2)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)' }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = 'scale(0.96)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      onTouchStart={e => { if (!disabled) e.currentTarget.style.transform = 'scale(0.96)' }}
      onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      <span style={{ fontSize: 26 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{label}</span>
      {badge && (
        <span style={{
          position: 'absolute', top: 8, right: 8,
          fontSize: 9, padding: '2px 6px', borderRadius: 4,
          background: 'var(--text)', color: 'var(--bg)',
          fontWeight: 700, letterSpacing: '0.08em',
        }}>{badge}</span>
      )}
    </button>
  )
}

// ─── Open Food Facts search ───────────────────────────────────────────────────
async function searchOpenFoodFacts(query) {
  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl')
  url.searchParams.set('action', 'process')
  url.searchParams.set('json', '1')
  url.searchParams.set('search_terms', query)
  url.searchParams.set('tagtype_0', 'countries')
  url.searchParams.set('tag_contains_0', 'contains')
  url.searchParams.set('tag_0', 'united-states')
  url.searchParams.set('fields', 'product_name,brands,nutriments,serving_size')
  url.searchParams.set('page_size', '20')

  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json()

  return (data.products || [])
    .filter(p =>
      p.product_name &&
      (p.nutriments?.['energy-kcal_serving'] || p.nutriments?.['energy-kcal_100g'])
    )
    .map(p => ({
      food_name:             p.product_name,
      brand_name:            p.brands?.split(',')[0]?.trim() || null,
      nf_calories:           Math.round(p.nutriments?.['energy-kcal_serving'] || p.nutriments?.['energy-kcal_100g'] || 0),
      nf_protein:            Math.round(p.nutriments?.['proteins_serving']       || p.nutriments?.['proteins_100g']       || 0),
      nf_total_carbohydrate: Math.round(p.nutriments?.['carbohydrates_serving']  || p.nutriments?.['carbohydrates_100g']  || 0),
      nf_total_fat:          Math.round(p.nutriments?.['fat_serving']            || p.nutriments?.['fat_100g']            || 0),
      serving_qty:           1,
      serving_unit:          'serving',
      verified:              false,
    }))
    .filter(f => f.nf_calories > 0)
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LogFoodSheet({
  open, onClose, onSelect, onBatchLog,
  savedFoods = [], onToggleSave = () => {},
  recipes = [], onSaveRecipe = () => {}, onDeleteRecipe = () => {},
}) {
  const { isPro, isTrialing } = usePro()
  const [showUpgrade, setShowUpgrade] = useState(false)

  const [mode, setMode]               = useState(null)
  const [mealTime, setMealTime]       = useState('Lunch')
  const [search, setSearch]           = useState('')
  const [results, setResults]         = useState([])
  const [searching, setSearching]     = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [resultPage, setResultPage]   = useState(0)

  // ── Recipe state ──────────────────────────────────────────────────────────
  const [recipeId, setRecipeId]                       = useState(null)
  const [recipeName, setRecipeName]                   = useState('')
  const [recipeIngredients, setRecipeIngredients]     = useState([])
  const [recipeServings, setRecipeServings]           = useState(1)
  const [recipeIngSearch, setRecipeIngSearch]         = useState('')
  const [recipeIngResults, setRecipeIngResults]       = useState([])
  const [recipeIngSearching, setRecipeIngSearching]   = useState(false)
  const [recipeIngHasSearched, setRecipeIngHasSearched] = useState(false)
  const recipeDebounceTimer = useRef(null)
  const recipeSearchIdRef   = useRef(0)

  // ── Sheet animation state ──────────────────────────────────────────────────
  const [visible, setVisible]     = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const closeTimer                = useRef(null)
  const debounceTimer             = useRef(null)
  const searchIdRef               = useRef(0)

  useEffect(() => {
    if (open) {
      clearTimeout(closeTimer.current)
      setVisible(true)
      setIsClosing(false)
    } else if (visible) {
      setIsClosing(true)
      closeTimer.current = setTimeout(() => {
        setVisible(false)
        setIsClosing(false)
      }, SHEET_ANIM_MS)
    }
    return () => clearTimeout(closeTimer.current)
  }, [open])

  // Reset all state when sheet closes
  useEffect(() => {
    if (!open) {
      setMode(null)
      setSearch('')
      setResults([])
      setHasSearched(false)
      setResultPage(0)
      setRecipeId(null)
      setRecipeName('')
      setRecipeIngredients([])
      setRecipeServings(1)
      setRecipeIngSearch('')
      setRecipeIngResults([])
      setRecipeIngHasSearched(false)
    }
  }, [open])

  // ── Debounced auto-search (grocery) ──────────────────────────────────────
  useEffect(() => {
    if (!search.trim()) {
      setResults([])
      setHasSearched(false)
      setResultPage(0)
      clearTimeout(debounceTimer.current)
      return
    }
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      if (mode === 'grocery') searchFoods(search.trim())
    }, DEBOUNCE_MS)
    return () => clearTimeout(debounceTimer.current)
  }, [search, mode])

  // ── Debounced auto-search (recipe ingredients) ────────────────────────────
  useEffect(() => {
    if (!recipeIngSearch.trim()) {
      setRecipeIngResults([])
      setRecipeIngHasSearched(false)
      clearTimeout(recipeDebounceTimer.current)
      return
    }
    clearTimeout(recipeDebounceTimer.current)
    recipeDebounceTimer.current = setTimeout(() => {
      if (mode === 'recipe') searchRecipeIngredient(recipeIngSearch.trim())
    }, DEBOUNCE_MS)
    return () => clearTimeout(recipeDebounceTimer.current)
  }, [recipeIngSearch, mode])

  // ── Parallel grocery search: USDA + Open Food Facts ───────────────────────
  const searchFoods = async (query) => {
    setSearching(true)
    setResults([])
    setResultPage(0)
    const myId = ++searchIdRef.current

    try {
      const [usdaResults, offResults] = await Promise.all([
        searchUSDA(query).catch(() => []),
        searchOpenFoodFacts(query).catch(() => []),
      ])

      if (myId !== searchIdRef.current) return

      const combined = [
        ...usdaResults.map(f => ({ ...f, verified: true })),
        ...offResults,
      ]
      setResults(combined)
    } catch {
      if (myId === searchIdRef.current) setResults([])
    } finally {
      if (myId === searchIdRef.current) {
        setSearching(false)
        setHasSearched(true)
      }
    }
  }

  // ── Parallel ingredient search: USDA + Open Food Facts ───────────────────
  const searchRecipeIngredient = async (query) => {
    setRecipeIngSearching(true)
    setRecipeIngResults([])
    const myId = ++recipeSearchIdRef.current

    try {
      const [usdaResults, offResults] = await Promise.all([
        searchUSDA(query).catch(() => []),
        searchOpenFoodFacts(query).catch(() => []),
      ])

      if (myId !== recipeSearchIdRef.current) return

      const combined = [
        ...usdaResults.map(f => ({ ...f, verified: true })),
        ...offResults,
      ]
      setRecipeIngResults(combined.slice(0, RESULTS_PER_PAGE))
    } catch {
      if (myId === recipeSearchIdRef.current) setRecipeIngResults([])
    } finally {
      if (myId === recipeSearchIdRef.current) {
        setRecipeIngSearching(false)
        setRecipeIngHasSearched(true)
      }
    }
  }

  // ── Close + reset ─────────────────────────────────────────────────────────
  const handleClose = () => {
    onClose()
  }

  // ── Back button: go to mode picker and clear all recipe state ────────────
  const handleBack = () => {
    setMode(null)
    setSearch('')
    setResults([])
    setHasSearched(false)
    setRecipeId(null)
    setRecipeName('')
    setRecipeIngredients([])
    setRecipeServings(1)
    setRecipeIngSearch('')
    setRecipeIngResults([])
    setRecipeIngHasSearched(false)
  }

  // ── Single-item selection (barcode, grocery, restaurant, saved) ──────────
  const handleSelect = (food, method = 'search') => {
    onSelect(food, mealTime, method)
    handleClose()
  }

  // ── Multi-item batch logging (voice) ─────────────────────────────────────
  // Voice logging MUST NOT go through onSelect → handleFoodSelect → setSelectedItem
  // → FoodDetailModal. The voice review screen is already the confirmation step.
  // Going through handleFoodSelect causes: each call overwrites selectedItem,
  // so only the last food survives and FoodDetailModal opens for that one item only.
  //
  // onBatchLog receives the full array and writes to Supabase directly,
  // bypassing FoodDetailModal entirely.
  const handleLogAll = (scaledFoods) => {
    const itemsWithMealTime = scaledFoods.map(food => ({ ...food, meal_time: mealTime }))
    onBatchLog(itemsWithMealTime, 'voice')
    handleClose()
  }

  // ── Recipe: add ingredient ────────────────────────────────────────────────
  const addIngredient = (food) => {
    setRecipeIngredients(prev => [...prev, food])
    setRecipeIngSearch('')
    setRecipeIngResults([])
    setRecipeIngHasSearched(false)
  }

  // ── Recipe: open saved recipe for editing ─────────────────────────────────
  const openRecipeForEdit = (recipe) => {
    setRecipeId(recipe.id)
    setRecipeName(recipe.name)
    setRecipeServings(recipe.servings)
    setRecipeIngredients(
      (recipe.recipe_ingredients || [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(ing => ({
          food_name:             ing.food_name,
          brand_name:            ing.brand_name || null,
          nf_calories:           Number(ing.nf_calories)           || 0,
          nf_protein:            Number(ing.nf_protein)            || 0,
          nf_total_carbohydrate: Number(ing.nf_total_carbohydrate) || 0,
          nf_total_fat:          Number(ing.nf_total_fat)          || 0,
        }))
    )
    setRecipeIngSearch('')
    setRecipeIngResults([])
    setRecipeIngHasSearched(false)
    setMode('recipe')
  }

  // ── Recipe: computed totals ───────────────────────────────────────────────
  const recipeTotals = recipeIngredients.reduce((acc, f) => ({
    calories: acc.calories + (f.nf_calories           || 0),
    protein:  acc.protein  + (f.nf_protein            || 0),
    carbs:    acc.carbs    + (f.nf_total_carbohydrate  || 0),
    fat:      acc.fat      + (f.nf_total_fat           || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  const effectiveServings = Math.max(1, Number(recipeServings) || 1)
  const recipePerServing = {
    calories: Math.round(recipeTotals.calories / effectiveServings),
    protein:  Math.round(recipeTotals.protein  / effectiveServings),
    carbs:    Math.round(recipeTotals.carbs    / effectiveServings),
    fat:      Math.round(recipeTotals.fat      / effectiveServings),
  }

  const canLogRecipe = recipeName.trim().length > 0 && recipeIngredients.length > 0

  // ── Recipe: log one serving (no save) ────────────────────────────────────
  const handleLogRecipe = () => {
    if (!canLogRecipe) return
    onBatchLog([{
      food_name:             recipeName.trim(),
      brand_name:            null,
      nf_calories:           recipePerServing.calories,
      nf_protein:            recipePerServing.protein,
      nf_total_carbohydrate: recipePerServing.carbs,
      nf_total_fat:          recipePerServing.fat,
      meal_time:             mealTime,
    }], 'recipe')
    handleClose()
  }

  // ── Recipe: save to recipes table then log ────────────────────────────────
  const handleSaveAndLogRecipe = () => {
    if (!canLogRecipe) return
    onSaveRecipe({
      id:          recipeId,
      name:        recipeName.trim(),
      servings:    effectiveServings,
      ingredients: recipeIngredients.map(ing => ({
        food_name:             ing.food_name,
        brand_name:            ing.brand_name || null,
        nf_calories:           Number(ing.nf_calories)           || 0,
        nf_protein:            Number(ing.nf_protein)            || 0,
        nf_total_carbohydrate: Number(ing.nf_total_carbohydrate) || 0,
        nf_total_fat:          Number(ing.nf_total_fat)          || 0,
      })),
    })
    onBatchLog([{
      food_name:             recipeName.trim(),
      brand_name:            null,
      nf_calories:           recipePerServing.calories,
      nf_protein:            recipePerServing.protein,
      nf_total_carbohydrate: recipePerServing.carbs,
      nf_total_fat:          recipePerServing.fat,
      meal_time:             mealTime,
    }], 'recipe')
    handleClose()
  }

  if (!visible) return null

  const pagedResults = results.slice(
    resultPage * RESULTS_PER_PAGE,
    (resultPage + 1) * RESULTS_PER_PAGE
  )
  const totalPages = Math.ceil(results.length / RESULTS_PER_PAGE)

  const modeTitle = {
    barcode:    'Scan Barcode',
    grocery:    'Grocery Search',
    restaurant: 'Restaurant',
    voice:      'Voice Log',
    recipe:     'Recipe Builder',
    saved:      'Saved',
  }

  // ── Saved tab: per-serving helper ─────────────────────────────────────────
  const recipePerServingMacros = (recipe) => {
    const s = Math.max(1, recipe.servings)
    const ings = recipe.recipe_ingredients || []
    return {
      calories: Math.round(ings.reduce((a, x) => a + Number(x.nf_calories),           0) / s),
      protein:  Math.round(ings.reduce((a, x) => a + Number(x.nf_protein),            0) / s),
      carbs:    Math.round(ings.reduce((a, x) => a + Number(x.nf_total_carbohydrate), 0) / s),
      fat:      Math.round(ings.reduce((a, x) => a + Number(x.nf_total_fat),          0) / s),
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.4)',
          opacity: isClosing ? 0 : 1,
          transition: `opacity ${SHEET_ANIM_MS}ms ease`,
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        zIndex: 41,
        background: 'var(--bg)',
        borderRadius: '20px 20px 0 0',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
        maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
        transform: isClosing ? 'translateY(100%)' : 'translateY(0)',
        transition: `transform ${SHEET_ANIM_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
      }}>

        {/* Drag handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'var(--border)', margin: '10px auto 0',
          flexShrink: 0,
        }} />

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '12px 16px 10px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          {mode ? (
            <button
              onClick={handleBack}
              style={{
                background: 'none', border: 'none', padding: '4px 8px 4px 0',
                fontSize: 13, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >← back</button>
          ) : null}
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', flex: 1 }}>
            {mode ? modeTitle[mode] : 'Log Food'}
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none', border: 'none', padding: 4,
              fontSize: 20, color: 'var(--muted)', cursor: 'pointer', lineHeight: 1,
            }}
          >×</button>
        </div>

        {/* Meal time selector */}
        <div style={{
          display: 'flex', gap: 6, padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          overflowX: 'auto', flexShrink: 0,
        }}>
          {MEAL_TIMES.map(t => (
            <button
              key={t}
              onClick={() => setMealTime(t)}
              style={{
                padding: '5px 14px', borderRadius: 20, border: 'none',
                background: mealTime === t ? 'var(--text)' : 'var(--surface)',
                color: mealTime === t ? 'var(--bg)' : 'var(--muted)',
                fontSize: 13, fontWeight: mealTime === t ? 600 : 400,
                cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
                transition: 'background 0.15s, color 0.15s',
              }}
            >{t}</button>
          ))}
        </div>

        {/* Scrollable content */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '16px 16px 32px',
          WebkitOverflowScrolling: 'touch',
        }}>

          {/* ── Upgrade modal (rendered at top so it's not blocked by mode guards) ── */}
          <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />

          {/* ── Mode picker ── */}
          {!mode && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <ModeTile
                icon="📷" label="Scan Barcode" animDelay={0}
                onClick={() => setMode('barcode')}
              />
              <ModeTile
                icon="🔍" label="Grocery Search" animDelay={0.05}
                onClick={() => setMode('grocery')}
              />
              <ModeTile
                icon="🍽️" label="Restaurant" animDelay={0.1}
                badge={!isPro && !isTrialing ? 'PRO' : undefined}
                onClick={() => {
                  if (!isPro && !isTrialing) { setShowUpgrade(true); return }
                  setMode('restaurant')
                }}
              />
              <ModeTile
                icon="🎙️" label="Voice Log" animDelay={0.15}
                badge={!isPro && !isTrialing ? 'PRO' : undefined}
                onClick={() => {
                  if (!isPro && !isTrialing) { setShowUpgrade(true); return }
                  setMode('voice')
                }}
              />
              <ModeTile
                icon="🥣" label="Recipe" animDelay={0.2}
                onClick={() => setMode('recipe')}
              />
              <ModeTile
                icon="🔖" label="Saved" animDelay={0.25}
                onClick={() => setMode('saved')}
              />
            </div>
          )}

          {/* ── Barcode ── */}
          {mode === 'barcode' && (
            <BarcodeScanner
              onResult={(food) => handleSelect(food, 'barcode')}
              onClose={() => setMode(null)}
            />
          )}

          {/* ── Grocery ── */}
          {mode === 'grocery' && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ position: 'relative' }}>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="search any food…"
                    autoFocus
                    style={{
                      width: '100%', padding: '10px 40px 10px 14px',
                      borderRadius: 10, boxSizing: 'border-box',
                      border: '1px solid var(--border)', fontSize: 14, outline: 'none',
                      background: 'var(--surface)', color: 'var(--text)',
                      fontFamily: 'inherit',
                    }}
                  />
                  {searching && (
                    <div style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      width: 16, height: 16, borderRadius: '50%',
                      border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
                      animation: 'spin 0.7s linear infinite',
                    }} />
                  )}
                  {!searching && search && (
                    <button
                      onClick={() => setSearch('')}
                      style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: 'var(--muted)',
                        cursor: 'pointer', fontSize: 16, lineHeight: 1,
                      }}
                    >×</button>
                  )}
                </div>
              </div>

              {pagedResults.length > 0 && (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {pagedResults.map((food, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelect(food, 'search')}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '10px 12px', borderRadius: 10,
                          border: 'none', background: 'transparent',
                          cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: 'inherit',
                          borderBottom: i < pagedResults.length - 1 ? '1px solid var(--border)' : 'none',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ flex: 1, paddingRight: 8 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                            {food.food_name}
                          </div>
                          {food.brand_name && (
                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{food.brand_name}</div>
                          )}
                          {food.verified && (
                            <div style={{ fontSize: 10, color: '#1D9E75', fontWeight: 700, marginTop: 2 }}>
                              VERIFIED
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>
                          {Math.round(food.nf_calories)} cal
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div style={{
                      display: 'flex', justifyContent: 'center', alignItems: 'center',
                      gap: 16, marginTop: 16,
                    }}>
                      <button
                        onClick={() => setResultPage(p => Math.max(0, p - 1))}
                        disabled={resultPage === 0}
                        style={{
                          padding: '6px 14px', borderRadius: 8,
                          border: '1px solid var(--border)', background: 'none',
                          color: resultPage === 0 ? 'var(--border)' : 'var(--text)',
                          cursor: resultPage === 0 ? 'default' : 'pointer', fontSize: 13,
                        }}
                      >←</button>
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                        {resultPage + 1} of {totalPages}
                      </span>
                      <button
                        onClick={() => setResultPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={resultPage === totalPages - 1}
                        style={{
                          padding: '6px 14px', borderRadius: 8,
                          border: '1px solid var(--border)', background: 'none',
                          color: resultPage === totalPages - 1 ? 'var(--border)' : 'var(--text)',
                          cursor: resultPage === totalPages - 1 ? 'default' : 'pointer', fontSize: 13,
                        }}
                      >→</button>
                    </div>
                  )}

                  {results.some(r => r.verified) && (
                    <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10, lineHeight: 1.5 }}>
                      <span style={{ color: '#1D9E75', fontWeight: 700 }}>VERIFIED</span>
                      : USDA Foundation or SR Legacy data, validated by registered dietitians.
                    </p>
                  )}
                </div>
              )}

              {/* No results — only after a search has actually fired */}
              {hasSearched && !searching && results.length === 0 && search.trim() && (
                <p style={{
                  color: 'var(--muted)', textAlign: 'center',
                  fontSize: 14, marginTop: 32,
                  animation: 'slideInUp 0.3s ease both',
                }}>
                  No results found. Try a different search.
                </p>
              )}
            </>
          )}

          {/* ── Restaurant ── */}
          {mode === 'restaurant' && (
            <RestaurantSearch onSelect={(food) => handleSelect(food, 'restaurant')} />
          )}

          {/* ── Voice ── */}
          {mode === 'voice' && (
            <VoiceLogger
              mealTime={mealTime}
              onLog={handleSelect}
              onLogAll={handleLogAll}
              onBack={() => setMode(null)}
            />
          )}

          {/* ── Recipe Builder ── */}
          {mode === 'recipe' && (
            <>
              {/* Recipe name */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Recipe name</div>
                <input
                  value={recipeName}
                  onChange={e => setRecipeName(e.target.value)}
                  placeholder="e.g. Chicken rice bowl"
                  style={{
                    width: '100%', padding: '10px 14px',
                    borderRadius: 10, boxSizing: 'border-box',
                    border: '1px solid var(--border)', fontSize: 14, outline: 'none',
                    background: 'var(--surface)', color: 'var(--text)',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Ingredient search */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Search ingredient</div>
                <div style={{ position: 'relative' }}>
                  <input
                    value={recipeIngSearch}
                    onChange={e => setRecipeIngSearch(e.target.value)}
                    placeholder="e.g. chicken breast"
                    style={{
                      width: '100%', padding: '10px 40px 10px 14px',
                      borderRadius: 10, boxSizing: 'border-box',
                      border: '1px solid var(--border)', fontSize: 14, outline: 'none',
                      background: 'var(--surface)', color: 'var(--text)',
                      fontFamily: 'inherit',
                    }}
                  />
                  {recipeIngSearching && (
                    <div style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      width: 16, height: 16, borderRadius: '50%',
                      border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
                      animation: 'spin 0.7s linear infinite',
                    }} />
                  )}
                  {!recipeIngSearching && recipeIngSearch && (
                    <button
                      onClick={() => { setRecipeIngSearch(''); setRecipeIngResults([]); setRecipeIngHasSearched(false) }}
                      style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: 'var(--muted)',
                        cursor: 'pointer', fontSize: 16, lineHeight: 1,
                      }}
                    >×</button>
                  )}
                </div>
              </div>

              {/* Ingredient search results */}
              {recipeIngResults.length > 0 && (
                <div style={{
                  marginBottom: 16,
                  border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
                }}>
                  {recipeIngResults.map((food, i) => (
                    <button
                      key={i}
                      onClick={() => addIngredient(food)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 12px', width: '100%', textAlign: 'left',
                        border: 'none',
                        borderBottom: i < recipeIngResults.length - 1 ? '1px solid var(--border)' : 'none',
                        background: 'var(--surface)', cursor: 'pointer', fontFamily: 'inherit',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
                    >
                      <div style={{ flex: 1, paddingRight: 8 }}>
                        <div style={{ fontSize: 14, color: 'var(--text)' }}>{food.food_name}</div>
                        {food.brand_name && (
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{food.brand_name}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {Math.round(food.nf_calories)} cal
                        </span>
                        <span style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1 }}>+</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {recipeIngHasSearched && !recipeIngSearching && recipeIngResults.length === 0 && recipeIngSearch.trim() && (
                <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
                  No results found.
                </p>
              )}

              {/* Added ingredients list */}
              {recipeIngredients.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Ingredients</div>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                    {recipeIngredients.map((food, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex', alignItems: 'center', padding: '10px 12px',
                          borderBottom: i < recipeIngredients.length - 1 ? '1px solid var(--border)' : 'none',
                          background: 'var(--surface)',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 14, color: 'var(--text)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {food.food_name}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                            {Math.round(food.nf_calories)} cal · {Math.round(food.nf_protein)}p · {Math.round(food.nf_total_carbohydrate)}c · {Math.round(food.nf_total_fat)}f
                          </div>
                        </div>
                        <button
                          onClick={() => setRecipeIngredients(prev => prev.filter((_, idx) => idx !== i))}
                          style={{
                            background: 'none', border: 'none', padding: '4px 8px',
                            color: 'var(--muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1,
                            flexShrink: 0,
                          }}
                        >×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Servings */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Servings this recipe makes</div>
                <input
                  type="number"
                  min="1"
                  value={recipeServings}
                  onChange={e => setRecipeServings(e.target.value)}
                  style={{
                    width: 80, padding: '10px 14px',
                    borderRadius: 10, boxSizing: 'border-box',
                    border: '1px solid var(--border)', fontSize: 14, outline: 'none',
                    background: 'var(--surface)', color: 'var(--text)',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Totals summary */}
              {recipeIngredients.length > 0 && (
                <div style={{
                  background: 'var(--surface)', borderRadius: 10,
                  border: '1px solid var(--border)',
                  padding: '12px 14px', marginBottom: 20,
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>Total</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {recipeTotals.calories} cal · {recipeTotals.protein}p · {recipeTotals.carbs}c · {recipeTotals.fat}f
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--text)' }}>Per serving</span>
                    <span style={{ fontSize: 13, color: 'var(--text)' }}>
                      {recipePerServing.calories} cal · {recipePerServing.protein}p · {recipePerServing.carbs}c · {recipePerServing.fat}f
                    </span>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleLogRecipe}
                  disabled={!canLogRecipe}
                  style={{
                    flex: 1, padding: '13px 0', borderRadius: 12, border: 'none',
                    background: canLogRecipe ? 'var(--text)' : 'var(--surface)',
                    color: canLogRecipe ? 'var(--bg)' : 'var(--muted)',
                    fontSize: 14, fontWeight: 600,
                    cursor: canLogRecipe ? 'pointer' : 'default',
                    fontFamily: 'inherit', transition: 'background 0.15s',
                  }}
                >
                  Log 1 Serving
                </button>
                <button
                  onClick={handleSaveAndLogRecipe}
                  disabled={!canLogRecipe}
                  style={{
                    flex: 1, padding: '13px 0', borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: canLogRecipe ? 'var(--text)' : 'var(--muted)',
                    fontSize: 14, fontWeight: 500,
                    cursor: canLogRecipe ? 'pointer' : 'default',
                    fontFamily: 'inherit', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (canLogRecipe) e.currentTarget.style.background = 'var(--surface)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  Save Recipe
                </button>
              </div>
            </>
          )}

          {/* ── Saved tab ── */}
          {mode === 'saved' && (
            <>
              {recipes.length === 0 && savedFoods.length === 0 && (
                <p style={{
                  color: 'var(--muted)', textAlign: 'center',
                  fontSize: 14, marginTop: 40, lineHeight: 1.6,
                }}>
                  No saved foods yet. Save a food or recipe from the detail screen.
                </p>
              )}

              {/* Recipes section */}
              {recipes.length > 0 && (
                <div style={{ marginBottom: savedFoods.length > 0 ? 24 : 0 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 600, color: 'var(--muted)',
                    letterSpacing: '0.08em', marginBottom: 8,
                  }}>RECIPES</div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {recipes.map((recipe, i) => {
                      const ps = recipePerServingMacros(recipe)
                      return (
                        <div
                          key={recipe.id}
                          style={{
                            display: 'flex', alignItems: 'center',
                            borderBottom: i < recipes.length - 1 ? '1px solid var(--border)' : 'none',
                            borderRadius: 8, transition: 'background 0.12s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <button
                            onClick={() => {
                              onBatchLog([{
                                food_name:             recipe.name,
                                brand_name:            null,
                                nf_calories:           ps.calories,
                                nf_protein:            ps.protein,
                                nf_total_carbohydrate: ps.carbs,
                                nf_total_fat:          ps.fat,
                                meal_time:             mealTime,
                              }], 'recipe')
                              handleClose()
                            }}
                            style={{
                              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                              background: 'none', border: 'none', cursor: 'pointer',
                              padding: '10px 4px 10px 12px', fontFamily: 'inherit', textAlign: 'left',
                            }}
                          >
                            <div style={{ fontSize: 14, color: 'var(--text)' }}>{recipe.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                              {ps.calories} cal · {ps.protein}p · {ps.carbs}c · {ps.fat}f per serving
                            </div>
                          </button>
                          <button
                            onClick={() => openRecipeForEdit(recipe)}
                            style={{
                              background: 'none', border: 'none', padding: '4px 8px',
                              color: 'var(--muted)', cursor: 'pointer', fontSize: 15, lineHeight: 1,
                              flexShrink: 0,
                            }}
                          >✎</button>
                          <button
                            onClick={() => onDeleteRecipe(recipe.id)}
                            style={{
                              background: 'none', border: 'none', padding: '4px 12px',
                              color: 'var(--muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1,
                              flexShrink: 0,
                            }}
                          >×</button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Saved foods section */}
              {savedFoods.length > 0 && (
                <>
                  <div style={{
                    fontSize: 11, fontWeight: 600, color: 'var(--muted)',
                    letterSpacing: '0.08em', marginBottom: 8,
                  }}>SAVED FOODS</div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {savedFoods.map((food, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex', alignItems: 'center',
                          borderBottom: i < savedFoods.length - 1 ? '1px solid var(--border)' : 'none',
                          borderRadius: 8, transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <button
                          onClick={() => handleSelect(food, 'saved')}
                          style={{
                            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '10px 4px 10px 12px', fontFamily: 'inherit', textAlign: 'left',
                          }}
                        >
                          <div style={{ fontSize: 14, color: 'var(--text)' }}>{food.food_name}</div>
                          {food.brand_name && (
                            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{food.brand_name}</div>
                          )}
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                            {Math.round(food.nf_calories)} cal · {Math.round(food.nf_protein)}p · {Math.round(food.nf_total_carbohydrate)}c · {Math.round(food.nf_total_fat)}f
                          </div>
                        </button>
                        <button
                          onClick={() => onToggleSave(food)}
                          style={{
                            background: 'none', border: 'none', padding: '4px 12px',
                            color: 'var(--muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1,
                            flexShrink: 0,
                          }}
                        >×</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </>
  )
}
