import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/roles";
import { redirect } from "next/navigation";
import { AddUserForm } from "./AddUserForm";
import { removeUser } from "./actions";
import { isUsernameAccount, displayIdentity } from "@/lib/username";

export default async function UsersPage() {
  const { role, email: myEmail } = await getCurrentRole();
  if (role !== "admin") {
    redirect("/");
  }

  const supabase = await createClient();
  const { data: users } = await supabase
    .from("user_roles")
    .select("id, email, role, user_id, created_at")
    .order("created_at", { ascending: true });

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-2xl font-bold text-ink">Users</h1>

      <div className="card mb-8 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">Username / Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id} className="border-b border-border">
                <td className="px-4 py-3 text-ink">
                  {isUsernameAccount(u.email) ? (
                    <>
                      {displayIdentity(u.email)}{" "}
                      <span className="text-xs text-ink-muted">(username)</span>
                    </>
                  ) : (
                    u.email
                  )}
                </td>
                <td className="px-4 py-3 capitalize text-ink">{u.role}</td>
                <td className="px-4 py-3 text-right">
                  {u.email !== myEmail && (
                    <form action={removeUser.bind(null, u.id)}>
                      <button type="submit" className="text-unpaid-ink hover:underline">
                        Remove
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-6">
        <h2 className="mb-1 font-semibold text-ink">Add a user</h2>
        <p className="text-ink-muted text-sm mb-4">
          Set a username and password yourself and hand them over — no email
          needed, and usernames aren&apos;t case-sensitive.
        </p>
        <AddUserForm />
      </div>
    </div>
  );
}
