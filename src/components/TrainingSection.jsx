import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatHours(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function toLocalDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function getDatesInRange(days) {
  const dates = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    dates.push(toLocalDateStr(d))
  }
  return dates
}

const SPORT_EMOJI = {
  running: '🏃', cycling: '🚴', swimming: '🏊',
  strength: '🏋️', team: '⚽', general: '🏃',
}

// ─── Training Load Chart ──────────────────────────────────────────────────────
// Overlays calories burned (orange bars) with calories eaten (green line)
// This is the core insight: where your fueling and training diverge
function TrainingLoadChart({ dates, byDate, calByDate, calorieGoal }) {
  const W = 320, H = 120
  const PAD = { top: 8, right: 8, bottom: 20, left: 32 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const burnValues  = dates.map(d => byDate[d]?.calories || 0)
  const eatValues   = dates.map(d => calByDate[d] || 0)
  const maxVal      = Math.max(...burnValues, ...eatValues, calorieGoal, 500)

  const xOf = (i) => PAD.left + (i / (dates.length - 1 || 1)) * chartW
  const yOf = (v) => PAD.top + chartH - (v / maxVal) * chartH
  const barW = Math.max(2, (chartW / dates.length) - 2)

  // Eating line path
  const eatPoints = dates.map((d, i) => ({ x: xOf(i), y: yOf(calByDate[d] || 0), has: !!calByDate[d] }))
  const eatPath = eatPoints.reduce((path, p, i) => {
    if (!p.has) return path
    const prev = eatPoints.slice(0, i).reverse().find(pp => pp.has)
    if (!prev) return `${path} M ${p.x} ${p.y}`
    return `${path} L ${p.x} ${p.y}`
  }, '')

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      {/* Goal line */}
      <line
        x1={PAD.left} y1={yOf(calorieGoal)}
        x2={PAD.left + chartW} y2={yOf(calorieGoal)}
        stroke="var(--border)" strokeWidth={1} strokeDasharray="4,3"
      />

      {/* Burned bars (orange) */}
      {dates.map((d, i) => {
        const val = byDate[d]?.calories || 0
        if (!val) return null
        const barH = Math.max(2, yOf(0) - yOf(val))
        return (
          <rect
            key={d}
            x={xOf(i) - barW / 2} y={yOf(val)}
            width={barW} height={barH}
            fill="#FC4C02" opacity={0.7} rx={1}
          />
        )
      })}

      {/* Eaten line (green) */}
      {eatPath && (
        <path
          d={eatPath.replace(/^\s*/, '')}
          fill="none" stroke="#1D9E75" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round"
        />
      )}

      {/* Dots on eaten line */}
      {eatPoints.map((p, i) => p.has && (
        <circle key={i} cx={p.x} cy={p.y} r={2.5}
          fill="#1D9E75" stroke="var(--bg)" strokeWidth={1} />
      ))}

      {/* X-axis labels — every 7 days */}
      {dates.map((d, i) => {
        if (i % 7 !== 0 && i !== dates.length - 1) return null
        const date = new Date(d + 'T12:00:00')
        return (
          <text key={i} x={xOf(i)} y={H - 4}
            textAnchor="middle" fontSize={8} fill="var(--muted)">
            {`${date.getMonth()+1}/${date.getDate()}`}
          </text>
        )
      })}

      {/* Y-axis label */}
      <text x={PAD.left - 4} y={yOf(maxVal)} textAnchor="end"
        fontSize={7} fill="var(--muted)">{Math.round(maxVal/1000)}k</text>
      <text x={PAD.left - 4} y={yOf(0) - 2} textAnchor="end"
        fontSize={7} fill="var(--muted)">0</text>
    </svg>
  )
}

