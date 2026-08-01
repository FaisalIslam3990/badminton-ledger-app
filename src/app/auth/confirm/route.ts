import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

// Landing point for the magic-link email. This project's Supabase auth
// uses the PKCE flow, so the email link redirects here with ?code=...,
// which must be exchanged for a session. (Older Supabase configs instead
// send ?token_hash=...&type=..., verified via verifyOtp — handled here
// too, since which one you get can depend on project auth settings.)
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      redirect("/");
    }
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      redirect("/");
    }
  }

  redirect("/login?error=link_invalid");
}
