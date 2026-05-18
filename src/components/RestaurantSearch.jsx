import { useState } from 'react'
import { searchRestaurants, NUTRITIONIX_HAS_REAL_KEYS } from '../services/nutritionix'
import { usePro } from '../hooks/usePro'
import UpgradeModal from './UpgradeModal'

export default function RestaurantSearch({ session, mealTime, onLog }) {
  const { isPro, loading: proLoading } = usePro()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    const items = await searchRestaurants(query)
    setResults(items)
    setSearching(false)
  }

  const handleResultClick = async (item) => {
    if (!isPro) {
      setModalOpen(true)
      return
    }
    // Pro user — log it
    await onLog({
      ...item,
      meal_time: mealTime,
    })
  }

  return (
    <div style={{ padding: 16 }}>
      {/* Demo-mode notice when running on mocks */}
      {!NUTRITIONIX_HAS_REAL_KEYS && (
        <div style={{
          padding: 10, marginBottom: 12, borderRadius: 8,
          background: 'var(--surface2)', border: '1px dashed var(--border)',
          fontSize: 12, color: 'var(--muted)', textAlign: 'center',
        }}>
          Restaurant search is in preview — full database arrives June 1
        </div>
      )}

      {/* Search bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="search 200,000+ menu items..."
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 10,
            border: '1px solid var(--border)', fontSize: 14, outline: 'none',
            background: 'var(--surface)', color: 'var(--text)',
          }}
        />
        <button
          onClick={handleSearch}
          style={{
            padding: '10px 18px', borderRadius: 10, border: 'none',
            background: 'var(--text)', color: 'var(--bg)',
            fontSize: 14, cursor: 'pointer', minWidth: 72,
          }}
        >
          {searching ? '...' : 'search'}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div style={{
          border: '1px solid var(--border)', borderRadius: 10,
          overflow: 'hidden', background: 'var(--surface)',
        }}>
          {results.map((item, i) => (
            <RestaurantResultRow
              key={i}
              item={item}
              isPro={isPro}
              onClick={() => handleResultClick(item)}
            />
          ))}
        </div>
      )}

      {results.length === 0 && query && !searching && (
        <div style={{ textAlign: 'center', padding: 30, color: 'var(--muted)', fontSize: 13 }}>
          no results. try a restaurant name like "chipotle" or "starbucks"
        </div>
      )}

      {/* Powered by Nutritionix attribution (required on free tier) */}
      {results.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
          Powered by Nutritionix
        </div>
      )}

      <UpgradeModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}

function RestaurantResultRow({ item, isPro, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 14px', borderBottom: '1px solid var(--border)',
        cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', gap: 12, transition: 'background 0.15s',
        position: 'relative',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 500, color: 'var(--text)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {item.food_name}
        </div>
        <div style={{
          fontSize: 12, color: 'var(--muted)', display: 'flex',
          gap: 8, alignItems: 'center', marginTop: 2,
        }}>
          <span>{item.brand_name}</span>
          <span>•</span>
          <span>{Math.round(item.nf_calories)} cal</span>
          {!isPro && <span style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 4,
            background: 'var(--text)', color: 'var(--bg)', fontWeight: 600,
            letterSpacing: 0.3,
          }}>PRO</span>}
        </div>
      </div>

      {/* Macros — blurred for non-Pro */}
      <div style={{
        display: 'flex', gap: 10, fontSize: 11, color: 'var(--muted)',
        flexShrink: 0, filter: isPro ? 'none' : 'blur(5px)',
        userSelect: isPro ? 'auto' : 'none',
        pointerEvents: 'none', // already non-interactive
      }}>
        <span>P {Math.round(item.nf_protein)}</span>
        <span>C {Math.round(item.nf_total_carbohydrate)}</span>
        <span>F {Math.round(item.nf_total_fat)}</span>
      </div>
    </div>
  )
}