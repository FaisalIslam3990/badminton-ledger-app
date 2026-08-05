"use client";

import { GRANT_MILESTONES, PROJECT_DEADLINE } from "@/lib/budget";
import { useAmountVisibility } from "@/components/AmountVisibility";

const MASK = "••••••";

function gbp(n: number) {
  return n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysRemaining(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${iso}T00:00:00`);
  return Math.max(Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)), 0);
}

function isOverdue(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${iso}T00:00:00`).getTime() < today.getTime();
}

// A milestone's date is also the date its phase begins, so "has this
// date arrived yet" (inclusive of today) tells us whether we've
// progressed into that phase — independent of whether the admin has
// actually clicked it as received yet.
function hasBegun(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${iso}T00:00:00`).getTime() <= today.getTime();
}

export function GrantTimeline() {
  const { visible } = useAmountVisibility();
  const cumulativeAmounts = GRANT_MILESTONES.reduce<number[]>((acc, m, i) => {
    acc.push((acc[i - 1] ?? 0) + m.amount);
    return acc;
  }, []);
  const rows = GRANT_MILESTONES.map((m, i) => ({ ...m, cumulative: cumulativeAmounts[i] }));

  // The stage we're "at" progresses forward either when it's actually
  // marked received, or once its date arrives — whichever comes first.
  // Milestones are chronological, so the last one satisfying either
  // condition is where we currently stand (Advance, with no deadline,
  // is always the floor).
  let currentIndex = 0;
  rows.forEach((m, i) => {
    if (m.status === "received" || (m.deadline && hasBegun(m.deadline))) currentIndex = i;
  });

  return (
    <div className="card mb-8 p-6">
      <h2 className="mb-4 text-lg font-semibold text-ink">Grant Payment Schedule</h2>
      <div className="space-y-1">
        {rows.map((m, i) => {
          const received = m.status === "received";
          const isCurrent = i === currentIndex;
          const overdue = !received && !!m.deadline && isOverdue(m.deadline);

          return (
            <div
              key={m.name}
              className={`flex items-center justify-between gap-3 rounded-lg px-3 py-3 ${
                isCurrent ? "bg-primary/10" : ""
              }`}
            >
              <div className="min-w-0">
                <p className={`text-sm ${received ? "text-ink-muted" : "font-medium text-ink"}`}>
                  {received && <span className="text-received-ink">✓ </span>}
                  {m.name}
                  {received && <span className="text-ink-muted"> · received</span>}
                  {isCurrent && !received && <span className="text-primary"> · current</span>}
                </p>
                {!received && m.deadline && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                    <span>{formatDate(m.deadline)}</span>
                    {overdue ? (
                      <span className="inline-block rounded-full bg-unpaid px-2 py-0.5 text-[10px] font-medium text-unpaid-ink">
                        Overdue
                      </span>
                    ) : (
                      <span>
                        · {daysRemaining(m.deadline)} day{daysRemaining(m.deadline) === 1 ? "" : "s"} left
                      </span>
                    )}
                  </p>
                )}
              </div>
              <span className={`amount shrink-0 text-sm ${received ? "text-ink-muted" : "text-ink"}`}>
                {visible ? gbp(m.cumulative) : MASK}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-ink-muted">
        <span>Project deadline</span>
        <span>
          {formatDate(PROJECT_DEADLINE)}
          {!isOverdue(PROJECT_DEADLINE) && ` · ${daysRemaining(PROJECT_DEADLINE)} days left`}
          {isOverdue(PROJECT_DEADLINE) && " · overdue"}
        </span>
      </div>
    </div>
  );
}
