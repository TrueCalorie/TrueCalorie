import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabase'

function toLocalDateStr(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatPace(movingTimeSec, distanceMeters) {
  if (!distanceMeters || distanceMeters < 100) return null
  const miles   = distanceMeters / 1609.34
  const minPerMile = movingTimeSec / 60 / miles
  const min     = Math.floor(minPerMile)
  const sec     = Math.round((minPerMile - min) * 60)
  return `${min}:${String(sec).padStart(2, '0')}/mi`
}

const SPORT_EMOJI = {
  running:  '🏃',
  cycling:  '🚴',
  swimming: '🏊',
  strength: '🏋️',
  team:     '⚽',
  general:  '🏃',
}

const SPORT_LABEL = {
  running:  'Run',
  cycling:  'Ride',
  swimming: 'Swim',
  strength: 'Workout',
  team:     'Sport',
  general:  'Activity',
}

// ─── Single activity card ─────────────────────────────────────────────────────
function ActivityRow({ activity }) {
  const pace = (activity.sport_key === 'running' && activity.distance_meters)
    ? formatPace(activity.moving_time_sec, activity.distance_meters)
    : null

  const distDisplay = activity.distance_miles
    ? `${activity.distance_miles} mi`
    : null

  return (
    <a
      href={activity.strava_url}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'block', textDecoration: 'none',
        padding: '12px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1 }}>
          <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>
            {SPORT_EMOJI[activity.sport_key] || '🏃'}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: 'var(--text)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {activity.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span>{formatDuration(activity.moving_time_sec)}</span>
              {distDisplay && <span>{distDisplay}</span>}
              {pace && <span>{pace}</span>}
              {activity.average_heartrate && <span>❤️ {Math.round(activity.average_heartrate)} bpm</span>}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
            {activity.calories > 0 ? `${activity.calories}` : '—'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>
            {activity.calories > 0 ? 'cal burned' : 'no cal data'}
          </div>
        </div>
      </div>
    </a>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function StravaCard({ session, refreshKey = 0, onSync }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError]     = useState(null)
  const hasLoadedRef          = useRef(false)

  const fetchActivities = useCallback(async () => {
    if (!session?.user?.id) return
    // Show skeleton only on first load; subsequent refreshes update in-place
    if (!hasLoadedRef.current) setLoading(true)
    setSyncing(true)
    setError(null)
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const res = await fetch('/api/strava-activities', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authSession?.access_token}` },
        cache:   'no-store',
        body:    JSON.stringify({ date: toLocalDateStr(new Date()) }),
      })
      const json = await res.json()
      setData(json)
      hasLoadedRef.current = true
    } catch {
      setError('Could not load Strava activities.')
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities, refreshKey])

  // Not connected — don't render anything (Settings has the connect flow)
  if (!loading && data && !data.connected) return null

  // Loading skeleton
  if (loading) return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 16, height: 16, borderRadius: 3, background: 'var(--surface2)' }} />
        <div style={{ width: 80, height: 11, borderRadius: 3, background: 'var(--surface2)' }} />
      </div>
      <div style={{ width: '100%', height: 40, borderRadius: 8, background: 'var(--surface2)' }} />
    </div>
  )

  if (error) return null

  const { activities = [], totalCalories, totalMovingTimeSec, cyclingAdjustmentApplied } = data

  // No activities today — still show the card if connected, just empty
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: activities.length > 0 ? '1px solid var(--border)' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Strava logo color */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6.5 0L9.5 6H7L9.5 11L12 16H9L6.5 11L4 16H1L6.5 0Z" fill="#FC4C02"/>
          </svg>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em' }}>
            TRAINING TODAY
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {activities.length > 0 && totalCalories > 0 && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#FC4C02' }}>
                {totalCalories.toLocaleString()}
              </span>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>cal burned</span>
            </div>
          )}
          {onSync && (
            <button
              onClick={onSync}
              disabled={syncing}
              title="Sync Strava"
              style={{
                background: 'none', border: 'none', padding: '2px 4px',
                cursor: syncing ? 'default' : 'pointer',
                color: 'var(--muted)', fontSize: 16, lineHeight: 1,
                opacity: syncing ? 0.3 : 0.6,
                display: 'flex', alignItems: 'center',
                animation: syncing ? 'spin 1s linear infinite' : 'none',
                transformOrigin: 'center',
              }}
            >
              ↻
            </button>
          )}
        </div>
      </div>

      {/* Activities */}
      {activities.length === 0 ? (
        <div style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
            No activities logged on Strava today.
          </p>
        </div>
      ) : (
        <div style={{ padding: '0 16px' }}>
          {activities.map(a => <ActivityRow key={a.id} activity={a} />)}
        </div>
      )}

      {/* Totals bar — only when multiple activities or time worth showing */}
      {activities.length > 1 && totalMovingTimeSec > 0 && (
        <div style={{
          display: 'flex', gap: 16, padding: '10px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface2)',
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
              {formatDuration(totalMovingTimeSec)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>total time</div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
              {activities.length}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>activities</div>
          </div>
        </div>
      )}

      {/* Cycling accuracy note — only when relevant */}
      {cyclingAdjustmentApplied && (
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid var(--border)',
          background: 'rgba(252,76,2,0.04)',
        }}>
          <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
            🔧 Strava overestimates cycling calories by ~18%. We've adjusted the numbers down for accuracy.
          </p>
        </div>
      )}
    </div>
  )
}
