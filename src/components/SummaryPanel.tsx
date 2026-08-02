import { AVAILABLE_BUDGET, COMPOST_LEAGUE_FEE, GRANT_AWARDED } from "@/lib/budget";
import { computeSummary, type Entry } from "@/lib/summary";

function gbp(n: number) {
  return n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: "received" | "dark" | "light" }) {
  const toneClass = {
    received: "bg-received text-received-ink",
    dark: "bg-ink text-white",
    light: "bg-bg text-ink",
  }[tone];
  return (
    <div className={`rounded-xl p-3 ${toneClass}`}>
      <p className="text-[10px] font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="amount mt-0.5 text-sm">{gbp(value)}</p>
    </div>
  );
}

export function SummaryPanel({ entries }: { entries: Entry[] }) {
  const { totalReceived, totalSpent, remainingToSpend } = computeSummary(entries);

  return (
    <div className="card mb-8 p-6">
      <h2 className="mb-4 text-lg font-semibold text-ink">Summary</h2>

      <div className="rounded-xl bg-primary p-6 text-white">
        <p className="text-xs font-medium uppercase tracking-wide text-white/80">Remaining to Spend</p>
        <p className={`amount mt-1 text-4xl ${remainingToSpend < 0 ? "text-red-200" : ""}`}>
          {gbp(remainingToSpend)}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile label="Total Received" value={totalReceived} tone="received" />
        <StatTile label="Total Spent" value={totalSpent} tone="dark" />
        <StatTile label="Grant Awarded" value={GRANT_AWARDED} tone="light" />
        <StatTile label="Compost Fee" value={COMPOST_LEAGUE_FEE} tone="light" />
        <StatTile label="Available Budget" value={AVAILABLE_BUDGET} tone="light" />
      </div>
    </div>
  );
}
