import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/roles";
import { SummaryPanel } from "@/components/SummaryPanel";
import { GrantTimeline } from "@/components/GrantTimeline";
import { AmountVisibilityProvider } from "@/components/AmountVisibility";
import { ViewerSummary } from "@/components/ViewerSummary";
import { LedgerTable } from "@/components/LedgerTable";
import { AddEntryFab } from "@/components/AddEntryFab";
import type { Entry } from "@/lib/summary";

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
      <div className="card p-6">
        <p className="text-ink">
          Your account isn&apos;t set up with access yet. Ask the admin to add your email to the{" "}
          <code>user_roles</code> table.
        </p>
      </div>
    );
  }

  const pendingConfirmCount = rows.filter((e) => e.paid && !e.received).length;

  // Income is money coming into the club, not part of her verify-and-pay
  // job — and under the new flow it'd otherwise look like a second,
  // redundant "she sent money" row alongside the payment status column.
  const ledgerRows = role === "viewer" ? rowsWithReceipts.filter((e) => e.type === "expense") : rowsWithReceipts;

  return (
    <div>
      {role === "admin" ? (
        <>
          <AmountVisibilityProvider>
            <SummaryPanel entries={rows} />
            <GrantTimeline />
          </AmountVisibilityProvider>
          {pendingConfirmCount > 0 && (
            <p className="mb-4 rounded-lg bg-pending px-4 py-2 text-sm font-medium text-pending-ink">
              {pendingConfirmCount} payment{pendingConfirmCount === 1 ? "" : "s"} awaiting your confirmation
            </p>
          )}
        </>
      ) : (
        <ViewerSummary entries={rows} />
      )}
      <LedgerTable entries={ledgerRows} role={role} />
      {role === "admin" && <AddEntryFab />}
    </div>
  );
}
