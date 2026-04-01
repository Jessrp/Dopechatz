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

      {/* Plus card */}
      <div style={{
        border: `1px solid ${accent}44`,
        borderRadius: 14,
        padding: '24px 20px',
        marginBottom: 16,
        background: '#111'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Plus</div>
            <div style={{ color: accent, fontSize: 13, marginTop: 2 }}>$3 / month</div>
          </div>
          {profile?.tier === 3 && (
            <div style={{ fontSize: 11, color: accent, border: `1px solid ${accent}`, borderRadius: 20, padding: '3px 10px' }}>
              Current plan
            </div>
          )}
        </div>
        <p style={{ color: '#888', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          Unlock up to 2 extra chatrooms for your neighborhood. Host your own space, set the vibe, build your crew.
        </p>
        {profile?.tier !== 3 && profile?.tier !== 7 && (
          <button
            onClick={() => handleUpgrade('plus')}
            disabled={loading}
            style={{
              width: '100%', padding: '13px', background: accent,
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
        border: `1px solid ${accent}88`,
        borderRadius: 14,
        padding: '24px 20px',
        background: '#111',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: accent, color: '#000',
          fontSize: 10, fontWeight: 800,
          padding: '3px 10px', borderRadius: 20
        }}>
          BEST VALUE
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Pro</div>
            <div style={{ color: accent, fontSize: 13, marginTop: 2 }}>$7 / month</div>
          </div>
          {profile?.tier === 7 && (
            <div style={{ fontSize: 11, color: accent, border: `1px solid ${accent}`, borderRadius: 20, padding: '3px 10px' }}>
              Current plan
            </div>
          )}
        </div>
        <p style={{ color: '#888', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          Create up to 4 chatrooms, including private rooms only visible to people you choose. Your neighborhood, your rules.
        </p>
        {profile?.tier !== 7 && (
          <button
            onClick={() => handleUpgrade('pro')}
            disabled={loading}
            style={{
              width: '100%', padding: '13px', background: accent,
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
