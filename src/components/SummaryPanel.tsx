import { AVAILABLE_BUDGET, COMPOST_LEAGUE_FEE, GRANT_AWARDED } from "@/lib/budget";
import { computeSummary, type Entry } from "@/lib/summary";

function gbp(n: number) {
  return n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: "received" | "dark" }) {
  const toneClass = {
    received: "bg-received text-received-ink",
    dark: "bg-card-alt text-ink",
  }[tone];
  return (
    <div className={`rounded-lg p-3 ${toneClass}`}>
      <p className="text-[10px] font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="amount mt-0.5 text-lg">{gbp(value)}</p>
    </div>
  );
}

// Remaining to Spend is the headline; the meter is its chart — how much
// of the Available Budget the spend-to-date has used up. Total Spent and
// Total Received flank it as the two numbers that actually feed that
// picture (what's gone out, what's been paid back), rather than as
// disconnected tiles. Grant/Compost/Available stay as a small caption:
// the arithmetic that gets you to the meter's ceiling, not the headline.
export function SummaryPanel({ entries }: { entries: Entry[] }) {
  const { totalReceived, totalSpent, remainingToSpend } = computeSummary(entries);
  const spentRatio = totalSpent / AVAILABLE_BUDGET;
  const overspent = spentRatio > 1;
  const meterWidth = Math.min(100, Math.max(0, spentRatio * 100));
  const owedToYou = totalSpent - totalReceived;

  return (
    <div className="card mb-8 p-6">
      <h2 className="mb-4 text-lg font-semibold text-ink">Summary</h2>

      <div className="rounded-xl bg-primary p-6 text-white">
        <p className="text-xs font-medium uppercase tracking-wide text-white/80">Remaining to Spend</p>
        <p className={`amount mt-1 text-4xl ${remainingToSpend < 0 ? "text-red-200" : ""}`}>
          {gbp(remainingToSpend)}
        </p>

        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className={`h-full rounded-full ${overspent ? "bg-red-300" : "bg-accent"}`}
            style={{ width: `${meterWidth}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-white/70">
          {gbp(totalSpent)} spent of {gbp(AVAILABLE_BUDGET)} available
        </p>

        <p className="mt-3 border-t border-white/15 pt-2 text-[11px] text-white/60">
          Grant {gbp(GRANT_AWARDED)} − Compost Fee {gbp(COMPOST_LEAGUE_FEE)} = Available {gbp(AVAILABLE_BUDGET)}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <StatTile label="Total Spent" value={totalSpent} tone="dark" />
        <span className="amount text-lg text-ink-muted">−</span>
        <StatTile label="Total Received" value={totalReceived} tone="received" />
      </div>

      <div className="flex justify-center">
        <div className="h-4 w-px border-l border-dashed border-ink-muted/40" />
      </div>
      <div className="flex justify-center">
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-ink-muted/40 text-xs text-ink-muted">
          =
        </div>
      </div>

      <div className="mt-1 rounded-xl bg-unpaid p-6">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-unpaid-ink">
          <span className="h-2 w-2 rounded-full bg-unpaid-ink" />
          Owed to You
        </p>
        <p className="amount mt-1 text-4xl font-bold text-unpaid-ink">{gbp(owedToYou)}</p>
      </div>
    </div>
  );
}
