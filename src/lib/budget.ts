export const GRANT_AWARDED = 4999.62;
export const COMPOST_LEAGUE_FEE_RATE = 0.03;
export const COMPOST_LEAGUE_FEE = 149.99;
export const AVAILABLE_BUDGET = GRANT_AWARDED - COMPOST_LEAGUE_FEE;

export type GrantMilestone = {
  label: string;
  amount: number;
  paidWindow: string;
  releaseCondition: string;
  /** ISO date (YYYY-MM-DD), or null if there's no fixed deadline. */
  deadline: string | null;
  /** Cumulative spend that should be evidenced by the deadline (what's
   *  been paid out so far), or null if not applicable. */
  targetCumulativeSpend: number | null;
};

export const GRANT_MILESTONES: GrantMilestone[] = [
  {
    label: "50% advance payment",
    amount: 2499.81,
    paidWindow: "June – August 2026",
    releaseCondition: "Signed Grant Agreement + evidence all additional conditions were met",
    deadline: null,
    targetCumulativeSpend: null,
  },
  {
    label: "25% — Phase One",
    amount: 1249.91,
    paidWindow: "October – November 2026",
    releaseCondition: "Phase One Monitoring Form + evidence of expenditure",
    deadline: "2026-11-29",
    targetCumulativeSpend: 2499.81,
  },
  {
    label: "25% — Phase Two",
    amount: 1249.91,
    paidWindow: "January – February 2027",
    releaseCondition: "Phase Two Monitoring Form + evidence of expenditure",
    deadline: "2027-02-27",
    targetCumulativeSpend: 3749.72,
  },
];
