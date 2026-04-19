'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const CATEGORY_META = {
  general:     { emoji: '🏠', label: 'General',            color: '#00ffdd' },
  dating:      { emoji: '💘', label: 'Dating & Flirting',  color: '#ec4899' },
  events:      { emoji: '🎉', label: 'Parties & Events',   color: '#f59e0b' },
  marketplace: { emoji: '🛍️', label: 'Buy · Sell · Trade', color: '#22c55e' },
  services:    { emoji: '🔧', label: 'Gigs & Services',    color: '#3b82f6' },
  cars:        { emoji: '🚗', label: 'Car Talk',           color: '#6366f1' },
  music:       { emoji: '🎵', label: 'Music Scene',        color: '#a855f7' },
  arts:        { emoji: '🎨', label: 'Art & Film',         color: '#06b6d4' },
  faith:       { emoji: '🕊️', label: 'Faith & Spirit',     color: '#fde68a' },
  pets:        { emoji: '🐾', label: 'Pets & Animals',     color: '#fb923c' },
  food:        { emoji: '🍜', label: 'Food & Eats',        color: '#ef4444' },
  rants:       { emoji: '😤', label: 'Rants & Confessions',color: '#888' },
}

export default function RoomsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [rooms, setRooms] = useState([])
  const [neighborhood, setNeighborhood] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accent, setAccent] = useState('#3b82f6')
  const [activeCategory, setActiveCategory] = useState('all')

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

    const { data: hood } = await supabase
      .from('neighborhoods')
      .select('*')
      .eq('id', prof.home_neighborhood_id || prof.neighborhood_id)
      .single()

    setNeighborhood(hood)

    const { data: allRooms } = await supabase
      .from('rooms')
      .select('*')
      .eq('neighborhood_id', prof.home_neighborhood_id || prof.neighborhood_id)
      .eq('is_secret', false)
      .order('is_main', { ascending: false })
      .order('category', { ascending: true })

    setRooms(allRooms || [])
    setLoading(false)
  }

  function canParticipate(room) {
    if (room.is_main) return true
    return profile?.tier >= 3
  }

  const categories = ['all', ...Object.keys(CATEGORY_META).filter(c =>
    c !== 'general' && rooms.some(r => r.category === c)
  )]

  const filtered = activeCategory === 'all'
    ? rooms
    : rooms.filter(r => r.category === activeCategory)

  if (loading) return (
    <div style={{ background: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#fff', fontFamily: 'sans-serif' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' }}>

      {/* Top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#111', borderBottom: `1px solid ${accent}22` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', height: 56 }}>
          <button onClick={() => router.push('/chat')} style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', fontSize: 20, padding: 0 }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Browse Rooms</div>
            <div style={{ fontSize: 11, color: '#444' }}>{neighborhood?.name}</div>
          </div>
          {profile?.tier > 0 && (
            <button
              onClick={() => router.push('/create-room')}
              style={{ fontSize: 12, color: accent, background: 'none', border: `1px solid ${accent}44`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}
            >
              + New
            </button>
          )}
        </div>

        {/* Category filter tabs */}
        <div style={{ display: 'flex', gap: 6, padding: '8px 16px 12px', overflowX: 'auto' }}>
          {categories.map(cat => {
            const meta = cat === 'all' ? { emoji: '✨', label: 'All', color: accent } : CATEGORY_META[cat]
            const isActive = activeCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  flexShrink: 0,
                  padding: '5px 12px',
                  borderRadius: 20,
                  border: `1px solid ${isActive ? meta?.color : '#222'}`,
                  background: isActive ? `${meta?.color}18` : 'transparent',
                  color: isActive ? meta?.color : '#555',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontFamily: 'sans-serif'
                }}
              >
                <span>{meta?.emoji}</span>
                <span>{meta?.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Rooms list */}
      <div style={{ padding: '12px 16px 80px' }}>
        {filtered.map(room => {
          const meta = CATEGORY_META[room.category || 'general']
          const canChat = canParticipate(room)
          const rColor = room.theme_color || meta?.color || accent

          return (
            <div
              key={room.id}
              onClick={() => router.push('/chat?room=' + room.id)}
              style={{
                marginBottom: 12,
                padding: '16px',
                borderRadius: 12,
                border: `1px solid ${canChat ? rColor + '33' : '#1a1a1a'}`,
                background: canChat ? `${rColor}08` : '#0a0a0a',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Category color strip */}
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: canChat ? rColor : '#222', borderRadius: '12px 0 0 12px' }} />

              <div style={{ paddingLeft: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{meta?.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: canChat ? '#fff' : '#444', fontFamily: room.theme_font || 'sans-serif' }}>
                        {room.name}
                      </div>
                      {room.subtitle && (
                        <div style={{ fontSize: 11, color: canChat ? rColor + 'aa' : '#333', marginTop: 1 }}>
                          {room.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                  {!canChat && (
                    <div style={{ fontSize: 10, color: '#333', border: '1px solid #222', borderRadius: 8, padding: '2px 8px', flexShrink: 0 }}>
                      Plus+
                    </div>
                  )}
                  {room.is_main && (
                    <div style={{ fontSize: 10, color: rColor, border: `1px solid ${rColor}44`, borderRadius: 8, padding: '2px 8px', flexShrink: 0 }}>
                      Main
                    </div>
                  )}
                </div>

                {room.description && (
                  <div style={{ fontSize: 12, color: canChat ? '#555' : '#2a2a2a', lineHeight: 1.5, paddingLeft: 26 }}>
                    {room.description}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Upgrade prompt for free users */}
        {profile?.tier === 0 && (
          <div style={{ margin: '24px 0', padding: '20px', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🔓</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Unlock all rooms</div>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 16, lineHeight: 1.6 }}>
              Upgrade to Plus to participate in Dating, Events, Marketplace, and all other category rooms.
            </div>
            <button
              onClick={() => router.push('/upgrade')}
              style={{ padding: '12px 24px', background: accent, color: '#000', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
            >
              Upgrade to Plus — $3/mo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
