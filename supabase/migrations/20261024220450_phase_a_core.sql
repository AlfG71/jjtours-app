-- JJ Tours Phase A — core schema
-- Tours, buses, departures (a tour on a date/time), bookings, refund tiers, admins.
-- Quorum is MANUAL for Phase A: the app shows Joey the count; he sets departure status himself.
-- Bookings are written only by server code (edge functions w/ service role) — never directly by clients.

create extension if not exists pgcrypto with schema extensions;

-- ---------- Admins ----------
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admin_users where user_id = auth.uid()); $$;

-- ---------- Settings (single row) ----------
create table public.app_settings (
  id boolean primary key default true check (id),
  default_min_seats int not null default 9 check (default_min_seats > 0),
  seat_hold_minutes int not null default 20 check (seat_hold_minutes between 5 and 120),
  currency text not null default 'usd',
  updated_at timestamptz not null default now()
);
insert into public.app_settings default values;

-- ---------- Tours ----------
create table public.tours (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_es text not null,
  summary_en text,
  summary_es text,
  description_en text,
  description_es text,
  duration_minutes int check (duration_minutes > 0),
  price_cents int not null check (price_cents >= 0),
  min_seats int,                       -- null = use app_settings.default_min_seats
  pickup_info_en text,
  pickup_info_es text,
  cover_photo_path text,               -- storage path in 'tour-photos' bucket
  photo_paths text[] not null default '{}',
  third_party_logistics boolean not null default false,  -- BioBay / El Yunque permits: open question w/ Joey
  is_active boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Buses (Phase A pool: 2 x 25 seats) ----------
create table public.buses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  seats int not null check (seats > 0),
  is_phase_a_pool boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.buses (name, seats) values ('Bus 1', 25), ('Bus 2', 25);

-- ---------- Departures ----------
create type public.departure_status as enum ('scheduled', 'confirmed', 'cancelled', 'completed');

create table public.departures (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours(id) on delete restrict,
  bus_id uuid references public.buses(id) on delete set null,
  starts_at timestamptz not null,
  capacity int not null default 25 check (capacity > 0),
  min_seats int,                       -- null = tour.min_seats, then app default
  status public.departure_status not null default 'scheduled',
  status_changed_at timestamptz,
  status_changed_by uuid references auth.users(id),
  -- Future automation hook: when set, a job could auto-cancel below quorum at this time. Unused in Phase A.
  quorum_cutoff_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tour_id, starts_at)
);
create index on public.departures (starts_at);
-- One bus can't be on two departures at the same start time
create unique index departures_bus_time_uniq on public.departures (bus_id, starts_at) where bus_id is not null and status <> 'cancelled';

