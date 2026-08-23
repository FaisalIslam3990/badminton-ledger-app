import type { Entry } from "./summary";

export type PaidFilter = "unpaid" | "paid" | "awaiting" | "received" | "all";

export function isPaidFilter(value: string | null): value is PaidFilter {
  return value === "unpaid" || value === "paid" || value === "awaiting" || value === "received" || value === "all";
}

// Shared between the Ledger table (client-side tab filtering) and the
// export route (server-side, so a downloaded backup always matches
// whichever tab you were looking at) — one definition, so the two can
// never quietly drift apart.
export function matchesPaidFilter(entry: Pick<Entry, "paid" | "received">, filter: PaidFilter): boolean {
  if (filter === "unpaid") return !entry.paid;
  if (filter === "paid") return entry.paid;
  if (filter === "awaiting") return entry.paid && !entry.received;
  if (filter === "received") return entry.received;
  return true;
}
