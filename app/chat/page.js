'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ChatPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [rooms, setRooms] = useState([])
  const [activeRoom, setActiveRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [accent, setAccent] = useState('#3b82f6')
  const [hue, setHue] = useState(217)
  const [input2, setInput2] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => { loadProfile() }, [])

  useEffect(() => {
    if (activeRoom) {
      loadMessages(activeRoom.id)
      const sub = supabase
        .channel(`room:${activeRoom.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${activeRoom.id}`
        }, payload => {
          setMessages(prev => [...prev, payload.new])
        })
        .subscribe()
      return () => supabase.removeChannel(sub)
    }
  }, [activeRoom])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: prof } = await supabase
      .from('profiles')
      .select('*, neighborhoods(*)')
      .eq('id', user.id)
      .single()

    if (!prof) { router.push('/signup'); return }

    setProfile(prof)
    if (prof.accent_color) {
      setAccent(prof.accent_color)
      setHue(hexToHue(prof.accent_color))
    }
    await loadRooms(prof)
    setLoading(false)
  }

  async function loadRooms(prof) {
    const { data: allRooms } = await supabase
      .from('rooms')
      .select('*')
      .eq('neighborhood_id', prof.neighborhood_id)
      .order('is_main', { ascending: false })

    const { data: memberships } = await supabase
      .from('room_members')
      .select('room_id')
      .eq('user_id', prof.id)

    const memberRoomIds = memberships?.map(m => m.room_id) || []

    const visible = allRooms?.filter(room => {
      if (room.is_main) return true
      if (!room.is_private) return true
      if (prof.tier === 7) return true
      if (prof.tier === 3 && memberRoomIds.includes(room.id)) return true
      return false
    }) || []

    setRooms(visible)
    if (visible.length > 0) setActiveRoom(visible[0])
  }

  async function loadMessages(roomId) {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(username)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(100)
    setMessages(data || [])
  }

  async function sendMessage() {
    if (!input2.trim()) return
    if (profile.tier === 0 && !activeRoom.is_main) return
    const { error } = await supabase.from('messages').insert({
      room_id: activeRoom.id,
      user_id: profile.id,
      content: input2.trim()
    })
    if (!error) setInput2('')
  }

  function canChat() {
    if (activeRoom?.is_main) return true
    if (profile?.tier === 0) return false
    if (activeRoom?.is_private) {
      if (profile?.tier === 7) return true
      return rooms.find(r => r.id === activeRoom.id) !== undefined
    }
    return profile?.tier >= 3
  }

  function hexToHue(hex) {
    const r = parseInt(hex.slice(1,3),16)/255
    const g = parseInt(hex.slice(3,5),16)/255
    const b = parseInt(hex.slice(5,7),16)/255
    const max = Math.max(r,g,b), min = Math.min(r,g,b)
    if (max === min) return 0
    const d = max - min
    let h = max === r ? (g-b)/d+(g<b?6:0) : max === g ? (b-r)/d+2 : (r-g)/d+4
    return Math.round(h*60)
  }

  function hueToHex(h) {
    const f = (n) => {
      const k = (n+h/60)%6
      return Math.round((1-Math.max(0,Math.min(k,4-k,1)))*255)
    }
    const r=f(5),g=f(3),b=f(1)
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
  }

  async function handleHueChange(h) {
    setHue(h)
    const color = hueToHex(h)
    setAccent(color)
    await supabase.from('profiles').update({ accent_color: color }).eq('id', profile.id)
  }

  if (loading) return (
    <div style={{ background: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#fff', fontFamily: 'sans-serif' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000', color: '#fff', fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden' }}>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10 }}
        />
      )}

      {/* Sidebar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, height: '100%', width: 270,
        background: '#111', zIndex: 20, display: 'flex', flexDirection: 'column',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        borderRight: `1px solid ${accent}33`
      }}>
        <div style={{ padding: '24px 18px 14px', borderBottom: `1px solid ${accent}22` }}>
          <div style={{ fontWeight: 800, fontSize: 20, color: accent, letterSpacing: '-0.5px' }}>Dopechatz</div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 3 }}>{profile?.neighborhoods?.name}</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {rooms.map(room => (
            <div
              key={room.id}
              onClick={() => { setActiveRoom(room); setSidebarOpen(false) }}
              style={{
                padding: '13px 18px',
                cursor: 'pointer',
                background: activeRoom?.id === room.id ? `${accent}18` : 'transparent',
                borderLeft: activeRoom?.id === room.id ? `3px solid ${accent}` : '3px solid transparent',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: activeRoom?.id === room.id ? accent : '#aaa',
                transition: 'all 0.15s ease'
              }}
            >
              {room.is_private && <span style={{ fontSize: 11 }}>🔒</span>}
              <span>{room.name}</span>
              {room.is_main && <span style={{ fontSize: 10, color: accent, opacity: 0.5, marginLeft: 'auto' }}>★</span>}
            </div>
          ))}
        </div>

        <div style={{ padding: '14px 18px', borderTop: `1px solid ${accent}22` }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>{profile?.username}</div>
          <div style={{ fontSize: 11, color: '#444', marginBottom: 12 }}>
            {profile?.tier === 0 ? 'Free' : profile?.tier === 3 ? '$3 tier' : '$7 tier'}
          </div>

          <div
            onClick={() => setShowColorPicker(!showColorPicker)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}
          >
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: accent, boxShadow: `0 0 6px ${accent}88` }} />
            <span style={{ fontSize: 12, color: '#666' }}>Accent color</span>
          </div>

          {showColorPicker && (
            <div style={{ marginBottom: 14 }}>
              <div style={{
                height: 10, borderRadius: 5, marginBottom: 8,
                background: 'linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)'
              }} />
              <input
                type="range"
                min={0}
                max={359}
                value={hue}
                onChange={e => handleHueChange(Number(e.target.value))}
                style={{ width: '100%', accentColor: accent }}
              />
            </div>
          )}

          {profile?.tier === 0 && (
            <button
              onClick={() => router.push('/upgrade')}
              style={{
                width: '100%', padding: '10px', background: accent,
                color: '#000', border: 'none', borderRadius: 8,
                fontWeight: 800, fontSize: 13, cursor: 'pointer',
                marginBottom: 10
              }}
            >
              Upgrade
            </button>
          )}
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
            style={{ fontSize: 11, color: '#444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '0 16px', height: 56,
        borderBottom: `1px solid ${accent}22`,
        background: '#111',
        flexShrink: 0
      }}>
        {/* Hamburger — large tap target */}
        <button
          onClick={() => setSidebarOpen(v => !v)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '10px 10px 10px 4px',
            display: 'flex', flexDirection: 'column', gap: 5,
            borderRadius: 8,
            transition: 'opacity 0.15s'
          }}
        >
          <div style={{
            width: 24, height: 2, background: accent,
            borderRadius: 2,
            transform: sidebarOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none',
            transition: 'transform 0.25s ease'
          }} />
          <div style={{
            width: 24, height: 2, background: accent,
            borderRadius: 2,
            opacity: sidebarOpen ? 0 : 1,
            transition: 'opacity 0.2s ease'
          }} />
          <div style={{
            width: 24, height: 2, background: accent,
            borderRadius: 2,
            transform: sidebarOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none',
            transition: 'transform 0.25s ease'
          }} />
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activeRoom?.name}
          </div>
          {activeRoom?.is_private && <div style={{ fontSize: 11, color: accent }}>Private</div>}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ marginBottom: 16 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: accent }}>
              {msg.profiles?.username}
            </span>
            <span style={{ fontSize: 11, color: '#333', marginLeft: 8 }}>
              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <div style={{ fontSize: 15, marginTop: 3, color: '#ddd', lineHeight: 1.4 }}>{msg.content}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 12px', borderTop: `1px solid ${accent}22`, display: 'flex', gap: 8, background: '#111', flexShrink: 0 }}>
        {canChat() ? (
          <>
            <input
              value={input2}
              onChange={e => setInput2(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Say something..."
              style={{
                flex: 1, padding: '11px 14px', fontSize: 15,
                border: `1px solid ${accent}33`, borderRadius: 10,
                background: '#1a1a1a', color: '#fff', outline: 'none'
              }}
            />
            <button onClick={sendMessage} style={{
              padding: '11px 20px', background: accent,
              color: '#000', border: 'none', borderRadius: 10,
              cursor: 'pointer', fontWeight: 800, fontSize: 14,
              flexShrink: 0
            }}>
              Send
            </button>
          </>
        ) : (
          <div style={{ fontSize: 14, color: '#444', padding: '10px 0' }}>
            {profile?.tier === 0 ? 'Upgrade to $3/mo to chat here' : 'You need an invite to chat here'}
          </div>
        )}
      </div>
    </div>
  )
}
