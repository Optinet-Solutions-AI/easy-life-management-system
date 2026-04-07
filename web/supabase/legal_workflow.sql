-- Legal / Accounting Workflow
-- Safe to run whether or not the expenses table already exists.

-- 1. Create expenses table with ALL columns (including legal workflow) if not exists
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
  legal_status text default 'Pending',
  legal_notes text,
  legal_reviewed_at date,
  created_at timestamptz default now()
);

-- 2. If the table already existed without the new columns, add them
alter table expenses add column if not exists legal_status text default 'Pending';
alter table expenses add column if not exists legal_notes text;
alter table expenses add column if not exists legal_reviewed_at date;

-- 3. Permissions
alter table expenses disable row level security;
grant all on expenses to anon;

-- 4. Back-fill existing legal expenses as Pending
update expenses set legal_status = 'Pending' where is_legal = true and legal_status is null;

-- notify pgrst, 'reload schema';
