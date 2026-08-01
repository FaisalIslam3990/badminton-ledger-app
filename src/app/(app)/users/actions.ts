"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentRole } from "@/lib/roles";
import { usernameToEmail } from "@/lib/username";
import { revalidatePath } from "next/cache";

export async function addUser(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const { role: callerRole } = await getCurrentRole();
  if (callerRole !== "admin") {
    return { error: "Forbidden" };
  }

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!username || password.length < 8 || (role !== "admin" && role !== "viewer")) {
    return { error: "Enter a username, a password (min 8 characters), and a role." };
  }

  const email = usernameToEmail(username);

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Admin client unavailable." };
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    return {
      error: createError.message.includes("already been registered")
        ? "That username is taken."
        : createError.message,
    };
  }

  const supabase = await createClient();
  const { error: roleError } = await supabase
    .from("user_roles")
    .insert({ email, role, user_id: created.user.id });

  if (roleError) {
    // Roll back the auth user so we don't leave an orphaned login with no role.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: roleError.message };
  }

  revalidatePath("/users");
  return { error: null };
}

export async function removeUser(id: string) {
  const { role: callerRole, email: callerEmail } = await getCurrentRole();
  if (callerRole !== "admin") {
    throw new Error("Forbidden");
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("user_roles")
    .select("email, user_id")
    .eq("id", id)
    .single();

  if (target?.email === callerEmail) {
    throw new Error("You can't remove your own access.");
  }

  await supabase.from("user_roles").delete().eq("id", id);

  // Username+password accounts were created by the admin, so also delete
  // the underlying login — otherwise it'd be an orphaned, unusable account.
  // Real-email accounts (magic link) are left alone: that login is theirs.
  if (target?.user_id) {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(target.user_id);
  }

  revalidatePath("/users");
}
