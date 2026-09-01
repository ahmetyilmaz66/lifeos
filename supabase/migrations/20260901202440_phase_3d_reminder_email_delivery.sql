-- Enable extensions needed for scheduled reminder delivery (cron trigger + async http call to edge function)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Track when a reminder was actually delivered
alter table public.reminders
  add column if not exists sent_at timestamptz;

create index if not exists reminders_pending_due_idx
  on public.reminders (remind_at)
  where status = 'pending';
