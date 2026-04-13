CREATE TABLE IF NOT EXISTS room_fire_extinguishers (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id        uuid        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  location       text        NOT NULL DEFAULT 'Room',
  serial_number  text,
  expiry_date    date        NOT NULL,
  last_inspected date,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS room_fire_extinguishers_room_id_idx  ON room_fire_extinguishers(room_id);
CREATE INDEX IF NOT EXISTS room_fire_extinguishers_expiry_idx   ON room_fire_extinguishers(expiry_date);
