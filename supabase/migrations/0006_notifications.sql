create table if not exists public.notifications(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique(user_id,trip_id,type,scheduled_for)
);
create index if not exists notifications_user_schedule_idx on public.notifications(user_id,scheduled_for desc);
create index if not exists notifications_unread_idx on public.notifications(user_id,scheduled_for) where read_at is null;
alter table public.notifications enable row level security;
drop policy if exists "Users can read their notifications" on public.notifications;
create policy "Users can read their notifications" on public.notifications for select using(auth.uid()=user_id);
