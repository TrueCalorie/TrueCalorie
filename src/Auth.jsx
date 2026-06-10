import { useState } from 'react'
import { supabase } from './supabase'
import Landing from './Landing'

// ─── Shared input style ───────────────────────────────────────────────────────
const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  background: '#1a1a1a',
  border: '1px solid #2a2a2a',
  borderRadius: 8,
  color: '#fff',
  fontSize: 16,
  fontFamily: 'sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
}

const btnStyle = (disabled) => ({
  width: '100%',
  padding: 12,
  background: disabled ? '#1a1a1a' : '#fff',
  color: disabled ? '#555' : '#000',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  fontFamily: 'sans-serif',
  cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0.7 : 1,
})

// ─── Main component ───────────────────────────────────────────────────────────
export default function Auth({ resetMode = false }) {
  const [showAuth, setShowAuth]   = useState(false)
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLogin, setIsLogin]     = useState(true)
  const [loading, setLoading]     = useState(false)
  const [message, setMessage]     = useState('')
  const [mode, setMode]           = useState(resetMode ? 'set-password' : 'auth')
  // modes: 'auth' | 'forgot' | 'forgot-sent' | 'set-password' | 'set-done'

  // ── Auth (sign in / sign up) ──────────────────────────────────────────────
  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage(error.message)
      else setMessage('Check your email to confirm your account!')
    }
    setLoading(false)
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      const { Browser } = await import('@capacitor/browser')
      const { data } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'truecalorie://auth/callback',
          skipBrowserRedirect: true,
        },
      })
      if (data?.url) await Browser.open({ url: data.url, windowName: '_self' })
    } else {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
    }
  }

  // ── Send reset email ──────────────────────────────────────────────────────
  const handleForgot = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/?reset=true`,
    })
    setLoading(false)
    if (error) {
      setMessage(error.message)
    } else {
      setMode('forgot-sent')
    }
  }

  // ── Set new password (after clicking email link) ──────────────────────────
  const handleSetPassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)
    if (error) {
      setMessage(error.message)
    } else {
      setMode('set-done')
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Landing → show auth button
  // ─────────────────────────────────────────────────────────────────────────
  if (!showAuth && !resetMode) return <Landing onGetStarted={() => setShowAuth(true)} />

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 380,
        padding: 32,
        background: '#111',
        border: '1px solid #1f1f1f',
        borderRadius: 16,
        margin: 24,
      }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', fontFamily: 'Georgia, serif', marginBottom: 6 }}>
            TrueCalorie
          </h1>
          <p style={{ fontSize: 14, color: '#555' }}>
            {mode === 'forgot'       ? 'Reset your password'      :
             mode === 'forgot-sent'  ? 'Check your email'         :
             mode === 'set-password' ? 'Set a new password'       :
             mode === 'set-done'     ? 'Password updated'         :
             isLogin                 ? 'Sign in to your account'  : 'Create your account'}
          </p>
        </div>

        {/* ══ MODE: forgot-sent ══════════════════════════════════════════════ */}
        {mode === 'forgot-sent' && (
          <div>
            <p style={{ fontSize: 14, color: '#aaa', lineHeight: 1.6, marginBottom: 24 }}>
              We sent a password reset link to <span style={{ color: '#fff' }}>{email}</span>. Check your inbox and click the link to set a new password.
            </p>
            <button
              onClick={() => { setMode('auth'); setMessage('') }}
              style={btnStyle(false)}
            >
              Back to sign in
            </button>
          </div>
        )}

        {/* ══ MODE: set-done ════════════════════════════════════════════════ */}
        {mode === 'set-done' && (
          <div>
            <p style={{ fontSize: 14, color: '#aaa', lineHeight: 1.6, marginBottom: 24 }}>
              Your password has been updated. You're signed in — head back to the app.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              style={btnStyle(false)}
            >
              Go to app →
            </button>
          </div>
        )}

        {/* ══ MODE: set-password ════════════════════════════════════════════ */}
        {mode === 'set-password' && (
          <form onSubmit={handleSetPassword}>
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              style={{ ...inputStyle, marginBottom: 10 }}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              style={{ ...inputStyle, marginBottom: 16 }}
            />
            <button type="submit" disabled={loading} style={btnStyle(loading)}>
              {loading ? 'Updating...' : 'Set new password'}
            </button>
            {message && (
              <p style={{ marginTop: 14, fontSize: 13, color: '#ef4444', textAlign: 'center' }}>
                {message}
              </p>
            )}
          </form>
        )}

        {/* ══ MODE: forgot ══════════════════════════════════════════════════ */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot}>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.5 }}>
              Enter your email and we'll send you a link to reset your password.
            </p>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ ...inputStyle, marginBottom: 16 }}
            />
            <button type="submit" disabled={loading || !email} style={btnStyle(loading || !email)}>
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
            {message && (
              <p style={{ marginTop: 14, fontSize: 13, color: '#ef4444', textAlign: 'center' }}>
                {message}
              </p>
            )}
            <p style={{ marginTop: 20, textAlign: 'center' }}>
              <span
                onClick={() => { setMode('auth'); setMessage('') }}
                style={{ fontSize: 13, color: '#555', cursor: 'pointer', textDecoration: 'underline' }}
              >
                ← Back to sign in
              </span>
            </p>
          </form>
        )}

        {/* ══ MODE: auth (sign in / sign up) ════════════════════════════════ */}
        {mode === 'auth' && (
          <>
            <button
              onClick={handleGoogle}
              style={{
                width: '100%',
                padding: 12,
                marginBottom: 16,
                cursor: 'pointer',
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: 8,
                color: '#fff',
                fontSize: 14,
                fontFamily: 'sans-serif',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => e.target.style.borderColor = '#444'}
              onMouseLeave={e => e.target.style.borderColor = '#2a2a2a'}
            >
              Continue with Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: '#1f1f1f' }} />
              <span style={{ fontSize: 12, color: '#444' }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#1f1f1f' }} />
            </div>

            <form onSubmit={handleAuth}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ ...inputStyle, marginBottom: 10 }}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ ...inputStyle, marginBottom: isLogin ? 8 : 16 }}
              />

              {/* Forgot password link — sign-in only */}
              {isLogin && (
                <div style={{ textAlign: 'right', marginBottom: 16 }}>
                  <span
                    onClick={() => { setMode('forgot'); setMessage('') }}
                    style={{ fontSize: 12, color: '#555', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Forgot password?
                  </span>
                </div>
              )}

              <button type="submit" disabled={loading} style={btnStyle(loading)}>
                {loading ? 'Loading...' : isLogin ? 'Sign in' : 'Create account'}
              </button>
            </form>

            {message && (
              <p style={{ marginTop: 14, fontSize: 13, color: message.includes('Check') ? '#22c55e' : '#ef4444', textAlign: 'center' }}>
                {message}
              </p>
            )}

            <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#555' }}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <span
                onClick={() => setIsLogin(!isLogin)}
                style={{ color: '#888', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </span>
            </p>

            {!resetMode && (
              <p style={{ marginTop: 12, textAlign: 'center' }}>
                <span
                  onClick={() => setShowAuth(false)}
                  style={{ fontSize: 12, color: '#444', cursor: 'pointer' }}
                >
                  ← Back
                </span>
              </p>
            )}
          </>
        )}

      </div>
    </div>
  )
}
