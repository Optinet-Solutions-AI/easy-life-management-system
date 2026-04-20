-- Add show_on_legal column to guests table
-- When true, the booking appears as revenue on the Legal page (along with its invoice).

alter table guests
  add column if not exists show_on_legal boolean not null default false;
