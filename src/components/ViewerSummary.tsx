import { computeSummary, type Entry } from "@/lib/summary";

function gbp(n: number) {
  return n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

// Caroline's job isn't grant bookkeeping — it's "what do I still owe."
// This is the one number she opens the app to check.
export function ViewerSummary({ entries }: { entries: Entry[] }) {
  const { outstandingToPay } = computeSummary(entries);
  const unpaidCount = entries.filter((e) => e.type === "expense" && !e.paid).length;

  return (
    <div className="torn-edge bg-paper-light p-5 shadow mb-6">
      <h2 className="font-serif text-lg text-ink mb-1">Outstanding to Pay</h2>
      <p className="amount text-3xl text-ink">{gbp(outstandingToPay)}</p>
      <p className="text-sm text-ink-muted mt-1">
        {unpaidCount === 0 ? "Nothing outstanding" : `${unpaidCount} unpaid item${unpaidCount === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}
