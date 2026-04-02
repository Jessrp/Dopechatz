'use client'

import { useState, useEffect, Suspense } from 'react'
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

  useEffect(() => {
    if (!roomId) { router.push('/chat'); return }
    loadData()
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

    const { data: members } = await supabase
      .from('room_members')
      .select('user_id')
      .eq('room_id', roomId)

    setInvited(members?.map(m => m.user_id) || [])

    const { data: allUsers } = await supabase
      .from('profiles')
      .select('id, username, accent_color, tier')
      .neq('id', user.id)

    setUsers(allUsers || [])
    setLoading(false)
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

  if (loading) return (
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

      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Invite to Room</h1>
      <p style={{ color: '#555', fontSize: 13, marginBottom: 24 }}>{room?.name}</p>

      <input
        placeholder="Search by username..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          display: 'block', width: '100%', padding: '12px',
          marginBottom: 20, fontSize: 15,
          border: `1px solid ${accent}44`, borderRadius: 8,
          background: '#111', color: '#fff', outline: 'none',
          boxSizing: 'border-box'
        }}
      />

      {filtered.length === 0 && (
        <p style={{ color: '#444', fontSize: 14 }}>No users found.</p>
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
              border: `1px solid ${isInvited ? accent : '#222'}`,
              background: isInvited ? `${accent}11` : '#111',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: userAccent }} />
              <span style={{ fontWeight: 600, fontSize: 14, color: userAccent }}>{u.username}</span>
              <span style={{ fontSize: 11, color: '#444' }}>
                {u.tier === 0 ? 'Free' : u.tier === 3 ? 'Plus' : 'Pro'}
              </span>
            </div>
            <div style={{
              width: 20, height: 20, borderRadius: 6,
              border: `2px solid ${isInvited ? accent : '#444'}`,
              background: isInvited ? accent : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
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
