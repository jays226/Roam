alter table public.users add column if not exists origin_airport text;
alter table public.trips add column if not exists estimated_total numeric(10,2);
create table if not exists public.sessions(
  id uuid primary key default gen_random_uuid(),user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,expires_at timestamptz not null,created_at timestamptz not null default now()
);
create index if not exists sessions_user_expires_idx on public.sessions(user_id,expires_at);
create table if not exists public.options(
  id uuid primary key default gen_random_uuid(),trip_id uuid not null references public.trips(id) on delete cascade,
  category text not null,title text not null,note text,url text,image text,price_estimate numeric(10,2),source text not null default 'planner',
  status text not null default 'idea' check(status in('idea','shortlisted','in_vote','locked','dismissed')),
  sort_order integer not null default 0,created_by uuid not null references public.users(id),created_at timestamptz not null default now()
);
create table if not exists public.polls(
  id uuid primary key default gen_random_uuid(),trip_id uuid not null references public.trips(id) on delete cascade,
  category text not null,title text not null,multi_select boolean not null default false,status text not null default 'open' check(status in('open','closed','locked')),
  deadline timestamptz,locked_option_id uuid,created_by uuid not null references public.users(id),created_at timestamptz not null default now()
);
create table if not exists public.poll_options(
  id uuid primary key default gen_random_uuid(),poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid references public.options(id) on delete set null,title text not null,note text,image text,price_estimate numeric(10,2),sort_order integer not null default 0
);
alter table public.polls drop constraint if exists polls_locked_option_id_fkey;
alter table public.polls add constraint polls_locked_option_id_fkey foreign key(locked_option_id) references public.poll_options(id) on delete set null;
create table if not exists public.ballots(
  id uuid primary key default gen_random_uuid(),poll_id uuid not null references public.polls(id) on delete cascade,
  poll_option_id uuid not null references public.poll_options(id) on delete cascade,user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),unique(poll_id,poll_option_id,user_id)
);
create table if not exists public.availability(
  trip_id uuid not null references public.trips(id) on delete cascade,user_id uuid not null references public.users(id) on delete cascade,
  date date not null,is_available boolean not null default true,updated_at timestamptz not null default now(),primary key(trip_id,user_id,date)
);
create table if not exists public.itinerary_items(
  id uuid primary key default gen_random_uuid(),trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null,place text,day date,time_label text,note text,url text,image text,cost numeric(10,2),cost_type text not null default 'shared' check(cost_type in('shared','per_signup')),
  capacity integer,booking_status text not null default 'not_booked' check(booking_status in('not_booked','booked')),
  booked_by uuid references public.users(id),confirmation_note text,created_by uuid not null references public.users(id),created_at timestamptz not null default now()
);
alter table public.itinerary_items add column if not exists option_id uuid references public.options(id) on delete set null;
create table if not exists public.activity_signups(
  item_id uuid not null references public.itinerary_items(id) on delete cascade,user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),primary key(item_id,user_id)
);
create table if not exists public.comments(
  id uuid primary key default gen_random_uuid(),trip_id uuid not null references public.trips(id) on delete cascade,
  entity_type text not null,entity_id uuid not null,user_id uuid not null references public.users(id) on delete cascade,
  body text not null check(length(body)<=2000),created_at timestamptz not null default now()
);
create table if not exists public.booking_requests(
  id uuid primary key default gen_random_uuid(),trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.users(id),what_to_book text not null,budget numeric(10,2),preferences text,
  status text not null default 'open' check(status in('open','in_progress','done')),created_at timestamptz not null default now(),completed_at timestamptz
);
create table if not exists public.pulse_responses(
  id uuid primary key default gen_random_uuid(),trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,disappointment text not null check(disappointment in('very','somewhat','not')),
  organizer_wtp text check(organizer_wtp in('yes','maybe','no')),comment text,created_at timestamptz not null default now(),unique(trip_id,user_id)
);
create table if not exists public.chat_messages(
  id uuid primary key default gen_random_uuid(),trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,body text not null check(length(body)<=2000),created_at timestamptz not null default now()
);
create table if not exists public.trip_origins(
  trip_id uuid not null references public.trips(id) on delete cascade,user_id uuid not null references public.users(id) on delete cascade,
  airport text not null,created_at timestamptz not null default now(),primary key(trip_id,user_id,airport)
);
create table if not exists public.expenses(
  id uuid primary key default gen_random_uuid(),trip_id uuid not null references public.trips(id) on delete cascade,
  paid_by uuid not null references public.users(id),title text not null,amount numeric(10,2) not null check(amount>=0),expense_date date not null default current_date,
  created_at timestamptz not null default now()
);
create table if not exists public.expense_shares(
  expense_id uuid not null references public.expenses(id) on delete cascade,user_id uuid not null references public.users(id) on delete cascade,
  share_amount numeric(10,2) not null check(share_amount>=0),settled boolean not null default false,settled_at timestamptz,primary key(expense_id,user_id)
);
create index if not exists options_trip_status_idx on public.options(trip_id,status,category);
create index if not exists polls_trip_status_idx on public.polls(trip_id,status);
create index if not exists itinerary_trip_day_idx on public.itinerary_items(trip_id,day,time_label);
create index if not exists comments_trip_entity_idx on public.comments(trip_id,entity_type,entity_id,created_at);
create index if not exists chat_trip_created_idx on public.chat_messages(trip_id,created_at);
