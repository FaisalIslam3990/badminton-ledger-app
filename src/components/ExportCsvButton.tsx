"use client";

import { useState } from "react";

// The zip is assembled server-side in /api/export (CSV + the actual
// receipt files, not just their names) since that's the only place
// with access to Storage-authenticated downloads for every entry.
export function ExportCsvButton() {
  const [preparing, setPreparing] = useState(false);

  async function download() {
    setPreparing(true);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `badminton-ledger-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setPreparing(false);
    }
  }

  return (
    <button
      onClick={download}
      disabled={preparing}
      className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-ink hover:bg-white/5 disabled:opacity-60"
    >
      {preparing ? "Preparing…" : "Export backup (CSV + receipts)"}
    </button>
  );
}
