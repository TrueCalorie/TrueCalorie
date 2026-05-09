import { useState } from 'react'
import { restaurants } from '../data/restaurants'

export default function AddMeal({ onLog }) {
  const [activeRest, setActiveRest] = useState(null)
  const [activeCat, setActiveCat] = useState(null)
  const [order, setOrder] = useState([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [search, setSearch] = useState('')

  const restNames = Object.keys(restaurants)
  const filtered = restNames.filter(r => !search || r.toLowerCase().includes(search.toLowerCase()))

  function selectRest(name) {
    setActiveRest(name)
    setActiveCat(restaurants[name].cats[0])
  }

  function addItem(item) {
    const key = `${activeRest}||${item.n}`
    setOrder(prev => {
      const ex = prev.find(o => o.key === key)
      if (ex) return prev.map(o => o.key === key ? { ...o, qty: o.qty + 1 } : o)
      return [...prev, { key, rest: activeRest, em: item.em, name: item.n, cal: item.cal, p: item.p, cb: item.cb, f: item.f, qty: 1 }]
    })
    if (!drawerOpen) setDrawerOpen(true)
  }

  function changeQty(key, delta) {
    setOrder(prev => {
      const updated = prev.map(o => o.key === key ? { ...o, qty: o.qty + delta } : o)
      return updated.filter(o => o.qty > 0)
    })
  }

  function removeItem(key) {
    setOrder(prev => prev.filter(o => o.key !== key))
  }

  function logAll() {
    const expanded = order.flatMap(o => Array(o.qty).fill({ em: o.em, name: o.name, rest: o.rest, cal: o.cal, p: o.p, cb: o.cb, f: o.f }))
    onLog(expanded)
    setOrder([])
    setDrawerOpen(false)
  }

  const totalCal = order.reduce((s, o) => s + o.cal * o.qty, 0)
  const totalItems = order.reduce((s, o) => s + o.qty, 0)
  const menuItems = activeRest && activeCat ? restaurants[activeRest].items.filter(i => i.c === activeCat) : []

  return (
    <div className="add-screen">
      <div className="add-top">
        <div className="search-box">
          <i className="ti ti-search" />
          <input
            type="text"
            placeholder="Search restaurants..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="add-body">
        <div className="rest-col">
          {filtered.map(r => (
            <div
              key={r}
              className={`rest-item ${r === activeRest ? 'active' : ''}`}
              onClick={() => selectRest(r)}
            >
              <div className="rest-em">{restaurants[r].e}</div>
              <div>
                <div className="rest-name">{r}</div>
                <div className="rest-count">{restaurants[r].items.length} items</div>
              </div>
            </div>
          ))}
        </div>

        <div className="menu-col">
          {activeRest && (
            <div className="cat-row">
              {restaurants[activeRest].cats.map(c => (
                <button
                  key={c}
                  className={`cat-pill ${c === activeCat ? 'active' : ''}`}
                  onClick={() => setActiveCat(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          <div className="menu-items">
            {!activeRest ? (
              <div className="empty">
                <i className="ti ti-building-store" />
                <p>Select a restaurant on the left to browse its menu</p>
              </div>
            ) : menuItems.map(item => {
              const key = `${activeRest}||${item.n}`
              const inOrder = order.some(o => o.key === key)
              return (
                <div
                  key={item.n}
                  className={`menu-item ${inOrder ? 'sel' : ''}`}
                  onClick={() => addItem(item)}
                >
                  <div className="mi-em">{item.em}</div>
                  <div className="mi-info">
                    <div className="mi-name">{item.n}</div>
                    <div className="mi-desc">{item.d}</div>
                  </div>
                  <div className="mi-cal">{item.cal}</div>
                  <i className={`ti ${inOrder ? 'ti-check' : 'ti-plus'} mi-icon`} />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="order-drawer">
        <div className="drawer-toggle" onClick={() => setDrawerOpen(o => !o)}>
          <div className="drawer-left">
            <i className="ti ti-shopping-cart" style={{ fontSize: 18, color: 'var(--muted)' }} />
            <div className="drawer-label">Order</div>
            <div className="cart-badge">{totalItems}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="drawer-cals">{Math.round(totalCal).toLocaleString()} cal</div>
            <i className="ti ti-chevron-down" style={{ fontSize: 16, color: 'var(--muted)', transform: drawerOpen ? 'rotate(180deg)' : '', transition: 'transform .25s' }} />
          </div>
        </div>

        <div className={`drawer-body ${drawerOpen ? 'open' : 'closed'}`}>
          <div className="order-list">
            {order.length === 0 ? (
              <div style={{ padding: 14, textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>No items added yet</div>
            ) : order.map(o => (
              <div className="order-item" key={o.key}>
                <div className="oi-em">{o.em}</div>
                <div className="oi-name">{o.name}</div>
                <div className="oi-cal">{Math.round(o.cal * o.qty)}</div>
                <div className="qty-ctrl">
                  <button className="qty-btn" onClick={() => changeQty(o.key, -1)}>−</button>
                  <span className="qty-num">{o.qty}</span>
                  <button className="qty-btn" onClick={() => changeQty(o.key, 1)}>+</button>
                </div>
                <button className="oi-del" onClick={() => removeItem(o.key)}>
                  <i className="ti ti-x" />
                </button>
              </div>
            ))}
          </div>
          <button className="log-all-btn" disabled={order.length === 0} onClick={logAll}>
            Log meal to today →
          </button>
        </div>
      </div>
    </div>
  )
}
