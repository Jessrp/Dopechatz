'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function InboxPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [accent, setAccent] = useState('#3b82f6')
  const [roomActivity, setRoomActivity] = useState([])
  const [dmActivity, setDmActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

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

    // Get rooms user has access to
    const { data: allRooms } = await supabase
      .from('rooms')
      .select('*, messages(content, created_at, user_id, profiles(username))')
      .eq('neighborhood_id', prof.home_neighborhood_id || prof.neighborhood_id)
      .eq('is_secret', false)
      .order('last_message_at', { ascending: false })

    // Get last read times for rooms
    const { data: reads } = await supabase
      .from('room_reads')
      .select('room_id, last_read_at')
      .eq('user_id', user.id)

    const readMap = {}
    reads?.forEach(r => { readMap[r.room_id] = r.last_read_at })

    // Count unread messages per room
    const roomsWithUnread = await Promise.all((allRooms || []).map(async room => {
      const lastRead = readMap[room.id]
      if (!lastRead) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', room.id)
          .neq('user_id', user.id)
        return { ...room, unread: count || 0 }
      }
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id)
        .neq('user_id', user.id)
        .gt('created_at', lastRead)
      return { ...room, unread: count || 0 }
    }))

    setRoomActivity(roomsWithUnread.filter(r => r.last_message_at))

    // Get DM activity if Pro
    if (prof.tier === 7) {
      const { data: sentDMs } = await supabase
        .from('direct_messages')
        .select('receiver_id')
        .eq('sender_id', user.id)

      const { data: receivedDMs } = await supabase
        .from('direct_messages')
        .select('sender_id')
        .eq('receiver_id', user.id)

      const contactIds = new Set([
        ...(sentDMs || []).map(m => m.receiver_id),
        ...(receivedDMs || []).map(m => m.sender_id)
      ])

      if (contactIds.size > 0) {
        const { data: contacts } = await supabase
          .from('profiles')
          .select('id, username, accent_color, tier')
          .in('id', [...contactIds])
          .eq('tier', 7)

        const { data: dmReads } = await supabase
          .from('dm_reads')
          .select('other_user_id, last_read_at')
          .eq('user_id', user.id)

        const dmReadMap = {}
        dmReads?.forEach(r => { dmReadMap[r.other_user_id] = r.last_read_at })

        const dmsWithUnread = await Promise.all((contacts || []).map(async contact => {
          const lastRead = dmReadMap[contact.id]
          const query = supabase
            .from('direct_messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', contact.id)
            .eq('receiver_id', user.id)
          if (lastRead) query.gt('created_at', lastRead)
          const { count } = await query
          const { data: lastMsg } = await supabase
            .from('direct_messages')
            .select('content, created_at')
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${contact.id}),and(sender_id.eq.${contact.id},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          return { ...contact, unread: count || 0, lastMsg }
        }))

        setDmActivity(dmsWithUnread.sort((a, b) => {
          if (!a.lastMsg) return 1
          if (!b.lastMsg) return -1
          return new Date(b.lastMsg.created_at) - new Date(a.lastMsg.created_at)
        }))
      }
    }

    setLoading(false)
  }

  function formatTime(iso) {
    if (!iso) return ''
    const date = new Date(iso)
    const now = new Date()
    const diffDays = Math.floor((now - date) / 86400000)
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' })
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const totalUnread = roomActivity.reduce((sum, r) => sum + r.unread, 0) +
    dmActivity.reduce((sum, d) => sum + d.unread, 0)

  if (loading) return (
    <div style={{ background: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#fff', fontFamily: 'sans-serif' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' }}>
      {/* Top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#111', borderBottom: `1px solid ${accent}22`, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', height: 56 }}>
        <button onClick={() => router.push('/chat')} style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', fontSize: 20, padding: 0 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Inbox</div>
          {totalUnread > 0 && <div style={{ fontSize: 11, color: '#ff4444' }}>{totalUnread} unread</div>}
        </div>
      </div>

      <div style={{ padding: '12px 16px 80px' }}>

        {/* DMs section */}
        {dmActivity.length > 0 && (
          <>
            <div style={{ fontSize: 10, color: '#444', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10, marginTop: 8 }}>Direct Messages</div>
            {dmActivity.map(contact => (
              <div key={contact.id} onClick={() => router.push('/dm/' + contact.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: '1px solid #0f0f0f', cursor: 'pointer' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${contact.accent_color || '#888'}22`, border: `2px solid ${contact.accent_color || '#888'}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: contact.accent_color || '#888' }}>{contact.username.charAt(0).toUpperCase()}</span>
                  </div>
                  {contact.unread > 0 && (
                    <div style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: '#ff4444', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>{contact.unread}</span>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontWeight: contact.unread > 0 ? 800 : 600, fontSize: 14, color: contact.accent_color || '#fff' }}>{contact.username}</span>
                    <span style={{ fontSize: 11, color: '#333' }}>{formatTime(contact.lastMsg?.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: contact.unread > 0 ? '#aaa' : '#444', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {contact.lastMsg?.content || 'No messages yet'}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Rooms section */}
        {roomActivity.length > 0 && (
          <>
            <div style={{ fontSize: 10, color: '#444', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10, marginTop: 20 }}>Chatrooms</div>
            {roomActivity.map(room => (
              <div key={room.id} onClick={() => router.push('/chat')}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: '1px solid #0f0f0f', cursor: 'pointer' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${room.theme_color || accent}22`, border: `2px solid ${room.theme_color || accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 18 }}>{room.is_main ? '🏠' : '💬'}</span>
                  </div>
                  {room.unread > 0 && (
                    <div style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: '#ff4444', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>{room.unread > 9 ? '9+' : room.unread}</span>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontWeight: room.unread > 0 ? 800 : 600, fontSize: 14, color: room.theme_color || '#fff', fontFamily: room.theme_font || 'sans-serif' }}>{room.name}</span>
                    <span style={{ fontSize: 11, color: '#333' }}>{formatTime(room.last_message_at)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: room.unread > 0 ? '#aaa' : '#444' }}>
                    {room.unread > 0 ? `${room.unread} new message${room.unread !== 1 ? 's' : ''}` : 'No new messages'}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {roomActivity.length === 0 && dmActivity.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📭</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>All caught up!</div>
            <div style={{ fontSize: 14, color: '#444' }}>No new messages anywhere.</div>
          </div>
        )}
      </div>
    </div>
  )
}
