import { AVAILABLE_BUDGET, COMPOST_LEAGUE_FEE, GRANT_AWARDED } from "@/lib/budget";
import { computeSummary, type Entry } from "@/lib/summary";

function gbp(n: number) {
  return n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

export function SummaryPanel({ entries }: { entries: Entry[] }) {
  const { totalReceived, totalSpent, remainingToSpend } = computeSummary(entries);

  const rows: Array<[string, number, boolean?]> = [
    ["Total Received", totalReceived],
    ["Total Spent", totalSpent],
    ["Grant Awarded", GRANT_AWARDED],
    ["Compost League Fee (3%)", COMPOST_LEAGUE_FEE],
    ["Available Budget", AVAILABLE_BUDGET],
    ["Remaining to Spend", remainingToSpend, true],
  ];

  return (
    <div className="torn-edge bg-paper-light p-5 shadow mb-6">
      <h2 className="font-serif text-lg text-ink mb-3">Summary</h2>
      <dl className="grid grid-cols-2 gap-y-2 text-sm">
        {rows.map(([label, value, emphasize]) => (
          <div key={label} className="contents">
            <dt className={emphasize ? "font-medium text-ink" : "text-ink-muted"}>{label}</dt>
            <dd
              className={`amount text-right ${emphasize ? "font-semibold text-ink" : "text-ink"} ${
                value < 0 ? "text-red-700" : ""
              }`}
            >
              {gbp(value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
