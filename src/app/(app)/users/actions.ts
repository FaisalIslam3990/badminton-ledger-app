"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/roles";
import { revalidatePath } from "next/cache";

export async function addUser(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const { role: callerRole } = await getCurrentRole();
  if (callerRole !== "admin") {
    return { error: "Forbidden" };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");

  if (!email || (role !== "admin" && role !== "viewer")) {
    return { error: "Enter a valid email and role." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_roles").insert({ email, role });

  if (error) {
    return { error: error.code === "23505" ? "That email already has access." : error.message };
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
  const { data: target } = await supabase.from("user_roles").select("email").eq("id", id).single();

  if (target?.email === callerEmail) {
    throw new Error("You can't remove your own access.");
  }

  await supabase.from("user_roles").delete().eq("id", id);
  revalidatePath("/users");
}
