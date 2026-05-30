import { useState, useEffect, useRef } from 'react'
import RestaurantSearch from './RestaurantSearch'
import BarcodeScanner from './BarcodeScanner'
import { searchUSDA } from '../services/usda'
import VoiceLogger from './VoiceLogger'

// ─── Animations ───────────────────────────────────────────────────────────────
const SHEET_ANIM_MS = 300

// ─── Scoring ─────────────────────────────────────────────────────────────────
const scoreResult = (item, query) => {
  let score = 0
  const name  = (item.food_name  || '').toLowerCase()
  const brand = (item.brand_name || '').toLowerCase()
  const q = query.toLowerCase()

  const primaryName = name.split(',')[0].trim()
  const hasComma    = primaryName !== name

  if (name === q)            score += 100
  if (name.startsWith(q))   score += 50
  if (name.includes(q))     score += 25

  if (hasComma) {
    if (primaryName === q)           score += 80
    if (primaryName.startsWith(q))  score += 40
    if (primaryName.includes(q))    score += 20
  }

  if (brand.includes(q)) score += 10

  const queryWords = q.split(/\s+/).filter(w => w.length > 1)
  if (queryWords.length > 1) {
    if (queryWords.every(w => name.includes(w)))        score += 45
    if (hasComma && queryWords.every(w => primaryName.includes(w))) score += 20
  }

  if (item.nf_calories            > 0) score += 20
  if (item.nf_protein             > 0) score += 5
  if (item.nf_total_carbohydrate  > 0) score += 5
  if (item.nf_total_fat           > 0) score += 5
  if (item.verified)                   score += 45

  score -= name.length * (item.verified ? 0.05 : 0.15)

  const nonAscii = (item.food_name || '').match(/[^\x00-\x7F]/g)?.length || 0
  score -= nonAscii * 5

  return score
}

