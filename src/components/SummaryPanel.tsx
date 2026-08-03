import { AVAILABLE_BUDGET, COMPOST_LEAGUE_FEE, GRANT_AWARDED } from "@/lib/budget";
import { computeSummary, type Entry } from "@/lib/summary";

function gbp(n: number) {
  return n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

// One line of the budget breakdown below. "op" is the arithmetic sign
// applied to get from the running total to this line; "subtotal"/"total"
// get a divider above and heavier emphasis since they're a result, not
// an input.
function BudgetLine({
  label,
  value,
  op,
  emphasis,
}: {
  label: string;
  value: number;
  op?: "−";
  emphasis?: "subtotal" | "total";
}) {
  if (emphasis === "total") {
    return (
      <div className="mt-3 border-t border-white/20 pt-3">
        <p className="text-xs font-medium uppercase tracking-wide text-white/80">{label}</p>
        <p className={`amount mt-1 text-4xl ${value < 0 ? "text-red-200" : ""}`}>{gbp(value)}</p>
      </div>
    );
  }
  return (
    <div
      className={`flex items-baseline justify-between text-sm ${
        emphasis === "subtotal" ? "mt-2 border-t border-white/15 pt-2 font-semibold" : "text-white/85"
      }`}
    >
      <span>
        {op && <span className="mr-1 opacity-70">{op}</span>}
        {label}
      </span>
      <span className="amount">{gbp(value)}</span>
    </div>
  );
}

// Grant Awarded, Compost Fee, Available Budget, and Remaining to Spend
// are one arithmetic chain (Grant − Compost = Available; Available −
// Spent = Remaining), so they're shown as a single running breakdown
// rather than separate, disconnected tiles. Total Received tracks
// actual reimbursement activity — a different metric — so it stays
// outside the chain as its own tile.
export function SummaryPanel({ entries }: { entries: Entry[] }) {
  const { totalReceived, totalSpent, remainingToSpend } = computeSummary(entries);

  return (
    <div className="card mb-8 p-6">
      <h2 className="mb-4 text-lg font-semibold text-ink">Summary</h2>

      <div className="rounded-xl bg-primary p-6 text-white">
        <BudgetLine label="Grant Awarded" value={GRANT_AWARDED} />
        <BudgetLine label="Compost Fee" value={-COMPOST_LEAGUE_FEE} op="−" />
        <BudgetLine label="Available Budget" value={AVAILABLE_BUDGET} emphasis="subtotal" />
        <BudgetLine label="Total Spent" value={-totalSpent} op="−" />
        <BudgetLine label="Remaining to Spend" value={remainingToSpend} emphasis="total" />
      </div>

      <div className="mt-4 rounded-lg bg-received p-3 text-received-ink">
        <p className="text-[10px] font-medium uppercase tracking-wide opacity-70">Total Received</p>
        <p className="amount mt-0.5 text-sm">{gbp(totalReceived)}</p>
      </div>
    </div>
  );
}
