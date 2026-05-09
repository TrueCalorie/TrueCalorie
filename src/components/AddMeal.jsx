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
            </d
