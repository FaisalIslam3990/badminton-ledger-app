"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { todayLocalISODate } from "@/lib/date";

export function MarkPaidControl({
  label,
  buttonClassName,
  confirmationMessage,
  onConfirm,
}: {
  label: string;
  buttonClassName?: string;
  /** Shown prominently inside the modal, above the fields — for actions
   *  (like a bulk mark-paid) that need an explicit "here's exactly what
   *  you're approving" statement, not just a generic form. */
  confirmationMessage?: string;
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

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xs rounded border border-brass/40 bg-white p-4 text-left shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {confirmationMessage && (
          <p className="mb-3 rounded bg-pending px-3 py-2 text-sm font-medium text-pending-ink">
            {confirmationMessage}
          </p>
        )}
        <label className="block text-sm text-ink-muted mb-1">Payment date</label>
        <input
          type="date"
          value={paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
          className="mb-3 w-full rounded border border-brass/40 px-3 py-2 text-base"
        />
        <label className="block text-sm text-ink-muted mb-1">Reference (optional)</label>
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="e.g. bank transfer ref"
          className="mb-4 w-full rounded border border-brass/40 px-3 py-2 text-base"
        />
        <div className="flex gap-2">
          <button
            onClick={confirm}
            disabled={saving}
            className="flex-1 rounded bg-brass px-3 py-2 text-sm font-medium text-ink-dark disabled:opacity-60"
          >
            {saving ? "Saving…" : "Confirm"}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="flex-1 rounded border border-brass/40 px-3 py-2 text-sm text-ink"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={buttonClassName ?? "rounded border border-brass/40 px-2 py-1 text-xs text-ink hover:bg-white"}
      >
        {label}
      </button>
      {open && typeof document !== "undefined" && createPortal(modal, document.body)}
    </>
  );
}
