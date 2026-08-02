import Link from "next/link";
import { getCurrentRole } from "@/lib/roles";
import { displayIdentity } from "@/lib/username";
import { AccountMenu } from "@/components/AccountMenu";
import { ListIcon, PlusCircleIcon } from "@/components/icons";
import { signOut } from "./actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, email } = await getCurrentRole();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-bold text-ink">
              Badminton Club
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/" className="flex items-center gap-1.5 text-ink-muted hover:text-primary">
                <ListIcon />
                Ledger
              </Link>
              {role === "admin" && (
                <Link href="/add" className="flex items-center gap-1.5 text-ink-muted hover:text-primary">
                  <PlusCircleIcon />
                  Add Entry
                </Link>
              )}
            </nav>
          </div>
          <AccountMenu
            identity={email ? displayIdentity(email) : "—"}
            role={role ?? "no access"}
            isAdmin={role === "admin"}
            signOutAction={signOut}
          />
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
