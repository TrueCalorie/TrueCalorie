import { useState } from 'react'
import { supabase } from './supabase'

export default function Auth() {
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
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>TrueCalorie</h1>
      <p style={{ marginBottom: 24, color: '#888' }}>
        {isLogin ? 'Sign in to your account' : 'Create your account'}
      </p>

      <button onClick={handleGoogle} style={{ width: '100%', padding: 12, marginBottom: 16, cursor: 'pointer' }}>
        Continue with Google
      </button>

      <form onSubmit={handleAuth}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', padding: 10, marginBottom: 10, boxSizing: 'border-box' }}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ width: '100%', padding: 10, marginBottom: 16, boxSizing: 'border-box' }}
          required
        />
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, cursor: 'pointer' }}>
          {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Sign Up'}
        </button>
      </form>

      {message && <p style={{ marginTop: 16, color: 'red' }}>{message}</p>}

      <p style={{ marginTop: 16, textAlign: 'center' }}>
        {isLogin ? "Don't have an account? " : 'Already have an account? '}
        <span
          onClick={() => setIsLogin(!isLogin)}
          style={{ color: 'blue', cursor: 'pointer' }}
        >
          {isLogin ? 'Sign Up' : 'Sign In'}
        </span>
      </p>
    </div>
  )
}