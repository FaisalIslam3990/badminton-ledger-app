"use client";

import { useRouter } from "next/navigation";
import { computeSummary, type Entry } from "@/lib/summary";
import { MarkPaidControl } from "./MarkPaidControl";

function gbp(n: number) {
  return n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

// Caroline's job isn't grant bookkeeping — it's "what do I still owe."
// This is the one number she opens the app to check, plus the option to
// clear all of it in a single real-world transfer.
export function ViewerSummary({ entries }: { entries: Entry[] }) {
  const router = useRouter();
  const { outstandingToPay } = computeSummary(entries);
  const unpaidExpenses = entries.filter((e) => e.type === "expense" && !e.paid);

  async function markAllPaid(paidAt: string, reference: string) {
    await Promise.all(
      unpaidExpenses.map((e) =>
        fetch(`/api/entries/${e.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paid: true, paid_at: paidAt, payment_reference: reference || null }),
        }),
      ),
    );
    router.refresh();
  }

  return (
    <div className="torn-edge bg-paper-light p-5 shadow mb-6">
      <h2 className="font-serif text-lg text-ink mb-1">Outstanding to Pay</h2>
      <p className="amount text-3xl text-ink">{gbp(outstandingToPay)}</p>
      <p className="text-sm text-ink-muted mt-1 mb-3">
        {unpaidExpenses.length === 0
          ? "Nothing outstanding"
          : `${unpaidExpenses.length} unpaid item${unpaidExpenses.length === 1 ? "" : "s"}`}
      </p>
      {unpaidExpenses.length > 1 && (
        <MarkPaidControl
          label={`Mark all ${unpaidExpenses.length} as paid`}
          buttonClassName="rounded bg-brass px-3 py-2 text-sm font-medium text-ink-dark hover:opacity-90"
          confirmationMessage={`Mark ${unpaidExpenses.length} receipts totaling ${gbp(outstandingToPay)} as paid without reviewing them individually?`}
          onConfirm={markAllPaid}
        />
      )}
    </div>
  );
}
