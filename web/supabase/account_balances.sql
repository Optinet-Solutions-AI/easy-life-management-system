-- Structured account balances (replaces free-form bank_balances for dashboard display)
CREATE TABLE IF NOT EXISTS account_balances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type TEXT UNIQUE NOT NULL,
  amount      NUMERIC NOT NULL DEFAULT 0,
  notes       TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the 5 manual accounts (No Invoice/Receipt is always calculated)
INSERT INTO account_balances (account_type, amount) VALUES
  ('Bank',     0),
  ('Cash',     0),
  ('Wise',     0),
  ('Revolut',  0),
  ('GM Bank',  0)
ON CONFLICT (account_type) DO NOTHING;

ALTER TABLE account_balances DISABLE ROW LEVEL SECURITY;
GRANT ALL ON account_balances TO anon;
