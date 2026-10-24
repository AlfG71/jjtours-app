// POST { departure_id, seats, name, email, phone?, locale }
// → holds the seats, opens a Stripe Checkout session, returns { url, booking_id }.
import Stripe from 'npm:stripe@17.7.0'
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'
import { allowedOrigins, corsHeaders, SITE_URL } from '../_shared/cors.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  httpClient: Stripe.createFetchHttpClient(),
})
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Errors raised by create_seat_hold() → HTTP status the app can show a message for
const HOLD_ERRORS: Record<string, number> = {
  departure_not_found: 404, departure_not_bookable: 409, departure_in_past: 409,
  tour_inactive: 409, not_enough_seats: 409,
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  // ---- validate input ----
  let input: Record<string, unknown>
  try { input = await req.json() } catch { return json({ error: 'invalid_json' }, 400) }
  const departureId = String(input.departure_id ?? '')
  const seats = Number(input.seats)
  const name = String(input.name ?? '').trim()
  const email = String(input.email ?? '').trim().toLowerCase()
  const phone = input.phone ? String(input.phone).trim() : null
  const locale = input.locale === 'en' ? 'en' : 'es'
  if (!UUID.test(departureId)) return json({ error: 'invalid_departure' }, 400)
  if (!Number.isInteger(seats) || seats < 1 || seats > 25) return json({ error: 'invalid_seats' }, 400)
  if (name.length < 2 || name.length > 100) return json({ error: 'invalid_name' }, 400)
  if (!EMAIL.test(email) || email.length > 200) return json({ error: 'invalid_email' }, 400)
  if (phone && phone.length > 30) return json({ error: 'invalid_phone' }, 400)

  // ---- optional signed-in customer (links the booking to their account) ----
  let userId: string | null = null
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (token && token.split('.').length === 3) {
    const { data } = await admin.auth.getUser(token)
    userId = data.user?.id ?? null
  }

  // ---- hold the seats (row-locked in the database, prevents overbooking) ----
  const { data: booking, error: holdErr } = await admin.rpc('create_seat_hold', {
    p_departure_id: departureId, p_seats: seats, p_name: name, p_email: email,
    p_phone: phone, p_locale: locale, p_user_id: userId,
  })
  if (holdErr || !booking) {
    const code = Object.keys(HOLD_ERRORS).find((k) => holdErr?.message?.includes(k))
    if (code) return json({ error: code }, HOLD_ERRORS[code])
    console.error('create_seat_hold failed', holdErr)
    return json({ error: 'hold_failed' }, 500)
  }

  const { data: dep } = await admin
    .from('departures').select('starts_at, tours(slug, name_en, name_es)').eq('id', departureId).single()
  const tour = dep?.tours as unknown as { slug: string; name_en: string; name_es: string } | null
  const tourName = locale === 'en' ? tour?.name_en : tour?.name_es
  const when = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-PR', {
    dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Puerto_Rico',
  }).format(new Date(dep!.starts_at))

  // ---- open Stripe Checkout; it closes 2 min before the seat hold ends ----
  const site = origin && allowedOrigins.includes(origin) ? origin : SITE_URL
  const expiresAt = Math.floor(new Date(booking.hold_expires_at!).getTime() / 1000) - 120
  const metadata = { app: 'jjtours', booking_id: booking.id, ticket_code: booking.ticket_code }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale,
      customer_email: email,
      line_items: [{
        quantity: seats,
        price_data: {
          currency: booking.currency,
          unit_amount: booking.unit_price_cents,
          product_data: { name: tourName ?? 'JJ Tours', description: when },
        },
      }],
      metadata,
      payment_intent_data: { metadata, description: `JJ Tours ${booking.ticket_code}` },
      expires_at: expiresAt,
      success_url: `${site}/reserva/confirmada?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/?checkout=cancelled&tour=${tour?.slug ?? ''}`,
    })

    await admin.from('bookings').update({ stripe_checkout_session_id: session.id }).eq('id', booking.id)
    return json({ url: session.url, booking_id: booking.id })
  } catch (err) {
    // Stripe failed → release the seats right away instead of waiting for the hold to lapse
    console.error('stripe checkout create failed', err)
    await admin.from('bookings').update({ status: 'expired' }).eq('id', booking.id)
    return json({ error: 'payment_unavailable' }, 502)
  }
})
