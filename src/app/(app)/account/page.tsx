import { getCurrentRole } from "@/lib/roles";
import { PasswordForm } from "./PasswordForm";

export default async function AccountPage() {
  const { email } = await getCurrentRole();

  return (
    <div className="max-w-sm">
      <h1 className="font-serif text-2xl text-ink mb-1">Account</h1>
      <p className="text-ink-muted text-sm mb-4">{email}</p>

      <div className="torn-edge bg-paper-light p-6 shadow">
        <h2 className="font-medium text-ink mb-1">Set a password</h2>
        <p className="text-ink-muted text-sm mb-4">
          Optional — lets you sign in with a password instead of a magic
          link each time. If you forget it, you can always fall back to a
          magic link and set a new one here.
        </p>
        <PasswordForm />
      </div>
    </div>
  );
}
