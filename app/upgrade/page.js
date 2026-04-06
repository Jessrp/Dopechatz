'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function UpgradePage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [accent, setAccent] = useState('#3b82f6')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (prof) {
        setProfile({ ...prof, email: user.email })
        if (prof.accent_color) setAccent(prof.accent_color)
      }
    })
  }, [])

  async function handleUpgrade(plan) {
    setLoading(true)
    const priceId = plan === 'plus'
      ? process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID
      : process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID

    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId,
        userId: profile.id,
        email: profile.email
      })
    })

    const { url } = await res.json()
    window.location.href = url
  }

  const plusColor = '#4fc3f7'
  const proColor = '#ce93d8'

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif', padding: '40px 20px' }}>
      <button
        onClick={() => router.push('/chat')}
        style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', fontSize: 14, marginBottom: 32, padding: 0 }}
      >
        ← Back
      </button>

      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Upgrade</h1>
      <p style={{ color: '#555', marginBottom: 40, fontSize: 14 }}>Your neighborhood, your way.</p>

      {/* Free tier — for context */}
      <div style={{
        border: '1px solid #222',
        borderRadius: 14,
        padding: '20px 20px',
        marginBottom: 16,
        background: '#0a0a0a'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#888' }}>Free</div>
            <div style={{ color: '#444', fontSize: 13, marginTop: 2 }}>Always free</div>
          </div>
          {profile?.tier === 0 && (
            <div style={{ fontSize: 11, color: '#555', border: '1px solid #333', borderRadius: 20, padding: '3px 10px' }}>
              Current plan
            </div>
          )}
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {[
            'Access to your neighborhood main chatroom',
            'See other local & normal chatrooms (view only)',
            'Anonymous username by default',
          ].map(item => (
            <li key={item} style={{ fontSize: 13, color: '#444', padding: '3px 0', paddingLeft: 14, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: '#333' }}>—</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Plus card */}
      <div style={{
        border: `1px solid ${plusColor}44`,
        borderRadius: 14,
        padding: '24px 20px',
        marginBottom: 16,
        background: '#0a1520'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: plusColor }}>Plus</div>
            <div style={{ color: plusColor + '99', fontSize: 13, marginTop: 2 }}>$3 / month</div>
          </div>
          {profile?.tier === 3 && (
            <div style={{ fontSize: 11, color: plusColor, border: `1px solid ${plusColor}`, borderRadius: 20, padding: '3px 10px' }}>
              Current plan
            </div>
          )}
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px' }}>
          {[
            'Create up to 2 custom visible chatrooms',
            'Choose your own font style per room',
            'Custom color scheme & theme per room',
            'Personalize your profile accent color',
            'Everything in Free',
          ].map(item => (
            <li key={item} style={{ fontSize: 13, color: plusColor + 'bb', padding: '4px 0', paddingLeft: 16, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: plusColor }}>✓</span>
              {item}
            </li>
          ))}
        </ul>
        {profile?.tier !== 3 && profile?.tier !== 7 && (
          <button
            onClick={() => handleUpgrade('plus')}
            disabled={loading}
            style={{
              width: '100%', padding: '13px', background: plusColor,
              color: '#000', border: 'none', borderRadius: 10,
              fontWeight: 800, fontSize: 15, cursor: 'pointer'
            }}
          >
            {loading ? 'Redirecting...' : 'Get Plus'}
          </button>
        )}
      </div>

      {/* Pro card */}
      <div style={{
        border: `1px solid ${proColor}66`,
        borderRadius: 14,
        padding: '24px 20px',
        background: '#0f0a14',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: proColor, color: '#000',
          fontSize: 10, fontWeight: 800,
          padding: '3px 10px', borderRadius: 20
        }}>
          BEST VALUE
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: proColor }}>Pro</div>
            <div style={{ color: proColor + '99', fontSize: 13, marginTop: 2 }}>$7 / month</div>
          </div>
          {profile?.tier === 7 && (
            <div style={{ fontSize: 11, color: proColor, border: `1px solid ${proColor}`, borderRadius: 20, padding: '3px 10px' }}>
              Current plan
            </div>
          )}
        </div>

        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px' }}>
          {[
            'Create up to 2 Secret Rooms — invisible to Free & Plus',
            'Secret Rooms auto-vanish after 24hrs with live countdown',
            'Direct message other Pro members',
            'Self-destructing messages — timed or on-read',
            'Everything in Plus',
          ].map(item => (
            <li key={item} style={{ fontSize: 13, color: proColor + 'bb', padding: '4px 0', paddingLeft: 16, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: proColor }}>✓</span>
              {item}
            </li>
          ))}
        </ul>

        {/* Secret Room callout */}
        <div style={{ background: '#1a0a1f', border: `1px solid ${proColor}33`, borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: proColor, fontWeight: 700, marginBottom: 4 }}>🔒 What's a Secret Room?</div>
          <div style={{ fontSize: 12, color: '#8a6a8a', lineHeight: 1.6 }}>
            A chatroom that's completely invisible to Free and Plus members. It runs a live countdown from the moment it starts — when the timer hits zero, the room and everything in it disappears. No logs. No trace.
          </div>
        </div>

        {profile?.tier !== 7 && (
          <button
            onClick={() => handleUpgrade('pro')}
            disabled={loading}
            style={{
              width: '100%', padding: '13px', background: proColor,
              color: '#000', border: 'none', borderRadius: 10,
              fontWeight: 800, fontSize: 15, cursor: 'pointer'
            }}
          >
            {loading ? 'Redirecting...' : profile?.tier === 3 ? 'Upgrade to Pro' : 'Get Pro'}
          </button>
        )}
      </div>
    </div>
  )
}
