import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(req) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return new Response(`Webhook error: ${err.message}`, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.metadata.userId
    const priceId = session.line_items?.data[0]?.price?.id
    const tier = priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ? 7 : 3

    await supabase
      .from('profiles')
      .update({ tier, stripe_customer_id: session.customer })
      .eq('id', userId)
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object
    const customerId = subscription.customer

    await supabase
      .from('profiles')
      .update({ tier: 0 })
      .eq('stripe_customer_id', customerId)
  }

  return new Response('ok', { status: 200 })
}
