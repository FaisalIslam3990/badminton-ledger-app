import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "viewer" | null;

// Looks up the current user's role via the same user_roles table the RLS
// policies check, so app-level UI restrictions and DB-level access
// control never disagree.
export async function getCurrentRole(): Promise<{
  role: Role;
  email: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { role: null, email: null };
  }

  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("email", user.email)
    .maybeSingle();

  return { role: (data?.role as Role) ?? null, email: user.email };
}
