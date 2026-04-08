-- Remove duplicate guest records, keeping the oldest id per unique booking
-- Run this in the Supabase SQL Editor

DELETE FROM guests
WHERE id NOT IN (
  SELECT DISTINCT ON (guest_name, room, check_in, check_out) id
  FROM guests
  ORDER BY guest_name, room, check_in, check_out, id
);

-- Verify result
SELECT COUNT(*) AS remaining_rows FROM guests;
