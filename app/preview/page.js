'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { assignNeighborhood } from '@/lib/neighborhood'

export default function PreviewPage() {
  const router = useRouter()
  const [messages, setMessages] = useState([])
  const [neighborhood, setNeighborhood] = useState(null)
  const [loading, setLoading] = useState(true)
  const [locationDenied, setLocationDenied] = useState(false)

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        const hood = await assignNeighborhood(lat, lng)
        setNeighborhood(hood)

        const { data: room } = await supabase
          .from('rooms')
          .select('*')
          .eq('neighborhood_id', hood.id)
          .eq('is_main', true)
          .single()

        if (room) {
          const { data: msgs } = await supabase
            .from('messages')
            .select('*, profiles(username, accent_color)')
            .eq('room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(30)
          setMessages((msgs || []).reverse())
        }

        setLoading(false)
      },
      () => {
        setLocationDenied(true)
        setLoading(false)
      }
    )
  }, [])

  if (loading) return (
    <div style={{ background: '#000', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', gap: 16 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ffdd', boxShadow: '0 0 12px #00ffdd', animation: 'pulse 1.5s infinite' }} />
      <p style={{ color: '#444', fontSize: 14 }}>Finding your neighborhood...</p>
      <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }`}</style>
    </div>
  )

  if (locationDenied) return (
    <div style={{ background: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 16 }}>📍</div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: '#fff' }}>Location needed</h1>
      <p style={{ color: '#555', fontSize: 14, lineHeight: 1.7, marginBottom: 32, maxWidth: 300 }}>
        Dopechatz is built around where you are. We need your location to show your neighborhood chat.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{ width: '100%', maxWidth: 300, padding: '14px', background: '#00ffdd', color: '#000', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: 'pointer', marginBottom: 12 }}
      >
        Try again
      </button>
      <button
        onClick={() => router.push('/signup')}
        style={{ width: '100%', maxWidth: 300, padding: '14px', background: 'transparent', color: '#fff', border: '1px solid #333', borderRadius: 10, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
      >
        Sign up anyway
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000', color: '#fff', fontFamily: 'sans-serif' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 56, borderBottom: '1px solid #1a1a1a', background: '#111', flexShrink: 0 }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: 16, color: '#00ffdd' }}>Dopechatz</span>
          {neighborhood && <span style={{ fontSize: 12, color: '#444', marginLeft: 10 }}>{neighborhood.name}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.push('/login')} style={{ fontSize: 12, color: '#aaa', background: 'none', border: '1px solid #333', borderRadius: 6, padding: '6px 12px', cursor: 'pointer' }}>
            Log in
          </button>
          <button onClick={() => router.push('/signup')} style={{ fontSize: 12, color: '#000', background: '#00ffdd', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 700 }}>
            Sign up
          </button>
        </div>
      </div>

      {/* Preview banner */}
      <div style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: '#444' }}>👀 Previewing — read only</span>
        <button onClick={() => router.push('/signup')} style={{ fontSize: 12, color: '#00ffdd', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0 }}>
          Join to chat →
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏘️</div>
            <p style={{ color: '#444', fontSize: 14, marginBottom: 20 }}>No messages yet in {neighborhood?.name || 'your neighborhood'}.</p>
            <button onClick={() => router.push('/signup')} style={{ padding: '12px 24px', background: '#00ffdd', color: '#000', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
              Be the first — sign up
            </button>
          </div>
        ) : (
          messages.map(msg => {
            const msgAccent = msg.profiles?.accent_color || '#555'
            return (
              <div key={msg.id} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: msgAccent }}>{msg.profiles?.username}</span>
                  <span style={{ fontSize: 11, color: '#333' }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ fontSize: 15, marginTop: 3, color: '#aaa', lineHeight: 1.4 }}>{msg.content}</div>
              </div>
            )
          })
        )}
      </div>

      {/* Locked input with upsell */}
      <div style={{ borderTop: '1px solid #1a1a1a', background: '#111', flexShrink: 0 }}>
        <div style={{ padding: '10px 12px', display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, padding: '11px 14px', fontSize: 14, border: '1px solid #222', borderRadius: 10, color: '#333', background: '#0a0a0a' }}>
            Sign up to start chatting...
          </div>
          <button onClick={() => router.push('/signup')} style={{ padding: '11px 20px', background: '#00ffdd', color: '#000', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
            Join
          </button>
        </div>

        {/* Tier teaser */}
        <div style={{ padding: '0 12px 14px', display: 'flex', gap: 8, justifyContent: 'center' }}>
          <div style={{ fontSize: 11, color: '#333', textAlign: 'center' }}>
            Free to join · <span style={{ color: '#4fc3f7' }}>Plus</span> for custom rooms · <span style={{ color: '#ce93d8' }}>Pro</span> for Secret Rooms & DMs
          </div>
        </div>
      </div>
    </div>
  )
}
