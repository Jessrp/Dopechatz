'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [tagIndex, setTagIndex] = useState(0)

  const tags = ['Your block.', 'Your people.', 'Your vibe.', 'Anonymous.', 'Real.']

  useEffect(() => {
    setTimeout(() => setVisible(true), 100)
    const interval = setInterval(() => {
      setTagIndex(prev => (prev + 1) % tags.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff', fontFamily: "'DM Sans', sans-serif", overflowX: 'hidden', position: 'relative' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .fade-in { opacity: 0; transform: translateY(30px); transition: opacity 0.8s ease, transform 0.8s ease; }
        .fade-in.visible { opacity: 1; transform: translateY(0); }
        .d1 { transition-delay: 0.1s; } .d2 { transition-delay: 0.3s; } .d3 { transition-delay: 0.5s; } .d4 { transition-delay: 0.7s; } .d5 { transition-delay: 0.9s; }
        .glow-dot { width: 8px; height: 8px; border-radius: 50%; background: #00ffdd; box-shadow: 0 0 12px #00ffdd, 0 0 24px #00ffdd44; display: inline-block; animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.8); } }
        .btn-primary { background: #00ffdd; color: #000; border: none; padding: 16px 32px; font-size: 16px; font-weight: 700; font-family: 'DM Sans', sans-serif; border-radius: 12px; cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease; letter-spacing: 0.5px; }
        .btn-primary:active { transform: translateY(-2px); box-shadow: 0 8px 32px #00ffdd44; }
        .btn-secondary { background: transparent; color: #fff; border: 1px solid #333; padding: 16px 32px; font-size: 16px; font-weight: 500; font-family: 'DM Sans', sans-serif; border-radius: 12px; cursor: pointer; transition: border-color 0.15s ease; }
        .btn-secondary:active { border-color: #00ffdd; color: #00ffdd; }
        .feature-card { background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 16px; padding: 28px 24px; }
        .grid-bg { position: fixed; inset: 0; background-image: linear-gradient(#ffffff08 1px, transparent 1px), linear-gradient(90deg, #ffffff08 1px, transparent 1px); background-size: 60px 60px; pointer-events: none; z-index: 0; }
        .glow-orb { position: fixed; width: 400px; height: 400px; border-radius: 50%; pointer-events: none; z-index: 0; }
      `}</style>

      <div className="grid-bg" />
      <div className="glow-orb" style={{ top: '-100px', right: '-100px', background: 'radial-gradient(circle, #00ffdd11 0%, transparent 70%)' }} />
      <div className="glow-orb" style={{ bottom: '-100px', left: '-100px', background: 'radial-gradient(circle, #00ffdd08 0%, transparent 70%)' }} />

      {/* Nav */}
      <nav style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #111' }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 2, color: '#00ffdd' }}>DOPECHATZ</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-secondary" style={{ padding: '10px 20px', fontSize: 14 }} onClick={() => router.push('/login')}>Log in</button>
          <button className="btn-primary" style={{ padding: '10px 20px', fontSize: 14 }} onClick={() => router.push('/signup')}>Sign up</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 24px 60px', maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <div className={`fade-in d1 ${visible ? 'visible' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          <span className="glow-dot" />
          <span style={{ fontSize: 13, color: '#00ffdd', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 500 }}>Your neighborhood is waiting</span>
        </div>
        <h1 className={`fade-in d2 ${visible ? 'visible' : ''}`} style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 72, lineHeight: 0.95, letterSpacing: 2, marginBottom: 16 }}>
          CHAT WITH YOUR<br /><span style={{ color: '#00ffdd' }}>NEIGHBORHOOD</span>
        </h1>
        <div className={`fade-in d3 ${visible ? 'visible' : ''}`} style={{ fontSize: 22, fontWeight: 500, color: '#00ffdd', marginBottom: 16, height: 32 }}>
          {tags[tagIndex]}
        </div>
        <p className={`fade-in d3 ${visible ? 'visible' : ''}`} style={{ fontSize: 17, color: '#666', lineHeight: 1.7, marginBottom: 40 }}>
          Dopechatz connects you with the people literally around you — no real names, no addresses. Just your community, talking.
        </p>
        <div className={`fade-in d4 ${visible ? 'visible' : ''}`} style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => router.push('/signup')} style={{ fontSize: 17, padding: '16px 40px' }}>Join your neighborhood →</button>
          <button className="btn-secondary" onClick={() => router.push('/preview')} style={{ fontSize: 17 }}>Preview first</button>
        </div>
      </section>

      {/* Features */}
      <section style={{ position: 'relative', zIndex: 1, padding: '40px 24px 80px', maxWidth: 640, margin: '0 auto' }}>
        <div className={`fade-in d4 ${visible ? 'visible' : ''}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="feature-card">
            <div style={{ fontSize: 28, marginBottom: 12 }}>🎭</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Anonymous by default</div>
            <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>Your username reveals nothing. Share as much or as little as you want.</div>
          </div>
          <div className="feature-card">
            <div style={{ fontSize: 28, marginBottom: 12 }}>📍</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Hyper-local</div>
            <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>Auto-detected neighborhood. Chat with people within a mile of you.</div>
          </div>
        </div>
        <div className={`fade-in d5 ${visible ? 'visible' : ''}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="feature-card">
            <div style={{ fontSize: 28, marginBottom: 12 }}>🌍</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Roam freely</div>
            <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>Visiting somewhere new? Drop into the local chat wherever you go.</div>
          </div>
          <div className="feature-card">
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚡</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Your own rooms</div>
            <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>Upgrade to create private spaces for your crew within your hood.</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: 'relative', zIndex: 1, padding: '40px 24px 80px', textAlign: 'center' }}>
        <div className={`fade-in d5 ${visible ? 'visible' : ''}`}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, letterSpacing: 2, marginBottom: 16 }}>
            READY TO MEET YOUR <span style={{ color: '#00ffdd' }}>NEIGHBORS?</span>
          </h2>
          <p style={{ color: '#555', fontSize: 15, marginBottom: 32 }}>Free to join. No personal info required.</p>
          <button className="btn-primary" onClick={() => router.push('/signup')} style={{ fontSize: 17, padding: '18px 48px' }}>
            Get started — it's free
          </button>
        </div>
      </section>
    </div>
  )
}
