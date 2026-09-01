do $$
declare
  duplicate_count bigint;
begin
  select count(*) into duplicate_count
  from (
    select user_id, life_item_id, remind_at, channel
    from public.reminders
    group by user_id, life_item_id, remind_at, channel
    having count(*) > 1
  ) duplicates;

  if duplicate_count = 0 then
    raise notice 'REMINDER_DUPLICATES count=0; creating unique protection';
    create unique index if not exists reminders_user_item_remind_channel_uidx
      on public.reminders(user_id, life_item_id, remind_at, channel);
  else
    raise notice 'REMINDER_DUPLICATES count=%; unique protection skipped; no rows deleted', duplicate_count;
  end if;
end $$;

alter table public.reminders enable row level security;

drop policy if exists "Users can read their own reminders" on public.reminders;
drop policy if exists "Users can insert their own reminders" on public.reminders;
drop policy if exists "Users can update their own reminders" on public.reminders;
drop policy if exists "Users can delete their own reminders" on public.reminders;

create policy "Users can read their own reminders" on public.reminders
  for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert their own reminders" on public.reminders
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update their own reminders" on public.reminders
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own reminders" on public.reminders
  for delete to authenticated using (auth.uid() = user_id);

create index if not exists reminders_user_remind_at_idx
  on public.reminders(user_id, remind_at);
create index if not exists life_items_user_due_date_idx
  on public.life_items(user_id, next_due_date);
create index if not exists life_items_user_category_idx
  on public.life_items(user_id, category);
