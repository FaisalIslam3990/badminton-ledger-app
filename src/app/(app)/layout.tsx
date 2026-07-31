import Link from "next/link";
import { getCurrentRole } from "@/lib/roles";
import { signOut } from "./actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, email } = await getCurrentRole();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-brass/30 bg-paper-light">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-serif text-lg text-ink">
              Badminton Club Ledger
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/" className="text-ink-muted hover:text-ink">
                Ledger
              </Link>
              {role === "admin" && (
                <Link href="/add" className="text-ink-muted hover:text-ink">
                  Add Entry
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-ink-muted">
            <span>
              {email} · {role ?? "no access"}
            </span>
            <form action={signOut}>
              <button type="submit" className="text-brass hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
