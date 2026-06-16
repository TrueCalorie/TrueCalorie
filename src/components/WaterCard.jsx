import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

const GOAL_OZ     = 80
const WATER_COLOR = '#38bdf8'
const QUICK_ADDS  = [8, 16, 32]
const COLLAPSE_AT = 4

const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

export default function WaterCard({ session }) {
  const [entries,    setEntries]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [adding,     setAdding]     = useState(false)
  const [customMode, setCustomMode] = useState(false)
  const [customVal,  setCustomVal]  = useState('')
  const [lastId,     setLastId]     = useState(null)
  const [justAdded,  setJustAdded]  = useState(0)
  const [expanded,   setExpanded]   = useState(false)
  const undoTimer = useRef(null)

  useEffect(() => {
    fetchToday()
    return () => clearTimeout(undoTimer.current)
  }, [session])

  const fetchToday = async () => {
    try {
      const now   = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

      const { data } = await supabase
        .from('water_logs')
        .select('id, amount_oz, logged_at')
        .eq('user_id', session.user.id)
        .gte('logged_at', start.toISOString())
        .lte('logged_at', end.toISOString())
        .order('logged_at', { ascending: true })

      if (data) setEntries(data)
    } catch {}
    setLoading(false)
  }

  const addWater = async (oz) => {
    if (adding) return
    setAdding(true)

    const { data, error } = await supabase
      .from('water_logs')
      .insert({ user_id: session.user.id, amount_oz: oz })
      .select('id, amount_oz, logged_at')
      .single()

    if (!error && data) {
      setEntries(prev => [...prev, data])
      setLastId(data.id)
      setJustAdded(oz)

      // Clear undo availability after 5 seconds
      clearTimeout(undoTimer.current)
      undoTimer.current = setTimeout(() => {
        setLastId(null)
        setJustAdded(0)
      }, 5000)
    }
    setAdding(false)
  }

  const undo = async () => {
    if (!lastId) return
    await supabase.from('water_logs').delete().eq('id', lastId)
    setEntries(prev => prev.filter(e => e.id !== lastId))
    setLastId(null)
    setJustAdded(0)
    clearTimeout(undoTimer.current)
  }

  const deleteEntry = async (id) => {
    await supabase.from('water_logs').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
    // If we just removed the entry the Undo button referred to, retire the prompt.
    if (id === lastId) {
      setLastId(null)
      setJustAdded(0)
      clearTimeout(undoTimer.current)
    }
  }

  const handleCustomSubmit = async () => {
    const oz = parseFloat(customVal)
    if (!oz || oz <= 0) return
    await addWater(Math.round(oz))
    setCustomVal('')
    setCustomMode(false)
  }

  if (loading) return null

  // Total always derives from the entries so the two can never drift apart.
  const todayOz   = Math.round(entries.reduce((sum, e) => sum + Number(e.amount_oz), 0))
  const pct       = Math.min((todayOz / GOAL_OZ) * 100, 100)
  const remaining = Math.max(GOAL_OZ - todayOz, 0)
  const goalHit   = todayOz >= GOAL_OZ

  // Newest first; collapse to the most recent few unless expanded.
  const sorted  = [...entries].sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at))
  const visible = expanded ? sorted : sorted.slice(0, COLLAPSE_AT)

  return (
    <div>
      {/* Amount + progress */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'baseline', marginBottom: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: goalHit ? '#1D9E75' : 'var(--text)' }}>
              {todayOz}
            </span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>oz</span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {goalHit ? '' : `${remaining} oz to go`}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          height: 7, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 4,
            background: goalHit ? '#1D9E75' : WATER_COLOR,
            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease',
          }} />
        </div>

        {/* Goal label */}
        <div style={{
          fontSize: 10, color: 'var(--muted)', marginTop: 5, textAlign: 'right',
        }}>
          goal: {GOAL_OZ} oz
        </div>
      </div>

      {/* Quick add / custom input */}
      {!customMode ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {QUICK_ADDS.map(oz => (
            <button
              key={oz}
              onClick={() => addWater(oz)}
              disabled={adding}
              style={{
                flex: 1, padding: '9px 0',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, fontSize: 13, fontWeight: 500,
                color: 'var(--text)', cursor: adding ? 'default' : 'pointer',
                fontFamily: 'inherit', opacity: adding ? 0.5 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              +{oz} oz
            </button>
          ))}
          <button
            onClick={() => setCustomMode(true)}
            title="Custom amount"
            style={{
              padding: '9px 14px',
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 10, fontSize: 14, color: 'var(--muted)',
              cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1,
            }}
          >
            ···
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            value={customVal}
            onChange={e => setCustomVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCustomSubmit()
              if (e.key === 'Escape') { setCustomMode(false); setCustomVal('') }
            }}
            placeholder="oz"
            autoFocus
            style={{
              flex: 1, padding: '9px 12px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, fontSize: 14, color: 'var(--text)',
              fontFamily: 'inherit', outline: 'none', MozAppearance: 'textfield',
            }}
          />
          <button
            onClick={handleCustomSubmit}
            style={{
              padding: '9px 16px', background: 'var(--text)', color: 'var(--bg)',
              border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Add
          </button>
          <button
            onClick={() => { setCustomMode(false); setCustomVal('') }}
            style={{
              padding: '9px 12px', background: 'none', border: '1px solid var(--border)',
              borderRadius: 10, fontSize: 13, color: 'var(--muted)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Undo last entry */}
      {lastId && (
        <div style={{
          marginTop: 10, textAlign: 'center',
          animation: 'fadeIn 0.2s ease both',
        }}>
          <button
            onClick={undo}
            style={{
              background: 'none', border: 'none', padding: 0,
              fontSize: 12, color: 'var(--muted)', cursor: 'pointer',
              fontFamily: 'inherit', textDecoration: 'underline',
              textUnderlineOffset: 2,
            }}
          >
            Undo +{justAdded} oz
          </button>
        </div>
      )}

      {/* Today's entries */}
      {entries.length > 0 && (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          {visible.map(e => (
            <div
              key={e.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '5px 0',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--text)', minWidth: 54 }}>
                {Math.round(e.amount_oz)} oz
              </span>
              <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1 }}>
                {formatTime(e.logged_at)}
              </span>
              <button className="le-del" onClick={() => deleteEntry(e.id)} aria-label="Remove">
                <i className="ti ti-x" />
              </button>
            </div>
          ))}

          {sorted.length > COLLAPSE_AT && (
            <button
              onClick={() => setExpanded(v => !v)}
              style={{
                marginTop: 2, background: 'none', border: 'none', padding: '4px 0',
                fontSize: 12, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {expanded ? 'Show less' : `Show all ${sorted.length}`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
