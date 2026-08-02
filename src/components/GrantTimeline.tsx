import { GRANT_MILESTONES } from "@/lib/budget";

function gbp(n: number) {
  return n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function daysUntil(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${iso}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function GrantTimeline({ totalSpent }: { totalSpent: number }) {
  return (
    <div className="torn-edge bg-paper-light p-5 shadow mb-6">
      <h2 className="font-serif text-lg text-ink mb-3">Grant Payment Schedule</h2>
      <div className="space-y-4">
        {GRANT_MILESTONES.map((m) => {
          const days = m.deadline ? daysUntil(m.deadline) : null;
          const onTrack =
            m.targetCumulativeSpend !== null ? totalSpent >= m.targetCumulativeSpend : null;

          return (
            <div key={m.label} className="border-t border-brass/20 pt-3 first:border-t-0 first:pt-0">
              <div className="flex items-baseline justify-between">
                <span className="font-medium text-ink">{m.label}</span>
                <span className="amount text-ink">{gbp(m.amount)}</span>
              </div>
              <p className="text-sm text-ink-muted">
                Paid {m.paidWindow} — released once: {m.releaseCondition}
              </p>

              {m.deadline && days !== null && (
                <p className={`text-sm mt-1 ${days < 0 ? "text-red-700" : "text-ink"}`}>
                  Deadline {formatDate(m.deadline)} —{" "}
                  {days >= 0
                    ? `${days} day${days === 1 ? "" : "s"} remaining`
                    : `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`}
                </p>
              )}

              {m.targetCumulativeSpend !== null && (
                <p className={`text-sm ${onTrack ? "text-income-ink" : "text-amber-800"}`}>
                  Target: {gbp(m.targetCumulativeSpend)} spent by then — you&apos;ve spent{" "}
                  {gbp(totalSpent)} so far
                  {onTrack
                    ? " (on track)"
                    : ` (${gbp(m.targetCumulativeSpend - totalSpent)} short)`}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
