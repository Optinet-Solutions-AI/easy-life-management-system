-- Add visible_to_gm flag to todos table
-- When a task is assigned to a shareholder (responsible_person), toggling this
-- flag makes it appear on the GM dashboard (view-only for the GM).

alter table todos
  add column if not exists visible_to_gm boolean not null default false;
