"use client";

import {
  AVAILABLE_BUDGET,
  COMPOST_LEAGUE_FEE,
  COMPOST_LEAGUE_FEE_RATE,
  GRANT_AWARDED,
  compostFeeOn,
} from "@/lib/budget";
import { computeSummary, type Entry } from "@/lib/summary";
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

// The hero answers three questions and nothing more: how much can I
// still spend (the headline), how far through am I (a plain bar with a
// percentage — the spent figure itself lives in the Total Spent tile
// below, so it isn't repeated), and where did the grant go (grant,
// compost's cut, what's left to spend, written out). Compost is
// shown as a line in that breakdown rather than as pieces of the bar:
// splitting the bar by compost made its empty part stop matching
// Remaining to Spend. The eye toggle gates the budget figures (shared
// with GrantTimeline via AmountVisibility context). Owed to You stays
// unmasked always — it's the number Caroline needs at a glance.
export function SummaryPanel({ entries }: { entries: Entry[] }) {
  const { visible, toggle } = useAmountVisibility();
  const { totalReceived, totalSpent, remainingToSpend } = computeSummary(entries);
  const overspent = totalSpent > AVAILABLE_BUDGET;
  const usedPct = (totalSpent / AVAILABLE_BUDGET) * 100;
  const meterWidth = Math.min(100, Math.max(0, usedPct));
  const compostSoFar = compostFeeOn(totalSpent);
  const owedToYou = totalSpent - totalReceived;
  const show = (n: number) => (visible ? gbp(n) : MASK);

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

        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className={`h-full rounded-full ${overspent ? "bg-red-300" : "bg-accent"}`}
            style={{ width: `${meterWidth}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-white/70">
          {visible ? `${Math.round(usedPct)}%` : MASK} of {show(AVAILABLE_BUDGET)} spent
        </p>

        <div className="mt-4 max-w-xs space-y-1 border-t border-white/15 pt-3 text-xs text-white/75">
          <div className="flex justify-between gap-4">
            <span>Grant</span>
            <span className="amount">{show(GRANT_AWARDED)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Compost ({COMPOST_LEAGUE_FEE_RATE * 100}%)</span>
            <span className="amount">−{show(COMPOST_LEAGUE_FEE)}</span>
          </div>
          <p className="text-[11px] text-white/55">{show(compostSoFar)} taken so far</p>
          <div className="flex justify-between gap-4 border-t border-white/15 pt-1 font-medium text-white">
            <span>To spend</span>
            <span className="amount">{show(AVAILABLE_BUDGET)}</span>
          </div>
        </div>
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
