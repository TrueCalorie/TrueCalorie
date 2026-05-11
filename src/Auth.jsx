import { useState } from 'react'
import { supabase } from './supabase'
import Landing from './Landing'

export default function Auth() {
  const [showAuth, setShowAuth] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

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

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
  }

  if (!showAuth) return <Landing onGetStarted={() => setShowAuth(true)} />

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
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', fontFamily: 'Georgia, serif', marginBottom: 6 }}>
            TrueCalorie
          </h1>
          <p style={{ fontSize: 14, color: '#555' }}>
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

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
            style={{
              width: '100%',
              padding: '11px 14px',
              marginBottom: 10,
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: 8,
              color: '#fff',
              fontSize: 14,
              fontFamily: 'sans-serif',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '11px 14px',
              marginBottom: 16,
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: 8,
              color: '#fff',
              fontSize: 14,
              fontFamily: 'sans-serif',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 12,
              background: '#fff',
              color: '#000',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'sans-serif',
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
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
          <span onClick={() => setIsLogin(!isLogin)} style={{ color: '#888', cursor: 'pointer', textDecoration: 'underline' }}>
            {isLogin ? 'Sign up' : 'Sign in'}
          </span>
        </p>

        <p style={{ marginTop: 12, textAlign: 'center' }}>
          <span onClick={() => setShowAuth(false)} style={{ fontSize: 12, color: '#444', cursor: 'pointer' }}>
            ← Back
          </span>
        </p>
      </div>
    </div>
  )
}