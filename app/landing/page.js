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
        .d1 { transition-delay: 0.1s; } .d2 { transition-delay: 0.3s; } .d3 { transition-delay: 0.5s; } .d4 { transition-delay: 0.7s; } .d5 { transition-delay: 0.9s; } .d6 { transition-delay: 1.1s; }
        .glow-dot { width: 8px; height: 8px; border-radius: 50%; background: #00ffdd; box-shadow: 0 0 12px #00ffdd, 0 0 24px #00ffdd44; display: inline-block; animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.8); } }
        .btn-primary { background: #00ffdd; color: #000; border: none; padding: 16px 32px; font-size: 16px; font-weight: 700; font-family: 'DM Sans', sans-serif; border-radius: 12px; cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease; letter-spacing: 0.5px; }
        .btn-primary:active { transform: translateY(-2px); box-shadow: 0 8px 32px #00ffdd44; }
        .btn-secondary { background: transparent; color: #fff; border: 1px solid #333; padding: 16px 32px; font-size: 16px; font-weight: 500; font-family: 'DM Sans', sans-serif; border-radius: 12px; cursor: pointer; transition: border-color 0.15s ease; }
        .btn-secondary:active { border-color: #00ffdd; color: #00ffdd; }
        .feature-card { background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 16px; padding: 28px 24px; }
        .secret-card { background: #0f0a14; border: 1px solid #ce93d833; border-radius: 16px; padding: 28px 24px; }
        .grid-bg { position: fixed; inset: 0; background-image: linear-gradient(#ffffff08 1px, transparent 1px), linear-gradient(90deg, #ffffff08 1px, transparent 1px); background-size: 60px 60px; pointer-events: none; z-index: 0; }
        .glow-orb { position: fixed; width: 400px; height: 400px; border-radius: 50%; pointer-events: none; z-index: 0; }
        .tier-row { display: flex; align-items: flex-start; gap: 16px; padding: 20px 0; border-bottom: 1px solid #111; }
        .tier-row:last-child { border-bottom: none; }
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

      {/* Early access badge */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', paddingTop: 32 }}>
        <div className={`fade-in d1 ${visible ? 'visible' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 20, padding: '6px 16px' }}>
          <span className="glow-dot" />
          <span style={{ fontSize: 12, color: '#00ffdd', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 500 }}>Early access — ground floor</span>
        </div>
      </div>

      {/* Hero */}
      <section style={{ position: 'relative', zIndex: 1, padding: '40px 24px 60px', maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <h1 className={`fade-in d2 ${visible ? 'visible' : ''}`} style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 72, lineHeight: 0.95, letterSpacing: 2, marginBottom: 16 }}>
          CHAT WITH YOUR<br /><span style={{ color: '#00ffdd' }}>NEIGHBORHOOD</span>
        </h1>
        <div className={`fade-in d3 ${visible ? 'visible' : ''}`} style={{ fontSize: 22, fontWeight: 500, color: '#00ffdd', marginBottom: 16, height: 32 }}>
          {tags[tagIndex]}
        </div>
        <p className={`fade-in d3 ${visible ? 'visible' : ''}`} style={{ fontSize: 17, color: '#666', lineHeight: 1.7, marginBottom: 40 }}>
          Dopechatz connects you with the people literally around you — no real names, no addresses. Just your community, talking. We're just getting started, and there's plenty of room. Get in early.
        </p>
        <div className={`fade-in d4 ${visible ? 'visible' : ''}`} style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => router.push('/signup')} style={{ fontSize: 17, padding: '16px 40px' }}>Join your neighborhood →</button>
          <button className="btn-secondary" onClick={() => router.push('/preview')} style={{ fontSize: 17 }}>Preview first</button>
        </div>
      </section>

      {/* Core features */}
      <section style={{ position: 'relative', zIndex: 1, padding: '0 24px 60px', maxWidth: 640, margin: '0 auto' }}>
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
            <div style={{ fontSize: 28, marginBottom: 12 }}>🎨</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Make it yours</div>
            <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>Custom colors, fonts, and room themes. Your space, your aesthetic.</div>
          </div>
        </div>
      </section>

      {/* Secret Rooms callout */}
      <section className={`fade-in d5 ${visible ? 'visible' : ''}`} style={{ position: 'relative', zIndex: 1, padding: '0 24px 60px', maxWidth: 640, margin: '0 auto' }}>
        <div className="secret-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 24 }}>🔒</span>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 1, color: '#ce93d8' }}>SECRET ROOMS</div>
            <div style={{ fontSize: 10, background: '#ce93d822', color: '#ce93d8', border: '1px solid #ce93d844', borderRadius: 10, padding: '2px 10px', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Pro</div>
          </div>
          <p style={{ fontSize: 14, color: '#8a6a8a', lineHeight: 1.7, marginBottom: 20 }}>
            Create chatrooms that are completely invisible to everyone who isn't invited. Each Secret Room runs a live countdown from the moment it starts — when the clock hits zero, the room and everything in it <strong style={{ color: '#ce93d8' }}>permanently vanishes</strong>. No logs. No trace. No receipts.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 800, color: '#ce93d8', background: '#1a0a1f', border: '1px solid #ce93d833', borderRadius: 8, padding: '6px 14px', letterSpacing: 2 }}>23:59:59</div>
            <span style={{ fontSize: 12, color: '#664477' }}>and counting down...</span>
          </div>
        </div>
      </section>

      {/* Tier breakdown */}
      <section className={`fade-in d5 ${visible ? 'visible' : ''}`} style={{ position: 'relative', zIndex: 1, padding: '0 24px 60px', maxWidth: 640, margin: '0 auto' }}>
        <div style={{ fontSize: 11, color: '#444', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20, fontWeight: 700 }}>Membership</div>
        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 16, padding: '8px 24px' }}>

          <div className="tier-row">
            <div style={{ minWidth: 48, fontWeight: 800, fontSize: 13, color: '#555', paddingTop: 2 }}>Free</div>
            <div style={{ fontSize: 13, color: '#444', lineHeight: 1.7 }}>Main chatroom access · Browse local rooms · Anonymous username</div>
          </div>

          <div className="tier-row">
            <div style={{ minWidth: 48, fontWeight: 800, fontSize: 13, color: '#4fc3f7', paddingTop: 2 }}>Plus</div>
            <div style={{ fontSize: 13, color: '#4fc3f7aa', lineHeight: 1.7 }}>Create 2 custom rooms · Custom colors & fonts per room · Full chatroom access · $3/mo</div>
          </div>

          <div className="tier-row">
            <div style={{ minWidth: 48, fontWeight: 800, fontSize: 13, color: '#ce93d8', paddingTop: 2 }}>Pro</div>
            <div style={{ fontSize: 13, color: '#ce93d8aa', lineHeight: 1.7 }}>Secret Rooms · Pro DMs · Self-destructing messages · Everything in Plus · $7/mo</div>
          </div>

        </div>
      </section>

      {/* CTA */}
      <section style={{ position: 'relative', zIndex: 1, padding: '0 24px 100px', textAlign: 'center' }}>
        <div className={`fade-in d6 ${visible ? 'visible' : ''}`}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, letterSpacing: 2, marginBottom: 16 }}>
            READY TO MEET YOUR <span style={{ color: '#00ffdd' }}>NEIGHBORS?</span>
          </h2>
          <p style={{ color: '#555', fontSize: 15, marginBottom: 32 }}>Free to join. No personal info required. Early access open now.</p>
          <button className="btn-primary" onClick={() => router.push('/signup')} style={{ fontSize: 17, padding: '18px 48px' }}>
            Get started — it's free
          </button>
        </div>
      </section>
    </div>
  )
}
