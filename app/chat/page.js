'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { detectCurrentNeighborhood } from '@/lib/neighborhood'
import { subscribeToPush } from '@/lib/push'

const CATEGORY_EMOJI = {
  general: '🏠', dating: '💘', events: '🎉', marketplace: '🛍️',
  services: '🔧', cars: '🚗', music: '🎵', arts: '🎨',
  faith: '🕊️', pets: '🐾', food: '🍜', rants: '😤'
}

const FONT_SCALE = { small: 0.85, medium: 1, large: 1.2 }

export default function ChatPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [homeNeighborhood, setHomeNeighborhood] = useState(null)
  const [currentNeighborhood, setCurrentNeighborhood] = useState(null)
  const [rooms, setRooms] = useState([])
  const [visitingRooms, setVisitingRooms] = useState([])
  const [activeRoom, setActiveRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [accent, setAccent] = useState('#3b82f6')
  const [hue, setHue] = useState(217)
  const [input2, setInput2] = useState('')
  const [isVisiting, setIsVisiting] = useState(false)
  const [activeUsers, setActiveUsers] = useState([])
  const [showActive, setShowActive] = useState(false)
  const [secretCountdown, setSecretCountdown] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [fontSize, setFontSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dc_fontsize') || 'medium'
    }
    return 'medium'
  })
  const [showHomeRooms, setShowHomeRooms] = useState(true)
  const [showVisitingRooms, setShowVisitingRooms] = useState(true)
  const [deleteRoomTarget, setDeleteRoomTarget] = useState(null)
  const bottomRef = useRef(null)
  const countdownRef = useRef(null)
  const pressTimer = useRef(null)

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
        }, async payload => {
          const { data: msgWithProfile } = await supabase
            .from('messages')
            .select('*, profiles(username, accent_color, home_neighborhood_id)')
            .eq('id', payload.new.id)
            .single()
          if (msgWithProfile) {
            setMessages(prev => {
              const exists = prev.find(m => m.id === msgWithProfile.id)
              if (exists) return prev.map(m => m.id === msgWithProfile.id ? msgWithProfile : m)
              return [...prev, msgWithProfile]
            })
          }
        })
        .subscribe()

      if (activeRoom.is_secret && activeRoom.expires_at) {
        startCountdown(activeRoom.expires_at)
      } else {
        clearInterval(countdownRef.current)
        setSecretCountdown(null)
      }

      return () => {
        supabase.removeChannel(sub)
        clearInterval(countdownRef.current)
      }
    }
  }, [activeRoom])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function startCountdown(expiresAt) {
    clearInterval(countdownRef.current)
    const tick = () => {
      const diff = new Date(expiresAt) - new Date()
      if (diff <= 0) {
        setSecretCountdown('00:00:00')
        clearInterval(countdownRef.current)
        setTimeout(() => setActiveRoom(rooms.find(r => r.is_main) || null), 2000)
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setSecretCountdown(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    tick()
    countdownRef.current = setInterval(tick, 1000)
  }

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!prof) { router.push('/signup'); return }

    setProfile(prof)
    if (prof.accent_color) { setAccent(prof.accent_color); setHue(hexToHue(prof.accent_color)) }

    const { data: homeHood } = await supabase.from('neighborhoods').select('*').eq('id', prof.home_neighborhood_id || prof.neighborhood_id).single()
    setHomeNeighborhood(homeHood)
    await loadRooms(prof, homeHood)
    await loadActiveUsers(homeHood?.id || prof.neighborhood_id, prof.id)

    const { hood: currentHood } = await detectCurrentNeighborhood()
    if (currentHood && currentHood.id !== (prof.home_neighborhood_id || prof.neighborhood_id)) {
      setCurrentNeighborhood(currentHood)
      await loadVisitingRooms(currentHood)
    }

    setLoading(false)
    subscribeToPush(prof.id)

    // Show onboarding if first time
    const seen = localStorage.getItem('dc_onboarded')
    if (!seen) setShowOnboarding(true)
    await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', prof.id)
    setInterval(async () => {
      await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', prof.id)
    }, 300000)
  }

  async function loadRooms(prof, hood) {
    const { data: allRooms } = await supabase.from('rooms').select('*').eq('neighborhood_id', hood?.id || prof.neighborhood_id).order('is_main', { ascending: false })
    const { data: memberships } = await supabase.from('room_members').select('room_id').eq('user_id', prof.id)
    const memberRoomIds = memberships?.map(m => m.room_id) || []

    const visible = allRooms?.filter(room => {
      if (room.is_main) return true
      if (room.is_secret) {
        if (prof.tier === 7) return true
        if (memberRoomIds.includes(room.id)) return true
        return false
      }
      // Free can SEE normal rooms in sidebar but cannot participate
      if (!room.is_private) return true
      if (memberRoomIds.includes(room.id)) return true
      return false
    }) || []

    setRooms(visible)
    if (visible.length > 0) setActiveRoom(visible[0])
  }

  async function loadActiveUsers(neighborhoodId, currentUserId) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    // Get ALL nearby neighborhood IDs to cast a wider net
    const { data: allNeighborhoods } = await supabase
      .from('neighborhoods')
      .select('id')
    const neighborhoodIds = (allNeighborhoods || []).map(n => n.id)
    // Fetch all active non-bot users across ALL neighborhoods
    const { data } = await supabase
      .from('profiles')
      .select('id, username, accent_color, last_seen, status_public, tier, neighborhood_id')
      .eq('status_public', true)
      .eq('is_bot', false)
      .neq('id', currentUserId)
      .gte('last_seen', oneDayAgo)
      .order('last_seen', { ascending: false })
      .limit(20)
    setActiveUsers(data || [])
  }

  async function loadVisitingRooms(hood) {
    const { data: mainRoom } = await supabase.from('rooms').select('*').eq('neighborhood_id', hood.id).eq('is_main', true).single()
    if (mainRoom) setVisitingRooms([mainRoom])
  }

  async function refreshLocation() {
    const { hood: currentHood } = await detectCurrentNeighborhood()
    if (currentHood && currentHood.id !== (profile.home_neighborhood_id || profile.neighborhood_id)) {
      setCurrentNeighborhood(currentHood)
      await loadVisitingRooms(currentHood)
    } else {
      setCurrentNeighborhood(null)
      setVisitingRooms([])
    }
  }

  async function loadMessages(roomId) {
    const { data } = await supabase.from('messages').select('*, profiles(username, accent_color, home_neighborhood_id)').eq('room_id', roomId).order('created_at', { ascending: true }).limit(100)
    setMessages(data || [])
  }

  async function sendMessage() {
    if (!input2.trim() || !canChat()) return
    const optimistic = {
      id: `temp-${Date.now()}`, room_id: activeRoom.id, user_id: profile.id,
      content: input2.trim(), created_at: new Date().toISOString(),
      profiles: { username: profile.username, accent_color: profile.accent_color, home_neighborhood_id: profile.home_neighborhood_id, neighborhoods: homeNeighborhood ? { name: homeNeighborhood.name } : null }
    }
    setMessages(prev => [...prev, optimistic])
    setInput2('')
    const { error } = await supabase.from('messages').insert({ room_id: activeRoom.id, user_id: profile.id, content: optimistic.content })
    if (error) { setMessages(prev => prev.filter(m => m.id !== optimistic.id)); setInput2(optimistic.content) }
    else { fetch('/api/push/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId: activeRoom.id, message: optimistic.content, senderUsername: profile.username }) }) }
  }

  async function deleteMessage(msgId) {
    setDeleteTarget(null)
    setMessages(prev => prev.filter(m => m.id !== msgId))
    await supabase.from('messages').delete().eq('id', msgId).eq('user_id', profile.id)
  }


  async function deleteRoom(roomId) {
    setDeleteRoomTarget(null)
    await supabase.from('messages').delete().eq('room_id', roomId)
    await supabase.from('room_members').delete().eq('room_id', roomId)
    await supabase.from('rooms').delete().eq('id', roomId).eq('created_by', profile.id)
    const mainRoom = rooms.find(r => r.is_main)
    if (mainRoom) setActiveRoom(mainRoom)
    setRooms(prev => prev.filter(r => r.id !== roomId))
  }

    function handlePressStart(msg) {
    if (msg.user_id !== profile?.id) return
    pressTimer.current = setTimeout(() => setDeleteTarget(msg.id), 500)
  }

  function handlePressEnd() {
    clearTimeout(pressTimer.current)
  }

  function isVisitor(msg) { return isVisiting && msg.user_id === profile?.id }

  function isOutOfTowner(msg) {
    if (isVisiting || !activeRoom) return false
    const msgHomeHood = msg.profiles?.home_neighborhood_id
    return msgHomeHood && msgHomeHood !== homeNeighborhood?.id
  }

  function canChat() {
    if (activeRoom?.is_main) return true
    if (profile?.tier === 0) return false
    if (activeRoom?.is_secret) return profile?.tier === 7
    if (activeRoom?.is_private) return profile?.tier === 7 || rooms.find(r => r.id === activeRoom.id) !== undefined
    return profile?.tier >= 3
  }

  function lockedReason() {
    if (activeRoom?.is_secret) return 'Secret Rooms are Pro only'
    if (profile?.tier === 0) return 'Join Plus to chat in this room'
    return 'You need an invite to chat here'
  }

  function hexToHue(hex) {
    const r=parseInt(hex.slice(1,3),16)/255, g=parseInt(hex.slice(3,5),16)/255, b=parseInt(hex.slice(5,7),16)/255
    const max=Math.max(r,g,b), min=Math.min(r,g,b)
    if (max===min) return 0
    const d=max-min
    let h=max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4
    return Math.round(h*60)
  }

  function hueToHex(h) {
    const f=(n)=>{const k=(n+h/60)%6;return Math.round((1-Math.max(0,Math.min(k,4-k,1)))*255)}
    const r=f(5),g=f(3),b=f(1)
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
  }

  async function handleHueChange(h) {
    if (profile?.tier === 0) return
    setHue(h); const color=hueToHex(h); setAccent(color)
    await supabase.from('profiles').update({ accent_color: color }).eq('id', profile.id)
  }

  const roomColor = activeRoom?.theme_color || accent
  const roomFont = activeRoom?.theme_font || 'sans-serif'

  if (loading) return (
    <div style={{ background: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#fff', fontFamily: 'sans-serif' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000', color: '#fff', fontFamily: roomFont, position: 'relative', overflow: 'hidden', fontSize: `${FONT_SCALE[fontSize] * 16}px` }}>

      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10 }} />}

      {/* Secret Room countdown banner */}
      {activeRoom?.is_secret && secretCountdown && (
        <div style={{ background: '#1a0a1f', borderBottom: '1px solid #ce93d833', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: '#ce93d8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>🔒 Secret Session</span>
          <span style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, color: secretCountdown === '00:00:00' ? '#ff4444' : '#ce93d8', letterSpacing: '0.05em' }}>{secretCountdown}</span>
          <span style={{ fontSize: 11, color: '#664477', letterSpacing: '0.1em', textTransform: 'uppercase' }}>remaining</span>
        </div>
      )}

      {/* Sidebar */}
      <div style={{ position: 'fixed', top: 0, left: 0, height: '100%', width: 270, background: '#111', zIndex: 20, display: 'flex', flexDirection: 'column', transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)', borderRight: `1px solid ${accent}33` }}>
        <div style={{ padding: '24px 18px 14px', borderBottom: `1px solid ${accent}22` }}>
          <div style={{ fontWeight: 800, fontSize: 20, color: accent, letterSpacing: '-0.5px' }}>Dopechatz</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          <div style={{ padding: '8px 18px 4px', fontSize: 10, color: '#444', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
            🏠 {homeNeighborhood?.name || 'Home'}
          </div>

          {rooms.filter(r => !r.is_secret).map(room => {
            const isActive = activeRoom?.id === room.id && !isVisiting
            const isFreeBlocked = profile?.tier === 0 && !room.is_main
            const rColor = room.theme_color || accent
            return (
              <div key={room.id} onClick={() => { setActiveRoom(room); setIsVisiting(false); setSidebarOpen(false) }}
                style={{ padding: '12px 18px', cursor: 'pointer', background: isActive ? `${rColor}18` : 'transparent', borderLeft: isActive ? `3px solid ${rColor}` : '3px solid transparent', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, color: isActive ? rColor : isFreeBlocked ? '#3a3a3a' : '#aaa', transition: 'all 0.15s ease', fontFamily: room.theme_font || 'sans-serif' }}>
                <span>{room.name}</span>
                {room.is_main && <span style={{ fontSize: 10, color: rColor, opacity: 0.5, marginLeft: 'auto' }}>★</span>}
                {isFreeBlocked && <span style={{ fontSize: 9, color: '#333', marginLeft: 'auto', border: '1px solid #2a2a2a', borderRadius: 8, padding: '1px 6px' }}>Plus</span>}
              </div>
            )
          })}

          {rooms.filter(r => r.is_secret).length > 0 && (
            <>
              <div style={{ padding: '16px 18px 4px', fontSize: 10, color: '#664477', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>🔒 Secret Rooms</div>
              {rooms.filter(r => r.is_secret).map(room => (
                <div key={room.id} onClick={() => { setActiveRoom(room); setIsVisiting(false); setSidebarOpen(false) }}
                  style={{ padding: '12px 18px', cursor: 'pointer', background: activeRoom?.id === room.id && !isVisiting ? '#ce93d818' : 'transparent', borderLeft: activeRoom?.id === room.id && !isVisiting ? '3px solid #ce93d8' : '3px solid transparent', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, color: activeRoom?.id === room.id && !isVisiting ? '#ce93d8' : '#664477', transition: 'all 0.15s ease' }}>
                  <span>{room.name}</span>
                  <span style={{ fontSize: 10, color: '#664477', marginLeft: 'auto' }}>secret</span>
                </div>
              ))}
            </>
          )}

          {visitingRooms.length > 0 && (
            <>
              <div style={{ padding: '16px 18px 4px', fontSize: 10, color: '#444', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>📍 {currentNeighborhood?.name || 'Nearby'}</div>
              {visitingRooms.map(room => (
                <div key={room.id} onClick={() => { setActiveRoom(room); setIsVisiting(true); setSidebarOpen(false) }}
                  style={{ padding: '12px 18px', cursor: 'pointer', background: activeRoom?.id === room.id && isVisiting ? `${accent}18` : 'transparent', borderLeft: activeRoom?.id === room.id && isVisiting ? `3px solid ${accent}` : '3px solid transparent', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, color: activeRoom?.id === room.id && isVisiting ? accent : '#aaa' }}>
                  <span>{room.name}</span>
                  <span style={{ fontSize: 10, color: '#555', marginLeft: 'auto' }}>visiting</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Active users */}
        {activeUsers.length > 0 && (
          <div style={{ borderTop: `1px solid ${accent}22`, padding: '8px 0' }}>
            <div onClick={() => setShowActive(!showActive)} style={{ padding: '8px 18px', fontSize: 10, color: '#444', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>⚡ Active Now ({activeUsers.length})</span>
              <span>{showActive ? '▾' : '▸'}</span>
            </div>
            {showActive && (
              <>
                {profile?.tier !== 7 && (
                  <div style={{ padding: '4px 18px 8px', fontSize: 11, color: '#444' }}>
                    <span onClick={() => router.push('/upgrade')} style={{ color: accent, cursor: 'pointer', textDecoration: 'underline' }}>Upgrade to Pro</span>{' '}to send DMs
                  </div>
                )}
                {activeUsers.map(u => (
                  <div key={u.id} onClick={() => { if (profile?.tier !== 7) { router.push('/upgrade'); return } router.push('/dm/' + u.id) }}
                    style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', opacity: profile?.tier !== 7 ? 0.4 : 1 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 6px #00ff88' }} />
                    <span style={{ fontSize: 13, color: u.accent_color || '#aaa', fontWeight: 600 }}>{u.username}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Settings */}
        <div style={{ padding: '14px 18px', borderTop: `1px solid ${accent}22` }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>{profile?.username}</div>
          <div style={{ fontSize: 11, color: '#444', marginBottom: 12 }}>{profile?.tier === 0 ? 'Free' : profile?.tier === 3 ? 'Plus' : 'Pro'}</div>

          {profile?.tier >= 3 ? (
            <>
              <div onClick={() => setShowColorPicker(!showColorPicker)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: accent, boxShadow: `0 0 6px ${accent}88` }} />
                <span style={{ fontSize: 12, color: '#666' }}>Accent color</span>
              </div>
              {showColorPicker && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ height: 10, borderRadius: 5, marginBottom: 8, background: 'linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)' }} />
                  <input type="range" min={0} max={359} value={hue} onChange={e => handleHueChange(Number(e.target.value))} style={{ width: '100%', accentColor: accent }} />
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 11, color: '#333', marginBottom: 10 }}>
              🎨 <span onClick={() => router.push('/upgrade')} style={{ color: accent, cursor: 'pointer', textDecoration: 'underline' }}>Plus</span>
              <span style={{ color: '#444' }}> to customize colors</span>
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#444', marginBottom: 6 }}>Text size</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['small', 'medium', 'large'].map(size => (
                <button key={size} onClick={() => {
                  setFontSize(size)
                  localStorage.setItem('dc_fontsize', size)
                }} style={{
                  flex: 1, padding: '6px 0', fontSize: 11,
                  background: fontSize === size ? accent : 'transparent',
                  color: fontSize === size ? '#000' : '#555',
                  border: `1px solid ${fontSize === size ? accent : '#333'}`,
                  borderRadius: 6, cursor: 'pointer', fontWeight: fontSize === size ? 700 : 400
                }}>
                  {size === 'small' ? 'A' : size === 'medium' ? 'A' : 'A'}
                </button>
              ))}
            </div>
          </div>
          <button onClick={refreshLocation} style={{ fontSize: 11, color: accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 8, display: 'block' }}>📍 Refresh location</button>

          <div onClick={async () => { const n=!profile.status_public; await supabase.from('profiles').update({ status_public: n }).eq('id', profile.id); setProfile(prev => ({ ...prev, status_public: n })) }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: profile?.status_public ? '#00ff88' : '#444', boxShadow: profile?.status_public ? '0 0 6px #00ff88' : 'none' }} />
            <span style={{ fontSize: 12, color: '#666' }}>{profile?.status_public ? 'Active status on' : 'Active status off'}</span>
          </div>

          {profile?.tier === 0 && (
            <button onClick={() => router.push('/upgrade')} style={{ width: '100%', padding: '10px', background: accent, color: '#000', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: 'pointer', marginBottom: 10 }}>Upgrade</button>
          )}
          {profile?.tier > 0 && (
            <button onClick={() => router.push('/create-room')} style={{ width: '100%', padding: '8px', fontSize: 12, color: accent, background: 'none', border: '1px solid ' + accent + '44', borderRadius: 6, cursor: 'pointer', marginBottom: 8, display: 'block' }}>+ New Room</button>
          )}
          {profile?.tier === 7 && (
            <button onClick={() => router.push('/contacts')} style={{ width: '100%', padding: '8px', fontSize: 12, color: '#ce93d8', background: 'none', border: '1px solid #ce93d844', borderRadius: 6, cursor: 'pointer', marginBottom: 8, display: 'block' }}>💬 Contacts</button>
          )}
          <button onClick={() => router.push('/help')} style={{ width: '100%', padding: '8px', fontSize: 12, color: '#555', background: 'none', border: '1px solid #222', borderRadius: 6, cursor: 'pointer', marginBottom: 8, display: 'block' }}>? Help & Features</button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'Dopechatz',
                  text: "Hey, check out Dopechatz — it's a free anonymous chat app for your neighborhood. No sign up BS, just your location.",
                  url: 'https://dopechatz.vercel.app'
                })
              } else {
                navigator.clipboard.writeText('https://dopechatz.vercel.app')
                alert('Link copied!')
              }
            }}
            style={{ width: '100%', padding: '8px', fontSize: 12, color: '#00ffdd', background: 'none', border: '1px solid #00ffdd33', borderRadius: 6, cursor: 'pointer', marginBottom: 8, display: 'block' }}
          >
            📤 Share Dopechatz
          </button>
                    <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} style={{ fontSize: 11, color: '#444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Sign out</button>
        </div>
      </div>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px', height: 56, borderBottom: `1px solid ${roomColor}22`, background: '#111', flexShrink: 0 }}>
        <button onClick={() => setSidebarOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px 10px 10px 4px', display: 'flex', flexDirection: 'column', gap: 5, borderRadius: 8 }}>
          <div style={{ width: 24, height: 2, background: roomColor, borderRadius: 2, transform: sidebarOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none', transition: 'transform 0.25s ease' }} />
          <div style={{ width: 24, height: 2, background: roomColor, borderRadius: 2, opacity: sidebarOpen ? 0 : 1, transition: 'opacity 0.2s ease' }} />
          <div style={{ width: 24, height: 2, background: roomColor, borderRadius: 2, transform: sidebarOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none', transition: 'transform 0.25s ease' }} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: activeRoom?.is_secret ? '#ce93d8' : '#fff', fontFamily: roomFont }}>
            {activeRoom?.is_secret && '🔒 '}{activeRoom?.name}
          </div>
          {isVisiting && currentNeighborhood && <div style={{ fontSize: 11, color: roomColor }}>📍 Visiting {currentNeighborhood.name}</div>}
        </div>
        {activeRoom?.created_by === profile?.id && !activeRoom?.is_main && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => router.push('/invite?room=' + activeRoom.id)} style={{ background: 'none', border: '1px solid ' + roomColor + '44', borderRadius: 6, color: roomColor, fontSize: 12, padding: '6px 10px', cursor: 'pointer' }}>+ Invite</button>
            <button onClick={() => setDeleteRoomTarget(activeRoom.id)} style={{ background: 'none', border: '1px solid #ff444433', borderRadius: 6, color: '#ff4444', fontSize: 12, padding: '6px 10px', cursor: 'pointer' }}>🗑️</button>
          </div>
        )}
      </div>

      {deleteRoomTarget && (
        <div onClick={() => setDeleteRoomTarget(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 40px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 16, padding: '24px 20px', width: '100%', maxWidth: 360, margin: '0 16px' }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Delete this room?</div>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 24, lineHeight: 1.6 }}>This permanently deletes the room and all its messages. Cannot be undone.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteRoomTarget(null)} style={{ flex: 1, padding: '12px', background: 'none', border: '1px solid #333', borderRadius: 10, color: '#aaa', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => deleteRoom(deleteRoomTarget)} style={{ flex: 1, padding: '12px', background: '#ff4444', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>Delete Room</button>
            </div>
          </div>
        </div>
      )}

      {/* First-time onboarding overlay */}
      {showOnboarding && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 32px' }}>
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: 20, padding: '28px 22px', width: '100%', maxWidth: 400, margin: '0 16px' }}>
            <div style={{ fontSize: 28, marginBottom: 12, textAlign: 'center' }}>👋</div>
            <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 8, textAlign: 'center' }}>Welcome to Dopechatz</div>
            <div style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 24, textAlign: 'center' }}>
              You're now in your neighborhood's chat. Say hi, see who's around, and explore — everything here is anonymous by default.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                '💬 Tap the menu (top left) to switch rooms',
                '🎨 Upgrade to Plus for custom colors & rooms',
                '🔒 Go Pro for Secret Rooms & DMs',
                '🗑️ Hold any of your messages to delete them',
              ].map(tip => (
                <div key={tip} style={{ fontSize: 13, color: '#666', padding: '8px 12px', background: '#0a0a0a', borderRadius: 8 }}>{tip}</div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button
                onClick={() => { router.push('/help') }}
                style={{ flex: 1, padding: '12px', background: 'none', border: '1px solid #333', borderRadius: 10, color: '#aaa', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                See all features
              </button>
              <button
                onClick={() => { localStorage.setItem('dc_onboarded', '1'); setShowOnboarding(false) }}
                style={{ flex: 1, padding: '12px', background: accent, border: 'none', borderRadius: 10, color: '#000', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
              >
                Let's go!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation overlay */}
      {deleteTarget && (
        <div onClick={() => setDeleteTarget(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 40px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 16, padding: '24px 20px', width: '100%', maxWidth: 360, margin: '0 16px' }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Delete message?</div>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 24 }}>This will remove the message for everyone. This can't be undone.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '12px', background: 'none', border: '1px solid #333', borderRadius: 10, color: '#aaa', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => deleteMessage(deleteTarget)} style={{ flex: 1, padding: '12px', background: '#ff4444', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: activeRoom?.is_secret ? '#0d000f' : '#000' }}>
        {messages.map(msg => {
          const msgAccent = msg.profiles?.accent_color || '#888'
          const outOfTowner = isOutOfTowner(msg)
          const visitor = isVisitor(msg)
          const homeHoodName = msg.profiles?.neighborhoods?.name
          const isMyMsg = msg.user_id === profile?.id
          const isTargeted = deleteTarget === msg.id
          return (
            <div
              key={msg.id}
              style={{ marginBottom: 18, opacity: isTargeted ? 0.5 : 1, transition: 'opacity 0.2s', userSelect: 'none' }}
              onTouchStart={() => handlePressStart(msg)}
              onTouchEnd={handlePressEnd}
              onTouchMove={handlePressEnd}
              onMouseDown={() => handlePressStart(msg)}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: msgAccent, fontFamily: roomFont }}>{msg.profiles?.username}</span>
                {outOfTowner && homeHoodName && (
                  <span style={{ fontSize: 10, color: msgAccent, opacity: 0.7, border: `1px solid ${msgAccent}44`, borderRadius: 10, padding: '1px 7px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>🌍 from {homeHoodName}</span>
                )}
                {visitor && (
                  <span style={{ fontSize: 10, color: accent, opacity: 0.7, border: `1px solid ${accent}44`, borderRadius: 10, padding: '1px 7px' }}>📍 visiting</span>
                )}
                <span style={{ fontSize: 11, color: '#333' }}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {isMyMsg && <span style={{ fontSize: 10, color: '#222', marginLeft: 'auto' }}>hold to delete</span>}
              </div>
              <div style={{ fontSize: 15, marginTop: 3, color: msgAccent === '#888' ? '#ddd' : msgAccent + 'cc', lineHeight: 1.4, fontFamily: roomFont }}>{msg.content}</div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 12px', borderTop: `1px solid ${roomColor}22`, display: 'flex', gap: 8, background: '#111', flexShrink: 0 }}>
        {canChat() ? (
          <>
            <textarea value={input2} onChange={e => {
                setInput2(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }} onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
              }}
              placeholder={isVisiting ? `Chatting in ${currentNeighborhood?.name}...` : activeRoom?.is_secret ? 'This message will vanish...' : 'Say something...'}
              rows={1} style={{ flex: 1, padding: '11px 14px', fontSize: 15, border: `1px solid ${roomColor}33`, borderRadius: 10, background: '#1a1a1a', color: '#fff', outline: 'none', fontFamily: roomFont, resize: 'none', lineHeight: '1.4', maxHeight: '120px', overflowY: 'auto' }}></textarea>
            <button onClick={sendMessage} style={{ padding: '11px 20px', background: activeRoom?.is_secret ? '#ce93d8' : roomColor, color: '#000', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>Send</button>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ fontSize: 13, color: '#444' }}>{lockedReason()}</span>
            {profile?.tier === 0 && (
              <button onClick={() => router.push('/upgrade')} style={{ padding: '8px 14px', background: accent, color: '#000', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>Upgrade</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
