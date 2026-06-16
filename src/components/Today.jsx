const GOAL = 2000, PG = 150, CG = 250, FG = 65

export default function Today({ log, onDelete, onAdd }) {
  const tC = log.reduce((s, l) => s + l.cal, 0)
  const tP = log.reduce((s, l) => s + l.p, 0)
  const tCb = log.reduce((s, l) => s + l.cb, 0)
  const tF = log.reduce((s, l) => s + l.f, 0)
  const pct = Math.min(tC / GOAL, 1)
  const rem = GOAL - tC
  const circ = 289

  const d = new Date()
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const dateStr = `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`

  const groups = {}
  log.forEach(l => {
    if (!groups[l.time]) groups[l.time] = []
    groups[l.time].push(l)
  })
  const timeOrder = ['Breakfast', 'Lunch', 'Snack', 'Dinner']

  return (
    <div className="today-wrap">
      <div className="greeting">Good morning, <em>let's eat.</em></div>
      <div className="date-line">{dateStr} · Day 1 🔥</div>

      <div className="ring-row">
        <div className="ring-wrap">
          <svg width="108" height="108" viewBox="0 0 108 108">
            <circle cx="54" cy="54" r="46" fill="none" stroke="#eee" strokeWidth="10" />
            <circle
              cx="54" cy="54" r="46" fill="none" stroke="#1D9E75" strokeWidth="10"
              strokeDasharray={circ} strokeDashoffset={circ - circ * pct}
              strokeLinecap="round" style={{ transition: 'stroke-dashoffset .5s' }}
            />
          </svg>
          <div className="ring-center">
            <div className="ring-num">{Math.round(tC).toLocaleString()}</div>
            <div className="ring-of">of 2,000 cal</div>
            <div className="ring-rem">{rem > 0 ? `${Math.round(rem).toLocaleString()} left` : 'Over goal!'}</div>
          </div>
        </div>
        <div className="macro-grid">
          <div className="mc">
            <div className="mc-lbl">Protein</div>
            <div className="mc-val">{Math.round(tP)}g</div>
            <div className="mc-bar"><div className="mc-fill" style={{ width: `${Math.min(tP/PG*100,100)}%`, background: '#378ADD' }} /></div>
          </div>
          <div className="mc">
            <div className="mc-lbl">Carbs</div>
            <div className="mc-val">{Math.round(tCb)}g</div>
            <div className="mc-bar"><div className="mc-fill" style={{ width: `${Math.min(tCb/CG*100,100)}%`, background: '#EF9F27' }} /></div>
          </div>
          <div className="mc">
            <div className="mc-lbl">Fat</div>
            <div className="mc-val">{Math.round(tF)}g</div>
            <div className="mc-bar"><div className="mc-fill" style={{ width: `${Math.min(tF/FG*100,100)}%`, background: '#D4537E' }} /></div>
          </div>
          <div className="mc">
            <div className="mc-lbl">Meals logged</div>
            <div className="mc-val">{log.length}</div>
            <div className="mc-bar" style={{ visibility: 'hidden' }} />
          </div>
        </div>
      </div>

      <button className="add-btn-strip" onClick={onAdd}>
        <i className="ti ti-plus" /> Search restaurants & add a meal
      </button>

      <div className="log-hdr">
        <div className="log-title">Today's log</div>
        <div className="log-count">{log.length ? `${log.length} item${log.length !== 1 ? 's' : ''} · ${Math.round(tC).toLocaleString()} cal` : ''}</div>
      </div>

      {log.length === 0 ? (
        <div className="empty">
          <i className="ti ti-salad" />
          <p>Nothing logged yet. Tap above to search restaurants</p>
        </div>
      ) : (
        timeOrder.filter(t => groups[t]).map(time => (
          <div key={time}>
            <div className="mg-label">{time}</div>
            {groups[time].map(l => (
              <div className="log-entry" key={l.id}>
                <div className="le-em">{l.em}</div>
                <div className="le-info">
                  <div className="le-name">{l.name}</div>
                  <div className="le-rest">{l.rest}</div>
                </div>
                <div className="le-cal">{l.cal}</div>
                <button className="le-del" onClick={() => onDelete(l.id)} aria-label="Remove">
                  <i className="ti ti-x" />
                </button>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}
