create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  life_item_id uuid not null references public.life_items(id) on delete cascade,
  remind_at timestamptz not null,
  channel text not null default 'in_app' check (channel = 'in_app'),
  created_at timestamptz not null default now(),
  unique (user_id, life_item_id, remind_at, channel)
);

alter table public.reminders enable row level security;
drop policy if exists "Users can read their own reminders" on public.reminders;
drop policy if exists "Users can insert their own reminders" on public.reminders;
drop policy if exists "Users can update their own reminders" on public.reminders;
drop policy if exists "Users can delete their own reminders" on public.reminders;
create policy "Users can read their own reminders" on public.reminders for select using (auth.uid() = user_id);
create policy "Users can insert their own reminders" on public.reminders for insert with check (auth.uid() = user_id);
create policy "Users can update their own reminders" on public.reminders for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own reminders" on public.reminders for delete using (auth.uid() = user_id);

create index if not exists reminders_user_remind_at_idx on public.reminders(user_id, remind_at);
create index if not exists life_items_user_due_date_idx on public.life_items(user_id, next_due_date);
create index if not exists life_items_user_category_idx on public.life_items(user_id, category);