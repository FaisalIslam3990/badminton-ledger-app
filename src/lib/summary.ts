import { AVAILABLE_BUDGET } from "@/lib/budget";

export type Entry = {
  id: string;
  date: string;
  type: "income" | "expense";
  category: string | null;
  vendor: string | null;
  note: string | null;
  amount: number;
  receipt_file_url: string | null;
  receipt_file_name: string | null;
  paid: boolean;
  paid_at: string | null;
  payment_reference: string | null;
  received: boolean;
  received_at: string | null;
  paid_marked_at: string | null;
  received_marked_at: string | null;
  created_at: string;
  extraction_method: "template" | "heuristic" | "ai" | null;
};

export function computeSummary(entries: Entry[]) {
  // There's no separate "income" ledger entry anymore — Caroline's
  // reimbursements ARE the grant tranches, so "received" is the only
  // source of truth for money that's actually landed.
  const totalReceived = entries.filter((e) => e.type === "expense" && e.received).reduce((sum, e) => sum + e.amount, 0);
  const totalSpent = entries.filter((e) => e.type === "expense").reduce((sum, e) => sum + e.amount, 0);
  const outstandingToPay = entries
    .filter((e) => e.type === "expense" && !e.paid)
    .reduce((sum, e) => sum + e.amount, 0);

  return {
    totalReceived,
    totalSpent,
    remainingToSpend: AVAILABLE_BUDGET - totalSpent,
    outstandingToPay,
  };
}
