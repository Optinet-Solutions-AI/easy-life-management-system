-- Add a unique constraint on (guest_name, room, check_in, check_out)
-- so the import script cannot create duplicates even if run multiple times.
-- Run AFTER deduplicate_guests.sql

ALTER TABLE guests
  ADD CONSTRAINT guests_unique_booking
  UNIQUE (guest_name, room, check_in, check_out);
