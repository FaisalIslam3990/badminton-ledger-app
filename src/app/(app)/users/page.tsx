import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/roles";
import { redirect } from "next/navigation";
import { AddUserForm } from "./AddUserForm";
import { removeUser } from "./actions";

export default async function UsersPage() {
  const { role, email: myEmail } = await getCurrentRole();
  if (role !== "admin") {
    redirect("/");
  }

  const supabase = await createClient();
  const { data: users } = await supabase
    .from("user_roles")
    .select("id, email, role, created_at")
    .order("created_at", { ascending: true });

  return (
    <div className="max-w-lg">
      <h1 className="font-serif text-2xl text-ink mb-4">Users</h1>

      <div className="torn-edge bg-paper-light shadow mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brass/30 text-left text-ink-muted">
              <th className="px-3 py-2 font-normal">Email</th>
              <th className="px-3 py-2 font-normal">Role</th>
              <th className="px-3 py-2 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id} className="border-b border-brass/10">
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2 capitalize">{u.role}</td>
                <td className="px-3 py-2 text-right">
                  {u.email !== myEmail && (
                    <form action={removeUser.bind(null, u.id)}>
                      <button type="submit" className="text-red-700 hover:underline">
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

      <div className="torn-edge bg-paper-light p-6 shadow">
        <h2 className="font-medium text-ink mb-1">Add a user</h2>
        <p className="text-ink-muted text-sm mb-4">
          They sign in themselves with this email (magic link, or a password
          once they set one) — no invite email is sent.
        </p>
        <AddUserForm />
      </div>
    </div>
  );
}
