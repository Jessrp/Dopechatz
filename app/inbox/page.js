'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function InboxPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [accent, setAccent] = useState('#3b82f6')
  const [myRooms, setMyRooms] = useState([])
  const [dmActivity, setDmActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!prof) { router.push('/chat'); return }
    setProfile(prof)
    if (prof.accent_color) setAccent(prof.accent_color)

    const { data: createdRooms } = await supabase.from('rooms').select('*').eq('created_by', user.id).eq('is_secret', false).order('last_message_at', { ascending: false })
    const { data: reads } = await supabase.from('room_reads').select('room_id, last_read_at').eq('user_id', user.id)
    const readMap = {}
    reads?.forEach(r => { readMap[r.room_id] = r.last_read_at })

    const roomsWithUnread = await Promise.all((createdRooms || []).map(async room => {
      const lastRead = readMap[room.id]
      let q = supabase.from('messages').select('*', { count: 'exact', head: true }).eq('room_id', room.id).neq('user_id', user.id)
      if (lastRead) q = q.gt('created_at', lastRead)
      const { count } = await q
      const { data: lastMsg } = await supabase.from('messages').select('content, created_at, profiles(username)').eq('room_id', room.id).order('created_at', { ascending: false }).limit(1).single()
      return { ...room, unread: count || 0, lastMsg }
    }))
    setMyRooms(roomsWithUnread)

    if (prof.tier === 7) {
      const { data: sentDMs } = await supabase.from('direct_messages').select('receiver_id').eq('sender_id', user.id)
      const { data: receivedDMs } = await supabase.from('direct_messages').select('sender_id').eq('receiver_id', user.id)
      const contactIds = new Set([...(sentDMs || []).map(m => m.receiver_id), ...(receivedDMs || []).map(m => m.sender_id)])
      if (contactIds.size > 0) {
        const { data: contacts } = await supabase.from('profiles').select('id, username, accent_color, tier').in('id', [...contactIds]).eq('tier', 7)
        const { data: dmReads } = await supabase.from('dm_reads').select('other_user_id, last_read_at').eq('user_id', user.id)
        const dmReadMap = {}
        dmReads?.forEach(r => { dmReadMap[r.other_user_id] = r.last_read_at })
        const dmsWithUnread = await Promise.all((contacts || []).map(async contact => {
          const lastRead = dmReadMap[contact.id]
          let q = supabase.from('direct_messages').select('*', { count: 'exact', head: true }).eq('sender_id', contact.id).eq('receiver_id', user.id)
          if (lastRead) q = q.gt('created_at', lastRead)
          const { count } = await q
          const { data: lastMsg } = await supabase.from('direct_messages').select('content, created_at, sender_id').or(`and(sender_id.eq.${user.id},receiver_id.eq.${contact.id}),and(sender_id.eq.${contact.id},receiver_id.eq.${user.id})`).order('created_at', { ascending: false }).limit(1).single()
          return { ...contact, unread: count || 0, lastMsg }
        }))
        setDmActivity(dmsWithUnread.sort((a, b) => (!a.lastMsg ? 1 : !b.lastMsg ? -1 : new Date(b.lastMsg.created_at) - new Date(a.lastMsg.created_at))))
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

  const totalUnread = myRooms.reduce((s, r) => s + r.unread, 0) + dmActivity.reduce((s, d) => s + d.unread, 0)

  if (loading) return <div style={{ background: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#fff', fontFamily: 'sans-serif' }}>Loading...</p></div>

  const Row = ({ onClick, avatar, avatarColor, unread, name, nameColor, nameFont, time, preview }) => (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: '1px solid #0f0f0f', cursor: 'pointer' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: `${avatarColor}22`, border: `2px solid ${avatarColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: avatarColor }}>{avatar}</span>
        </div>
        {unread > 0 && <div style={{ position: 'absolute', top: -2, right: -2, width: 18, height: 18, borderRadius: '50%', background: '#ff4444', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>{unread > 9 ? '9+' : unread}</span></div>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontWeight: unread > 0 ? 800 : 600, fontSize: 14, color: nameColor, fontFamily: nameFont || 'sans-serif' }}>{name}</span>
          <span style={{ fontSize: 11, color: '#333' }}>{time}</span>
        </div>
        <div style={{ fontSize: 13, color: unread > 0 ? '#aaa' : '#444', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{preview}</div>
      </div>
    </div>
  )

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#111', borderBottom: `1px solid ${accent}22`, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', height: 56 }}>
        <button onClick={() => router.push('/chat')} style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', fontSize: 20, padding: 0 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Inbox</div>
          {totalUnread > 0 && <div style={{ fontSize: 11, color: '#ff4444' }}>{totalUnread} unread</div>}
        </div>
      </div>

      <div style={{ padding: '12px 16px 80px' }}>
        {dmActivity.length > 0 && (
          <>
            <div style={{ fontSize: 10, color: '#444', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10, marginTop: 8 }}>Direct Messages</div>
            {dmActivity.map(c => (
              <Row key={c.id} onClick={() => router.push('/dm/' + c.id)}
                avatar={c.username.charAt(0).toUpperCase()} avatarColor={c.accent_color || '#888'}
                unread={c.unread} name={c.username} nameColor={c.accent_color || '#fff'}
                time={formatTime(c.lastMsg?.created_at)}
                preview={c.lastMsg ? (c.lastMsg.sender_id === profile?.id ? 'You: ' : '') + c.lastMsg.content : 'No messages yet'} />
            ))}
          </>
        )}

        {myRooms.length > 0 && (
          <>
            <div style={{ fontSize: 10, color: '#444', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10, marginTop: 24 }}>Your Rooms</div>
            {myRooms.map(room => (
              <Row key={room.id} onClick={() => router.push('/chat')}
                avatar="💬" avatarColor={room.theme_color || accent}
                unread={room.unread} name={room.name} nameColor={room.theme_color || '#fff'} nameFont={room.theme_font}
                time={formatTime(room.last_message_at)}
                preview={room.lastMsg ? `${room.lastMsg.profiles?.username}: ${room.lastMsg.content}` : 'No messages yet'} />
            ))}
          </>
        )}

        {myRooms.length === 0 && dmActivity.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📭</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Nothing here yet</div>
            <div style={{ fontSize: 14, color: '#444', lineHeight: 1.6 }}>Your DMs and rooms you create will show up here.</div>
          </div>
        )}
      </div>
    </div>
  )
}
