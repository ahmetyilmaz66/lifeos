create table if not exists public.documents (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  storage_path text not null unique,
  file_size bigint not null check (file_size > 0 and file_size <= 10485760),
  processing_status text not null default 'uploaded' check (processing_status in ('uploaded', 'processing', 'needs_review', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.documents drop constraint if exists documents_processing_status_check;
alter table public.documents add constraint documents_processing_status_check check (processing_status in ('uploaded', 'processing', 'needs_review', 'completed', 'failed'));

alter table public.documents enable row level security;

drop policy if exists "Users can read their own documents" on public.documents;
drop policy if exists "Users can insert their own documents" on public.documents;
drop policy if exists "Users can delete their own documents" on public.documents;
create policy "Users can read their own documents" on public.documents
  for select using (auth.uid() = user_id);
create policy "Users can insert their own documents" on public.documents
  for insert with check (auth.uid() = user_id);
create policy "Users can delete their own documents" on public.documents
  for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lifeos-documents', 'lifeos-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload to their own document folder" on storage.objects;
drop policy if exists "Users can read their own documents" on storage.objects;
drop policy if exists "Users can delete their own documents" on storage.objects;
create policy "Users can upload to their own document folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'lifeos-documents' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users can read their own documents" on storage.objects
  for select to authenticated
  using (bucket_id = 'lifeos-documents' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users can delete their own documents" on storage.objects
  for delete to authenticated
  using (bucket_id = 'lifeos-documents' and (storage.foldername(name))[1] = (select auth.uid()::text));