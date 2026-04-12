-- Customer complaints table
CREATE TABLE IF NOT EXISTS complaints (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date            date NOT NULL,
  guest_name      text NOT NULL,
  room            integer,
  category        text,
  description     text NOT NULL,
  severity        text NOT NULL DEFAULT 'Medium',
  status          text NOT NULL DEFAULT 'Open',
  resolution_notes text,
  resolved_at     date,
  filed_by        text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
