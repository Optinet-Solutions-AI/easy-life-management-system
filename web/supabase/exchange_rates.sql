-- Live Exchange Rate Storage

create table if not exists exchange_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency text not null default 'EUR',
  quote_currency text not null default 'THB',
  rate numeric(12,6) not null,
  source text not null default 'ECB',
  fetched_at timestamptz not null default now(),
  unique(base_currency, quote_currency)
);

alter table exchange_rates disable row level security;
grant all on exchange_rates to anon;

-- Seed a starting rate so the app works before the first cron run
insert into exchange_rates (base_currency, quote_currency, rate, source)
values ('EUR', 'THB', 37.0, 'seed')
on conflict (base_currency, quote_currency) do nothing;

-- notify pgrst, 'reload schema';
