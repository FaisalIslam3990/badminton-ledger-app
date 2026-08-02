"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Entry } from "@/lib/summary";
import type { Role } from "@/lib/roles";
import { PRESET_CATEGORIES } from "@/lib/categories";
import { todayLocalISODate, formatDateUK, formatDateTimeUK } from "@/lib/date";
import { MarkPaidControl } from "./MarkPaidControl";

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

  const emptyMessage =
    filter === "unpaid" ? "Nothing outstanding." : filter === "paid" ? "Nothing paid yet." : "No entries yet.";

  return (
    <div className="torn-edge bg-paper-light shadow">
      <div className="flex gap-1 border-b border-brass/20 px-3 py-2">
        {(["unpaid", "all", "paid"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded px-3 py-2 text-xs capitalize ${
              filter === f ? "bg-brass text-ink-dark" : "text-ink-muted hover:text-ink"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Mobile: stacked cards. A table crammed into a phone width just
          forces horizontal scrolling and unreadable cells. */}
      <div className="sm:hidden divide-y divide-brass/10">
        {visibleEntries.map((entry) =>
          editingId === entry.id ? (
            <EditCard
              key={entry.id}
              entry={entry}
              onCancel={() => setEditingId(null)}
              onSaved={() => {
                setEditingId(null);
                router.refresh();
              }}
            />
          ) : (
            <EntryCard
              key={entry.id}
              entry={entry}
              role={role}
              onEdit={() => setEditingId(entry.id)}
              onDelete={() => deleteEntry(entry.id)}
              onChanged={() => router.refresh()}
            />
          ),
        )}
        {visibleEntries.length === 0 && <p className="px-4 py-6 text-center text-ink-muted">{emptyMessage}</p>}
      </div>

      {/* Desktop / tablet: table. */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brass/30 text-left text-ink-muted">
              <th className="px-3 py-2 font-normal">Date</th>
              <th className="px-3 py-2 font-normal">Category</th>
              <th className="px-3 py-2 font-normal">Note</th>
              <th className="px-3 py-2 font-normal text-right">Amount</th>
              <th className="px-3 py-2 font-normal">Receipt</th>
              <th className="px-3 py-2 font-normal">Status</th>
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
                  <td className="amount px-3 py-2 text-right whitespace-nowrap">{gbp(entry.amount)}</td>
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
                    <StatusCell entry={entry} role={role} onChanged={() => router.refresh()} />
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
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EntryCard({
  entry,
  role,
  onEdit,
  onDelete,
  onChanged,
}: {
  entry: Row;
  role: Role;
  onEdit: () => void;
  onDelete: () => void;
  onChanged: () => void;
}) {
  return (
    <div className={`p-4 ${entry.type === "income" ? "bg-income" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-ink-muted">
            {entry.date}
            {entry.category ? ` · ${entry.category}` : ""}
          </p>
          <p className="text-ink">{entry.note ?? "—"}</p>
        </div>
        <p className="amount shrink-0 font-medium text-ink">{gbp(entry.amount)}</p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        {entry.receiptSignedUrl ? (
          <a
            href={entry.receiptSignedUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={entry.receipt_file_name ?? "Receipt"}
            className="flex h-11 w-11 items-center justify-center rounded border border-brass/30 bg-white text-[10px] font-medium text-ink-muted"
          >
            {receiptLabel(entry)}
          </a>
        ) : (
          <span className="text-xs text-ink-muted">No receipt</span>
        )}
        <StatusCell entry={entry} role={role} onChanged={onChanged} />
      </div>

      {role === "admin" && (
        <div className="mt-3 flex gap-4 text-sm">
          <button onClick={onEdit} className="text-brass">
            Edit
          </button>
          <button onClick={onDelete} className="text-red-700">
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// Two-step settlement, split cleanly by whose job it is: she marks a
// claim sent (date + optional reference); only he can confirm it landed.
// Once received, the row is locked — neither the UI here nor the DB
// trigger let a viewer touch it again.
function StatusCell({ entry, role, onChanged }: { entry: Row; role: Role; onChanged: () => void }) {
  async function patch(body: Record<string, unknown>) {
    await fetch(`/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    onChanged();
  }

  async function markSent(paidAt: string, reference: string) {
    await patch({ paid: true, paid_at: paidAt, payment_reference: reference || null });
  }

  async function undoSent() {
    if (!confirm("Undo this payment? This clears the payment date/reference.")) return;
    await patch({ paid: false, paid_at: null, payment_reference: null });
  }

  async function confirmReceived() {
    await patch({ received: true, received_at: todayLocalISODate() });
  }

  async function undoReceived() {
    if (!confirm("Undo confirming this as received?")) return;
    await patch({ received: false, received_at: null });
  }

  if (entry.received) {
    return (
      <div>
        <p className="text-xs text-income-ink">Received {entry.received_at ? formatDateUK(entry.received_at) : ""}</p>
        {entry.received_marked_at && (
          <p className="text-[10px] text-ink-muted">confirmed {formatDateTimeUK(entry.received_marked_at)}</p>
        )}
        {role === "admin" && (
          <button onClick={undoReceived} className="mt-0.5 text-[10px] text-ink-muted underline">
            Undo
          </button>
        )}
      </div>
    );
  }

  if (entry.paid) {
    if (role === "admin") {
      return (
        <div>
          <p className="text-xs text-ink-muted">
            Sent {entry.paid_at ? formatDateUK(entry.paid_at) : ""}
            {entry.payment_reference ? ` · ${entry.payment_reference}` : ""}
          </p>
          {entry.paid_marked_at && (
            <p className="text-[10px] text-ink-muted mb-1">marked {formatDateTimeUK(entry.paid_marked_at)}</p>
          )}
          <button
            onClick={confirmReceived}
            className="rounded border border-brass/40 px-2 py-1 text-xs text-ink hover:bg-white"
          >
            Confirm Received
          </button>
        </div>
      );
    }
    return (
      <div>
        <p className="text-xs text-ink-muted">
          Sent {entry.paid_at ? formatDateUK(entry.paid_at) : ""} — awaiting confirmation
        </p>
        {entry.paid_marked_at && (
          <p className="text-[10px] text-ink-muted mb-1">marked {formatDateTimeUK(entry.paid_marked_at)}</p>
        )}
        <button onClick={undoSent} className="text-xs text-brass underline">
          Undo
        </button>
      </div>
    );
  }

  if (role === "viewer") {
    return <MarkPaidControl label="Mark Paid" onConfirm={markSent} />;
  }

  return <span className="text-xs text-ink-muted">Unpaid</span>;
}

function EditCard({
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
    <div className="space-y-3 bg-white p-4">
      <div>
        <label className="block text-xs text-ink-muted mb-1">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded border border-brass/40 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-xs text-ink-muted mb-1">Category</label>
        <input
          type="text"
          list="edit-category-options-mobile"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded border border-brass/40 px-3 py-2"
        />
        <datalist id="edit-category-options-mobile">
          {PRESET_CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div>
        <label className="block text-xs text-ink-muted mb-1">Note</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded border border-brass/40 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-xs text-ink-muted mb-1">Amount (£)</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="amount w-full rounded border border-brass/40 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-xs text-ink-muted mb-1">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "income" | "expense")}
          className="w-full rounded border border-brass/40 px-3 py-2"
        >
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 rounded bg-brass px-3 py-2 text-sm font-medium text-ink-dark disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={onCancel} className="flex-1 rounded border border-brass/40 px-3 py-2 text-sm text-ink">
          Cancel
        </button>
      </div>
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