-- ---------- Bookings ----------
create type public.booking_status as enum ('pending_payment', 'confirmed', 'cancelled', 'refunded', 'expired');

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  ticket_code text not null unique default upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8)),
  departure_id uuid not null references public.departures(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  locale text not null default 'es' check (locale in ('en', 'es')),
  seats int not null check (seats > 0 and seats <= 25),
  unit_price_cents int not null check (unit_price_cents >= 0),
  amount_cents int generated always as (seats * unit_price_cents) stored,
  currency text not null default 'usd',
  status public.booking_status not null default 'pending_payment',
  hold_expires_at timestamptz,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  refunded_cents int not null default 0 check (refunded_cents >= 0),
  -- Joey's admin fields
  handled_at timestamptz,
  handled_by uuid references auth.users(id),
  admin_notes text,
  cancelled_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.bookings (departure_id, status);
create index on public.bookings (user_id);
create index on public.bookings (lower(customer_email));

-- ---------- Refund tiers (configurable; real numbers TBD with Joey) ----------
create table public.refund_tiers (
  id uuid primary key default gen_random_uuid(),
  min_hours_before int not null check (min_hours_before >= 0),  -- tier applies if cancelling >= this many hours before departure
  refund_percent int not null check (refund_percent between 0 and 100),
  label_en text,
  label_es text,
  unique (min_hours_before)
);
-- Intentionally NOT seeded: windows/percentages are not final.

-- Refund % for a booking cancelled "now" (0 if no tier matches)
create or replace function public.refund_percent_for(p_departure_id uuid, p_at timestamptz default now())
returns int
language sql stable security definer set search_path = public
as $$
  select coalesce((
    select rt.refund_percent from public.refund_tiers rt, public.departures d
    where d.id = p_departure_id
      and extract(epoch from (d.starts_at - p_at)) / 3600 >= rt.min_hours_before
    order by rt.min_hours_before desc limit 1
  ), 0);
$$;

-- ---------- Updated_at triggers ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create trigger tours_touch before update on public.tours for each row execute function public.touch_updated_at();
create trigger departures_touch before update on public.departures for each row execute function public.touch_updated_at();
create trigger bookings_touch before update on public.bookings for each row execute function public.touch_updated_at();

-- ---------- Availability / quorum view ----------
-- Seats held = confirmed + unexpired pending holds.
create or replace view public.departure_availability
with (security_invoker = true) as
select
  d.id as departure_id,
  d.tour_id,
  d.starts_at,
  d.status,
  d.capacity,
  coalesce(d.min_seats, t.min_seats, s.default_min_seats) as min_seats,
  coalesce(sum(b.seats) filter (where b.status = 'confirmed'), 0)::int as seats_confirmed,
  coalesce(sum(b.seats) filter (where b.status = 'pending_payment' and b.hold_expires_at > now()), 0)::int as seats_held,
  greatest(d.capacity
    - coalesce(sum(b.seats) filter (where b.status = 'confirmed'), 0)
    - coalesce(sum(b.seats) filter (where b.status = 'pending_payment' and b.hold_expires_at > now()), 0), 0)::int as seats_available,
  count(b.id) filter (where b.status = 'confirmed')::int as bookings_confirmed
from public.departures d
join public.tours t on t.id = d.tour_id
cross join public.app_settings s
left join public.bookings b on b.departure_id = d.id
group by d.id, t.min_seats, s.default_min_seats;


-- Public seat counts (counts only — no customer data). Used by the catalog/booking screens.
create or replace function public.tour_availability(p_tour_id uuid, p_from timestamptz default now(), p_to timestamptz default now() + interval '90 days')
returns table (departure_id uuid, starts_at timestamptz, status public.departure_status, capacity int, seats_available int)
language sql stable security definer set search_path = public
as $$
  select a.departure_id, a.starts_at, a.status, a.capacity, a.seats_available
  from public.departure_availability a
  join public.tours t on t.id = a.tour_id
  where a.tour_id = p_tour_id and t.is_active
    and a.status in ('scheduled','confirmed')
    and a.starts_at between greatest(p_from, now()) and p_to
  order by a.starts_at;
$$;
grant execute on function public.tour_availability(uuid, timestamptz, timestamptz) to anon, authenticated;

-- ---------- Seat hold (called by the checkout edge function with service role) ----------
-- Locks the departure row so two people can't grab the last seats at once.
create or replace function public.create_seat_hold(
  p_departure_id uuid, p_seats int, p_name text, p_email text, p_phone text,
  p_locale text, p_user_id uuid default null
) returns public.bookings
language plpgsql security definer set search_path = public
as $$
declare
  d public.departures;
  t public.tours;
  taken int;
  hold_min int;
  b public.bookings;
begin
  select * into d from public.departures where id = p_departure_id for update;
  if not found then raise exception 'departure_not_found'; end if;
  if d.status not in ('scheduled', 'confirmed') then raise exception 'departure_not_bookable'; end if;
  if d.starts_at <= now() then raise exception 'departure_in_past'; end if;

  select * into t from public.tours where id = d.tour_id;
  if not t.is_active then raise exception 'tour_inactive'; end if;

  select coalesce(sum(seats), 0) into taken from public.bookings
  where departure_id = d.id
    and (status = 'confirmed' or (status = 'pending_payment' and hold_expires_at > now()));
  if taken + p_seats > d.capacity then raise exception 'not_enough_seats'; end if;

  select seat_hold_minutes into hold_min from public.app_settings;

  insert into public.bookings (departure_id, user_id, customer_name, customer_email, customer_phone,
                               locale, seats, unit_price_cents, hold_expires_at)
  values (d.id, p_user_id, p_name, lower(p_email), p_phone, p_locale, p_seats, t.price_cents,
          now() + make_interval(mins => hold_min))
  returning * into b;
  return b;
end; $$;

revoke all on public.departure_availability from anon;
revoke execute on function public.create_seat_hold(uuid,int,text,text,text,text,uuid) from public, anon, authenticated;
revoke execute on function public.refund_percent_for(uuid, timestamptz) from public, anon;
grant execute on function public.refund_percent_for(uuid, timestamptz) to authenticated;

-- ---------- RLS ----------
alter table public.admin_users  enable row level security;
alter table public.app_settings enable row level security;
alter table public.tours        enable row level security;
alter table public.buses        enable row level security;
alter table public.departures   enable row level security;
alter table public.bookings     enable row level security;
alter table public.refund_tiers enable row level security;

-- Public catalog
create policy tours_public_read on public.tours for select using (is_active or public.is_admin());
create policy departures_public_read on public.departures for select
  using (public.is_admin() or (status in ('scheduled','confirmed') and exists (select 1 from public.tours t where t.id = tour_id and t.is_active)));
create policy refund_tiers_public_read on public.refund_tiers for select using (true);
create policy settings_public_read on public.app_settings for select using (true);

-- Customers see their own bookings (by account or by verified email)
create policy bookings_own_read on public.bookings for select to authenticated
  using (user_id = auth.uid() or lower(customer_email) = lower(auth.jwt() ->> 'email') or public.is_admin());

-- Admin write access
create policy tours_admin_all       on public.tours        for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy departures_admin_all  on public.departures   for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy buses_admin_all       on public.buses        for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy bookings_admin_update on public.bookings     for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy refund_tiers_admin    on public.refund_tiers for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy settings_admin_update on public.app_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_users_self_read on public.admin_users  for select to authenticated using (user_id = auth.uid());

-- ---------- Storage bucket for tour photos (public read) ----------
insert into storage.buckets (id, name, public) values ('tour-photos', 'tour-photos', true)
on conflict (id) do nothing;
create policy tour_photos_admin_write on storage.objects for all to authenticated
  using (bucket_id = 'tour-photos' and public.is_admin())
  with check (bucket_id = 'tour-photos' and public.is_admin());
