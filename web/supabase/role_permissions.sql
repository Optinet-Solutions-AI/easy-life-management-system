CREATE TABLE IF NOT EXISTS role_permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role        text NOT NULL,
  module      text NOT NULL,
  can_view    boolean NOT NULL DEFAULT true,
  can_add     boolean NOT NULL DEFAULT true,
  can_edit    boolean NOT NULL DEFAULT true,
  can_delete  boolean NOT NULL DEFAULT true,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, module)
);
