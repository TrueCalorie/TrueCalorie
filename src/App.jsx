import { useState } from 'react'
import Today from './components/Today'
import AddMeal from './components/AddMeal'
import Trends from './components/Trends'

export default function App() {
  const [tab, setTab] = useState('today')
  const [log, setLog] = useState([])

  function addToLog(items) {
    const h = new Date().getHours()
    const time = h < 11 ? 'Breakfast' : h < 15 ? 'Lunch' : h < 18 ? 'Snack' : 'Dinner'
    const stamped = items.map(item => ({ ...item, time, id: crypto.randomUUID() }))
    setLog(prev => [...prev, ...stamped])
  }

  function deleteFromLog(id) {
    setLog(prev => prev.filter(l => l.id !== id))
  }

  return (
    <>
      <nav className="nav">
        <button className={`nt ${tab === 'today' ? 'active' : ''}`} onClick={() => setTab('today')}>
          <i className="ti ti-home" />
          Today
        </button>
        <button className={`nt ${tab === 'add' ? 'active' : ''}`} onClick={() => setTab('add')}>
          <i className="ti ti-plus" />
          Add meal
        </button>
        <button className={`nt ${tab === 'trends' ? 'active' : ''}`} onClick={() => setTab('trends')}>
          <i className="ti ti-chart-bar" />
          Trends
        </button>
      </nav>

      {tab === 'today' && (
        <Today log={log} onDelete={deleteFromLog} onAdd={() => setTab('add')} />
      )}
      {tab === 'add' && (
        <AddMeal onLog={(items) => { addToLog(items); setTab('today') }} />
      )}
      {tab === 'trends' && (
        <Trends log={log} />
      )}

      <div id="toast" className="toast" />
    </>
  )
}
