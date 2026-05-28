import { useState } from 'react'
import RestaurantSearch from './RestaurantSearch'
import BarcodeScanner from './BarcodeScanner'
import { searchUSDA } from '../services/usda'

// ─── Scoring (mirrors App.jsx) ───────────────────────────────────────────────
const scoreResult = (item, query) => {
  let score = 0
  const name = (item.food_name || '').toLowerCase()
  const brand = (item.brand_name || '').toLowerCase()
  const q = query.toLowerCase()

  // USDA uses comma-separated format: "Chicken, broilers or fryers, breast..."
  // Extract primary food (before first comma) to score separately
  const primaryName = name.split(',')[0].trim()
  const hasComma = primaryName !== name

  // Full name matching
  if (name === q) score += 100
  if (name.startsWith(q)) score += 50
  if (name.includes(q)) score += 25

  // Primary name matching (catches USDA comma-format foods)
  if (hasComma) {
    if (primaryName === q) score += 80
    if (primaryName.startsWith(q)) score += 40
    if (primaryName.includes(q)) score += 20
  }

  if (brand.includes(q)) score += 10

  // Multi-word query: all words present in full name or primary name
  const queryWords = q.split(/\s+/).filter(w => w.length > 1)
  if (queryWords.length > 1) {
    if (queryWords.every(w => name.includes(w))) score += 45
    if (hasComma && queryWords.every(w => primaryName.includes(w))) score += 20
  }

  // Macro completeness
  if (item.nf_calories > 0) score += 20
  if (item.nf_protein > 0) score += 5
  if (item.nf_total_carbohydrate > 0) score += 5
  if (item.nf_total_fat > 0) score += 5

  // Strong boost for USDA-verified data
  if (item.verified) score += 45

  // Length penalty — halved for verified items (names are intentionally verbose)
  score -= name.length * (item.verified ? 0.05 : 0.15)

  // Penalize non-ASCII (likely mistagged international products)
  const nonAscii = (item.food_name || '').match(/[^\x00-\x7F]/g)?.length || 0
  score -= nonAscii * 5

  return score
}

// ─── OFF fetch (mirrors App.jsx) ─────────────────────────────────────────────
const fetchOFF = async (query) => {
  const url =
    `https://world.openfoodfacts.org/cgi/search.pl` +
    `?search_terms=${encodeURIComponent(query)}` +
    `&search_simple=1&action=process&json=1&page_size=100` +
    `&fields=product_name,brands,nutriments,countries_tags`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)
      const data = await res.json()
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
          verified: false,
          source: 'off',
        }))
    } catch (e) {
      clearTimeout(timeoutId)
      if (attempt === 0) await new Promise(r => setTimeout(r, 400))
    }
  }
  return []
}

// ─── Mode Picker Tile ─────────────────────────────────────────────────────────
const ModeTile = ({ icon, label, badge, disabled, onClick }) => (
  <button
    onClick={disabled ? undefined : onClick}
    style={{
      position: 'relative',
      flex: '1 1 calc(50% - 6px)',
      minHeight: 100,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 10,
      borderRadius: 14,
      border: '1px solid var(--border)',
      background: 'var(--surface)',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'background 0.15s, border-color 0.15s',
    }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'var(--surface2)' }}
    onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)' }}
  >
    <span style={{ fontSize: 28 }}>{icon}</span>
    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{label}</span>
    {badge && (
      <span style={{
        position: 'absolute', top: 10, right: 10,
        fontSize: 9, padding: '2px 6px', borderRadius: 4,
        background: 'var(--text)', color: 'var(--bg)',
        fontWeight: 700, letterSpacing: '0.08em',
      }}>
        {badge}
      </span>
    )}
  </button>
)

// ─── Main component ───────────────────────────────────────────────────────────
const RESULTS_PER_PAGE = 8
const MEAL_TIMES = ['Breakfast', 'Lunch', 'Snack', 'Dinner']

