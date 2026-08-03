"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PRESET_CATEGORIES } from "@/lib/categories";
import { todayLocalISODate } from "@/lib/date";
import { takePendingReceipt } from "@/lib/pendingReceipt";

type ExtractedFields = {
  date: string;
  vendor: string;
  amount: number;
  category: string;
  note: string;
};

// Every entry is an expense claim now — "income" is derived from
// confirmed reimbursements (Section: Ledger status flow), not logged
// separately, so there's nothing to toggle here anymore.
export function AddEntryForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [fields, setFields] = useState<ExtractedFields | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function processFile(selected: File) {
    setFile(selected);
    setPreviewUrl(selected.type === "application/pdf" ? null : URL.createObjectURL(selected));
    setFields(null);
    setExtractError(null);
    setExtracting(true);

    const formData = new FormData();
    formData.set("file", selected);

    try {
      const res = await fetch("/api/receipts/extract", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) {
        setExtractError(body.error ?? "Couldn't read the receipt — enter details manually.");
        setFields({ date: todayLocalISODate(), vendor: "", amount: 0, category: "Other", note: "" });
        return;
      }
      setFields(body.extracted);
    } catch {
      setExtractError("Couldn't read the receipt — enter details manually.");
      setFields({ date: todayLocalISODate(), vendor: "", amount: 0, category: "Other", note: "" });
    } finally {
      setExtracting(false);
    }
  }

  // If the Add Entry FAB already picked a file (native picker, no
  // "Choose file" tap needed here), pick up right where that left off.
  // Falls through to the manual file input below when there isn't one
  // — e.g. a direct visit to this page.
  useEffect(() => {
    const pending = takePendingReceipt();
    if (!pending) return;
    queueMicrotask(() => processFile(pending));
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) processFile(selected);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fields || !file) return;
    setSaving(true);
    setSaveError(null);

    const formData = new FormData();
    formData.set("date", fields.date);
    formData.set("vendor", fields.vendor);
    formData.set("amount", String(fields.amount));
    formData.set("category", fields.category);
    formData.set("note", fields.note);
    formData.set("receipt", file);

    const res = await fetch("/api/entries", { method: "POST", body: formData });
    setSaving(false);

    if (!res.ok && res.status !== 207) {
      const body = await res.json().catch(() => ({}));
      setSaveError(body.error ?? "Failed to save");
      return;
    }
    router.push("/");
  }

  return (
    <div className="card space-y-4 p-6">
      {!file && (
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">Photograph or upload the receipt.</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            onChange={handleFileChange}
            className="w-full rounded-lg border border-border bg-card-alt px-3 py-2"
          />
        </div>
      )}

      {previewUrl && (
        <img src={previewUrl} alt="Receipt preview" className="max-h-64 w-full rounded-lg object-contain border border-border" />
      )}
      {file?.type === "application/pdf" && <p className="text-sm text-ink-muted">PDF attached: {file.name}</p>}

      {extracting && <p className="text-sm text-ink-muted">Reading receipt…</p>}
      {extractError && <p className="text-sm text-pending-ink">{extractError}</p>}

      {fields && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-ink-muted mb-1">Date</label>
            <input
              type="date"
              value={fields.date}
              onChange={(e) => setFields({ ...fields, date: e.target.value })}
              required
              className="w-full rounded-lg border border-border bg-card-alt px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-ink-muted mb-1">Vendor</label>
            <input
              type="text"
              value={fields.vendor}
              onChange={(e) => setFields({ ...fields, vendor: e.target.value })}
              className="w-full rounded-lg border border-border bg-card-alt px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-ink-muted mb-1">Amount (£)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              value={fields.amount}
              onChange={(e) => setFields({ ...fields, amount: Number(e.target.value) })}
              required
              className="amount w-full rounded-lg border border-border bg-card-alt px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-ink-muted mb-1">Category</label>
            <input
              type="text"
              list="category-options"
              value={fields.category}
              onChange={(e) => setFields({ ...fields, category: e.target.value })}
              className="w-full rounded-lg border border-border bg-card-alt px-3 py-2"
            />
            <datalist id="category-options">
              {PRESET_CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm text-ink-muted mb-1">Note</label>
            <input
              type="text"
              value={fields.note}
              onChange={(e) => setFields({ ...fields, note: e.target.value })}
              className="w-full rounded-lg border border-border bg-card-alt px-3 py-2"
            />
          </div>

          {saveError && <p className="text-sm text-unpaid-ink">{saveError}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setPreviewUrl(null);
                setFields(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-ink"
            >
              Retake
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary-dark disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save expense"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
