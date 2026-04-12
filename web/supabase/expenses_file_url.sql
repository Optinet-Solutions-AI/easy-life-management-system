-- Add file attachment column to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS file_url text;
