// Stripe → this endpoint. Confirms paid bookings, expires unpaid ones.
// Events to subscribe in Stripe: checkout.session.completed, checkout.session.expired
import Stripe from 'npm:stripe@17.7.0'
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  httpClient: Stripe.createFetchHttpClient(),
})
const cryptoProvider = Stripe.createSubtleCryptoProvider()
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

  // ---- verify the request really came from Stripe ----
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body, signature!, Deno.env.get('STRIPE_WEBHOOK_SECRET')!, undefined, cryptoProvider,
    )
  } catch (err) {
    console.error('webhook signature check failed', err)
    return new Response('invalid signature', { status: 400 })
  }

  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.expired') {
    return new Response('ignored', { status: 200 })
  }

  const session = event.data.object as Stripe.Checkout.Session
  // The sandbox may be shared with other projects — only handle JJ Tours sessions
  if (session.metadata?.app !== 'jjtours' || !session.metadata.booking_id) {
    return new Response('not jjtours', { status: 200 })
  }
  const bookingId = session.metadata.booking_id

  const { data: booking, error } = await admin
    .from('bookings').select('id, status, admin_notes').eq('id', bookingId).single()
  if (error || !booking) {
    console.error('booking not found for session', session.id, bookingId)
    return new Response('booking not found', { status: 200 }) // don't make Stripe retry forever
  }

  if (event.type === 'checkout.session.completed') {
    if (session.payment_status !== 'paid') return new Response('not paid yet', { status: 200 })
    if (booking.status === 'confirmed') return new Response('already confirmed', { status: 200 })
    if (booking.status !== 'pending_payment' && booking.status !== 'expired') {
      console.warn('paid session for booking in status', booking.status, bookingId)
      return new Response('unexpected status', { status: 200 })
    }
    // Shouldn't happen (session closes before the hold), but if it does, flag it for Joey
    const lateNote = booking.status === 'expired'
      ? 'Pagado después de vencer la reserva de asientos — verificar capacidad. / Paid after seat hold expired — check capacity.'
      : null
    const { error: upErr } = await admin.from('bookings').update({
      status: 'confirmed',
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null,
      hold_expires_at: null,
      admin_notes: lateNote ? [booking.admin_notes, lateNote].filter(Boolean).join('\n') : booking.admin_notes,
    }).eq('id', bookingId)
    if (upErr) {
      console.error('confirm failed', upErr)
      return new Response('db error', { status: 500 }) // Stripe will retry
    }
    // TODO (JJA-05): send confirmation email/SMS here
    return new Response('confirmed', { status: 200 })
  }

  // checkout.session.expired → free the seats
  if (booking.status === 'pending_payment') {
    await admin.from('bookings').update({ status: 'expired' }).eq('id', bookingId)
  }
  return new Response('expired', { status: 200 })
})
