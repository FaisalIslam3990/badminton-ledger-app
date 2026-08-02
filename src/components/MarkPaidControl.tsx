"use client";

import { useState } from "react";
import { todayLocalISODate } from "@/lib/date";

export function MarkPaidControl({
  label,
  buttonClassName,
  onConfirm,
}: {
  label: string;
  buttonClassName?: string;
  onConfirm: (paidAt: string, reference: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [paidAt, setPaidAt] = useState(todayLocalISODate());
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  async function confirm() {
    setSaving(true);
    await onConfirm(paidAt, reference);
    setSaving(false);
    setOpen(false);
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className={buttonClassName ?? "rounded border border-brass/40 px-2 py-1 text-xs text-ink hover:bg-white"}
      >
        {label}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 w-56 rounded border border-brass/40 bg-white p-3 text-left shadow-lg">
          <label className="block text-xs text-ink-muted mb-1">Payment date</label>
          <input
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="mb-2 w-full rounded border border-brass/40 px-2 py-1 text-sm"
          />
          <label className="block text-xs text-ink-muted mb-1">Reference (optional)</label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. bank transfer ref"
            className="mb-3 w-full rounded border border-brass/40 px-2 py-1 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={confirm}
              disabled={saving}
              className="flex-1 rounded bg-brass px-2 py-1 text-xs font-medium text-ink-dark disabled:opacity-60"
            >
              {saving ? "Saving…" : "Confirm"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="flex-1 rounded border border-brass/40 px-2 py-1 text-xs text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
