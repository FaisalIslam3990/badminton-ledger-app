"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Entry } from "@/lib/summary";
import type { Role } from "@/lib/roles";
import { PRESET_CATEGORIES } from "@/lib/categories";
import { todayLocalISODate, formatDateUK } from "@/lib/date";

type Row = Entry & { receiptSignedUrl: string | null };

type PaidFilter = "unpaid" | "all" | "paid";

function gbp(n: number) {
  return n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

function receiptLabel(entry: Row) {
  const ext = entry.receipt_file_url?.split(".").pop()?.toUpperCase();
  return ext && ext.length <= 4 ? ext : "FILE";
}

export function LedgerTable({ entries, role }: { entries: Row[]; role: Role }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  // Her job is clearing what's outstanding, so default to that; admin's
  // log defaults to everything, unfiltered.
  const [filter, setFilter] = useState<PaidFilter>(role === "viewer" ? "unpaid" : "all");

  const visibleEntries = entries.filter((e) => {
    if (filter === "unpaid") return !e.paid;
    if (filter === "paid") return e.paid;
    return true;
  });

  async function deleteEntry(id: string) {
    if (!confirm("Delete this entry? This can't be undone.")) return;
    await fetch(`/api/entries/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="torn-edge bg-paper-light shadow overflow-x-auto">
      <div className="flex gap-1 border-b border-brass/20 px-3 py-2">
        {(["unpaid", "all", "paid"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded px-2 py-1 text-xs capitalize ${
              filter === f ? "bg-brass text-ink-dark" : "text-ink-muted hover:text-ink"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-brass/30 text-left text-ink-muted">
            <th className="px-3 py-2 font-normal">Date</th>
            <th className="px-3 py-2 font-normal">Category</th>
            <th className="px-3 py-2 font-normal">Note</th>
            <th className="px-3 py-2 font-normal text-right">Amount</th>
            <th className="px-3 py-2 font-normal">Receipt</th>
            <th className="px-3 py-2 font-normal">Paid</th>
            {role === "admin" && <th className="px-3 py-2 font-normal">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {visibleEntries.map((entry) =>
            editingId === entry.id ? (
              <EditRow
                key={entry.id}
                entry={entry}
                onCancel={() => setEditingId(null)}
                onSaved={() => {
                  setEditingId(null);
                  router.refresh();
                }}
              />
            ) : (
              <tr
                key={entry.id}
                className={`border-b border-brass/10 ${entry.type === "income" ? "bg-income" : ""}`}
              >
                <td className="px-3 py-2 whitespace-nowrap">{entry.date}</td>
                <td className="px-3 py-2">{entry.category ?? "—"}</td>
                <td className="px-3 py-2">{entry.note ?? "—"}</td>
                <td className="amount px-3 py-2 text-right">
                  {entry.type === "expense" ? "-" : ""}
                  {gbp(entry.amount)}
                </td>
                <td className="px-3 py-2">
                  {entry.receiptSignedUrl ? (
                    <a
                      href={entry.receiptSignedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={entry.receipt_file_name ?? "Receipt"}
                      className="flex h-10 w-10 items-center justify-center rounded border border-brass/30 bg-white text-[10px] font-medium text-ink-muted"
                    >
                      {receiptLabel(entry)}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2">
                  {role === "admin" || role === "viewer" ? (
                    <PaidCell entry={entry} onChanged={() => router.refresh()} />
                  ) : entry.paid ? (
                    "Paid"
                  ) : (
                    "—"
                  )}
                </td>
                {role === "admin" && (
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button
                      onClick={() => setEditingId(entry.id)}
                      className="mr-3 text-brass hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="text-red-700 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ),
          )}
          {visibleEntries.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-center text-ink-muted">
                {filter === "unpaid" ? "Nothing outstanding." : filter === "paid" ? "Nothing paid yet." : "No entries yet."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PaidCell({ entry, onChanged }: { entry: Row; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [paidAt, setPaidAt] = useState(entry.paid_at ?? todayLocalISODate());
  const [reference, setReference] = useState(entry.payment_reference ?? "");
  const [saving, setSaving] = useState(false);

  async function markPaid() {
    setSaving(true);
    await fetch(`/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: true, paid_at: paidAt, payment_reference: reference || null }),
    });
    setSaving(false);
    setOpen(false);
    onChanged();
  }

  async function markUnpaid() {
    if (!confirm("Mark as unpaid? This clears the payment date/reference.")) return;
    await fetch(`/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: false, paid_at: null, payment_reference: null }),
    });
    onChanged();
  }

  if (entry.paid) {
    return (
      <button
        onClick={markUnpaid}
        title={entry.payment_reference ? `Ref: ${entry.payment_reference} — click to undo` : "Click to undo"}
        className="text-income-ink hover:underline"
      >
        ✓ {entry.paid_at ? formatDateUK(entry.paid_at) : "Paid"}
      </button>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="rounded border border-brass/40 px-2 py-1 text-xs text-ink hover:bg-white"
      >
        Mark Paid
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
              onClick={markPaid}
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

function EditRow({
  entry,
  onCancel,
  onSaved,
}: {
  entry: Row;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(entry.date);
  const [type, setType] = useState(entry.type);
  const [category, setCategory] = useState(entry.category ?? "");
  const [note, setNote] = useState(entry.note ?? "");
  const [amount, setAmount] = useState(String(entry.amount));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, type, category, note, amount: Number(amount) }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <tr className="border-b border-brass/10 bg-white">
      <td className="px-3 py-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded border border-brass/40 px-2 py-1"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          list="edit-category-options"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded border border-brass/40 px-2 py-1"
        />
        <datalist id="edit-category-options">
          {PRESET_CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded border border-brass/40 px-2 py-1"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="amount w-full rounded border border-brass/40 px-2 py-1 text-right"
        />
      </td>
      <td className="px-3 py-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "income" | "expense")}
          className="rounded border border-brass/40 px-2 py-1"
        >
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </td>
      <td className="px-3 py-2"></td>
      <td className="px-3 py-2 whitespace-nowrap">
        <button onClick={save} disabled={saving} className="mr-3 text-brass hover:underline">
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={onCancel} className="text-ink-muted hover:underline">
          Cancel
        </button>
      </td>
    </tr>
  );
}
