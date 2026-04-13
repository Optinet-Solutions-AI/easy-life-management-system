CREATE TABLE IF NOT EXISTS room_inventory (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    uuid        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  category   text        NOT NULL DEFAULT 'General',
  quantity   int         NOT NULL DEFAULT 1,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS room_inventory_room_id_idx ON room_inventory(room_id);
