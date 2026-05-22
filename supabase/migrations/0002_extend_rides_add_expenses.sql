-- ====================================================================
-- YOUR TAXI MATE - MIGRATION 0002
-- Extends rides table with driver-entered customer fields,
-- and adds expenses table for driver self-employment tracking.
-- Run this in: Supabase Dashboard → SQL Editor
-- ====================================================================

-- 1. EXTEND RIDES TABLE with driver-entered customer details
--    (drivers pre-book manually — customer may not have a Supabase account)
alter table public.rides
  add column if not exists customer_name     text,
  add column if not exists customer_phone    text,
  add column if not exists company_name      text,
  add column if not exists flight_number     text,
  add column if not exists return_journey    boolean default false,
  add column if not exists payment_method    text check (payment_method in ('cash', 'card')),
  add column if not exists trip_mode         text default 'Prebook' check (trip_mode in ('Prebook', 'Meter'));

-- 2. EXPENSES TABLE (driver self-employment cost tracking)
create table if not exists public.expenses (
  id           uuid default gen_random_uuid() primary key,
  driver_id    uuid references public.drivers(id) on delete cascade not null,
  type         text not null check (type in ('Fuel','Airport Toll','Insurance','Maintenance','Phone','Car Wash','Other')),
  amount_pence integer not null check (amount_pence > 0),
  description  text,
  created_at   timestamptz default now() not null
);

-- 3. RLS for expenses
alter table public.expenses enable row level security;

create policy "Drivers manage own expenses"
  on public.expenses
  using (auth.uid() = driver_id)
  with check (auth.uid() = driver_id);

-- 4. Performance indexes
create index if not exists idx_rides_driver_status   on public.rides(driver_id, status);
create index if not exists idx_rides_passenger        on public.rides(passenger_id);
create index if not exists idx_expenses_driver        on public.expenses(driver_id, created_at desc);
create index if not exists idx_ride_locations_ride    on public.ride_locations(ride_id, recorded_at desc);