// ─── Fueling Score ────────────────────────────────────────────────────────────
function FuelingScore({ trainingDays, byDate, calByDate, calorieGoal }) {
  if (!trainingDays.length) return null

  // Only score training days
  const scoredDays = trainingDays.filter(d => calByDate[d] > 0)
  if (!scoredDays.length) return null

  const scores = scoredDays.map(d => {
    const burned  = byDate[d]?.calories || 0
    const eaten   = calByDate[d] || 0
    const target  = calorieGoal + burned
    return Math.min(eaten / target, 1.2) // cap at 120%
  })

  const avgScore = Math.round((scores.reduce((s, x) => s + x, 0) / scores.length) * 100)

  const color = avgScore >= 90 ? '#1D9E75' : avgScore >= 70 ? '#f59e0b' : '#E24B4A'
  const label = avgScore >= 90
    ? 'Well fueled'
    : avgScore >= 70
      ? 'Slightly under-fueled'
      : 'Under-fueled'
  const desc = avgScore >= 90
    ? "You're eating enough to support your training load."
    : avgScore >= 70
      ? "You're falling slightly short on training days. Try adding a post-workout snack."
      : "You're consistently under-eating on training days. This limits recovery and performance."

  // Arc
  const r  = 38
  const cx = 52, cy = 52
  const pct = Math.min(avgScore / 100, 1)
  const angle = pct * Math.PI // 180° arc
  const startX = cx - r, startY = cy
  const endX = cx + Math.cos(Math.PI - angle) * r
  const endY = cy - Math.sin(angle) * r
  const largeArc = angle > Math.PI / 2 ? 1 : 0

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
        {/* Gauge */}
        <svg width="104" height="58" viewBox="0 0 104 58" style={{ flexShrink: 0 }}>
          {/* Track */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none" stroke="var(--surface2)" strokeWidth={8} strokeLinecap="round"
          />
          {/* Fill */}
          {pct > 0 && (
            <path
              d={`M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`}
              fill="none" stroke={color} strokeWidth={8} strokeLinecap="round"
            />
          )}
          {/* Score */}
          <text x={cx} y={cy + 2} textAnchor="middle"
            fontSize={16} fontWeight={700} fill={color}>{avgScore}%</text>
          <text x={cx} y={cy + 14} textAnchor="middle"
            fontSize={8} fill="var(--muted)">fueled</text>
        </svg>

        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.55 }}>{desc}</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        Based on {scoredDays.length} training day{scoredDays.length !== 1 ? 's' : ''} with logged meals in this period.
      </div>
    </div>
  )
}

// ─── Training vs Rest Comparison ──────────────────────────────────────────────
function TrainingVsRest({ trainingDays, allDates, calByDate, calorieGoal }) {
  const restDays     = allDates.filter(d => !trainingDays.includes(d))
  const trainLogged  = trainingDays.filter(d => calByDate[d] > 0)
  const restLogged   = restDays.filter(d => calByDate[d] > 0)

  if (!trainLogged.length && !restLogged.length) return null

  const avg = (days) => days.length
    ? Math.round(days.reduce((s, d) => s + (calByDate[d] || 0), 0) / days.length)
    : null

  const trainAvg = avg(trainLogged)
  const restAvg  = avg(restLogged)

  if (!trainAvg && !restAvg) return null

  const maxVal = Math.max(trainAvg || 0, restAvg || 0, calorieGoal)

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 12 }}>
        {[
          { label: 'Training days', val: trainAvg, color: '#FC4C02', count: trainLogged.length },
          { label: 'Rest days',     val: restAvg,  color: 'var(--muted)', count: restLogged.length },
        ].map(({ label, val, color, count }) => val && (
          <div key={label} style={{ flex: 1 }}>
            <div style={{
              height: 80, display: 'flex', alignItems: 'flex-end',
              marginBottom: 6,
            }}>
              <div style={{
                width: '100%',
                height: `${Math.round((val / maxVal) * 80)}px`,
                background: color, borderRadius: '4px 4px 0 0',
                opacity: color === 'var(--muted)' ? 0.4 : 0.8,
                minHeight: 4,
              }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
              {val.toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.4 }}>
              {label}<br/>({count} day{count !== 1 ? 's' : ''})
            </div>
          </div>
        ))}

        {/* Goal reference line area */}
        <div style={{ flex: 1 }}>
          <div style={{ height: 80, display: 'flex', alignItems: 'flex-end', marginBottom: 6 }}>
            <div style={{ width: '100%', borderTop: '2px dashed var(--accent)',
              height: `${Math.round((calorieGoal / maxVal) * 80)}px`,
              borderBottom: 'none',
            }} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', marginBottom: 2 }}>
            {calorieGoal.toLocaleString()}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>base goal</div>
        </div>
      </div>

      {trainAvg && restAvg && (
        <div style={{
          fontSize: 12, color: 'var(--muted)', paddingTop: 10,
          borderTop: '1px solid var(--border)', lineHeight: 1.5,
        }}>
          {trainAvg > restAvg
            ? `You eat ${(trainAvg - restAvg).toLocaleString()} more calories on training days — good instinct.`
            : trainAvg === restAvg
              ? "You eat the same on training and rest days. Consider eating more on heavy training days."
              : `You eat ${(restAvg - trainAvg).toLocaleString()} fewer calories on training days. This may be limiting your recovery.`
          }
        </div>
      )}
    </div>
  )
}

