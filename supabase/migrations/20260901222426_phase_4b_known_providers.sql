create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null check (category in ('digital_subscription', 'bill', 'vehicle', 'product', 'warranty', 'document', 'home', 'family', 'other')),
  created_at timestamptz not null default now()
);

alter table public.providers enable row level security;
drop policy if exists "Authenticated users can read providers" on public.providers;
create policy "Authenticated users can read providers" on public.providers
  for select to authenticated using (true);

insert into public.providers (name, category) values
  ('Netflix', 'digital_subscription'),
  ('Spotify', 'digital_subscription'),
  ('YouTube Premium', 'digital_subscription'),
  ('Disney+', 'digital_subscription'),
  ('Amazon Prime', 'digital_subscription'),
  ('Apple', 'digital_subscription'),
  ('Google One', 'digital_subscription'),
  ('Microsoft 365', 'digital_subscription'),
  ('Canva', 'digital_subscription'),
  ('Adobe', 'digital_subscription'),
  ('ChatGPT', 'digital_subscription'),
  ('Claude', 'digital_subscription'),
  ('Gemini', 'digital_subscription'),
  ('Midjourney', 'digital_subscription'),
  ('Turkcell', 'bill'),
  ('Vodafone', 'bill'),
  ('Türk Telekom', 'bill'),
  ('İSKİ', 'bill'),
  ('Enerjisa', 'bill'),
  ('BEDAŞ', 'bill'),
  ('İGDAŞ', 'bill'),
  ('Axa Sigorta', 'vehicle'),
  ('Allianz Sigorta', 'vehicle')
on conflict (name) do nothing;

create index if not exists providers_name_idx on public.providers (lower(name));
