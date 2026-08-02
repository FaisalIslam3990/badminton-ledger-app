"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PRESET_CATEGORIES } from "@/lib/categories";
import { todayLocalISODate } from "@/lib/date";

type ExtractedFields = {
  date: string;
  vendor: string;
  amount: number;
  category: string;
  note: string;
};

export function AddEntryForm() {
  const router = useRouter();
  const [entryType, setEntryType] = useState<"income" | "expense" | null>(null);

  if (entryType === null) {
    return (
      <div className="flex gap-3">
        <button
          onClick={() => setEntryType("income")}
          className="flex-1 torn-edge bg-income py-6 text-center font-medium text-income-ink shadow"
        >
          Income
        </button>
        <button
          onClick={() => setEntryType("expense")}
          className="flex-1 torn-edge bg-paper-light py-6 text-center font-medium text-ink shadow"
        >
          Expense
        </button>
      </div>
    );
  }

  return entryType === "income" ? (
    <IncomeForm onBack={() => setEntryType(null)} onSaved={() => router.push("/")} />
  ) : (
    <ExpenseForm onBack={() => setEntryType(null)} onSaved={() => router.push("/")} />
  );
}

function BackLink({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} className="mb-4 text-sm text-ink-muted hover:text-ink">
      ← Change type
    </button>
  );
}

function IncomeForm({ onBack, onSaved }: { onBack: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayLocalISODate());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData();
    formData.set("type", "income");
    formData.set("date", date);
    formData.set("amount", amount);
    formData.set("note", note);

    const res = await fetch("/api/entries", { method: "POST", body: formData });
    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save");
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="torn-edge bg-paper-light p-6 shadow space-y-4">
      <BackLink onBack={onBack} />
      <div>
        <label className="block text-sm text-ink-muted mb-1">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full rounded border border-brass/40 bg-white px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm text-ink-muted mb-1">Amount (£)</label>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="amount w-full rounded border border-brass/40 bg-white px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm text-ink-muted mb-1">Note (optional)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded border border-brass/40 bg-white px-3 py-2"
        />
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded bg-brass px-4 py-2 font-medium text-ink-dark disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save income"}
      </button>
    </form>
  );
}

function ExpenseForm({ onBack, onSaved }: { onBack: () => void; onSaved: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [fields, setFields] = useState<ExtractedFields | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fields || !file) return;
    setSaving(true);
    setSaveError(null);

    const formData = new FormData();
    formData.set("type", "expense");
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
    onSaved();
  }

  return (
    <div className="torn-edge bg-paper-light p-6 shadow space-y-4">
      <BackLink onBack={onBack} />

      {!file && (
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">Photograph or upload the receipt.</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            onChange={handleFileChange}
            className="w-full rounded border border-brass/40 bg-white px-3 py-2"
          />
        </div>
      )}

      {previewUrl && (
        <img src={previewUrl} alt="Receipt preview" className="max-h-64 w-full rounded object-contain border border-brass/30" />
      )}
      {file?.type === "application/pdf" && <p className="text-sm text-ink-muted">PDF attached: {file.name}</p>}

      {extracting && <p className="text-sm text-ink-muted">Reading receipt…</p>}
      {extractError && <p className="text-sm text-amber-800">{extractError}</p>}

      {fields && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-ink-muted mb-1">Date</label>
            <input
              type="date"
              value={fields.date}
              onChange={(e) => setFields({ ...fields, date: e.target.value })}
              required
              className="w-full rounded border border-brass/40 bg-white px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-ink-muted mb-1">Vendor</label>
            <input
              type="text"
              value={fields.vendor}
              onChange={(e) => setFields({ ...fields, vendor: e.target.value })}
              className="w-full rounded border border-brass/40 bg-white px-3 py-2"
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
              className="amount w-full rounded border border-brass/40 bg-white px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-ink-muted mb-1">Category</label>
            <input
              type="text"
              list="category-options"
              value={fields.category}
              onChange={(e) => setFields({ ...fields, category: e.target.value })}
              className="w-full rounded border border-brass/40 bg-white px-3 py-2"
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
              className="w-full rounded border border-brass/40 bg-white px-3 py-2"
            />
          </div>

          {saveError && <p className="text-sm text-red-700">{saveError}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setPreviewUrl(null);
                setFields(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="flex-1 rounded border border-brass/40 px-4 py-2 text-ink"
            >
              Retake
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded bg-brass px-4 py-2 font-medium text-ink-dark disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save expense"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
