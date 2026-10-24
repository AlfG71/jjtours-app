-- Stripe Checkout sessions must stay open at least 30 minutes.
-- Hold seats for 35 min; the checkout session expires 2 min before the hold ends,
-- so a customer can never pay after their seats were released.
alter table public.app_settings drop constraint if exists app_settings_seat_hold_minutes_check;
alter table public.app_settings
  add constraint app_settings_seat_hold_minutes_check check (seat_hold_minutes between 33 and 1440);
alter table public.app_settings alter column seat_hold_minutes set default 35;
update public.app_settings set seat_hold_minutes = 35;
