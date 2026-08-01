import { createClient } from "@supabase/supabase-js";

// service_role client — bypasses RLS and can manage other users' auth
// credentials directly. Server-only, and used in exactly one place
// (creating/removing username+password logins for other users), because
// that's an operation Supabase's normal session-bound client can't do
// without disturbing the caller's own session. Never import this from a
// Client Component, and never send SUPABASE_SERVICE_ROLE_KEY to the browser.
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it in your environment variables (Settings → API → service_role in Supabase) to manage username+password logins.",
    );
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
