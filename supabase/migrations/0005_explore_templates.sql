alter table public.users add column if not exists template_display_name text;
alter table public.trips add column if not exists is_template_source boolean not null default false;

create table if not exists public.templates(
  id uuid primary key default gen_random_uuid(),
  source_trip_id uuid not null unique references public.trips(id) on delete cascade,
  creator_user_id uuid not null references public.users(id) on delete cascade,
  creator_display_name text not null,
  title text not null,
  description text not null default '',
  tags text[] not null default '{}',
  season text,
  days integer not null check(days between 1 and 60),
  cities_json jsonb not null default '[]'::jsonb,
  blocks_json jsonb not null default '[]'::jsonb,
  price_level text check(price_level is null or price_level in('$','$$','$$$')),
  cover_image text,
  cover_photo_id text,
  published boolean not null default false,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.template_views(
  template_id uuid not null references public.templates(id) on delete cascade,
  visitor_key text not null,
  created_at timestamptz not null default now(),
  primary key(template_id,visitor_key)
);
create table if not exists public.template_saves(
  template_id uuid not null references public.templates(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(template_id,user_id)
);
create table if not exists public.template_uses(
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  new_trip_id uuid not null references public.trips(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(template_id,user_id)
);
create table if not exists public.template_ratings(
  template_id uuid not null references public.templates(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  rating integer not null check(rating between 1 and 5),
  feedback text,
  created_at timestamptz not null default now(),
  primary key(template_id,user_id)
);
create table if not exists public.points_ledger(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  reason text not null check(reason in('template_copy','template_rating','template_save')),
  amount integer not null,
  ref_id uuid not null,
  created_at timestamptz not null default now(),
  unique(user_id,reason,ref_id)
);
create table if not exists public.template_reports(
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);
create table if not exists public.template_events(
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.templates(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  visitor_key text,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists templates_published_created_idx on public.templates(published,created_at desc);
create index if not exists templates_creator_published_idx on public.templates(creator_user_id,published);
create index if not exists template_uses_template_idx on public.template_uses(template_id);
create index if not exists template_ratings_template_idx on public.template_ratings(template_id);

alter table public.templates enable row level security;
alter table public.template_views enable row level security;
alter table public.template_saves enable row level security;
alter table public.template_uses enable row level security;
alter table public.template_ratings enable row level security;
alter table public.points_ledger enable row level security;
alter table public.template_reports enable row level security;
alter table public.template_events enable row level security;

drop policy if exists "Anyone can browse published templates" on public.templates;
create policy "Anyone can browse published templates" on public.templates for select using(published);
drop policy if exists "Creators can see their own templates" on public.templates;
create policy "Creators can see their own templates" on public.templates for select using(auth.uid()=creator_user_id);
drop policy if exists "Users can read their template saves" on public.template_saves;
create policy "Users can read their template saves" on public.template_saves for select using(auth.uid()=user_id);
drop policy if exists "Users can read their template uses" on public.template_uses;
create policy "Users can read their template uses" on public.template_uses for select using(auth.uid()=user_id);
drop policy if exists "Users can read their points" on public.points_ledger;
create policy "Users can read their points" on public.points_ledger for select using(auth.uid()=user_id);
