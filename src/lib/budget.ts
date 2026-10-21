// The grant is the hard cap — nothing can be drawn beyond it.
export const GRANT_AWARDED = 4999.62;

const roundToPence = (n: number) => Math.round(n * 100) / 100;

// Compost takes 3% of the grant, out of what's spent — it isn't extra on
// top. So the club can spend £4,849.63 on actual expenses, and by the
// time that's all spent compost will have taken its full £149.99.
export const COMPOST_LEAGUE_FEE_RATE = 0.03;
export const COMPOST_LEAGUE_FEE = roundToPence(GRANT_AWARDED * COMPOST_LEAGUE_FEE_RATE);
export const AVAILABLE_BUDGET = roundToPence(GRANT_AWARDED - COMPOST_LEAGUE_FEE);

// Compost's share accrues in proportion to spend, reaching the full fee
// exactly when all of AVAILABLE_BUDGET has been spent.
export function compostFeeOn(spent: number) {
  return roundToPence((spent * COMPOST_LEAGUE_FEE) / AVAILABLE_BUDGET);
}

// Fixed facts from the signed grant agreement — not derived from
// ledger entries. `status: "received"` is set by hand as each tranche
// actually lands; everything else (cumulative totals, which milestone
// is "next", overdue state) is computed from this and today's date.
export type GrantMilestone = {
  name: string;
  amount: number;
  status?: "received";
  /** ISO date (YYYY-MM-DD). Absent for a milestone with no deadline. */
  deadline?: string;
};

export const GRANT_MILESTONES: GrantMilestone[] = [
  { name: "Advance", amount: 2499.81, status: "received" },
  { name: "Phase One", amount: 1249.9, deadline: "2026-11-29" },
  { name: "Phase Two", amount: 1249.91, deadline: "2027-02-27" },
];

export const PROJECT_DEADLINE = "2027-05-31";
