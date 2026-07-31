# Badminton Club Ledger

Two-role ledger for a grant-funded badminton club: admin logs income/expenses
(with receipt photo → Claude auto-extraction), a viewer (Caroline) sees
everything read-only except a "Paid" checkbox.

## Stack

Next.js 16 (App Router) + Tailwind v4 · Supabase (Postgres, Auth, Storage) ·
Claude API (receipt extraction) · Vercel

## 1. Supabase project

1. Create a free project at [supabase.com](https://supabase.com).
2. **Settings → API**: copy the Project URL and the `anon` `public` key.
3. **SQL Editor → New query**: paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql) and run it. This creates the
   `entries` and `user_roles` tables, all RLS policies, and the private
   `receipts` storage bucket.
   - The schema seeds `faisalislam3990@gmail.com` as `admin`. When you're
     ready to give Caroline viewer access, run in the SQL editor:
     ```sql
     insert into public.user_roles (email, role) values ('caroline@example.com', 'viewer');
     ```
4. **Authentication → Providers**: make sure Email is enabled. Under
   **Authentication → URL Configuration**, add your site URL (and
   `http://localhost:3000` for local dev) to the redirect allow list.

Note: this app does **not** use the Supabase `service_role` key — every
operation goes through the logged-in user's own session and is enforced by
RLS, which is more secure than holding a key that bypasses it. You can skip
grabbing it.

## 2. Anthropic API key

Create a key at [console.anthropic.com](https://console.anthropic.com). You
will be asked for a payment method — billing is prepaid, and at this app's
volume (a handful of receipts a month) actual cost is roughly $1/year.

## 3. Local setup

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`ANTHROPIC_API_KEY` in `.env.local`.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in with your own
email via the magic link, and you're in as admin.

## 4. Deploy to Vercel

1. Push this repo to GitHub (see below — needed for the keep-alive workflow
   too).
2. Import the repo at [vercel.com/new](https://vercel.com/new).
3. Add the same env vars from `.env.local` in the Vercel project settings,
   but set `NEXT_PUBLIC_SITE_URL` to your Vercel URL.
4. Add that Vercel URL to Supabase's **Authentication → URL Configuration**
   redirect allow list.

## 5. Keep-alive (prevents Supabase free-tier auto-pause)

`.github/workflows/supabase-keep-alive.yml` pings the Supabase REST API
every 3 days. To activate it:

1. Push this repo to a **public** GitHub repo (Actions minutes are free
   there).
2. In the repo's **Settings → Secrets and variables → Actions**, add:
   - `SUPABASE_URL` — same as `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_ANON_KEY` — same as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Confirm it works: **Actions** tab → select the workflow → **Run
   workflow** (manual trigger), check it succeeds.

## 6. Backups

Supabase's free tier has no automated backups. Admin can click **Export CSV
backup** on the Ledger page any time — set a recurring monthly reminder to
do this and save the file somewhere durable.

## Security notes

- `ANTHROPIC_API_KEY` is only read in `src/app/api/receipts/extract/route.ts`
  (server-side). It is never sent to the browser.
- Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (both
  meant to be public) are exposed client-side.
- `.env*` is already git-ignored by the Next.js default `.gitignore` —
  confirmed before the first commit.
