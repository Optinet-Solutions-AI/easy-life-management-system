-- Add passport fields to guests table
ALTER TABLE guests ADD COLUMN IF NOT EXISTS passport_number TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS passport_expiry DATE;