// ─── Sport Breakdown ──────────────────────────────────────────────────────────
function SportBreakdown({ sportBreakdown }) {
  const sports = Object.entries(sportBreakdown)
    .sort((a, b) => b[1].minutes - a[1].minutes)

  if (!sports.length) return null

  const totalMin = sports.reduce((s, [, v]) => s + v.minutes, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sports.map(([key, val]) => (
        <div key={key}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text)' }}>
              {SPORT_EMOJI[key]} {val.label}
            </span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {formatHours(val.minutes * 60)} · {val.calories.toLocaleString()} cal
            </span>
          </div>
          <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2 }}>
            <div style={{
              height: '100%',
              width: `${Math.round((val.minutes / totalMin) * 100)}%`,
              background: '#FC4C02', borderRadius: 2, opacity: 0.8,
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── This Week vs Last Week ───────────────────────────────────────────────────
function WeekComparison({ weeklyTotals, priorWeeklyTotals }) {
  if (!priorWeeklyTotals) return null

  if (priorWeeklyTotals.activityCount === 0) {
    return (
      <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '8px 0' }}>
        Not enough history yet. Check back next week.
      </div>
    )
  }

  const pctChange = (curr, prev) => prev ? Math.round((curr - prev) / prev * 100) : null

  const calPct  = pctChange(weeklyTotals.calories,      priorWeeklyTotals.calories)
  const timePct = pctChange(weeklyTotals.movingTimeSec, priorWeeklyTotals.movingTimeSec)

  const Arrow = ({ pct }) => {
    if (pct === null || pct === 0) return <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>
    const up = pct > 0
    return (
      <span style={{ fontSize: 12, fontWeight: 700, color: up ? '#1D9E75' : '#E24B4A' }}>
        {up ? '↑' : '↓'} {Math.abs(pct)}%
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {[
        { label: 'Calories burned', curr: weeklyTotals.calories,      prev: priorWeeklyTotals.calories,      pct: calPct,  fmt: v => v.toLocaleString() },
        { label: 'Training time',   curr: weeklyTotals.movingTimeSec, prev: priorWeeklyTotals.movingTimeSec, pct: timePct, fmt: v => formatHours(v) },
      ].map(({ label, curr, prev, pct, fmt }) => (
        <div key={label} style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{fmt(curr)}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>vs {fmt(prev)} last week</div>
          <Arrow pct={pct} />
        </div>
      ))}
    </div>
  )
}

// ─── Calorie Accuracy ─────────────────────────────────────────────────────────
function CalorieAccuracy({ weeklyTotals, sportBreakdown }) {
  if (!weeklyTotals?.rawCalories || weeklyTotals.rawCalories === weeklyTotals.calories) return null

  const raw      = weeklyTotals.rawCalories
  const adjusted = weeklyTotals.calories
  const reduction = Math.round((raw - adjusted) / raw * 100)
  const hasCycling = sportBreakdown?.cycling?.calories > 0

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        {[
          { label: "Strava's estimate", val: raw,      color: 'var(--muted)' },
          { label: 'Adjusted total',    val: adjusted, color: '#1D9E75'      },
          { label: 'Reduction',         val: `-${reduction}%`, color: '#E24B4A', isStr: true },
        ].map(({ label, val, color, isStr }) => (
          <div key={label} style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color, marginBottom: 2 }}>
              {isStr ? val : val.toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        Strava tends to overestimate calorie burn. We adjust by sport so your targets stay accurate.
        {hasCycling && ' Cycling has the largest correction (−18%) — Strava is known to significantly overcount cycling calories.'}
      </div>
    </div>
  )
}

// ─── Main TrainingSection component ──────────────────────────────────────────
export default function TrainingSection({ session, range, calByDate, calorieGoal }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!session?.user?.id) return
    fetchTrainingData()
  }, [session?.user?.id, range])

  const fetchTrainingData = async () => {
    setLoading(true)
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      const res  = await fetch('/api/strava-training', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession?.access_token}`,
        },
        body:    JSON.stringify({ days: range }),
      })
      const json = await res.json()
      setData(json)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  // Not connected — render nothing
  if (!loading && (!data || !data.connected)) return null

  const SectionHead = ({ children }) => (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
      color: 'var(--muted)', marginBottom: 14,
    }}>{children}</div>
  )

  const Card = ({ children, style }) => (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 16, marginBottom: 14, ...style,
    }}>{children}</div>
  )

  if (loading) return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M6.5 0L9.5 6H7L9.5 11L12 16H9L6.5 11L4 16H1L6.5 0Z" fill="#FC4C02"/>
        </svg>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)' }}>
          TRAINING LOAD
        </span>
      </div>
      <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>loading…</span>
      </div>
    </Card>
  )

  const { byDate, trainingDays, weeklyTotals, sportBreakdown, priorWeeklyTotals } = data
  const allDates = getDatesInRange(range)
  const hasTraining = trainingDays && trainingDays.length > 0

  return (
    <>
      {/* ── Training Load Overview ── */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M6.5 0L9.5 6H7L9.5 11L12 16H9L6.5 11L4 16H1L6.5 0Z" fill="#FC4C02"/>
            </svg>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)' }}>
              TRAINING LOAD
            </span>
          </div>
          {hasTraining && (
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#FC4C02' }}>
                  {weeklyTotals.calories.toLocaleString()}
                </div>
                <div style={{ fontSize: 9, color: 'var(--muted)' }}>cal burned this wk</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                  {formatHours(weeklyTotals.movingTimeSec)}
                </div>
                <div style={{ fontSize: 9, color: 'var(--muted)' }}>training this wk</div>
              </div>
            </div>
          )}
        </div>

        {!hasTraining ? (
          <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '8px 0' }}>
            No Strava activities in this period.
          </div>
        ) : (
          <>
            <TrainingLoadChart
              dates={allDates}
              byDate={byDate}
              calByDate={calByDate}
              calorieGoal={calorieGoal}
            />
            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 8, justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, background: '#FC4C02', borderRadius: 2, opacity: 0.7 }} />
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>Calories burned</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 16, height: 2, background: '#1D9E75', borderRadius: 1 }} />
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>Calories eaten</span>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* ── This Week vs Last Week ── */}
      {hasTraining && (
        <Card>
          <SectionHead>THIS WEEK VS LAST WEEK</SectionHead>
          <WeekComparison weeklyTotals={weeklyTotals} priorWeeklyTotals={priorWeeklyTotals} />
        </Card>
      )}

      {/* ── Fueling Score ── */}
      {hasTraining && (
        <Card>
          <SectionHead>FUELING SCORE</SectionHead>
          <FuelingScore
            trainingDays={trainingDays}
            byDate={byDate}
            calByDate={calByDate}
            calorieGoal={calorieGoal}
          />
        </Card>
      )}

      {/* ── Training vs Rest Comparison ── */}
      {hasTraining && (
        <Card>
          <SectionHead>TRAINING VS REST DAYS</SectionHead>
          <TrainingVsRest
            trainingDays={trainingDays}
            allDates={allDates}
            calByDate={calByDate}
            calorieGoal={calorieGoal}
          />
        </Card>
      )}

      {/* ── Sport Breakdown ── */}
      {hasTraining && sportBreakdown && Object.keys(sportBreakdown).length > 0 && (
        <Card>
          <SectionHead>SPORT BREAKDOWN</SectionHead>
          <SportBreakdown sportBreakdown={sportBreakdown} />
        </Card>
      )}

      {/* ── Calorie Accuracy ── */}
      {hasTraining && weeklyTotals.rawCalories !== weeklyTotals.calories && (
        <Card>
          <SectionHead>CALORIE ACCURACY</SectionHead>
          <CalorieAccuracy weeklyTotals={weeklyTotals} sportBreakdown={sportBreakdown} />
        </Card>
      )}
    </>
  )
}
