"use client";

import type { Entry } from "@/lib/summary";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function ExportCsvButton({ entries }: { entries: Entry[] }) {
  function download() {
    const header = ["Date", "Type", "Category", "Vendor", "Note", "Amount", "Paid", "Receipt File"];
    const rows = entries.map((e) => [
      e.date,
      e.type,
      e.category ?? "",
      e.vendor ?? "",
      e.note ?? "",
      e.amount.toFixed(2),
      e.paid ? "yes" : "no",
      e.receipt_file_name ?? "",
    ]);

    const csv = [header, ...rows].map((row) => row.map((v) => csvEscape(String(v))).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `badminton-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button onClick={download} className="text-sm text-brass hover:underline">
      Export CSV backup
    </button>
  );
}
