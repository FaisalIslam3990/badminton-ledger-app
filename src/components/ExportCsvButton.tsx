"use client";

import { useState } from "react";
import { DownloadIcon } from "./icons";

// The zip is assembled server-side in /api/export (CSV + the actual
// receipt files, not just their names) since that's the only place
// with access to Storage-authenticated downloads for every entry.
export function ExportCsvButton() {
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState(false);

  async function download() {
    setPreparing(true);
    setError(false);
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
      setError(true);
    } finally {
      setPreparing(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={download}
        disabled={preparing}
        title="Export backup (CSV + receipts)"
        aria-label="Export backup (CSV + receipts)"
        className="pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-ink-muted hover:bg-white/5 hover:text-ink disabled:opacity-60"
      >
        <DownloadIcon className={`h-4 w-4 ${preparing ? "animate-pulse" : ""}`} />
      </button>
      {error && (
        <p className="absolute right-0 top-full z-10 mt-1 w-40 text-right text-[11px] text-unpaid-ink">
          Export failed — try again
        </p>
      )}
    </div>
  );
}
