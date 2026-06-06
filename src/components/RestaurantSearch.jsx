import { useState, useEffect } from 'react'
import { getChainMenuItems, CHAIN_NAMES } from '../services/nutritionix'

// ─── Chain display metadata ───────────────────────────────────────────────────
const CHAIN_META = {
  "Arby's":              { icon: '🥩', color: '#C8102E' },
  'Buffalo Wild Wings':  { icon: '🍗', color: '#F7941D' },
  'Burger King':         { icon: '👑', color: '#D62300' },
  'Cava':                { icon: '🫙', color: '#C8A876' },
  'Chick-fil-A':         { icon: '🐔', color: '#DD0031' },
  'Chipotle':            { icon: '🌯', color: '#A81612' },
  "Culver's":            { icon: '🧀', color: '#003087' },
  "Domino's":            { icon: '🍕', color: '#006491' },
  'Dutch Bros':          { icon: '☕', color: '#1B75BC' },
  'Five Guys':           { icon: '🍔', color: '#D71920' },
  'In-N-Out Burger':     { icon: '🍔', color: '#D41C36' },
  "Jersey Mike's":       { icon: '🥖', color: '#CE1126' },
  "Jimmy John's":        { icon: '🥖', color: '#1B2A4A' },
  'KFC':                 { icon: '🍗', color: '#F40027' },
  "McDonald's":          { icon: '🍟', color: '#FFC72C' },
  'Noodles & Company':   { icon: '🍜', color: '#E8611A' },
  'Panda Express':       { icon: '🐼', color: '#C8102E' },
  'Panera Bread':        { icon: '🥗', color: '#4E7B2E' },
  'Popeyes':             { icon: '🍗', color: '#F28C00' },
  'Qdoba':               { icon: '🌮', color: '#D52B1E' },
  "Raising Cane's":      { icon: '🍗', color: '#FDB913' },
  'Shake Shack':         { icon: '🍔', color: '#6DBE45' },
  'Starbucks':           { icon: '☕', color: '#00704A' },
  'Subway':              { icon: '🥖', color: '#009246' },
  'Sweetgreen':          { icon: '🥗', color: '#4C7B3A' },
  'Taco Bell':           { icon: '🌮', color: '#702082' },
  "Wendy's":             { icon: '🍔', color: '#D62300' },
  'Wingstop':            { icon: '🍗', color: '#C8102E' },
}

// ─── Menu section inference ───────────────────────────────────────────────────
const SECTION_ORDER = [
  'Breakfast', 'Bowls', 'Burritos', 'Tacos', 'Quesadillas',
  'Burgers', 'Sandwiches & Wraps', 'Chicken', 'Pizza',
  'Salads', 'Soups', 'Sides', 'Drinks', 'Shakes & Desserts', 'Entrées',
]

function inferSection(food_name) {
  const n = food_name.toLowerCase()
  if (/latte|macchiato|cold brew|americano|refresher|chai|coffee|rebel|espresso/.test(n)) return 'Drinks'
  if (/\bshake\b|concrete mixer|frosty/.test(n))                             return 'Shakes & Desserts'
  if (/\begg\b|biscuit|mcmuffin|mcgriddle|croissan|scrambler/.test(n))      return 'Breakfast'
  if (/\bbowl\b/.test(n))                                                    return 'Bowls'
  if (/\bburrito\b/.test(n))                                                 return 'Burritos'
  if (/\btacos?\b/.test(n))                                                  return 'Tacos'
  if (/quesadilla/.test(n))                                                  return 'Quesadillas'
  if (/burger|whopper|double-double|shackburger|baconator|butterburger/.test(n)) return 'Burgers'
  if (/sandwich|sub|wrap|pita|panini|melt|club/.test(n))                     return 'Sandwiches & Wraps'
  if (/\bsalad\b/.test(n))                                                   return 'Salads'
  if (/\bsoup\b/.test(n))                                                    return 'Soups'
  if (/\bpizza\b/.test(n))                                                   return 'Pizza'
  if (/wing|nugget|tender|finger/.test(n))                                   return 'Chicken'
  if (/fries|curly|corn\b|coleslaw|cole slaw|mashed|fried rice|chow mein|toast|bites|crinkle/.test(n)) return 'Sides'
  return 'Entrées'
}

function groupBySection(items) {
  const groups = {}
  for (const item of items) {
    const s = inferSection(item.food_name)
    if (!groups[s]) groups[s] = []
    groups[s].push(item)
  }
  return SECTION_ORDER.filter(s => groups[s]).map(s => ({ section: s, items: groups[s] }))
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
const RECENT_KEY = 'tc_recent_chains'
const MAX_RECENT = 6

function getRecentChains() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}

