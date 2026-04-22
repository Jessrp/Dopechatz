'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const DESTRUCT_OPTIONS = [
  { label: 'Off', value: null },
  { label: 'On read', value: 'on_read' },
  { label: '5 min', value: '5m' },
  { label: '1 hr', value: '1h' },
  { label: '24 hr', value: '24h' },
]

function destructLabel(val) {
  const o = DESTRUCT_OPTIONS.find(d => d.value === val)
  return o ? o.label : 'Off'
}

function expiresAtFromOption(option) {
  if (!option || option === 'on_read') return null
  const map = { '5m': 5 * 60 * 1000, '1h': 60 * 60 * 1000, '24h': 24 * 60 * 60 * 1000 }
  return new Date(Date.now() + map[option]).toISOString()
}

function timeLeft(expiresAt) {
  const diff = new Date(expiresAt) - new Date()
  if (diff <= 0) return 'expired'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export default function DMPage() {
  const router = useRouter()
  const { userId } = useParams()
  const [profile, setProfile] = useState(null)
  const [other, setOther] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [accent, setAccent] = useState('#3b82f6')
  const [destructMode, setDestructMode] = useState(null)
  const [showDestructPicker, setShowDestructPicker] = useState(false)
  const [, forceUpdate] = useState(0)
  const bottomRef = useRef(null)
  const tickRef = useRef(null)

  useEffect(() => { loadData() }, [userId])

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [messages])

  // Tick every second to update countdown timers and purge expired messages
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setMessages(prev => {
        const now = new Date()
        const filtered = prev.filter(m => {
          if (!m.expires_at) return true
          return new Date(m.expires_at) > now
        })
        return filtered
      })
      forceUpdate(n => n + 1)
    }, 1000)
    return () => clearInterval(tickRef.current)
  }, [])

  useEffect(() => {
    if (!profile) return
    const sub = supabase
      .channel(`dm:${[profile.id, userId].sort().join('-')}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages'
      }, async payload => {
        const msg = payload.new
        if (
          (msg.sender_id === profile.id && msg.receiver_id === userId) ||
          (msg.sender_id === userId && msg.receiver_id === profile.id)
        ) {
          setMessages(prev => {
            const exists = prev.find(m => m.id === msg.id)
            if (exists) return prev
            return [...prev, msg]
          })

          // If this is an incoming on_read message, mark it seen immediately
          if (msg.sender_id === userId && msg.destruct_mode === 'on_read') {
            await markSeen(msg.id)
          }
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'direct_messages'
      }, payload => {
        const msg = payload.new
        // If seen_at just got set on an on_read message, start 3s removal
        if (msg.destruct_mode === 'on_read' && msg.seen_at) {
          setTimeout(() => {
            setMessages(prev => prev.filter(m => m.id !== msg.id))
          }, 3000)
          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, seen_at: msg.seen_at } : m))
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'direct_messages'
      }, payload => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id))
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [profile, userId])

  async function markSeen(msgId) {
    await supabase
      .from('direct_messages')
      .update({ seen_at: new Date().toISOString() })
      .eq('id', msgId)
      .is('seen_at', null)
  }

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!prof) { router.push('/chat'); return }

    // DMs are Pro only
    if (prof.tier !== 7) {
      router.push('/upgrade')
      return
    }

    setProfile(prof)
    if (prof.accent_color) setAccent(prof.accent_color)

    const { data: otherUser } = await supabase
      .from('profiles')
      .select('id, username, accent_color, last_seen, status_public, tier')
      .eq('id', userId)
      .single()

    setOther(otherUser)

    const { data: msgs } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
      .limit(100)

    // Filter out already-expired messages client-side
    const now = new Date()
    const live = (msgs || []).filter(m => !m.expires_at || new Date(m.expires_at) > now)
    setMessages(live)

    // Mark any unread on_read messages as seen
    const unread = live.filter(m => m.sender_id === userId && m.destruct_mode === 'on_read' && !m.seen_at)
    for (const m of unread) await markSeen(m.id)

    setLoading(false)
  }

  async function sendMessage() {
    if (!input.trim()) return

    const expiresAt = expiresAtFromOption(destructMode)

    const optimistic = {
      id: `temp-${Date.now()}`,
      sender_id: profile.id,
      receiver_id: userId,
      content: input.trim(),
      created_at: new Date().toISOString(),
      destruct_mode: destructMode,
      expires_at: expiresAt,
      seen_at: null
    }

    setMessages(prev => [...prev, optimistic])
    setInput('')

    const { error } = await supabase.from('direct_messages').insert({
      sender_id: profile.id,
      receiver_id: userId,
      content: optimistic.content,
      destruct_mode: destructMode,
      expires_at: expiresAt,
    })

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setInput(optimistic.content)
    }
  }

  function isActive(user) {
    if (!user?.last_seen || !user?.status_public) return false
    return new Date(user.last_seen) > new Date(Date.now() - 15 * 60 * 1000)
  }

  function destructColor(mode) {
    if (!mode) return '#444'
    return '#ff6b6b'
  }

  if (loading) return (
    <div style={{ background: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#fff', fontFamily: 'sans-serif' }}>Loading...</p>
    </div>
  )

  const otherAccent = other?.accent_color || '#888'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#000', color: '#fff', fontFamily: 'sans-serif' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', height: 56, borderBottom: `1px solid ${accent}22`, background: '#111', flexShrink: 0 }}>
        <button
          onClick={() => router.push('/chat')}
          style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', fontSize: 20, padding: 0, lineHeight: 1 }}
        >
          ←
        </button>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: isActive(other) ? '#00ff88' : '#333', boxShadow: isActive(other) ? '0 0 6px #00ff88' : 'none', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: otherAccent }}>{other?.username}</div>
          <div style={{ fontSize: 11, color: '#444' }}>{isActive(other) ? 'Active now' : 'Offline'}</div>
        </div>
        {/* Self-destruct toggle in header */}
        <div
          onClick={() => setShowDestructPicker(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
            border: `1px solid ${destructMode ? '#ff6b6b44' : '#333'}`,
            background: destructMode ? '#1f0a0a' : '#1a1a1a',
          }}
        >
          <span style={{ fontSize: 13 }}>💣</span>
          <span style={{ fontSize: 11, color: destructMode ? '#ff6b6b' : '#555', fontWeight: 600 }}>
            {destructLabel(destructMode)}
          </span>
        </div>
      </div>

      {/* Self-destruct picker dropdown */}
      {showDestructPicker && (
        <div style={{
          background: '#111', borderBottom: `1px solid #ff6b6b22`,
          padding: '10px 16px', display: 'flex', gap: 8, flexWrap: 'wrap',
          flexShrink: 0
        }}>
          <div style={{ width: '100%', fontSize: 11, color: '#555', marginBottom: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Self-destruct after
          </div>
          {DESTRUCT_OPTIONS.map(opt => (
            <div
              key={opt.label}
              onClick={() => { setDestructMode(opt.value); setShowDestructPicker(false) }}
              style={{
                padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${destructMode === opt.value ? '#ff6b6b' : '#333'}`,
                background: destructMode === opt.value ? '#ff6b6b18' : '#1a1a1a',
                color: destructMode === opt.value ? '#ff6b6b' : '#666',
                fontSize: 13, fontWeight: 600,
                transition: 'all 0.15s ease'
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {messages.length === 0 && (
          <p style={{ color: '#333', fontSize: 14, textAlign: 'center', marginTop: 40 }}>
            Start a conversation with {other?.username}
          </p>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_id === profile?.id
          const isOnRead = msg.destruct_mode === 'on_read'
          const isTimed = msg.destruct_mode && msg.destruct_mode !== 'on_read'
          const isDestructing = isOnRead && msg.seen_at
          const hasDestruct = !!msg.destruct_mode

          return (
            <div key={msg.id} style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '75%', padding: '10px 14px',
                borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: isMe
                  ? hasDestruct ? '#2a0a0a' : accent
                  : '#1a1a1a',
                color: isMe
                  ? hasDestruct ? '#ff6b6b' : '#000'
                  : otherAccent,
                fontSize: 15, lineHeight: 1.4,
                border: isMe
                  ? hasDestruct ? '1px solid #ff6b6b44' : 'none'
                  : hasDestruct ? `1px solid #ff6b6b33` : `1px solid ${otherAccent}22`,
                opacity: isDestructing ? 0.4 : 1,
                transition: 'opacity 0.5s ease'
              }}>
                {msg.content}
              </div>

              {/* Destruct status row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <span style={{ fontSize: 10, color: '#333' }}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {isOnRead && !msg.seen_at && (
                  <span style={{ fontSize: 10, color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: 3 }}>
                    💣 vanishes on read
                  </span>
                )}
                {isOnRead && msg.seen_at && (
                  <span style={{ fontSize: 10, color: '#ff6b6b88' }}>
                    💨 vanishing...
                  </span>
                )}
                {isTimed && msg.expires_at && (
                  <span style={{ fontSize: 10, color: '#ff6b6b', fontFamily: 'monospace' }}>
                    💣 {timeLeft(msg.expires_at)}
                  </span>
                )}
                {isMe && !hasDestruct && (
                  <span style={{ fontSize: 10, color: msg.seen_at ? accent : '#333' }}>
                    {msg.seen_at ? '✓✓' : '✓'}
                  </span>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 12px', borderTop: `1px solid ${destructMode ? '#ff6b6b22' : accent + '22'}`, display: 'flex', gap: 8, background: '#111', flexShrink: 0 }}>
        <textarea
          value={input}
          onChange={e => {
            setInput(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
          }}
          placeholder={destructMode ? `Message vanishes ${destructLabel(destructMode).toLowerCase()}...` : `Message ${other?.username}...`}
          style={{
            flex: 1, padding: '11px 14px', fontSize: 15,
            border: `1px solid ${destructMode ? '#ff6b6b33' : accent + '33'}`,
            borderRadius: 10, background: destructMode ? '#110a0a' : '#1a1a1a',
            color: '#fff', outline: 'none'
          }}
        />
        <button
          onClick={sendMessage}
          style={{
            padding: '11px 20px',
            background: destructMode ? '#ff6b6b' : accent,
            color: '#000', border: 'none', borderRadius: 10,
            cursor: 'pointer', fontWeight: 800, fontSize: 14, flexShrink: 0
          }}
        >
          {destructMode ? '💣' : 'Send'}
        </button>
      </div>
    </div>
  )
}
