import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

export async function POST(req) {
  const { roomId, message, senderUsername } = await req.json()

  const { data: room } = await supabase
    .from('rooms')
    .select('neighborhood_id, name')
    .eq('id', roomId)
    .single()

  if (!room) return Response.json({ error: 'Room not found' }, { status: 404 })

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('neighborhood_id', room.neighborhood_id)

  if (!profiles?.length) return Response.json({ ok: true })

  const userIds = profiles.map(p => p.id)

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .in('user_id', userIds)

  if (!subs?.length) return Response.json({ ok: true })

  const payload = JSON.stringify({
    title: `${senderUsername} in ${room.name}`,
    body: message,
    url: '/chat'
  })

  await Promise.allSettled(
    subs.map(sub => webpush.sendNotification(JSON.parse(sub.subscription), payload))
  )

  return Response.json({ ok: true })
}
