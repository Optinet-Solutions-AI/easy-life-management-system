-- Rooms configuration table
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number int NOT NULL,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (number)
);

-- Seed default rooms 1-10 (skip if already exist)
INSERT INTO rooms (number, name) VALUES
  (1, 'Room 1'), (2, 'Room 2'), (3, 'Room 3'), (4, 'Room 4'), (5, 'Room 5'),
  (6, 'Room 6'), (7, 'Room 7'), (8, 'Room 8'), (9, 'Room 9'), (10, 'Room 10')
ON CONFLICT (number) DO NOTHING;
