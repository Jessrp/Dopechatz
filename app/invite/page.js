'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function InvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomId = searchParams.get('room')
  const [profile, setProfile] = useState(null)
  const [room, setRoom] = useState(null)
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [invited, setInvited] = useState([])
  const [loading, setLoading] = useState(true)
  const [accent, setAccent] = useState('#3b82f6')
  const [countdown, setCountdown] = useState(null)
  const countdownRef = useRef(null)

  useEffect(() => {
    if (!roomId) { router.push('/chat'); return }
    loadData()
    return () => clearInterval(countdownRef.current)
  }, [roomId])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!prof) { router.push('/chat'); return }
    setProfile(prof)
    if (prof.accent_color) setAccent(prof.accent_color)

    const { data: roomData } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (!roomData || roomData.created_by !== user.id) {
      router.push('/chat'); return
    }
    setRoom(roomData)

    // Start countdown if secret room
    if (roomData.is_secret && roomData.expires_at) {
      startCountdown(roomData.expires_at)
    }

    const { data: members } = await supabase
      .from('room_members')
      .select('user_id')
      .eq('room_id', roomId)

    setInvited(members?.map(m => m.user_id) || [])

    // For secret rooms: only show Pro members
    // For normal rooms: show everyone
    let query = supabase
      .from('profiles')
      .select('id, username, accent_color, tier')
      .neq('id', user.id)

    if (roomData.is_secret) {
      query = query.eq('tier', 7)
    }

    const { data: allUsers } = await query
    setUsers(allUsers || [])
    setLoading(false)
  }

  function startCountdown(expiresAt) {
    clearInterval(countdownRef.current)
    const tick = () => {
      const diff = new Date(expiresAt) - new Date()
      if (diff <= 0) { setCountdown('00:00:00'); clearInterval(countdownRef.current); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    tick()
    countdownRef.current = setInterval(tick, 1000)
  }

  async function toggleInvite(userId) {
    const isInvited = invited.includes(userId)
    if (isInvited) {
      await supabase.from('room_members').delete().eq('room_id', roomId).eq('user_id', userId)
      setInvited(prev => prev.filter(id => id !== userId))
    } else {
      await supabase.from('room_members').insert({ room_id: roomId, user_id: userId, invited_by: profile.id })
      setInvited(prev => [...prev, userId])
    }
  }

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase())
  )

  const isSecret = room?.is_secret
  const headerColor = isSecret ? '#ce93d8' : accent

  if (loading) return (
    <div style={{ background: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#fff', fontFamily: 'sans-serif' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif', padding: '40px 20px' }}>
      <button
        onClick={() => router.push('/chat')}
        style={{ background: 'none', border: 'none', color: headerColor, cursor: 'pointer', fontSize: 14, marginBottom: 32, padding: 0 }}
      >
        ← Back
      </button>

      {/* Header — different for secret vs normal */}
      {isSecret ? (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>🔒</span>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#ce93d8', margin: 0 }}>Secret Room Invite</h1>
          </div>
          <p style={{ color: '#664477', fontSize: 13, marginBottom: 12 }}>{room?.name}</p>

          {/* Countdown banner */}
          {countdown && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#1a0a1f', border: '1px solid #ce93d833', borderRadius: 10, padding: '10px 16px' }}>
              <span style={{ fontSize: 11, color: '#664477', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Session ends in</span>
              <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 800, color: countdown === '00:00:00' ? '#ff4444' : '#ce93d8' }}>
                {countdown}
              </span>
            </div>
          )}

          <p style={{ color: '#555', fontSize: 12, marginTop: 12, lineHeight: 1.6 }}>
            Only <span style={{ color: '#ce93d8' }}>Pro members</span> can be invited to Secret Rooms.
            Invited members can access this room until the session expires.
          </p>
        </div>
      ) : (
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Invite to Room</h1>
          <p style={{ color: '#555', fontSize: 13 }}>{room?.name}</p>
        </div>
      )}

      <input
        placeholder={isSecret ? 'Search Pro members...' : 'Search by username...'}
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          display: 'block', width: '100%', padding: '12px',
          marginBottom: 20, fontSize: 15,
          border: `1px solid ${headerColor}44`, borderRadius: 8,
          background: '#111', color: '#fff', outline: 'none',
          boxSizing: 'border-box'
        }}
      />

      {invited.length > 0 && (
        <button
          onClick={() => router.push('/chat')}
          style={{
            width: '100%', padding: '14px', marginBottom: 16,
            background: headerColor, color: '#000', border: 'none',
            borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: 'pointer'
          }}
        >
          ✓ Done — {invited.length} member{invited.length !== 1 ? 's' : ''} invited
        </button>
      )}

      {filtered.length === 0 && (
        <p style={{ color: '#444', fontSize: 14 }}>
          {isSecret ? 'No Pro members found.' : 'No users found.'}
        </p>
      )}

      {filtered.map(u => {
        const isInvited = invited.includes(u.id)
        const userAccent = u.accent_color || '#888'
        return (
          <div
            key={u.id}
            onClick={() => toggleInvite(u.id)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', borderRadius: 10, marginBottom: 10,
              border: `1px solid ${isInvited ? headerColor : '#222'}`,
              background: isInvited ? `${headerColor}11` : '#111',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: userAccent }} />
              <span style={{ fontWeight: 600, fontSize: 14, color: userAccent }}>{u.username}</span>
              {!isSecret && (
                <span style={{ fontSize: 11, color: '#444' }}>
                  {u.tier === 0 ? 'Free' : u.tier === 3 ? 'Plus' : 'Pro'}
                </span>
              )}
              {isSecret && (
                <span style={{ fontSize: 10, color: '#ce93d844', border: '1px solid #ce93d822', borderRadius: 8, padding: '1px 7px' }}>Pro</span>
              )}
            </div>
            <div style={{
              width: 20, height: 20, borderRadius: 6,
              border: `2px solid ${isInvited ? headerColor : '#444'}`,
              background: isInvited ? headerColor : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              {isInvited && <span style={{ color: '#000', fontSize: 12, fontWeight: 800 }}>✓</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function InvitePageWrapper() {
  return (
    <Suspense fallback={<div style={{ background: '#000', height: '100vh' }} />}>
      <InvitePage />
    </Suspense>
  )
}
