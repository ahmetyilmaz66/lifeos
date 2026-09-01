alter table public.life_items
  add column if not exists reminder_enabled boolean;

alter table public.life_items
  add column if not exists reminder_days integer[];
