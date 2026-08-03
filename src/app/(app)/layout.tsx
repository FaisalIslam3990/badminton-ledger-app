import Link from "next/link";
import { getCurrentRole } from "@/lib/roles";
import { displayIdentity } from "@/lib/username";
import { AccountMenu } from "@/components/AccountMenu";
import { AppNav } from "@/components/AppNav";
import { signOut } from "./actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, email } = await getCurrentRole();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card shadow-[0_1px_0_rgba(0,0,0,0.4)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-bold text-ink">
              Badminton Club
            </Link>
            <AppNav />
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
