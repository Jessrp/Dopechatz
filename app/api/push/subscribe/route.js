import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  const { subscription, userId } = await req.json()

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ user_id: userId, subscription: JSON.stringify(subscription) })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
