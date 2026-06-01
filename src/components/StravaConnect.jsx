import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

// ─── StravaConnect ────────────────────────────────────────────────────────────
// Renders the Strava connection row inside Settings → Integrations.
// Handles connect, disconnect, and URL param feedback (?strava=connected/denied/error)

export default function StravaConnect({ session }) {
  const [connected, setConnected]   = useState(false)
  const [athleteName, setAthleteName] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [feedback, setFeedback]     = useState(null) // 'connected' | 'denied' | 'error'

  useEffect(() => {
    checkConnection()
    handleUrlFeedback()
  }, [])

  const checkConnection = async () => {
    if (!session?.user?.id) return
    const { data } = await supabase
      .from('strava_tokens')
      .select('athlete_name, athlete_id')
      .eq('user_id', session.user.id)
      .single()
    setConnected(!!data)
    setAthleteName(data?.athlete_name || null)
    setLoading(false)
  }

  const handleUrlFeedback = () => {
    const params = new URLSearchParams(window.location.search)
    const stravaParam = params.get('strava')
    if (stravaParam) {
      setFeedback(stravaParam)
      // Clean up URL without reload
      window.history.replaceState({}, '', '/')
      // If connected, refresh connection status
      if (stravaParam === 'connected') {
        setTimeout(checkConnection, 500)
      }
    }
  }

  const handleConnect = () => {
    const userId = session?.user?.id
    if (!userId) return
    window.location.href = `/api/strava-auth?userId=${userId}`
  }

  const handleDisconnect = async () => {
    if (!session?.user?.id || disconnecting) return
    setDisconnecting(true)
    await supabase
      .from('strava_tokens')
      .delete()
      .eq('user_id', session.user.id)
    setConnected(false)
    setAthleteName(null)
    setFeedback(null)
    setDisconnecting(false)
  }

  if (loading) return (
    <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 16, height: 16, borderRadius: 3, background: 'var(--surface2)' }} />
      <div style={{ width: 120, height: 13, borderRadius: 3, background: 'var(--surface2)' }} />
    </div>
  )

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 16px',
      }}>
        {/* Left: icon + label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M6.5 0L9.5 6H7L9.5 11L12 16H9L6.5 11L4 16H1L6.5 0Z" fill="#FC4C02"/>
          </svg>
          <div>
            <div style={{ fontSize: 15, color: 'var(--text)' }}>Strava</div>
            {connected && athleteName && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                Connected as {athleteName}
              </div>
            )}
            {connected && !athleteName && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>Connected</div>
            )}
          </div>
        </div>

        {/* Right: action */}
        {connected ? (
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            style={{
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 8, padding: '5px 12px',
              fontSize: 12, color: disconnecting ? 'var(--muted)' : 'var(--text)',
              cursor: disconnecting ? 'default' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {disconnecting ? 'Disconnecting…' : 'Disconnect'}
          </button>
        ) : (
          <button
            onClick={handleConnect}
            style={{
              background: '#FC4C02', border: 'none',
              borderRadius: 8, padding: '5px 12px',
              fontSize: 12, fontWeight: 600, color: '#fff',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Connect
          </button>
        )}
      </div>

      {/* Feedback banner */}
      {feedback === 'connected' && (
        <div style={{
          margin: '0 16px 12px',
          padding: '8px 12px',
          background: 'rgba(29,158,117,0.08)',
          border: '1px solid rgba(29,158,117,0.2)',
          borderRadius: 8, fontSize: 12, color: 'var(--accent)',
        }}>
          ✓ Strava connected. Today's activities will appear on the Today tab.
        </div>
      )}
      {(feedback === 'denied' || feedback === 'error') && (
        <div style={{
          margin: '0 16px 12px',
          padding: '8px 12px',
          background: 'rgba(226,75,74,0.08)',
          border: '1px solid rgba(226,75,74,0.2)',
          borderRadius: 8, fontSize: 12, color: '#E24B4A',
        }}>
          {feedback === 'denied'
            ? 'Strava connection was cancelled.'
            : 'Something went wrong connecting to Strava. Please try again.'}
        </div>
      )}
    </div>
  )
}
