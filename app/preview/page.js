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

        // Get main room for this neighborhood
        const { data: room } = await supabase
          .from('rooms')
          .select('*')
          .eq('neighborhood_id', hood.id)
          .eq('is_main', true)
          .single()

        if (room) {
          const { data: msgs } = await supabase
            .from('messages')
            .select('*, profiles(username)')
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
    <main style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <p>Finding your neighborhood...</p>
    </main>
  )

  if (locationDenied) return (
    <main style={{ maxWidth: 400, margin: '80px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Dopechatz</h1>
      <p style={{ color: '#666', marginTop: 8 }}>We need your location to show your neighborhood chat.</p>
      <button onClick={() => window.location.reload()} style={btnStyle}>Try Again</button>
      <a href="/signup" style={{ ...btnStyle, background: '#fff', color: '#000', border: '1px solid #000', display: 'block', textAlign: 'center', marginTop: 10, textDecoration: 'none' }}>
        Sign Up
      </a>
    </main>
  )

  return (
    <main style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 18 }}>Dopechatz</span>
          {neighborhood && (
            <span style={{ fontSize: 13, color: '#999', marginLeft: 10 }}>{neighborhood.name}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/login" style={{ fontSize: 13, color: '#fff', textDecoration: 'none', padding: '6px 12px', border: '1px solid #444', borderRadius: 6 }}>
            Log in
          </a>
          <a href="/signup" style={{ fontSize: 13, color: '#000', textDecoration: 'none', padding: '6px 12px', background: '#fff', borderRadius: 6 }}>
            Sign up
          </a>
        </div>
      </div>

      {/* Preview banner */}
      <div style={{ background: '#f5f5f5', padding: '10px 20px', fontSize: 13, color: '#666', textAlign: 'center' }}>
        You're previewing your neighborhood chat — <a href="/signup" style={{ color: '#000', fontWeight: 600 }}>sign up to join the conversation</a>
      </div>

      {/* Messages (read only) */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {messages.length === 0 ? (
          <p style={{ color: '#999', fontSize: 14 }}>No messages yet in your neighborhood. Be the first — sign up!</p>
        ) : (
          messages.map(msg => (
            <div key={msg.id} style={{ marginBottom: 12 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{msg.profiles?.username}</span>
              <span style={{ fontSize: 11, color: '#999', marginLeft: 8 }}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <div style={{ fontSize: 15, marginTop: 2 }}>{msg.content}</div>
            </div>
          ))
        )}
      </div>

      {/* Locked input */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid #eee', display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{
          flex: 1,
          padding: '10px 14px',
          fontSize: 14,
          border: '1px solid #ddd',
          borderRadius: 8,
          color: '#aaa',
          background: '#fafafa'
        }}>
          Sign up to start chatting...
        </div>
        <a href="/signup" style={{
          padding: '10px 18px',
          background: '#000',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontWeight: 600,
          textDecoration: 'none',
          fontSize: 14
        }}>
          Join
        </a>
      </div>
    </main>
  )
}

const btnStyle = {
  display: 'block',
  width: '100%',
  padding: '12px',
  fontSize: 15,
  fontWeight: 600,
  background: '#000',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  marginTop: 16,
  textDecoration: 'none',
  textAlign: 'center',
  boxSizing: 'border-box'
}
