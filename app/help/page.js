'use client'

import { useRouter } from 'next/navigation'

const sections = [
  {
    emoji: '🏠',
    title: 'Your Neighborhood',
    content: 'Dopechatz automatically detects your neighborhood using your location. You\'re placed in a local chatroom with people within about a mile of you. No zip codes, no manual setup — just your block.'
  },
  {
    emoji: '🎭',
    title: 'Anonymous by Default',
    content: 'Your username is randomly generated and reveals nothing about you. You can chat freely without sharing your real name or identity. Share as much or as little as you want.'
  },
  {
    emoji: '💬',
    title: 'Chatrooms',
    content: 'Every neighborhood has a main chatroom open to everyone. Plus and Pro members can create additional custom rooms with their own name, color scheme, and font. Free members can see these rooms but can only participate in the main room.'
  },
  {
    emoji: '🎨',
    title: 'Colors & Themes (Plus+)',
    content: 'Plus and Pro members can customize their accent color in settings, and choose a unique color scheme and font for each room they create. Hold and drag the color slider in the sidebar to change your accent color.'
  },
  {
    emoji: '🔒',
    title: 'Secret Rooms (Pro)',
    content: 'Pro members can create Secret Rooms — chatrooms completely invisible to Free and Plus members. Each Secret Room has a live countdown timer and automatically vanishes after 24 hours along with all its messages. No logs, no trace.'
  },
  {
    emoji: '✉️',
    title: 'Direct Messages (Pro)',
    content: 'Pro members can send direct messages to other Pro members. Tap any active user in the sidebar, or visit your Contacts list to message people you\'ve talked to before. DMs support self-destructing messages.'
  },
  {
    emoji: '💣',
    title: 'Self-Destructing Messages (Pro)',
    content: 'In any DM conversation, tap the 💣 button at the top to set a self-destruct timer. Choose "On read" to vanish after the recipient opens it, or set a time limit (5 min, 1hr, 24hr). The send button turns red when destruct mode is on.'
  },
  {
    emoji: '🗑️',
    title: 'Deleting Messages',
    content: 'You can delete any message you\'ve sent. Press and hold on your message for half a second — a confirmation sheet will pop up. Tap Delete to remove it for everyone in the room.'
  },
  {
    emoji: '📍',
    title: 'Visiting Other Neighborhoods',
    content: 'If you travel to a different neighborhood, Dopechatz detects this and shows a "Visiting" section in the sidebar with that area\'s main chatroom. You can chat there as a visitor. Tap "Refresh location" in the sidebar to update.'
  },
  {
    emoji: '⚡',
    title: 'Active Users',
    content: 'The Active Now section in the sidebar shows neighbors who\'ve been online in the last 15 minutes and have their active status turned on. You can toggle your own active status in the sidebar settings.'
  },
  {
    emoji: '👥',
    title: 'Contacts (Pro)',
    content: 'Once you\'ve DMed another Pro member, they\'ll appear in your Contacts list for quick access. Tap "💬 Contacts" in the sidebar to see everyone you\'ve messaged, sorted by most recent conversation.'
  },
  {
    emoji: '🔔',
    title: 'Notifications',
    content: 'Dopechatz supports push notifications so you\'re alerted when someone messages in your neighborhood rooms. You\'ll be prompted to enable these when you first sign in. You can install Dopechatz as a PWA from your browser for the best experience.'
  },
]

export default function HelpPage() {
  const router = useRouter()

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', height: 56, borderBottom: '1px solid #1a1a1a', background: '#111', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => router.push('/chat')} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 20, padding: 0, lineHeight: 1 }}>←</button>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Help & Features</div>
          <div style={{ fontSize: 11, color: '#444' }}>How Dopechatz works</div>
        </div>
      </div>

      <div style={{ padding: '24px 16px 80px' }}>
        {sections.map((s, i) => (
          <div key={i} style={{ marginBottom: 28, paddingBottom: 28, borderBottom: '1px solid #0f0f0f' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 22 }}>{s.emoji}</span>
              <span style={{ fontWeight: 800, fontSize: 15 }}>{s.title}</span>
            </div>
            <p style={{ fontSize: 14, color: '#666', lineHeight: 1.7, paddingLeft: 32 }}>{s.content}</p>
          </div>
        ))}

        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#444', marginBottom: 12 }}>Still have questions?</div>
          <div style={{ fontSize: 12, color: '#333' }}>Dopechatz is early access and growing fast. More features coming soon.</div>
        </div>
      </div>
    </div>
  )
}
