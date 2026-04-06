-- Dream-T Management System — New Modules Schema

-- ============================================================
-- SHAREHOLDER PROFILES
-- ============================================================
create table if not exists shareholder_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  bio text,
  ownership_pct numeric(5,2),
  photo_url text,
  email text,
  phone text,
  nationality text,
  joined_date date,
  created_at timestamptz default now()
);

alter table shareholder_profiles disable row level security;
grant all on shareholder_profiles to anon;

-- ============================================================
-- SHAREHOLDER MEETINGS
-- ============================================================
create table if not exists shareholder_meetings (
  id uuid primary key default gen_random_uuid(),
  meeting_date date not null,
  title text not null,
  participants text[] default '{}',
  agenda text,
  decisions text,
  action_items text,
  attachments jsonb default '[]',
  created_at timestamptz default now()
);

alter table shareholder_meetings disable row level security;
grant all on shareholder_meetings to anon;

-- ============================================================
-- STAFF HOURS
-- ============================================================
create table if not exists staff_hours (
  id uuid primary key default gen_random_uuid(),
  staff_name text not null,
  role text,
  department text,
  date date not null,
  hours numeric(5,2) not null,
  hourly_rate_thb numeric(10,2),
  notes text,
  created_at timestamptz default now()
);

alter table staff_hours disable row level security;
grant all on staff_hours to anon;

-- ============================================================
-- SUPABASE STORAGE BUCKET (run once in Storage settings or via SQL)
-- Create a public bucket named "dms-files" in the Supabase dashboard:
--   Storage → New Bucket → Name: dms-files → Public: ON
-- ============================================================
-- notify pgrst, 'reload schema';
