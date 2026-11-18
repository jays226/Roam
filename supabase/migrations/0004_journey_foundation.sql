create table if not exists public.photo_cache(
  query_key text primary key,
  photos jsonb not null default '[]'::jsonb,
  provider text not null check(provider in('unsplash','pexels')),
  cached_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '30 days')
);

alter table public.trips add column if not exists date_mode text not null default 'exact'
  check(date_mode in('exact','window','unsure'));
alter table public.trips add column if not exists window_start date;
alter table public.trips add column if not exists window_end date;
alter table public.trips add column if not exists nights integer check(nights is null or nights between 1 and 60);
alter table public.trips add column if not exists planning_mode text not null default 'manual'
  check(planning_mode in('manual','assisted'));
alter table public.trips add column if not exists cover_photo_id text;

create table if not exists public.trip_cities(
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  city text not null,
  position integer not null default 0,
  start_day integer not null default 1 check(start_day>=1),
  nights integer not null default 1 check(nights>=1),
  created_at timestamptz not null default now(),
  unique(trip_id,position)
);

create table if not exists public.member_travel(
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  mode text check(mode in('flight','train_bus','driving','already_there')),
  origin text,
  carrier text,
  travel_number text,
  depart_at timestamptz,
  arrive_at timestamptz,
  return_depart_at timestamptz,
  return_arrive_at timestamptz,
  booked boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(trip_id,user_id)
);

alter table public.itinerary_items add column if not exists type text not null default 'activity'
  check(type in('travel','stay','food','activity','nightlife','event','transport','free_time'));
alter table public.itinerary_items add column if not exists day_index integer check(day_index is null or day_index>=1);
alter table public.itinerary_items add column if not exists position integer not null default 0;
alter table public.itinerary_items add column if not exists start_time time;
alter table public.itinerary_items add column if not exists end_time time;
alter table public.itinerary_items add column if not exists span_nights integer check(span_nights is null or span_nights>=1);
alter table public.itinerary_items add column if not exists status text not null default 'idea'
  check(status in('idea','voting','booked'));
alter table public.itinerary_items add column if not exists photo_id text;

create index if not exists trip_cities_trip_position_idx on public.trip_cities(trip_id,position);
create index if not exists member_travel_trip_booked_idx on public.member_travel(trip_id,booked);
create index if not exists itinerary_items_trip_position_idx on public.itinerary_items(trip_id,day_index,position);
