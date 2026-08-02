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
    <div className="card mb-8 p-6">
      <h2 className="mb-4 text-lg font-semibold text-ink">Outstanding to Pay</h2>
      <div className="rounded-xl bg-primary p-6 text-white">
        <p className="text-xs font-medium uppercase tracking-wide text-white/80">Outstanding to Pay</p>
        <p className="amount mt-1 text-4xl">{gbp(outstandingToPay)}</p>
        <p className="mt-1 text-sm text-white/80">
          {unpaidExpenses.length === 0
            ? "Nothing outstanding"
            : `${unpaidExpenses.length} unpaid item${unpaidExpenses.length === 1 ? "" : "s"}`}
        </p>
      </div>
      {unpaidExpenses.length > 1 && (
        <div className="mt-4">
          <MarkPaidControl
            label={`Mark all ${unpaidExpenses.length} as paid`}
            buttonClassName="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
            confirmationMessage={`Mark ${unpaidExpenses.length} receipts totaling ${gbp(outstandingToPay)} as paid without reviewing them individually?`}
            onConfirm={markAllPaid}
          />
        </div>
      )}
    </div>
  );
}
