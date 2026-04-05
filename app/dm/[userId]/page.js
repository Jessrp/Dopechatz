'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function DMPage() {
  const router = useRouter()
  const { userId } = useParams()
  const [profile, setProfile] = useState(null)
  const [other, setOther] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [accent, setAccent] = useState('#3b82f6')
  const bottomRef = useRef(null)

  useEffect(() => { loadData() }, [userId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!profile) return
    const sub = supabase
      .channel(`dm:${[profile.id, userId].sort().join('-')}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages'
      }, payload => {
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
        }
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [profile, userId])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!prof) { router.push('/chat'); return }

    // Check DM access
    if (prof.tier === 0) {
      router.push('/upgrade')
      return
    }

    setProfile(prof)
    if (prof.accent_color) setAccent(prof.accent_color)

    const { data: otherUser } = await supabase
      .from('profiles')
      .select('id, username, accent_color, last_seen, status_public')
      .eq('id', userId)
      .single()

    setOther(otherUser)

    const { data: msgs } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
      .limit(100)

    setMessages(msgs || [])
    setLoading(false)
  }

  async function sendMessage() {
    if (!input.trim()) return

    const optimistic = {
      id: `temp-${Date.now()}`,
      sender_id: profile.id,
      receiver_id: userId,
      content: input.trim(),
      created_at: new Date().toISOString()
    }

    setMessages(prev => [...prev, optimistic])
    setInput('')

    const { error } = await supabase.from('direct_messages').insert({
      sender_id: profile.id,
      receiver_id: userId,
      content: optimistic.content
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

  if (loading) return (
    <div style={{ background: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#fff', fontFamily: 'sans-serif' }}>Loading...</p>
    </div>
  )

  const otherAccent = other?.accent_color || '#888'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000', color: '#fff', fontFamily: 'sans-serif' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', height: 56, borderBottom: `1px solid ${accent}22`, background: '#111', flexShrink: 0 }}>
        <button
          onClick={() => router.push('/chat')}
          style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', fontSize: 20, padding: 0, lineHeight: 1 }}
        >
          ←
        </button>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: isActive(other) ? '#00ff88' : '#333', boxShadow: isActive(other) ? '0 0 6px #00ff88' : 'none' }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: otherAccent }}>{other?.username}</div>
          <div style={{ fontSize: 11, color: '#444' }}>{isActive(other) ? 'Active now' : 'Offline'}</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {messages.length === 0 && (
          <p style={{ color: '#333', fontSize: 14, textAlign: 'center', marginTop: 40 }}>
            Start a conversation with {other?.username}
          </p>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_id === profile?.id
          return (
            <div key={msg.id} style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '75%', padding: '10px 14px',
                borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: isMe ? accent : '#1a1a1a',
                color: isMe ? '#000' : otherAccent,
                fontSize: 15, lineHeight: 1.4,
                border: isMe ? 'none' : `1px solid ${otherAccent}22`
              }}>
                {msg.content}
              </div>
              <div style={{ fontSize: 10, color: '#333', marginTop: 3 }}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 12px', borderTop: `1px solid ${accent}22`, display: 'flex', gap: 8, background: '#111', flexShrink: 0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder={`Message ${other?.username}...`}
          style={{ flex: 1, padding: '11px 14px', fontSize: 15, border: `1px solid ${accent}33`, borderRadius: 10, background: '#1a1a1a', color: '#fff', outline: 'none' }}
        />
        <button onClick={sendMessage} style={{ padding: '11px 20px', background: accent, color: '#000', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
          Send
        </button>
      </div>
    </div>
  )
}
