"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Entry } from "@/lib/summary";
import type { Role } from "@/lib/roles";
import { PRESET_CATEGORIES } from "@/lib/categories";

type Row = Entry & { receiptSignedUrl: string | null };

function gbp(n: number) {
  return n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

function isPdf(entry: Row) {
  return entry.receipt_file_url?.toLowerCase().endsWith(".pdf") ?? false;
}

export function LedgerTable({ entries, role }: { entries: Row[]; role: Role }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function togglePaid(entry: Row) {
    setBusyId(entry.id);
    await fetch(`/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: !entry.paid }),
    });
    setBusyId(null);
    router.refresh();
  }

  async function deleteEntry(id: string) {
    if (!confirm("Delete this entry? This can't be undone.")) return;
    setBusyId(id);
    await fetch(`/api/entries/${id}`, { method: "DELETE" });
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="torn-edge bg-paper-light shadow overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-brass/30 text-left text-ink-muted">
            <th className="px-3 py-2 font-normal">Date</th>
            <th className="px-3 py-2 font-normal">Category</th>
            <th className="px-3 py-2 font-normal">Note</th>
            <th className="px-3 py-2 font-normal text-right">Amount</th>
            <th className="px-3 py-2 font-normal">Receipt</th>
            <th className="px-3 py-2 font-normal text-center">Paid</th>
            {role === "admin" && <th className="px-3 py-2 font-normal">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) =>
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
                    isPdf(entry) ? (
                      <a
                        href={entry.receiptSignedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={entry.receipt_file_name ?? "Receipt PDF"}
                        className="flex h-10 w-10 items-center justify-center rounded border border-brass/30 bg-white text-[10px] font-medium text-ink-muted"
                      >
                        PDF
                      </a>
                    ) : (
                      <button onClick={() => setLightbox(entry.receiptSignedUrl)}>
                        <img
                          src={entry.receiptSignedUrl}
                          alt={entry.receipt_file_name ?? "Receipt"}
                          className="h-10 w-10 rounded border border-brass/30 object-cover"
                        />
                      </button>
                    )
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={entry.paid}
                    disabled={busyId === entry.id || (role !== "admin" && role !== "viewer")}
                    onChange={() => togglePaid(entry)}
                    className="h-4 w-4 accent-brass"
                  />
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
                      disabled={busyId === entry.id}
                      className="text-red-700 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ),
          )}
          {entries.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-center text-ink-muted">
                No entries yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Receipt" className="max-h-full max-w-full rounded shadow-xl" />
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
