const GOAL = 2000
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SAMPLE = [1840, 2100, 1650, 0, 0, 0, 0]

export default function Trends({ log }) {
  const todayTotal = log.reduce((s, l) => s + l.cal, 0)
  const week = [...SAMPLE]
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  week[todayIndex] = todayTotal

  const logged = week.filter(v => v > 0)
  const avg = logged.length ? Math.round(logged.reduce((a, b) => a + b) / logged.length) : null
  const best = logged.length ? Math.round(Math.max(...logged)) : null
  const lowest = logged.length ? Math.round(Math.min(...logged)) : null
  const max = Math.max(...week, GOAL, 1)

  return (
    <div className="trends-wrap">
      <div className="tw-h">This week</div>

      <div className="bar-wrap">
        {week.map((v, i) => (
          <div className="bar-col" key={i}>
            <div className="bar-v">{v ? Math.round(v) : ''}</div>
            <div
              className="bar-fill"
              style={{
                height: v ? Math.max(Math.round(v / max * 100), 4) : 4,
                background: v > GOAL ? '#E24B4A' : v ? '#1D9E75' : '#E8E5DF'
              }}
            />
            <div
              className="bar-day"
              style={i === todayIndex ? { fontWeight: 700, color: 'var(--text)' } : {}}
            >
              {DAYS[i]}
            </div>
          </div>
        ))}
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-val">3</div>
          <div className="stat-lbl">day streak 🔥</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{avg ? avg.toLocaleString() : '—'}</div>
          <div className="stat-lbl">avg cal / day</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{best ? best.toLocaleString() : '—'}</div>
          <div className="stat-lbl">highest day</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{lowest ? lowest.toLocaleString() : '—'}</div>
          <div className="stat-lbl">lowest day</div>
        </div>
      </div>
    </div>
  )
}
