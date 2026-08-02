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
  -- Set for accounts the admin creates directly (username + password);
  -- null for accounts tied to a real email that signed in themselves.
  -- Lets removal also delete the underlying login, not just access.
  user_id uuid,
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

-- Admins can additionally read/add/remove any row, so they can manage
-- who has access from within the app instead of the SQL editor.
create policy "user_roles_admin_full_access"
on public.user_roles for all
to authenticated
using (public.get_user_role() = 'admin')
with check (public.get_user_role() = 'admin');

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
  -- Two-step settlement: `paid` means the viewer has sent the money
  -- (with a date + optional reference as an audit trail); `received`
  -- means the admin has separately confirmed it landed. Money isn't
  -- fully settled until both are true.
  paid boolean not null default false,
  paid_at date,
  payment_reference text,
  received boolean not null default false,
  received_at date,
  -- Exact moment each button was pressed (auto-stamped by the trigger
  -- below, not client-supplied) — separate from paid_at/received_at,
  -- which are the human-chosen "date the payment actually happened".
  paid_marked_at timestamptz,
  received_marked_at timestamptz,
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

-- RLS alone can't restrict an UPDATE to specific columns, so a trigger
-- enforces it: a viewer's update may only ever touch paid / paid_at /
-- payment_reference — everything else, including received / received_at
-- (that's the admin's confirmation, not hers to set), is locked. This is
-- the real security boundary; the app UI hiding other fields from her is
-- just UX, not enforcement — this trigger is what actually stops a
-- direct API call from editing anything else. Once received is true,
-- the admin has confirmed the money — a viewer can no longer touch that
-- row at all, so a "sent" claim can't be quietly reopened after the
-- fact.
create or replace function public.enforce_viewer_paid_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.get_user_role() = 'viewer' then
    if old.received = true then
      raise exception 'This entry has already been confirmed received and can no longer be changed';
    end if;
    if new.date is distinct from old.date
      or new.type is distinct from old.type
      or new.category is distinct from old.category
      or new.vendor is distinct from old.vendor
      or new.note is distinct from old.note
      or new.amount is distinct from old.amount
      or new.receipt_file_url is distinct from old.receipt_file_url
      or new.receipt_file_name is distinct from old.receipt_file_name
      or new.received is distinct from old.received
      or new.received_at is distinct from old.received_at
      or new.paid_marked_at is distinct from old.paid_marked_at
      or new.received_marked_at is distinct from old.received_marked_at
    then
      raise exception 'Viewers may only update paid, paid_at, and payment_reference';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_viewer_paid_only on public.entries;
create trigger trg_enforce_viewer_paid_only
before update on public.entries
for each row execute function public.enforce_viewer_paid_only();

-- Auto-stamps the exact moment paid/received flip on or off. Runs
-- server-side regardless of what the client sends, so it can't be
-- backdated or faked through the API.
create or replace function public.stamp_payment_marks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.paid = true and old.paid is distinct from true then
    new.paid_marked_at := now();
  elsif new.paid = false and old.paid = true then
    new.paid_marked_at := null;
  end if;

  if new.received = true and old.received is distinct from true then
    new.received_marked_at := now();
  elsif new.received = false and old.received = true then
    new.received_marked_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_stamp_payment_marks on public.entries;
create trigger trg_stamp_payment_marks
before update on public.entries
for each row execute function public.stamp_payment_marks();

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
