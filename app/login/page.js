'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    setError('')

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (loginError) { setError(loginError.message); setLoading(false); return }

    router.push('/chat')
  }

  return (
    <main style={{ maxWidth: 400, margin: '80px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Dopechatz</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>Welcome back.</p>

      {error && <p style={{ color: 'red', marginBottom: 16 }}>{error}</p>}

      <input
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={inputStyle}
      />
      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={inputStyle}
      />
      <button onClick={handleLogin} disabled={loading} style={btnStyle}>
        {loading ? 'Logging in...' : 'Log In'}
      </button>
      <p style={{ marginTop: 16, color: '#666', fontSize: 14 }}>
        No account? <a href="/signup" style={{ color: '#000' }}>Sign up</a>
      </p>
    </main>
  )
}

const inputStyle = {
  display: 'block',
  width: '100%',
  padding: '12px',
  marginBottom: 12,
  fontSize: 15,
  border: '1px solid #ddd',
  borderRadius: 8,
  boxSizing: 'border-box'
}

const btnStyle = {
  display: 'block',
  width: '100%',
  padding: '12px',
  fontSize: 15,
  fontWeight: 600,
  background: '#000',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer'
}
