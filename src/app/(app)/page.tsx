import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/roles";
import { SummaryPanel } from "@/components/SummaryPanel";
import { GrantTimeline } from "@/components/GrantTimeline";
import { ViewerSummary } from "@/components/ViewerSummary";
import { LedgerTable } from "@/components/LedgerTable";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { computeSummary, type Entry } from "@/lib/summary";
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
      const { data, error } = await supabase.storage.from("receipts").createSignedUrl(entry.receipt_file_url, 3600);
      if (error) console.error("Signed URL error for", entry.receipt_file_url, error);
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

  const { totalSpent } = computeSummary(rows);
  const pendingConfirmCount = rows.filter((e) => e.paid && !e.received).length;

  // Income is money coming into the club, not part of her verify-and-pay
  // job — and under the new flow it'd otherwise look like a second,
  // redundant "she sent money" row alongside the payment status column.
  const ledgerRows = role === "viewer" ? rowsWithReceipts.filter((e) => e.type === "expense") : rowsWithReceipts;

  return (
    <div>
      {role === "admin" ? (
        <>
          <SummaryPanel entries={rows} />
          <GrantTimeline totalSpent={totalSpent} />
          {pendingConfirmCount > 0 && (
            <p className="text-sm text-amber-800 mb-3">
              {pendingConfirmCount} payment{pendingConfirmCount === 1 ? "" : "s"} awaiting your confirmation
            </p>
          )}
        </>
      ) : (
        <ViewerSummary entries={rows} />
      )}
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
      <LedgerTable entries={ledgerRows} role={role} />
    </div>
  );
}
