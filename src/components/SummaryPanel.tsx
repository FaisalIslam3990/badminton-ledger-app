import { AVAILABLE_BUDGET, COMPOST_LEAGUE_FEE, GRANT_AWARDED } from "@/lib/budget";
import { computeSummary, type Entry } from "@/lib/summary";

function gbp(n: number) {
  return n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

export function SummaryPanel({ entries }: { entries: Entry[] }) {
  const { totalReceived, totalSpent, remainingToSpend } = computeSummary(entries);

  const secondaryStats: Array<[string, number]> = [
    ["Total Received", totalReceived],
    ["Total Spent", totalSpent],
    ["Grant Awarded", GRANT_AWARDED],
    ["Compost League Fee (3%)", COMPOST_LEAGUE_FEE],
    ["Available Budget", AVAILABLE_BUDGET],
  ];

  return (
    <div className="torn-edge bg-paper-light p-5 shadow mb-6">
      <h2 className="font-serif text-lg text-ink mb-3">Summary</h2>

      <div className="mb-4">
        <p className="text-xs uppercase tracking-wide text-ink-muted">Remaining to Spend</p>
        <p
          className={`amount text-4xl font-semibold ${remainingToSpend < 0 ? "text-red-700" : "text-ink"}`}
        >
          {gbp(remainingToSpend)}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-brass/20 pt-3 text-xs sm:grid-cols-3">
        {secondaryStats.map(([label, value]) => (
          <div key={label}>
            <dt className="text-ink-muted">{label}</dt>
            <dd className={`amount ${value < 0 ? "text-red-700" : "text-ink"}`}>{gbp(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
