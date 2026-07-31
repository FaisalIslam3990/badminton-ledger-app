-- Badminton Club Ledger — schema, RLS policies, and storage setup
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- user_roles: maps an email to 'admin' or 'viewer'. Checked by both RLS
-- policies below and the app's server-side role lookup.
-- ---------------------------------------------------------------------------
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

-- Seed the admin (you). Add Caroline as 'viewer' later, once she's ready:
--   insert into public.user_roles (email, role) values ('caroline@example.com', 'viewer');
insert into public.user_roles (email, role)
values ('faisalislam3990@gmail.com', 'admin')
on conflict (email) do nothing;

-- A logged-in user may only read their own role row.
create policy "user_roles_read_own"
on public.user_roles for select
to authenticated
using (email = auth.email());

-- ---------------------------------------------------------------------------
-- Helper: current caller's role, or null if they have no row.
-- security definer so it can read user_roles regardless of the caller's
-- own RLS visibility (needed because entries policies call this too).
-- ---------------------------------------------------------------------------
create or replace function public.get_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.user_roles where email = auth.email();
$$;

-- ---------------------------------------------------------------------------
-- entries: the ledger itself.
-- ---------------------------------------------------------------------------
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  type text not null check (type in ('income', 'expense')),
  category text,
  vendor text,
  note text,
  amount numeric(10, 2) not null,
  receipt_file_url text,
  receipt_file_name text,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.entries enable row level security;

-- Admin: full read/write.
create policy "entries_admin_full_access"
on public.entries for all
to authenticated
using (public.get_user_role() = 'admin')
with check (public.get_user_role() = 'admin');

-- Viewer: can read every row.
create policy "entries_viewer_select"
on public.entries for select
to authenticated
using (public.get_user_role() = 'viewer');

-- Viewer: can issue an UPDATE at the RLS layer; the trigger below then
-- restricts it to the `paid` column only.
create policy "entries_viewer_update"
on public.entries for update
to authenticated
using (public.get_user_role() = 'viewer')
with check (public.get_user_role() = 'viewer');

-- RLS alone can't restrict an UPDATE to a single column, so a trigger
-- enforces it: a viewer's update may only ever change `paid`.
create or replace function public.enforce_viewer_paid_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.get_user_role() = 'viewer' then
    if new.date is distinct from old.date
      or new.type is distinct from old.type
      or new.category is distinct from old.category
      or new.vendor is distinct from old.vendor
      or new.note is distinct from old.note
      or new.amount is distinct from old.amount
      or new.receipt_file_url is distinct from old.receipt_file_url
      or new.receipt_file_name is distinct from old.receipt_file_name
    then
      raise exception 'Viewers may only update the paid field';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_viewer_paid_only on public.entries;
create trigger trg_enforce_viewer_paid_only
before update on public.entries
for each row execute function public.enforce_viewer_paid_only();

-- ---------------------------------------------------------------------------
-- Storage: private bucket for receipt images/PDFs. The app reads them via
-- short-lived signed URLs generated server-side, never a public URL.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "receipts_select_authenticated"
on storage.objects for select
to authenticated
using (bucket_id = 'receipts');

create policy "receipts_admin_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'receipts' and public.get_user_role() = 'admin');

create policy "receipts_admin_update"
on storage.objects for update
to authenticated
using (bucket_id = 'receipts' and public.get_user_role() = 'admin');

create policy "receipts_admin_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'receipts' and public.get_user_role() = 'admin');
