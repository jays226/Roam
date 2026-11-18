-- Focused ordering for AI-assisted trips. Manual trips remain on their existing flow.
alter table public.trips add column if not exists journey_stage text not null default 'choose'
  check(journey_stage in('choose','travel','itinerary'));

update public.trips
set journey_stage='itinerary'
where planning_mode='manual' and journey_stage='choose';

create index if not exists trips_journey_stage_idx on public.trips(planning_mode,journey_stage);
