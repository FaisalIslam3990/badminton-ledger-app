import { getCurrentRole } from "@/lib/roles";
import { displayIdentity, isUsernameAccount } from "@/lib/username";
import { PasswordForm } from "./PasswordForm";

export default async function AccountPage() {
  const { email } = await getCurrentRole();
  const usernameAccount = email ? isUsernameAccount(email) : false;

  return (
    <div className="max-w-sm">
      <h1 className="mb-1 text-2xl font-bold text-ink">Account</h1>
      <p className="text-ink-muted text-sm mb-4">{email ? displayIdentity(email) : "—"}</p>

      <div className="card p-6">
        <h2 className="mb-1 font-semibold text-ink">
          {usernameAccount ? "Change your password" : "Set a password"}
        </h2>
        <p className="text-ink-muted text-sm mb-4">
          {usernameAccount
            ? "If you forget it, ask the admin to remove and re-add your account with a new one."
            : "Optional — lets you sign in with a password instead of a magic link each time. If you forget it, you can always fall back to a magic link and set a new one here."}
        </p>
        <PasswordForm />
      </div>
    </div>
  );
}
