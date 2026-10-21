"use client";

import {
  AVAILABLE_BUDGET,
  COMPOST_LEAGUE_FEE,
  COMPOST_LEAGUE_FEE_RATE,
  GRANT_AWARDED,
  compostFeeOn,
} from "@/lib/budget";
import { computeSummary, type Entry } from "@/lib/summary";
import { GrantBreakdownToggle } from "@/components/GrantBreakdown";
import { RemainingAmount } from "@/components/RemainingAmount";
import { useAmountVisibility } from "@/components/AmountVisibility";

const MASK = "••••••";

function gbp(n: number) {
  return n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

function StatTile({
  label,
  value,
  tone,
  visible,
}: {
  label: string;
  value: number;
  tone: "received" | "dark" | "unpaid";
  visible: boolean;
}) {
  const toneClass = {
    received: "bg-received text-received-ink",
    dark: "bg-card-alt text-ink",
    unpaid: "bg-unpaid text-unpaid-ink",
  }[tone];
  return (
    <div className={`rounded-lg p-3 sm:min-w-0 sm:flex-1 ${toneClass}`}>
      <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide opacity-70">
        {tone === "unpaid" && <span className="h-1.5 w-1.5 rounded-full bg-unpaid-ink" />}
        {label}
      </p>
      <p className="amount mt-0.5 text-lg">{visible ? gbp(value) : MASK}</p>
    </div>
  );
}

// Remaining to Spend is the headline; the meter is its chart — how much
// of the Available Budget the spend-to-date has used up. Total Spent and
// Total Received flank it as the two numbers that actually feed that
// picture (what's gone out, what's been paid back), rather than as
// disconnected tiles. Grant/Compost/Available stay as a small caption:
// the arithmetic that gets you to the meter's ceiling, not the headline.
// The eye toggle next to the headline gates the budget figures (shared
// with GrantTimeline via AmountVisibility context). Owed to You stays
// unmasked always — it's the number Caroline needs at a glance.
export function SummaryPanel({ entries }: { entries: Entry[] }) {
  const { visible, toggle } = useAmountVisibility();
  const { totalReceived, totalSpent, remainingToSpend } = computeSummary(entries);
  const overspent = totalSpent > AVAILABLE_BUDGET;
  const compostSoFar = compostFeeOn(totalSpent);
  // The bar is the whole £4,999.62 grant: what's been spent, plus the
  // compost share that's come out with it. Both fill it exactly when
  // the budget is used up.
  const pct = (n: number) => Math.min(100, Math.max(0, (n / GRANT_AWARDED) * 100));
  const spentWidth = pct(totalSpent);
  const compostWidth = Math.min(pct(compostSoFar), 100 - spentWidth);
  const owedToYou = totalSpent - totalReceived;

  return (
    <div className="card mb-8 p-6">
      <h2 className="mb-4 text-lg font-semibold text-ink">Summary</h2>

      <div className="rounded-xl bg-primary p-6 text-white">
        <p className="text-xs font-medium uppercase tracking-wide text-white/80">Remaining to Spend</p>
        <RemainingAmount
          amount={gbp(remainingToSpend)}
          negative={remainingToSpend < 0}
          visible={visible}
          onToggle={toggle}
        />

        <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-white/15">
          <div className={overspent ? "bg-red-300" : "bg-accent"} style={{ width: `${spentWidth}%` }} />
          <div className="bg-amber-300" style={{ width: `${compostWidth}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/75">
          <span className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${overspent ? "bg-red-300" : "bg-accent"}`} />
            Spent {visible ? gbp(totalSpent) : MASK}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-300" />
            Compost {visible ? gbp(compostSoFar) : MASK} of {visible ? gbp(COMPOST_LEAGUE_FEE) : MASK}
          </span>
        </div>
        <p className="mt-1.5 text-[11px] text-white/70">From {visible ? gbp(AVAILABLE_BUDGET) : MASK}</p>

        <GrantBreakdownToggle
          breakdown={
            visible
              ? `Grant ${gbp(GRANT_AWARDED)} − Compost Fee ${gbp(COMPOST_LEAGUE_FEE)} (${COMPOST_LEAGUE_FEE_RATE * 100}%) = Available ${gbp(AVAILABLE_BUDGET)}`
              : `Grant ${MASK} − Compost Fee ${MASK} (${COMPOST_LEAGUE_FEE_RATE * 100}%) = Available ${MASK}`
          }
        />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:contents">
          <StatTile label="Total Spent" value={totalSpent} tone="dark" visible={visible} />
          <span className="amount flex items-center justify-center text-lg text-ink-muted">−</span>
          <StatTile label="Total Received" value={totalReceived} tone="received" visible={visible} />
        </div>

        <span className="amount hidden text-lg text-ink-muted sm:flex sm:items-center">=</span>

        <StatTile label="Owed to You" value={owedToYou} tone="unpaid" visible />
      </div>
    </div>
  );
}