export default function LogFoodSheet({ open, onClose, onSelect }) {
  const [mode, setMode] = useState(null) // null | 'grocery' | 'restaurant' | 'barcode' | 'voice'
  const [mealTime, setMealTime] = useState('Lunch')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [resultPage, setResultPage] = useState(0)

  const reset = () => {
    setMode(null)
    setSearch('')
    setResults([])
    setResultPage(0)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSelect = (item) => {
    onSelect(item, mealTime)
    handleClose()
  }

  const searchFood = async () => {
    if (!search.trim()) return
    setSearching(true)
    setResultPage(0)

    const [offItems, usdaItems] = await Promise.all([fetchOFF(search), searchUSDA(search)])
    const usOff = offItems.filter(p => p.countries?.includes('en:united-states'))
    const pool = usOff.length >= 5 ? usOff : offItems

    const sorted = [...pool, ...usdaItems]
      .map(item => ({ ...item, _score: scoreResult(item, search) }))
      .sort((a, b) => b._score - a._score)

    setResults(sorted)
    setSearching(false)
  }

  const pagedResults = results.slice(resultPage * RESULTS_PER_PAGE, (resultPage + 1) * RESULTS_PER_PAGE)
  const totalPages = Math.ceil(results.length / RESULTS_PER_PAGE)

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(2px)',
          zIndex: 100,
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        background: 'var(--bg)',
        borderRadius: '20px 20px 0 0',
        zIndex: 101,
        maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Drag Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '8px 20px 12px',
          borderBottom: '1px solid var(--border)',
        }}>
          {mode ? (
            <button
              onClick={reset}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 20, padding: '0 12px 0 0', lineHeight: 1 }}
            >
              ←
            </button>
          ) : (
            <div style={{ width: 32 }} />
          )}
          <h2 style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
            {mode === 'grocery' ? 'Grocery Search'
              : mode === 'restaurant' ? 'Restaurant'
              : mode === 'barcode' ? 'Scan Barcode'
              : mode === 'voice' ? 'Voice Log'
              : 'Log Food'}
          </h2>
          <button
            onClick={handleClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 20, padding: '0 0 0 12px', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Meal Time Selector — shown whenever a mode is active */}
        {mode && mode !== 'barcode' && (
          <div style={{ display: 'flex', gap: 6, padding: '10px 20px 0' }}>
            {MEAL_TIMES.map(t => (
              <button key={t} onClick={() => setMealTime(t)} style={{
                fontSize: 12, padding: '5px 12px', borderRadius: 20,
                border: mealTime === t ? '1.5px solid var(--text)' : '1px solid var(--border)',
                background: mealTime === t ? 'var(--text)' : 'none',
                color: mealTime === t ? 'var(--bg)' : 'var(--muted)',
                cursor: 'pointer', flex: 1,
              }}>{t.toLowerCase()}</button>
            ))}
          </div>
        )}

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

          {/* ── Mode Picker ── */}
          {!mode && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <ModeTile icon="⬛" label="Scan Barcode" onClick={() => setMode('barcode')} />
              <ModeTile icon="🔍" label="Grocery Search" onClick={() => setMode('grocery')} />
              <ModeTile icon="🍽️" label="Restaurant" badge="PRO" onClick={() => setMode('restaurant')} />
              <ModeTile icon="🎙️" label="Voice Log" badge="SOON" disabled />
            </div>
          )}

          {/* ── Barcode Mode ── */}
          {mode === 'barcode' && (
            <div>
              {/* Meal time inside barcode mode */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                {MEAL_TIMES.map(t => (
                  <button key={t} onClick={() => setMealTime(t)} style={{
                    fontSize: 12, padding: '5px 12px', borderRadius: 20,
                    border: mealTime === t ? '1.5px solid var(--text)' : '1px solid var(--border)',
                    background: mealTime === t ? 'var(--text)' : 'none',
                    color: mealTime === t ? 'var(--bg)' : 'var(--muted)',
                    cursor: 'pointer', flex: 1,
                  }}>{t.toLowerCase()}</button>
                ))}
              </div>
              <BarcodeScanner
                onResult={(food) => handleSelect(food)}
                onClose={() => setMode('grocery')}
              />
            </div>
          )}

          {/* ── Grocery Mode ── */}
          {mode === 'grocery' && (
            <>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchFood()}
                  placeholder="search any food..."
                  autoFocus
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
                      display: 'inline-block', width: 16, height: 16,
                      border: '2px solid var(--bg)', borderTopColor: 'transparent',
                      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                    }} />
                  ) : 'search'}
                </button>
              </div>

              {results.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--surface)' }}>
                    {pagedResults.map((item, i) => (
                      <div
                        key={i}
                        onClick={() => handleSelect(item)}
                        style={{
                          padding: '10px 14px', borderBottom: '1px solid var(--border)',
                          cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.food_name}
                          </div>
                          {(item.brand_name || item.verified) && (
                            <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                              {item.brand_name && <span>{item.brand_name}</span>}
                              {item.verified && (
                                <span style={{ fontSize: 9, color: '#1D9E75', fontWeight: 700, letterSpacing: '0.08em' }}>
                                  VERIFIED
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', flexShrink: 0 }}>
                          {Math.round(item.nf_calories || 0)} cal
                        </div>
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 10 }}>
                      <button
                        onClick={() => setResultPage(p => Math.max(0, p - 1))}
                        disabled={resultPage === 0}
                        style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', color: resultPage === 0 ? 'var(--border)' : 'var(--text)', cursor: resultPage === 0 ? 'default' : 'pointer', fontSize: 13 }}
                      >←</button>
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                        {resultPage + 1} of {totalPages}
                      </span>
                      <button
                        onClick={() => setResultPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={resultPage === totalPages - 1}
                        style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', color: resultPage === totalPages - 1 ? 'var(--border)' : 'var(--text)', cursor: resultPage === totalPages - 1 ? 'default' : 'pointer', fontSize: 13 }}
                      >→</button>
                    </div>
                  )}
                  {/* Verified note */}
                  {results.some(r => r.verified) && (
                    <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10, marginBottom: 0, lineHeight: 1.5 }}>
                      <span style={{ color: '#1D9E75', fontWeight: 700 }}>VERIFIED</span> — USDA Foundation or SR Legacy data, validated by registered dietitians.
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Restaurant Mode ── */}
          {mode === 'restaurant' && (
            <RestaurantSearch onSelect={handleSelect} />
          )}

        </div>
      </div>
    </>
  )
}
