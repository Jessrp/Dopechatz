'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const FONT_OPTIONS = [
  { label: 'Default', value: 'sans-serif' },
  { label: 'Mono', value: 'monospace' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Rounded', value: '"Trebuchet MS", sans-serif' },
  { label: 'Slab', value: '"Courier New", monospace' },
]

const COLOR_PRESETS = [
  { label: 'Electric Blue', value: '#3b82f6' },
  { label: 'Neon Green', value: '#22c55e' },
  { label: 'Hot Pink', value: '#ec4899' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Red', value: '#ef4444' },
  { label: 'White', value: '#e5e5e5' },
]

export default function CreateRoomPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [name, setName] = useState('')
  const [isSecret, setIsSecret] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [accent, setAccent] = useState('#3b82f6')
  const [roomCount, setRoomCount] = useState(false)
  const [secretCount, setSecretCount] = useState(0)

  // Theme options (Plus+ only)
  const [roomColor, setRoomColor] = useState('#3b82f6')
  const [roomFont, setRoomFont] = useState('sans-serif')

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
      if (prof.accent_color) {
        setAccent(prof.accent_color)
        setRoomColor(prof.accent_color)
      }

      // Count normal rooms created by this user
      const { count: normalCount } = await supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id)
        .eq('is_secret', false)

      // Count secret rooms created by this user (Pro only)
      const { count: secCount } = await supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id)
        .eq('is_secret', true)

      setRoomCount(normalCount || 0)
      setSecretCount(secCount || 0)
    })
  }, [])

  function maxNormalRooms() {
    if (!profile) return 0
    return 2 // Both Plus and Pro get 2 normal rooms
  }

  function maxSecretRooms() {
    return 2 // Pro only
  }

  function canMakeSecret() {
    return profile?.tier === 7
  }

  function isAtLimit() {
    if (isSecret) return secretCount >= maxSecretRooms()
    return roomCount >= maxNormalRooms()
  }

  async function handleCreate() {
    if (!name.trim()) { setError('Please enter a room name.'); return }
    if (isAtLimit()) {
      setError(isSecret
        ? `You've reached your limit of ${maxSecretRooms()} Secret Rooms.`
        : `You've reached your limit of ${maxNormalRooms()} rooms.`
      )
      return
    }

    setLoading(true)
    setError('')

    // Secret rooms auto-expire after 24hrs — set expires_at
    const expiresAt = isSecret
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : null

    const { error: roomError } = await supabase.from('rooms').insert({
      neighborhood_id: profile.neighborhood_id,
      name: name.trim(),
      created_by: profile.id,
      is_main: false,
      is_private: false,
      is_secret: isSecret,
      expires_at: expiresAt,
      theme_color: profile.tier >= 3 ? roomColor : null,
      theme_font: profile.tier >= 3 ? roomFont : null,
    })

    if (roomError) { setError(roomError.message); setLoading(false); return }

    router.push('/chat')
  }

  if (!profile) return (
    <div style={{ background: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#fff', fontFamily: 'sans-serif' }}>Loading...</p>
    </div>
  )

  const isPlus = profile.tier >= 3
  const isPro = profile.tier === 7

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif', padding: '40px 20px 120px 20px' }}>
      <button
        onClick={() => router.push('/chat')}
        style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', fontSize: 14, marginBottom: 32, padding: 0 }}
      >
        ← Back
      </button>

      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>New Room</h1>
      <p style={{ color: '#555', fontSize: 13, marginBottom: 32 }}>
        {isSecret
          ? `${secretCount} of ${maxSecretRooms()} Secret Rooms used`
          : `${roomCount} of ${maxNormalRooms()} rooms used`
        }
      </p>

      {error && <p style={{ color: '#ff4444', marginBottom: 16, fontSize: 14 }}>{error}</p>}

      {/* Room name */}
      <input
        placeholder="Room name"
        value={name}
        onChange={e => setName(e.target.value)}
        style={{
          display: 'block', width: '100%', padding: '12px',
          marginBottom: 24, fontSize: 15,
          border: `1px solid ${roomColor}44`, borderRadius: 8,
          background: '#111', color: '#fff', outline: 'none',
          boxSizing: 'border-box', fontFamily: roomFont
        }}
      />

      {/* Secret Room toggle — Pro only */}
      {isPro && (
        <div
          onClick={() => setIsSecret(!isSecret)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px', borderRadius: 10, marginBottom: 16,
            border: `1px solid ${isSecret ? '#ce93d8' : '#333'}`,
            background: isSecret ? '#ce93d811' : '#111',
            cursor: 'pointer'
          }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: 6,
            border: `2px solid ${isSecret ? '#ce93d8' : '#444'}`,
            background: isSecret ? '#ce93d8' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            {isSecret && <span style={{ color: '#000', fontSize: 12, fontWeight: 800 }}>✓</span>}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>🔒 Secret Room</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
              Invisible to Free &amp; Plus members · Auto-vanishes after 24hrs
            </div>
          </div>
          {isSecret && (
            <div style={{ marginLeft: 'auto', fontSize: 10, color: '#ce93d8', border: '1px solid #ce93d844', borderRadius: 10, padding: '2px 8px', whiteSpace: 'nowrap' }}>
              PRO
            </div>
          )}
        </div>
      )}

      {/* Theme color picker — Plus+ only */}
      {isPlus && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Room Color
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {COLOR_PRESETS.map(c => (
              <div
                key={c.value}
                onClick={() => setRoomColor(c.value)}
                title={c.label}
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: c.value, cursor: 'pointer',
                  border: roomColor === c.value ? `3px solid #fff` : '3px solid transparent',
                  boxShadow: roomColor === c.value ? `0 0 8px ${c.value}88` : 'none',
                  transition: 'all 0.15s ease'
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Font picker — Plus+ only */}
      {isPlus && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Room Font
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {FONT_OPTIONS.map(f => (
              <div
                key={f.value}
                onClick={() => setRoomFont(f.value)}
                style={{
                  padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${roomFont === f.value ? roomColor : '#333'}`,
                  background: roomFont === f.value ? `${roomColor}18` : '#111',
                  color: roomFont === f.value ? roomColor : '#666',
                  fontSize: 13, fontFamily: f.value,
                  transition: 'all 0.15s ease'
                }}
              >
                {f.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      {isPlus && name && (
        <div style={{
          marginBottom: 28, padding: '14px 16px', borderRadius: 10,
          border: `1px solid ${roomColor}44`, background: '#111',
          fontFamily: roomFont
        }}>
          <div style={{ fontSize: 11, color: '#444', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Preview</div>
          <div style={{ fontWeight: 700, color: roomColor, fontSize: 15, marginBottom: 4 }}>{name}</div>
          <div style={{ fontSize: 13, color: roomColor + 'aa' }}>Hey everyone, welcome to the room 👋</div>
        </div>
      )}

      <button
        onClick={handleCreate}
        disabled={loading || isAtLimit()}
        style={{
          display: 'block', width: '100%', padding: '14px',
          fontSize: 15, fontWeight: 800,
          background: isAtLimit() ? '#222' : isSecret ? '#ce93d8' : roomColor,
          color: isAtLimit() ? '#555' : '#000',
          border: 'none', borderRadius: 10,
          cursor: isAtLimit() ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Creating...' : isAtLimit()
          ? `${isSecret ? 'Secret Room' : 'Room'} limit reached`
          : isSecret ? '🔒 Create Secret Room' : 'Create Room'
        }
      </button>
    </div>
  )
}
