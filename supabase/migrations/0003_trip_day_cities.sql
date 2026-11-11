create table if not exists public.trip_days(
  trip_id uuid not null references public.trips(id) on delete cascade,
  day date not null,
  city text not null,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key(trip_id,day)
);
