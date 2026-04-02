'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function CreateRoomPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [name, setName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [accent, setAccent] = useState('#3b82f6')
  const [roomCount, setRoomCount] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!prof) { router.push('/chat'); return }
      if (prof.tier === 0) { router.push('/upgrade'); return }

      setProfile(prof)
      if (prof.accent_color) setAccent(prof.accent_color)

      // Count existing rooms created by this user
      const { count } = await supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id)

      setRoomCount(count || 0)
    })
  }, [])

  function maxRooms() {
    if (!profile) return 0
    return profile.tier === 3 ? 2 : 4
  }

  function canMakePrivate() {
    return profile?.tier === 7
  }

  async function handleCreate() {
    if (!name.trim()) { setError('Please enter a room name.'); return }
    if (roomCount >= maxRooms()) {
      setError(`You've reached your limit of ${maxRooms()} rooms.`)
      return
    }

    setLoading(true)
    setError('')

    const { error: roomError } = await supabase.from('rooms').insert({
      neighborhood_id: profile.neighborhood_id,
      name: name.trim(),
      created_by: profile.id,
      is_main: false,
      is_private: canMakePrivate() ? isPrivate : false
    })

    if (roomError) { setError(roomError.message); setLoading(false); return }

    router.push('/chat')
  }

  if (!profile) return (
    <div style={{ background: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#fff', fontFamily: 'sans-serif' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif', padding: '40px 20px' }}>
      <button
        onClick={() => router.push('/chat')}
        style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', fontSize: 14, marginBottom: 32, padding: 0 }}
      >
        ← Back
      </button>

      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>New Room</h1>
      <p style={{ color: '#555', fontSize: 13, marginBottom: 32 }}>
        {roomCount} of {maxRooms()} rooms used
      </p>

      {error && <p style={{ color: 'red', marginBottom: 16, fontSize: 14 }}>{error}</p>}

      <input
        placeholder="Room name"
        value={name}
        onChange={e => setName(e.target.value)}
        style={{
          display: 'block', width: '100%', padding: '12px',
          marginBottom: 16, fontSize: 15,
          border: `1px solid ${accent}44`, borderRadius: 8,
          background: '#111', color: '#fff', outline: 'none',
          boxSizing: 'border-box'
        }}
      />

      {canMakePrivate() && (
        <div
          onClick={() => setIsPrivate(!isPrivate)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px', borderRadius: 10, marginBottom: 24,
            border: `1px solid ${isPrivate ? accent : '#333'}`,
            background: isPrivate ? `${accent}11` : '#111',
            cursor: 'pointer'
          }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: 6,
            border: `2px solid ${isPrivate ? accent : '#444'}`,
            background: isPrivate ? accent : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            {isPrivate && <span style={{ color: '#000', fontSize: 12, fontWeight: 800 }}>✓</span>}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>🔒 Private room</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
              Only visible to Pro users and people you invite
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleCreate}
        disabled={loading || roomCount >= maxRooms()}
        style={{
          display: 'block', width: '100%', padding: '14px',
          fontSize: 15, fontWeight: 800,
          background: roomCount >= maxRooms() ? '#222' : accent,
          color: roomCount >= maxRooms() ? '#555' : '#000',
          border: 'none', borderRadius: 10, cursor: roomCount >= maxRooms() ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Creating...' : roomCount >= maxRooms() ? 'Room limit reached' : 'Create Room'}
      </button>
    </div>
  )
}
