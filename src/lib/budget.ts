export const GRANT_AWARDED = 4999.62;
export const COMPOST_LEAGUE_FEE_RATE = 0.03;
export const COMPOST_LEAGUE_FEE = 149.99;
export const AVAILABLE_BUDGET = GRANT_AWARDED - COMPOST_LEAGUE_FEE;

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

// Assumption: no separate project-completion date has been given, so
// this is set to the final tranche's deadline. Update if the grant
// agreement specifies a distinct overall project end date.
export const PROJECT_DEADLINE = "2027-02-27";
