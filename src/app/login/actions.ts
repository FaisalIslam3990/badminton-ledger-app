"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { identifierToEmail } from "@/lib/username";

export async function signInWithPassword(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return { error: "Enter your username/email and password." };
  }

  const email = identifierToEmail(identifier);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/");
}

export async function sendMagicLink(
  _prevState: { error: string | null; sent: boolean },
  formData: FormData,
): Promise<{ error: string | null; sent: boolean }> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Enter an email address.", sent: false };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm`,
    },
  });

  if (error) {
    return { error: error.message, sent: false };
  }

  return { error: null, sent: true };
}
