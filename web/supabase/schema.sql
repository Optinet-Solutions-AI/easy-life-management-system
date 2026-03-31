-- Easy Life Management System - Supabase Schema

-- GUESTS table
create table if not exists guests (
  id uuid primary key default gen_random_uuid(),
  date date,
  room integer not null,
  check_in date not null,
  check_out date not null,
  guest_name text not null,
  guest_count integer default 1,
  amount_thb_day numeric,
  amount_thb_stay numeric,
  paid text,
  payment numeric default 0,
  invoice text,
  notes text,
  email text,
  phone text,
  tm30 boolean default false,
  created_at timestamptz default now()
);

-- EXPENSES table
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  audit text,
  lawyers text,
  sent date,
  to_verify text,
  payment_date date,
  transaction_number text,
  document_number text,
  category text,
  subcategory text,
  supplier text,
  amount numeric,
  currency text default 'THB',
  method text,
  paid_by text,
  internal_document text,
  document_page text,
  type text,
  description text,
  is_legal boolean default false,
  created_at timestamptz default now()
);

-- REVENUE table
create table if not exists revenue (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  type text,
  supplier text,
  amount_thb numeric,
  notes text,
  created_at timestamptz default now()
);

-- FOUNDING CONTRIBUTIONS table
create table if not exists founding_contributions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  method text,
  shareholder text not null,
  amount_thb numeric,
  amount_eur numeric,
  notes text,
  created_at timestamptz default now()
);

-- SHAREHOLDERS table (reference)
create table if not exists shareholders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  share_percentage numeric,
  amount_to_found_thb numeric,
  created_at timestamptz default now()
);

-- SHAREHOLDER WORK table
create table if not exists shareholder_work (
  id uuid primary key default gen_random_uuid(),
  month date not null,
  shareholder text not null,
  hours numeric default 0,
  hour_rate numeric default 200,
  created_at timestamptz default now()
);

-- TODOS table
create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  project text,
  department text,
  topic text not null,
  responsible_person text,
  status_notes text,
  target_date date,
  status text default 'Pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- BUDGET REVENUE table
create table if not exists budget_revenue (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  month integer not null,
  room_name text not null,
  amount_thb numeric default 0,
  season text,
  created_at timestamptz default now()
);

-- BUDGET EXPENSES table
create table if not exists budget_expenses (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  month integer not null,
  category text not null,
  subcategory text,
  item_name text not null,
  amount_thb numeric default 0,
  expense_type text default 'OPEX',
  created_at timestamptz default now()
);

-- BUDGET RENT table
create table if not exists budget_rent (
  id uuid primary key default gen_random_uuid(),
  year_number integer not null,
  year_label text,
  rent_thb numeric not null,
  vat_amount numeric,
  created_at timestamptz default now()
);

-- BANK BALANCES table (for Status of Account)
create table if not exists bank_balances (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  amount numeric not null,
  recorded_date date not null,
  status text,
  notes text,
  created_at timestamptz default now()
);

-- Seed shareholders
insert into shareholders (name, share_percentage, amount_to_found_thb) values
  ('Lorenzo PAGNAN', 25, 0),
  ('Stella MAROZZI', 25, 0),
  ('Bruce MIFSUD', 25, 0),
  ('Hanna PARSONSON', 25, 0)
on conflict do nothing;