// ─── OFF fetch ────────────────────────────────────────────────────────────────
const fetchOFF = async (query) => {
  const url =
    `https://world.openfoodfacts.org/cgi/search.pl` +
    `?search_terms=${encodeURIComponent(query)}` +
    `&search_simple=1&action=process&json=1&page_size=100` +
    `&fields=product_name,brands,nutriments,countries_tags`

  const controller = new AbortController()
  const timeoutId  = setTimeout(() => controller.abort(), 8000)

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res  = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)
      const data = await res.json()
      if (!data?.products) return []
      return data.products
        .filter(p => p.product_name && p.nutriments?.['energy-kcal_serving'])
        .map(p => ({
          food_name:             p.product_name,
          brand_name:            p.brands || null,
          nf_calories:           Math.round(p.nutriments['energy-kcal_serving']    || 0),
          nf_protein:            Math.round(p.nutriments['proteins_serving']        || 0),
          nf_total_carbohydrate: Math.round(p.nutriments['carbohydrates_serving']  || 0),
          nf_total_fat:          Math.round(p.nutriments['fat_serving']            || 0),
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

// ─── Mode Tile ────────────────────────────────────────────────────────────────
const ModeTile = ({ icon, label, badge, disabled, onClick, animDelay = 0 }) => (
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

const RESULTS_PER_PAGE = 8
const MEAL_TIMES = ['Breakfast', 'Lunch', 'Snack', 'Dinner']

// ─── Main component ───────────────────────────────────────────────────────────
export default function LogFoodSheet({ open, onClose, onSelect, savedFoods = [] }) {
  const [mode, setMode]             = useState(null)
  const [mealTime, setMealTime]     = useState('Lunch')
  const [search, setSearch]         = useState('')
  const [results, setResults]       = useState([])
  const [searching, setSearching]   = useState(false)
  const [resultPage, setResultPage] = useState(0)

  // ── Sheet animation state ──
  const [visible, setVisible]     = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const closeTimer                = useRef(null)

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
    const pool  = usOff.length >= 5 ? usOff : offItems
    const sorted = [...pool, ...usdaItems]
      .map(item => ({ ...item, _score: scoreResult(item, search) }))
      .sort((a, b) => b._score - a._score)
    setResults(sorted)
    setSearching(false)
  }

  const pagedResults = results.slice(resultPage * RESULTS_PER_PAGE, (resultPage + 1) * RESULTS_PER_PAGE)
  const totalPages   = Math.ceil(results.length / RESULTS_PER_PAGE)

  if (!visible) return null

  const modeTitle = {
    grocery:    'Grocery Search',
    restaurant: 'Restaurant',
    barcode:    'Scan Barcode',
    voice:      'Voice Log',
  }

  const sheetAnim   = isClosing
    ? `sheetExit ${SHEET_ANIM_MS}ms cubic-bezier(0.4, 0, 1, 1) forwards`
    : `sheetEnter ${SHEET_ANIM_MS}ms cubic-bezier(0.32, 0.72, 0, 1) both`

  const backdropAnim = isClosing
    ? `backdropFadeOut ${SHEET_ANIM_MS}ms ease forwards`
    : `backdropFadeIn ${SHEET_ANIM_MS}ms ease both`

  return (
    <>
      <style>{`
        @keyframes sheetEnter      { from { transform: translateX(-50%) translateY(100%); } to { transform: translateX(-50%) translateY(0); } }
        @keyframes sheetExit       { from { transform: translateX(-50%) translateY(0); } to { transform: translateX(-50%) translateY(100%); } }
        @keyframes backdropFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes backdropFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes spin            { to { transform: rotate(360deg); } }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          zIndex: 100,
          animation: backdropAnim,
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        background: 'var(--bg)',
        borderRadius: '20px 20px 0 0',
        zIndex: 101,
        maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: sheetAnim,
      }}>

        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '8px 20px 10px',
          borderBottom: '1px solid var(--border)',
        }}>
          {mode ? (
            <button
              onClick={reset}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--muted)', fontSize: 20, padding: '0 12px 0 0', lineHeight: 1,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
            >←</button>
          ) : <div style={{ width: 32 }} />}

          <h2 style={{
            flex: 1, textAlign: 'center', fontSize: 16,
            fontWeight: 600, color: 'var(--text)', margin: 0,
          }}>
            {mode ? modeTitle[mode] : 'Log Food'}
          </h2>

          <button
            onClick={handleClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--muted)', fontSize: 20, padding: '0 0 0 12px', lineHeight: 1,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
          >×</button>
        </div>

        {/* Meal time selector — always visible */}
        <div style={{ display: 'flex', gap: 6, padding: '10px 20px 0' }}>
          {MEAL_TIMES.map(t => (
            <button
              key={t}
              onClick={() => setMealTime(t)}
              style={{
                fontSize: 12, padding: '5px 0', borderRadius: 20,
                border: mealTime === t ? '1.5px solid var(--text)' : '1px solid var(--border)',
                background: mealTime === t ? 'var(--text)' : 'none',
                color: mealTime === t ? 'var(--bg)' : 'var(--muted)',
                cursor: 'pointer', flex: 1, textAlign: 'center',
                transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                fontFamily: 'inherit',
              }}
            >{t.toLowerCase()}</button>
          ))}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

          {/* ── Mode picker ── */}
          {!mode && (
            <>
              {/* Saved foods — staggered entrance */}
              {savedFoods.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 600, color: 'var(--muted)',
                    letterSpacing: '0.08em', marginBottom: 8,
                  }}>SAVED FOODS</div>
                  <div style={{
                    border: '1px solid var(--border)', borderRadius: 10,
                    overflow: 'hidden', background: 'var(--surface)',
                  }}>
                    {savedFoods.map((food, i) => (
                      <div
                        key={food.id}
                        onClick={() => handleSelect(food)}
                        style={{
                          padding: '10px 14px',
                          borderBottom: i < savedFoods.length - 1 ? '1px solid var(--border)' : 'none',
                          cursor: 'pointer',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          transition: 'background 0.15s',
                          animation: `slideInUp 0.3s ease both`,
                          animationDelay: `${i * 0.045}s`,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                          <div style={{
                            fontSize: 14, fontWeight: 500, color: 'var(--text)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {food.food_name}
                          </div>
                          {food.brand_name && (
                            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                              {food.brand_name}
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>
                          {Math.round(food.nf_calories)} cal
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode tiles — staggered entrance */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <ModeTile icon="📷"  label="Scan Barcode"   animDelay={0}    onClick={() => setMode('barcode')} />
                <ModeTile icon="🔍"  label="Grocery Search" animDelay={0.05} onClick={() => setMode('grocery')} />
                <ModeTile icon="🍽️" label="Restaurant"     animDelay={0.1}  badge="PRO"  onClick={() => setMode('restaurant')} />
                <ModeTile
                  icon="🎙️"
                  label="Voice Log"
                  animDelay={0.15}
                  badge="PRO"
                  onClick={() => {
                    if (!isPro && !isTrialing) { setShowUpgrade(true); return }
                    setMode('voice')
                  }}
                />
              </div>
            </>
          )}

          {/* ── Barcode ── */}
          {mode === 'barcode' && (
            <BarcodeScanner
              onResult={(food) => handleSelect(food)}
              onClose={() => setMode('grocery')}
            />
          )}

          {/* ── Grocery ── */}
          {mode === 'grocery' && (
            <>
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
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={searchFood}
                  disabled={searching}
                  style={{
                    padding: '10px 18px', borderRadius: 10, border: 'none',
                    background: 'var(--text)', color: 'var(--bg)',
                    fontSize: 14, cursor: searching ? 'default' : 'pointer',
                    minWidth: 72, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'inherit', transition: 'opacity 0.15s',
                  }}
                >
                  {searching ? (
                    <span style={{
                      display: 'inline-block', width: 16, height: 16,
                      border: '2px solid var(--bg)', borderTopColor: 'transparent',
                      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                    }} />
                  ) : 'search'}
                </button>
              </div>

              {/* Results — keyed so stagger re-fires on each new search or page change */}
              {results.length > 0 && (
                <div key={`${resultPage}-${results.length}`} style={{ marginBottom: 20 }}>
                  <div style={{
                    border: '1px solid var(--border)', borderRadius: 10,
                    overflow: 'hidden', background: 'var(--surface)',
                  }}>
                    {pagedResults.map((item, i) => (
                      <div
                        key={i}
                        onClick={() => handleSelect(item)}
                        style={{
                          padding: '10px 14px',
                          borderBottom: i < pagedResults.length - 1 ? '1px solid var(--border)' : 'none',
                          cursor: 'pointer',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          transition: 'background 0.15s',
                          animation: `slideInUp 0.28s ease both`,
                          animationDelay: `${i * 0.035}s`,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                          <div style={{
                            fontSize: 14, fontWeight: 500, color: 'var(--text)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {item.food_name}
                          </div>
                          {(item.brand_name || item.verified) && (
                            <div style={{
                              fontSize: 12, color: 'var(--muted)',
                              display: 'flex', alignItems: 'center', gap: 8, marginTop: 2,
                            }}>
                              {item.brand_name && <span>{item.brand_name}</span>}
                              {item.verified && (
                                <span style={{
                                  fontSize: 9, color: '#1D9E75',
                                  fontWeight: 700, letterSpacing: '0.08em',
                                }}>VERIFIED</span>
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
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 12, marginTop: 10,
                    }}>
                      <button
                        onClick={() => setResultPage(p => Math.max(0, p - 1))}
                        disabled={resultPage === 0}
                        style={{
                          padding: '6px 14px', borderRadius: 8,
                          border: '1px solid var(--border)', background: 'none',
                          color: resultPage === 0 ? 'var(--border)' : 'var(--text)',
                          cursor: resultPage === 0 ? 'default' : 'pointer', fontSize: 13,
                          transition: 'color 0.15s',
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
                          transition: 'color 0.15s',
                        }}
                      >→</button>
                    </div>
                  )}

                  {results.some(r => r.verified) && (
                    <p style={{
                      fontSize: 11, color: 'var(--muted)',
                      marginTop: 10, marginBottom: 0, lineHeight: 1.5,
                    }}>
                      <span style={{ color: '#1D9E75', fontWeight: 700 }}>VERIFIED</span>
                      {' '}— USDA Foundation or SR Legacy data, validated by registered dietitians.
                    </p>
                  )}
                </div>
              )}

              {results.length === 0 && !searching && search.trim() && (
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
            <RestaurantSearch onSelect={handleSelect} />
          )}
          
          {mode === 'voice' && (
            <VoiceLogger
              mealTime={selectedMealTime}
              onLog={(food, servings) => {
                onSelectFood(food)   // opens FoodDetailModal with pre-filled data
                // OR if you want to log directly without the detail modal:
                // handleLog(food, servings)
              }}
              onBack={() => setMode(null)}
            />
          )}          

        </div>
      </div>
    </>
  )
}
