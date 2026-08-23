"use client";

import { useState } from "react";
import { DownloadIcon } from "./icons";
import type { PaidFilter } from "@/lib/paidFilter";

// The zip is assembled server-side in /api/export (CSV + the actual
// receipt files, not just their names) since that's the only place
// with access to Storage-authenticated downloads for every entry.
// Exports whichever tab is currently active — the same filter and
// count you're looking at is exactly what lands in the download, not
// a fixed "everything" snapshot.
export function ExportCsvButton({ filter, filterLabel }: { filter: PaidFilter; filterLabel: string }) {
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState(false);

  async function download() {
    setPreparing(true);
    setError(false);
    try {
      const res = await fetch(`/api/export?filter=${filter}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const datedSuffix = new Date().toISOString().slice(0, 10);
      a.download = `badminton-ledger-${filter}-${datedSuffix}.zip`;
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
        title={`Export ${filterLabel} (CSV + receipts)`}
        aria-label={`Export ${filterLabel} (CSV + receipts)`}
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
