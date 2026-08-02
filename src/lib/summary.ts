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
  created_at: string;
};

export function computeSummary(entries: Entry[]) {
  const totalReceived = entries.filter((e) => e.type === "income").reduce((sum, e) => sum + e.amount, 0);
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
