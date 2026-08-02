import { GRANT_MILESTONES } from "@/lib/budget";

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

export function GrantTimeline() {
  const cumulativeAmounts = GRANT_MILESTONES.reduce<number[]>((acc, m, i) => {
    acc.push((acc[i - 1] ?? 0) + m.amount);
    return acc;
  }, []);
  const rows = GRANT_MILESTONES.map((m, i) => ({ ...m, cumulative: cumulativeAmounts[i] }));

  // Computed, not hardcoded: the first not-yet-received milestone. Once
  // Phase One is marked received, Phase Two becomes "next" automatically.
  const nextIndex = rows.findIndex((m) => m.status !== "received");

  return (
    <div className="torn-edge bg-paper-light p-5 shadow mb-6">
      <h2 className="font-serif text-lg text-ink mb-3">Grant Payment Schedule</h2>
      <div>
        {rows.map((m, i) => {
          const received = m.status === "received";
          const isNext = i === nextIndex;
          const overdue = isNext && !!m.deadline && isOverdue(m.deadline);

          return (
            <div
              key={m.name}
              className={`flex items-center justify-between gap-3 rounded px-2 py-2 ${
                isNext ? "bg-brass/10" : ""
              }`}
            >
              <div className="min-w-0">
                <p className={`text-sm ${received ? "text-ink-muted" : "text-ink"}`}>
                  {received && "✓ "}
                  {m.name}
                  {received && <span className="text-ink-muted"> · received</span>}
                </p>
                {!received && m.deadline && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                    <span>{formatDate(m.deadline)}</span>
                    {isNext &&
                      (overdue ? (
                        <span className="inline-block rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                          Overdue
                        </span>
                      ) : (
                        <span>
                          · {daysRemaining(m.deadline)} day{daysRemaining(m.deadline) === 1 ? "" : "s"} left
                        </span>
                      ))}
                  </p>
                )}
              </div>
              <span className={`amount shrink-0 text-sm ${received ? "text-ink-muted" : "text-ink"}`}>
                {gbp(m.cumulative)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-ink-muted">
        Amounts shown are cumulative grant unlocked as of each milestone. Release still depends on
        hitting a spend target — not yet confirmed.
      </p>
    </div>
  );
}
