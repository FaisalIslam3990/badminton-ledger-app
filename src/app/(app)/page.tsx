import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/roles";
import { SummaryPanel } from "@/components/SummaryPanel";
import { LedgerTable } from "@/components/LedgerTable";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import type { Entry } from "@/lib/summary";
import Link from "next/link";

export default async function LedgerPage() {
  const { role } = await getCurrentRole();
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from("entries")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const rows = (entries ?? []) as Entry[];

  const signedUrls = await Promise.all(
    rows.map(async (entry) => {
      if (!entry.receipt_file_url) return null;
      const { data } = await supabase.storage.from("receipts").createSignedUrl(entry.receipt_file_url, 3600);
      return data?.signedUrl ?? null;
    }),
  );

  const rowsWithReceipts = rows.map((entry, i) => ({ ...entry, receiptSignedUrl: signedUrls[i] }));

  if (!role) {
    return (
      <div className="torn-edge bg-paper-light p-6 shadow">
        <p className="text-ink">
          Your account isn&apos;t set up with access yet. Ask the admin to add your email to the{" "}
          <code>user_roles</code> table.
        </p>
      </div>
    );
  }

  return (
    <div>
      <SummaryPanel entries={rows} />
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-lg text-ink">Ledger</h2>
        <div className="flex items-center gap-4">
          {role === "admin" && <ExportCsvButton entries={rows} />}
          {role === "admin" && (
            <Link href="/add" className="text-sm text-brass hover:underline">
              + Add Entry
            </Link>
          )}
        </div>
      </div>
      <LedgerTable entries={rowsWithReceipts} role={role} />
    </div>
  );
}
