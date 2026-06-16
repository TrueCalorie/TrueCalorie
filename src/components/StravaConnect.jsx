import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

function buildStravaAuthUrl(userId) {
  const clientId    = import.meta.env.VITE_STRAVA_CLIENT_ID
  // Absolute redirect_uri: window.location.origin resolves to capacitor://localhost
  // on native, which Strava rejects. Always return through the production callback,
  // which deep-links back into the app on native and https-redirects on web.
  const redirectUri = 'https://www.truecalorie.net/api/strava-callback'
  // Encode the platform in state so the callback knows whether to send the user
  // back via the truecalorie:// custom scheme (native) or the https redirect (web).
  const isNative = window.Capacitor?.isNativePlatform?.()
  const state    = isNative ? `${userId}__native` : userId
  const params = new URLSearchParams({
    client_id:       clientId,
    redirect_uri:    redirectUri,
    response_type:   'code',
    approval_prompt: 'auto',
    scope:           'read,activity:read',
    state,
  })
  return `https://www.strava.com/oauth/authorize?${params}`
}

export default function StravaConnect({ session }) {
  const [connected, setConnected]         = useState(false)
  const [athleteName, setAthleteName]     = useState(null)
  const [loading, setLoading]             = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [feedback, setFeedback]           = useState(null)
  const feedbackHandled                   = useRef(false)

  // Re-run whenever session becomes available (handles the post-OAuth race condition
  // where Settings opens before session is restored from localStorage)
  useEffect(() => {
    if (!session?.user?.id) return
    checkConnection()

    // Only handle URL feedback once, after session is confirmed
    if (!feedbackHandled.current) {
      feedbackHandled.current = true
      handleUrlFeedback()
    }
  }, [session?.user?.id])

  // Native return: App.jsx's single appUrlOpen listener catches the truecalorie://
  // deep link and dispatches a 'strava-return' event. Mirror what the web ?strava
  // param does — set the same feedback and re-check the connection.
  useEffect(() => {
    const onStravaReturn = (e) => {
      const detail = e.detail || {}
      if (detail.connected) {
        setFeedback('connected')
        checkConnection()
        setTimeout(checkConnection, 800)
      } else if (detail.denied) {
        setFeedback('denied')
      } else if (detail.error) {
        setFeedback('error')
      }
    }
    window.addEventListener('strava-return', onStravaReturn)
    return () => window.removeEventListener('strava-return', onStravaReturn)
  }, [session?.user?.id])

  const checkConnection = async () => {
    if (!session?.user?.id) return
    const { data } = await supabase
      .from('strava_tokens')
      .select('athlete_name, athlete_id')
      .eq('user_id', session.user.id)
      .maybeSingle()
    setConnected(!!data)
    setAthleteName(data?.athlete_name || null)
    setLoading(false)
  }

  const handleUrlFeedback = () => {
    const params      = new URLSearchParams(window.location.search)
    const stravaParam = params.get('strava')
    if (stravaParam) {
      setFeedback(stravaParam)
      window.history.replaceState({}, '', '/')
      // If connected param, re-check DB to confirm token saved
      if (stravaParam === 'connected') {
        setTimeout(checkConnection, 800)
      }
    }
  }

  const handleConnect = () => {
    const userId = session?.user?.id
    if (!userId) return
    // Native and web both navigate the current window to the Strava authorize URL,
    // mirroring src/Auth.jsx (supabase.auth.signInWithOAuth navigates window.location
    // internally; no in-app browser sheet is used). On native the callback returns
    // through the truecalorie:// custom scheme handled by the single appUrlOpen
    // listener in App.jsx; on web it returns via the normal https redirect.
    window.location.href = buildStravaAuthUrl(userId)
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

      {feedback === 'connected' && (
        <div style={{
          margin: '0 16px 12px', padding: '8px 12px',
          background: 'rgba(29,158,117,0.08)',
          border: '1px solid rgba(29,158,117,0.2)',
          borderRadius: 8, fontSize: 12, color: 'var(--accent)',
        }}>
          ✓ Strava connected. Today's activities will appear on the Today tab.
        </div>
      )}
      {(feedback === 'denied' || feedback === 'error') && (
        <div style={{
          margin: '0 16px 12px', padding: '8px 12px',
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