function addRecentChain(name) {
  const current = getRecentChains().filter(n => n !== name)
  localStorage.setItem(RECENT_KEY, JSON.stringify([name, ...current].slice(0, MAX_RECENT)))
}

// ─────────────────────────────────────────────────────────────────────────────
// MACRO PILL
// ─────────────────────────────────────────────────────────────────────────────
function MacroPill({ label, value }) {
  return (
    <span style={{
      fontSize: 11, color: 'var(--muted)',
      background: 'var(--surface2)', borderRadius: 5,
      padding: '2px 5px', flexShrink: 0,
    }}>
      {label} {Math.round(value)}g
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MENU ROW
// ─────────────────────────────────────────────────────────────────────────────
function MenuRow({ item, isLast, onSelect }) {
  const [pressed, setPressed] = useState(false)

  return (
    <button
      onClick={() => onSelect(item)}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 0',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        borderTop: 'none', borderLeft: 'none', borderRight: 'none',
        background: 'transparent',
        cursor: 'pointer', textAlign: 'left', width: '100%',
        fontFamily: 'inherit',
        opacity: pressed ? 0.65 : 1,
        transform: pressed ? 'scale(0.99)' : 'scale(1)',
        transition: 'opacity 0.1s, transform 0.1s',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 500, color: 'var(--text)',
          marginBottom: 4,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {item.food_name}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <MacroPill label="P" value={item.nf_protein} />
          <MacroPill label="C" value={item.nf_total_carbohydrate} />
          <MacroPill label="F" value={item.nf_total_fat} />
          {item.serving_qty && item.serving_unit && (
            <span style={{ fontSize: 11, color: 'var(--muted)', opacity: 0.6 }}>
              · {item.serving_qty} {item.serving_unit}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
            {Math.round(item.nf_calories)}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: -1 }}>cal</div>
        </div>
        <span style={{ color: 'var(--muted)', fontSize: 18, opacity: 0.3 }}>›</span>
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAIN MENU VIEW
// ─────────────────────────────────────────────────────────────────────────────
function ChainMenu({ chainName, onSelect, onBack }) {
  const [allItems, setAllItems] = useState([])
  const [loading, setLoading]   = useState(true)
  const [menuQuery, setMenuQuery] = useState('')

  const meta = CHAIN_META[chainName] || { icon: '🍽️', color: '#888' }

  useEffect(() => {
    setLoading(true)
    getChainMenuItems(chainName)
      .then(items => { setAllItems(items); setLoading(false) })
      .catch(() => setLoading(false))
  }, [chainName])

  const filtered = menuQuery.trim()
    ? allItems.filter(item => item.food_name.toLowerCase().includes(menuQuery.toLowerCase()))
    : allItems

  const grouped = groupBySection(filtered)

  return (
    <div style={{ animation: 'fadeIn 0.18s ease both' }}>

      {/* Chain header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 14, paddingBottom: 14,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, background: `${meta.color}15`,
          border: `1px solid ${meta.color}25`,
        }}>
          {meta.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{chainName}</div>
          {!loading && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
              {allItems.length} item{allItems.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
        <button
          onClick={onBack}
          style={{
            fontSize: 12, color: 'var(--muted)', background: 'none',
            border: '1px solid var(--border)', cursor: 'pointer',
            padding: '5px 10px', borderRadius: 8, fontFamily: 'inherit',
          }}
        >← Back</button>
      </div>

      {/* Menu search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <span style={{
          position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
          fontSize: 14, pointerEvents: 'none', opacity: 0.4,
        }}>🔍</span>
        <input
          value={menuQuery}
          onChange={e => setMenuQuery(e.target.value)}
          placeholder={`Search ${chainName} menu…`}
          style={{
            width: '100%', padding: '9px 36px 9px 32px',
            borderRadius: 10, boxSizing: 'border-box',
            border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text)',
            fontSize: 13, fontFamily: 'inherit', outline: 'none',
          }}
        />
        {menuQuery && (
          <button
            onClick={() => setMenuQuery('')}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--muted)',
              cursor: 'pointer', fontSize: 16, lineHeight: 1,
            }}
          >×</button>
        )}
      </div>

      {/* Loading spinner */}
      {loading && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 12, padding: '40px 0', color: 'var(--muted)',
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            border: '2.5px solid var(--border)', borderTopColor: 'var(--accent)',
            animation: 'spin 0.7s linear infinite',
          }} />
          <span style={{ fontSize: 13 }}>Loading menu…</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <p style={{ color: 'var(--muted)', fontSize: 14, textAlign: 'center', marginTop: 24 }}>
          {menuQuery ? `No items match "${menuQuery}"` : 'No items found.'}
        </p>
      )}

      {/* Grouped menu sections */}
      {!loading && grouped.map(({ section, items }) => (
        <div key={section} style={{ marginBottom: 22 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--muted)',
            letterSpacing: '0.09em', textTransform: 'uppercase',
            paddingBottom: 6, marginBottom: 2,
            borderBottom: '1px solid var(--border)',
          }}>
            {section}
          </div>
          <div>
            {items.map((item, i) => (
              <MenuRow
                key={i}
                item={item}
                isLast={i === items.length - 1}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      ))}

      <div style={{ height: 8 }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAIN PICKER
// ─────────────────────────────────────────────────────────────────────────────
function ChainPicker({ onSelect }) {
  const [query, setQuery]               = useState('')
  const [recentChains, setRecentChains] = useState(getRecentChains)

  const handleSelect = (chainName) => {
    addRecentChain(chainName)
    setRecentChains(getRecentChains())
    onSelect(chainName)
  }

  const allChains  = (CHAIN_NAMES.length > 0 ? CHAIN_NAMES : Object.keys(CHAIN_META).sort())
  const filtered   = allChains.filter(name => name.toLowerCase().includes(query.toLowerCase()))
  const recent     = recentChains.filter(name => allChains.includes(name))
  const showRecent = recent.length > 0 && !query.trim()

  return (
    <div style={{ animation: 'fadeIn 0.2s ease both' }}>

      {/* Search input */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <span style={{
          position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
          fontSize: 15, pointerEvents: 'none', opacity: 0.4,
        }}>🔍</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search restaurants…"
          autoFocus
          style={{
            width: '100%', padding: '10px 12px 10px 34px',
            borderRadius: 10, boxSizing: 'border-box',
            border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text)',
            fontSize: 14, fontFamily: 'inherit', outline: 'none',
          }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--muted)',
              cursor: 'pointer', fontSize: 16, lineHeight: 1,
            }}
          >×</button>
        )}
      </div>

      {/* Recently used chips */}
      {showRecent && (
        <div style={{ marginBottom: 18 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--muted)',
            letterSpacing: '0.08em', marginBottom: 8,
          }}>RECENTLY USED</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {recent.map(name => {
              const meta = CHAIN_META[name] || { icon: '🍽️' }
              return (
                <button
                  key={name}
                  onClick={() => handleSelect(name)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 12px', borderRadius: 20,
                    border: '1px solid var(--accent)',
                    background: 'rgba(29,158,117,0.07)',
                    cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 13, fontWeight: 500, color: 'var(--text)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(29,158,117,0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(29,158,117,0.07)'}
                >
                  <span style={{ fontSize: 16 }}>{meta.icon}</span>
                  {name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Section label */}
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--muted)',
        letterSpacing: '0.08em', marginBottom: 8,
      }}>
        {query.trim()
          ? `${filtered.length} RESULT${filtered.length !== 1 ? 'S' : ''}`
          : `ALL RESTAURANTS (${filtered.length})`}
      </div>

      {/* No results */}
      {filtered.length === 0 && (
        <p style={{ color: 'var(--muted)', fontSize: 14, textAlign: 'center', marginTop: 24 }}>
          No restaurants match "{query}"
        </p>
      )}

      {/* 3-column grid of chain cards */}
      {filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {filtered.map(name => {
            const meta = CHAIN_META[name] || { icon: '🍽️', color: '#888' }
            return (
              <button
                key={name}
                onClick={() => handleSelect(name)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '14px 8px 12px', borderRadius: 12,
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  cursor: 'pointer', fontFamily: 'inherit',
                  gap: 6, transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
              >
                <span style={{ fontSize: 28, lineHeight: 1 }}>{meta.icon}</span>
                <span style={{
                  fontSize: 11, color: 'var(--text)', textAlign: 'center',
                  lineHeight: 1.3, fontWeight: 500,
                  display: '-webkit-box', WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {name}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export default function RestaurantSearch({ onSelect }) {
  const [selectedChain, setSelectedChain] = useState(null)

  return selectedChain ? (
    <ChainMenu
      chainName={selectedChain}
      onSelect={onSelect}
      onBack={() => setSelectedChain(null)}
    />
  ) : (
    <ChainPicker onSelect={setSelectedChain} />
  )
}
