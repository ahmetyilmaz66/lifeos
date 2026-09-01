alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Prevent a user from granting themselves admin via a normal client update
-- (the existing "update own profile" RLS policy would otherwise allow it).
create or replace function public.prevent_self_admin_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin and auth.role() <> 'service_role' then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_self_admin_escalation on public.profiles;
create trigger profiles_prevent_self_admin_escalation
  before update on public.profiles
  for each row execute function public.prevent_self_admin_escalation();
