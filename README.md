# JJ Tours — Phase A booking app

Direct-to-tourist booking PWA for JJ Tours (Puerto Rico). Built by Gonzalez Tech.

**Stack:** React + Vite + TypeScript · Supabase (auth/DB/storage) · Stripe Checkout (test mode until launch) · Vercel · vite-plugin-pwa · i18next (ES default, EN)

## Setup
```bash
cp .env.example .env.local   # fill in keys
npm install
npm run dev
```

## Supabase
- Project: `jjtours-phase-a` (ref `gtifcktipzdeipilywlt`, us-east-1)
- Migrations: `supabase/migrations/` (applied in order)
- Types: `src/lib/database.types.ts` — regenerate after schema changes

### Data model
- `tours` — bilingual catalog (`*_en` / `*_es` columns), `is_active` gates public visibility
- `buses` — Phase A pool, 2 × 25 seats
- `departures` — a tour on a date/time; `status` (scheduled/confirmed/cancelled/completed) is set **manually by Joey** (Phase A quorum = manual)
- `bookings` — written only server-side via `create_seat_hold()` (row-locks the departure, prevents overbooking); unpaid holds expire after `app_settings.seat_hold_minutes`
- `refund_tiers` — configurable cancellation tiers (intentionally empty until Joey finalizes numbers); `refund_percent_for(departure)` reads them
- `departure_availability` (view) — seats confirmed/held/available + min seats, for the admin quorum view
- `tour_availability(tour_id)` (RPC) — public seat counts only, no customer data
- `admin_users` — whoever is in here gets admin access via `is_admin()`
