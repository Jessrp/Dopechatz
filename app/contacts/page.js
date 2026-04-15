'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ContactsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [accent, setAccent] = useState('#3b82f6')
  const [search, setSearch] = useState('')

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
    if (prof.tier !== 7) { router.push('/upgrade'); return }

    setProfile(prof)
    if (prof.accent_color) setAccent(prof.accent_color)

    // Get all unique users this person has DMed with (sent or received)
    const { data: sent } = await supabase
      .from('direct_messages')
      .select('receiver_id')
      .eq('sender_id', user.id)

    const { data: received } = await supabase
      .from('direct_messages')
      .select('sender_id')
      .eq('receiver_id', user.id)

    // Build unique set of contact IDs
    const contactIds = new Set([
      ...(sent || []).map(m => m.receiver_id),
      ...(received || []).map(m => m.sender_id),
    ])

    if (contactIds.size === 0) { setLoading(false); return }

    // Fetch profiles for all contacts
    const { data: contactProfiles } = await supabase
      .from('profiles')
      .select('id, username, accent_color, last_seen, status_public, tier')
      .in('id', [...contactIds])

    // Get last message for each contact for preview
    const contactsWithLastMsg = await Promise.all(
      (contactProfiles || []).map(async (contact) => {
        const { data: lastMsg } = await supabase
          .from('direct_messages')
          .select('content, created_at, sender_id')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${contact.id}),and(sender_id.eq.${contact.id},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        return { ...contact, lastMsg: lastMsg || null }
      })
    )

    // Sort by most recent message
    contactsWithLastMsg.sort((a, b) => {
      if (!a.lastMsg) return 1
      if (!b.lastMsg) return -1
      return new Date(b.lastMsg.created_at) - new Date(a.lastMsg.created_at)
    })

    setContacts(contactsWithLastMsg)
    setLoading(false)
  }

  function isActive(contact) {
    if (!contact?.last_seen || !contact?.status_public) return false
    return new Date(contact.last_seen) > new Date(Date.now() - 15 * 60 * 1000)
  }

  function formatTime(isoString) {
    if (!isoString) return ''
    const date = new Date(isoString)
    const now = new Date()
    const diffDays = Math.floor((now - date) / 86400000)
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' })
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const filtered = contacts.filter(c =>
    c.username.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div style={{ background: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#fff', fontFamily: 'sans-serif' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', height: 56, borderBottom: `1px solid ${accent}22`, background: '#111', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => router.push('/chat')} style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', fontSize: 20, padding: 0, lineHeight: 1 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Contacts</div>
          <div style={{ fontSize: 11, color: '#444' }}>Pro members you've messaged</div>
        </div>
        <div style={{ fontSize: 11, color: accent, border: `1px solid ${accent}44`, borderRadius: 10, padding: '2px 10px' }}>
          {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid #111` }}>
        <input
          placeholder="Search contacts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', fontSize: 14, border: `1px solid ${accent}33`, borderRadius: 10, background: '#111', color: '#fff', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* Empty state */}
      {contacts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>💬</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>No contacts yet</div>
          <div style={{ fontSize: 14, color: '#444', lineHeight: 1.6, marginBottom: 32 }}>
            Once you DM another Pro member, they'll show up here for quick access.
          </div>
          <button onClick={() => router.push('/chat')} style={{ padding: '12px 24px', background: accent, color: '#000', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
            Go to chat
          </button>
        </div>
      )}

      {/* Contacts list */}
      {filtered.map(contact => {
        const active = isActive(contact)
        const contactAccent = contact.accent_color || '#888'
        const isMe = contact.lastMsg?.sender_id === profile?.id

        return (
          <div
            key={contact.id}
            onClick={() => router.push('/dm/' + contact.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: '1px solid #0f0f0f', cursor: 'pointer', transition: 'background 0.15s ease' }}
            onMouseEnter={e => e.currentTarget.style.background = '#0a0a0a'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {/* Avatar / status indicator */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${contactAccent}22`, border: `2px solid ${contactAccent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: contactAccent }}>
                  {contact.username.charAt(0).toUpperCase()}
                </span>
              </div>
              {active && (
                <div style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: '#00ff88', border: '2px solid #000', boxShadow: '0 0 6px #00ff88' }} />
              )}
            </div>

            {/* Name + last message */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: contactAccent }}>{contact.username}</span>
                <span style={{ fontSize: 11, color: '#333', flexShrink: 0, marginLeft: 8 }}>
                  {formatTime(contact.lastMsg?.created_at)}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#444', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {contact.lastMsg
                  ? `${isMe ? 'You: ' : ''}${contact.lastMsg.content}`
                  : 'No messages yet'
                }
              </div>
            </div>

            {/* Chevron */}
            <div style={{ color: '#333', fontSize: 16, flexShrink: 0 }}>›</div>
          </div>
        )
      })}

      {filtered.length === 0 && contacts.length > 0 && (
        <div style={{ textAlign: 'center', padding: '40px 24px', color: '#444', fontSize: 14 }}>
          No contacts matching "{search}"
        </div>
      )}
    </div>
  )
}
