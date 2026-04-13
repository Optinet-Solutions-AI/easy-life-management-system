CREATE TABLE IF NOT EXISTS room_photos (
  id       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id  uuid        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  url      text        NOT NULL,
  position int         NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS room_photos_room_id_idx ON room_photos(room_id);
