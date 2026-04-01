'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { assignNeighborhood, generateUsername } from '@/lib/neighborhood'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [suggested, setSuggested] = useState('')
  const [userId, setUserId] = useState(null)
  const [step, setStep] = useState('auth')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup() {
    setLoading(true)
    setError('')

    const { data, error: signupError } = await supabase.auth.signUp({ email, password })
    if (signupError) { setError(signupError.message); setLoading(false); return }
    if (!data.user) { setError('Signup failed, please try again.'); setLoading(false); return }

    setUserId(data.user.id)
    const s = generateUsername()
    setSuggested(s)
    setUsername(s)
    setStep('username')
    setLoading(false)
  }

  async function handleConfirmUsername() {
    setLoading(true)
    setError('')
    setStep('locating')

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        const neighborhood = await assignNeighborhood(lat, lng)

        if (!neighborhood) {
          setError('Could not determine your neighborhood. Please try again.')
          setStep('username')
          setLoading(false)
          return
        }

        const { error: profileError } = await supabase.from('profiles').insert({
          id: userId,
          username,
          username_changes_used: username !== suggested ? 1 : 0,
          neighborhood_id: neighborhood.id,
          home_neighborhood_id: neighborhood.id,
          lat,
          lng,
          tier: 0, email: email
        })

        if (profileError) { setError(profileError.message); setStep('username'); setLoading(false); return }

        router.push('/chat')
      },
      () => {
        setError('Location access is required. Please enable it and try again.')
        setStep('username')
        setLoading(false)
      }
    )
  }

  return (
    <main style={{ maxWidth: 400, margin: '80px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Dopechatz</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>Your neighborhood, anonymously.</p>

      {error && <p style={{ color: 'red', marginBottom: 16 }}>{error}</p>}

      {step === 'auth' && (
        <>
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
          <button onClick={handleSignup} disabled={loading} style={btnStyle}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
          <p style={{ marginTop: 16, color: '#666', fontSize: 14 }}>
            Already have an account? <a href="/login" style={{ color: '#000' }} style={{ color: '#000' }}>Log in</a>
          </p>
        </>
      )}

      {step === 'username' && (
        <>
          <p style={{ marginBottom: 12, fontSize: 15 }}>
            We suggested a username for you. You can change it now, or once more later — then it is locked.
          </p>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            style={inputStyle}
          />
          <p style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>
            Suggested: <strong>{suggested}</strong>
          </p>
          <button onClick={handleConfirmUsername} disabled={loading} style={btnStyle}>
            {loading ? 'Saving...' : 'Confirm Username'}
          </button>
        </>
      )}

      {step === 'locating' && (
        <p style={{ fontSize: 16 }}>Finding your neighborhood...</p>
      )}
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
