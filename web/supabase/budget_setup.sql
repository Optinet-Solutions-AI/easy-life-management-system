-- Budget Module Restructure — Room Setup Table

create table if not exists budget_room_setup (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  room_name text not null,
  high_season_rate_thb numeric,
  low_season_rate_thb numeric,
  target_occupancy_pct numeric(5,2),
  notes text,
  unique(year, room_name)
);

alter table budget_room_setup disable row level security;
grant all on budget_room_setup to anon;

-- notify pgrst, 'reload schema';
