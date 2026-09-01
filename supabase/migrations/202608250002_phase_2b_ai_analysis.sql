create table if not exists public.document_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  document_type text,
  category text not null check (category in ('digital_subscription', 'bill', 'vehicle', 'product', 'warranty', 'document', 'home', 'family', 'other')),
  title text,
  provider text,
  amount numeric check (amount is null or amount >= 0),
  currency text,
  start_date date,
  end_date date,
  next_due_date date,
  recurrence text,
  description text,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  extracted_fields jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_analyses_one_per_document unique (document_id)
);

alter table public.life_items add column if not exists source_document_id uuid references public.documents(id) on delete set null;

alter table public.document_analyses enable row level security;
drop policy if exists "Users can read their own document analyses" on public.document_analyses;
drop policy if exists "Users can insert their own document analyses" on public.document_analyses;
drop policy if exists "Users can update their own document analyses" on public.document_analyses;
drop policy if exists "Users can delete their own document analyses" on public.document_analyses;
create policy "Users can read their own document analyses" on public.document_analyses for select using (auth.uid() = user_id);
create policy "Users can insert their own document analyses" on public.document_analyses for insert with check (auth.uid() = user_id);
create policy "Users can update their own document analyses" on public.document_analyses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own document analyses" on public.document_analyses for delete using (auth.uid() = user_id);

create index if not exists documents_user_id_created_at_idx on public.documents(user_id, created_at desc);
create index if not exists document_analyses_user_id_idx on public.document_analyses(user_id);

create unique index if not exists life_items_source_document_id_idx on public.life_items(source_document_id) where source_document_id is not null;