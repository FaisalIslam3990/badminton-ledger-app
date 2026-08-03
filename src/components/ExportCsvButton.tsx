"use client";

import { useState } from "react";
import { DownloadIcon } from "./icons";

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
      title="Export backup (CSV + receipts)"
      aria-label="Export backup (CSV + receipts)"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-ink-muted hover:bg-white/5 hover:text-ink disabled:opacity-60"
    >
      <DownloadIcon className={`h-4 w-4 ${preparing ? "animate-pulse" : ""}`} />
    </button>
  );
}
