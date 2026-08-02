"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Entry } from "@/lib/summary";
import type { Role } from "@/lib/roles";
import { PRESET_CATEGORIES } from "@/lib/categories";
import { todayLocalISODate, formatDateUK, formatDateTimeUK } from "@/lib/date";
import { MarkPaidControl } from "./MarkPaidControl";
import { ReceiptThumb } from "./ReceiptThumb";

type Row = Entry & { receiptSignedUrl: string | null };

type PaidFilter = "unpaid" | "all" | "paid";

function gbp(n: number) {
  return n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

function isPdfReceipt(entry: Row) {
  return (entry.receipt_file_url ?? "").toLowerCase().endsWith(".pdf");
}

// Whole-row/card tint reflecting payment status: yellow while sent and
// awaiting confirmation, green once received. `type === "income"` only
// matters for legacy rows predating the reimbursement-only model.
function statusBgClass(entry: Row) {
  if (entry.received || entry.type === "income") return "bg-income";
  if (entry.paid) return "bg-pending";
  return "";
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "unpaid" | "pending" | "received" }) {
  const toneClass = {
    unpaid: "border border-red-300 text-red-700",
    pending: "bg-pending text-pending-ink",
    received: "bg-income text-income-ink",
  }[tone];
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClass}`}>{children}</span>
  );
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
    filter === "unpaid"
      ? role === "viewer"
        ? "You're all caught up — nothing outstanding."
        : "Nothing outstanding."
      : filter === "paid"
        ? "Nothing paid yet."
        : "No entries yet.";

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
                <tr key={entry.id} className={`border-b border-brass/10 ${statusBgClass(entry)}`}>
                  <td className="px-3 py-2 whitespace-nowrap">{entry.date}</td>
                  <td className="px-3 py-2">{entry.category ?? "—"}</td>
                  <td className="px-3 py-2">{entry.note ?? "—"}</td>
                  <td className="amount px-3 py-2 text-right whitespace-nowrap">{gbp(entry.amount)}</td>
                  <td className="px-3 py-2">
                    {entry.receiptSignedUrl ? (
                      <ReceiptThumb
                        signedUrl={entry.receiptSignedUrl}
                        isPdf={isPdfReceipt(entry)}
                        name={entry.receipt_file_name ?? "Receipt"}
                        size="h-10 w-10"
                      />
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
    <div className={`p-4 ${statusBgClass(entry)}`}>
      {/* Compact header: date · category, plus the status badge so the
          state is visible without scanning the whole card. */}
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs text-ink-muted">
          {entry.date}
          {entry.category ? ` · ${entry.category}` : ""}
        </span>
        <StatusBadge entry={entry} />
      </div>

      <p className="mt-1 text-ink">{entry.note ?? "—"}</p>
      <p className="amount mt-1 text-xl font-semibold text-ink">{gbp(entry.amount)}</p>

      <div className="mt-3 flex items-center justify-between gap-3">
        {entry.receiptSignedUrl ? (
          <ReceiptThumb
            signedUrl={entry.receiptSignedUrl}
            isPdf={isPdfReceipt(entry)}
            name={entry.receipt_file_name ?? "Receipt"}
          />
        ) : (
          <span className="text-xs text-ink-muted">No receipt</span>
        )}
        <StatusActions entry={entry} role={role} onChanged={onChanged} />
      </div>

      {role === "admin" && (
        <div className="mt-3 flex gap-4 text-sm">
          <button onClick={onEdit} className="min-h-11 text-brass">
            Edit
          </button>
          <button onClick={onDelete} className="min-h-11 text-red-700">
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// Just the pill — used in the mobile card header and reused inside
// StatusCell for the desktop table.
function StatusBadge({ entry }: { entry: Row }) {
  if (entry.received) return <Badge tone="received">Received</Badge>;
  if (entry.paid) return <Badge tone="pending">Awaiting confirmation</Badge>;
  return <Badge tone="unpaid">Unpaid</Badge>;
}

// Two-step settlement, split cleanly by whose job it is: she marks a
// claim sent (date + optional reference); only he can confirm it landed.
// Once received, the row is locked — neither the UI here nor the DB
// trigger let a viewer touch it again.
function StatusActions({ entry, role, onChanged }: { entry: Row; role: Role; onChanged: () => void }) {
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
        <p className="text-xs text-ink-muted">{entry.received_at ? formatDateUK(entry.received_at) : ""}</p>
        {entry.received_marked_at && (
          <p className="text-[10px] text-ink-muted">confirmed {formatDateTimeUK(entry.received_marked_at)}</p>
        )}
        {role === "admin" && (
          <button onClick={undoReceived} className="mt-0.5 min-h-6 text-[10px] text-ink-muted underline">
            Undo
          </button>
        )}
      </div>
    );
  }

  if (entry.paid) {
    return (
      <div>
        <p className="text-xs text-ink-muted">
          {role === "viewer" ? "Paid" : "Sent"} {entry.paid_at ? `on ${formatDateUK(entry.paid_at)}` : ""}
          {role === "viewer" && " — awaiting confirmation"}
        </p>
        {role === "admin" && entry.payment_reference && (
          <p className="text-[10px] text-ink-muted">Ref: {entry.payment_reference}</p>
        )}
        {entry.paid_marked_at && (
          <p className="mb-1 text-[10px] text-ink-muted">marked {formatDateTimeUK(entry.paid_marked_at)}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-3">
          {role === "admin" && (
            <button
              onClick={confirmReceived}
              className="min-h-9 rounded border border-brass/40 px-2 py-1 text-xs text-ink hover:bg-white"
            >
              Confirm Received
            </button>
          )}
          <button onClick={undoSent} className="min-h-6 text-xs text-brass underline">
            Undo
          </button>
        </div>
      </div>
    );
  }

  if (role === "viewer") {
    return <MarkPaidControl label="Mark Paid" onConfirm={markSent} />;
  }

  return null;
}

// Desktop table cell: badge + actions stacked together (there's no
// separate compact header line to split them across, unlike the card).
function StatusCell({ entry, role, onChanged }: { entry: Row; role: Role; onChanged: () => void }) {
  return (
    <div className="space-y-1">
      <StatusBadge entry={entry} />
      <StatusActions entry={entry} role={role} onChanged={onChanged} />
    </div>
  );
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
  const [category, setCategory] = useState(entry.category ?? "");
  const [note, setNote] = useState(entry.note ?? "");
  const [amount, setAmount] = useState(String(entry.amount));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, category, note, amount: Number(amount) }),
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
  const [category, setCategory] = useState(entry.category ?? "");
  const [note, setNote] = useState(entry.note ?? "");
  const [amount, setAmount] = useState(String(entry.amount));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, category, note, amount: Number(amount) }),
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
      <td className="px-3 py-2"></td>
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
