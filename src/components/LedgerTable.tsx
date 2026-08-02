"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Entry } from "@/lib/summary";
import type { Role } from "@/lib/roles";
import { PRESET_CATEGORIES, categoryBadge } from "@/lib/categories";
import { todayLocalISODate, formatDateUK, formatDateTimeUK } from "@/lib/date";
import { MarkPaidControl } from "./MarkPaidControl";
import { ReceiptThumb } from "./ReceiptThumb";
import { PencilIcon, TrashIcon } from "./icons";

type Row = Entry & { receiptSignedUrl: string | null };

type PaidFilter = "unpaid" | "awaiting" | "received" | "all";

const FILTER_LABELS: Record<PaidFilter, string> = {
  unpaid: "Unpaid",
  awaiting: "Awaiting",
  received: "Received",
  all: "All",
};

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
  if (entry.received || entry.type === "income") return "bg-received/40";
  if (entry.paid) return "bg-pending/50";
  return "";
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "unpaid" | "pending" | "received" }) {
  const toneClass = {
    unpaid: "bg-unpaid text-unpaid-ink",
    pending: "bg-pending text-pending-ink",
    received: "bg-received text-received-ink",
  }[tone];
  const dot = { unpaid: "●", pending: "◐", received: "✓" }[tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClass}`}>
      <span aria-hidden>{dot}</span>
      {children}
    </span>
  );
}

function CategoryTag({ category }: { category: string | null }) {
  const badge = categoryBadge(category);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
        style={{ backgroundColor: badge.bg, color: badge.text }}
      >
        {badge.letter}
      </span>
      <span className="truncate">{category ?? "—"}</span>
    </span>
  );
}

function IconButton({
  onClick,
  variant,
  label,
  children,
  size = "h-8 w-8",
}: {
  onClick: () => void;
  variant: "edit" | "delete";
  label: string;
  children: React.ReactNode;
  size?: string;
}) {
  const variantClass =
    variant === "delete"
      ? "border-border text-ink-muted hover:border-unpaid-ink/50 hover:bg-unpaid hover:text-unpaid-ink"
      : "border-border text-ink-muted hover:bg-white/5 hover:text-ink";
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex ${size} items-center justify-center rounded-md border ${variantClass}`}
    >
      {children}
    </button>
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
    if (filter === "awaiting") return e.paid && !e.received;
    if (filter === "received") return e.received;
    return true;
  });

  // Every filter except All narrows to a single implied status —
  // repeating that badge on each row is just noise.
  const showBadge = filter === "all";

  // Admin's Status column has nothing to show under Unpaid — no badge
  // (redundant) and no action (that's the viewer's job) — so drop the
  // column entirely rather than render dead space. Once she marks one
  // paid it moves to the Awaiting tab automatically, where Status carries
  // the Confirm Received action.
  const showStatusColumn = !(role === "admin" && filter === "unpaid");
  const columnCount = 5 + (showStatusColumn ? 1 : 0) + (role === "admin" ? 1 : 0);

  async function deleteEntry(id: string) {
    if (!confirm("Delete this entry? This can't be undone.")) return;
    await fetch(`/api/entries/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const emptyState =
    filter === "unpaid" && role === "viewer"
      ? { emoji: "✅", text: "You're all caught up — nothing outstanding." }
      : filter === "unpaid"
        ? { emoji: "📭", text: "Nothing outstanding." }
        : filter === "awaiting"
          ? { emoji: "📭", text: "Nothing awaiting confirmation." }
          : filter === "received"
            ? { emoji: "📭", text: "Nothing received yet." }
            : { emoji: "📭", text: "No entries yet." };

  const filterCounts = {
    unpaid: entries.filter((e) => !e.paid).length,
    awaiting: entries.filter((e) => e.paid && !e.received).length,
    received: entries.filter((e) => e.received).length,
    all: entries.length,
  };

  return (
    <div className="card">
      <div className="flex flex-wrap gap-2 border-b border-border p-4">
        {(["unpaid", "awaiting", "received", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-xs font-medium ${
              filter === f
                ? "bg-primary text-white"
                : "border border-border text-ink-muted hover:bg-white/5"
            }`}
          >
            {FILTER_LABELS[f]} ({filterCounts[f]})
          </button>
        ))}
      </div>

      {/* Mobile: stacked cards. A table crammed into a phone width just
          forces horizontal scrolling and unreadable cells. */}
      <div className="sm:hidden divide-y divide-border">
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
              showBadge={showBadge}
              onEdit={() => setEditingId(entry.id)}
              onDelete={() => deleteEntry(entry.id)}
              onChanged={() => router.refresh()}
            />
          ),
        )}
        {visibleEntries.length === 0 && (
          <div className="px-4 py-10 text-center text-ink-muted">
            <p className="mb-1 text-3xl">{emptyState.emoji}</p>
            <p>{emptyState.text}</p>
          </div>
        )}
      </div>

      {/* Desktop / tablet: table. */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Note</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Receipt</th>
              {showStatusColumn && <th className="px-4 py-3 font-medium">Status</th>}
              {role === "admin" && <th className="px-4 py-3 text-right font-medium">Actions</th>}
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
                <tr key={entry.id} className={`border-b border-border ${statusBgClass(entry)}`}>
                  <td className="whitespace-nowrap px-4 py-4 text-ink">{entry.date}</td>
                  <td className="px-4 py-4 text-ink">
                    <CategoryTag category={entry.category} />
                  </td>
                  <td className="px-4 py-4 text-ink-muted">{entry.note ?? "—"}</td>
                  <td className="amount px-4 py-4 text-right text-ink">{gbp(entry.amount)}</td>
                  <td className="px-4 py-4">
                    {entry.receiptSignedUrl ? (
                      <ReceiptThumb
                        signedUrl={entry.receiptSignedUrl}
                        isPdf={isPdfReceipt(entry)}
                        name={entry.receipt_file_name ?? "Receipt"}
                        size="h-10 w-10"
                      />
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </td>
                  {showStatusColumn && (
                    <td className="px-4 py-4">
                      <StatusCell
                        entry={entry}
                        role={role}
                        showBadge={showBadge}
                        onChanged={() => router.refresh()}
                      />
                    </td>
                  )}
                  {role === "admin" && (
                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <IconButton onClick={() => setEditingId(entry.id)} variant="edit" label="Edit">
                          <PencilIcon className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton onClick={() => deleteEntry(entry.id)} variant="delete" label="Delete">
                          <TrashIcon className="h-3.5 w-3.5" />
                        </IconButton>
                      </div>
                    </td>
                  )}
                </tr>
              ),
            )}
            {visibleEntries.length === 0 && (
              <tr>
                <td colSpan={columnCount} className="px-4 py-10 text-center text-ink-muted">
                  <p className="mb-1 text-3xl">{emptyState.emoji}</p>
                  <p>{emptyState.text}</p>
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
  showBadge,
  onEdit,
  onDelete,
  onChanged,
}: {
  entry: Row;
  role: Role;
  showBadge: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onChanged: () => void;
}) {
  return (
    <div className={`p-5 ${statusBgClass(entry)}`}>
      {/* Compact header: date · category, plus the status badge so the
          state is visible without scanning the whole card. */}
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-ink-muted">
          {entry.date} · <CategoryTag category={entry.category} />
        </span>
        <StatusBadge entry={entry} showBadge={showBadge} />
      </div>

      <p className="mt-2 text-ink">{entry.note ?? "—"}</p>
      <p className="amount mt-1 text-xl text-ink">{gbp(entry.amount)}</p>

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
        <div className="mt-3 flex gap-2">
          <IconButton onClick={onEdit} variant="edit" label="Edit" size="h-11 w-11">
            <PencilIcon className="h-4 w-4" />
          </IconButton>
          <IconButton onClick={onDelete} variant="delete" label="Delete" size="h-11 w-11">
            <TrashIcon className="h-4 w-4" />
          </IconButton>
        </div>
      )}
    </div>
  );
}

// Just the pill — used in the mobile card header and reused inside
// StatusCell for the desktop table.
function StatusBadge({ entry, showBadge }: { entry: Row; showBadge: boolean }) {
  if (entry.received) return <Badge tone="received">Received</Badge>;
  if (entry.paid) return <Badge tone="pending">Awaiting confirmation</Badge>;
  if (!showBadge) return null;
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
              className="min-h-9 rounded-lg border border-border px-2 py-1 text-xs text-ink hover:bg-white/5"
            >
              Confirm Received
            </button>
          )}
          <button onClick={undoSent} className="min-h-6 text-xs text-primary underline">
            Undo
          </button>
        </div>
      </div>
    );
  }

  if (role === "viewer") {
    return (
      <MarkPaidControl
        label="Mark Paid"
        buttonClassName="min-h-11 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary-dark"
        onConfirm={markSent}
      />
    );
  }

  return null;
}

// Desktop table cell: badge + actions stacked together (there's no
// separate compact header line to split them across, unlike the card).
function StatusCell({
  entry,
  role,
  showBadge,
  onChanged,
}: {
  entry: Row;
  role: Role;
  showBadge: boolean;
  onChanged: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <StatusBadge entry={entry} showBadge={showBadge} />
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
    <div className="space-y-3 bg-bg p-4">
      <div>
        <label className="block text-xs text-ink-muted mb-1">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-lg border border-border bg-card-alt px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-xs text-ink-muted mb-1">Category</label>
        <input
          type="text"
          list="edit-category-options-mobile"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-border bg-card-alt px-3 py-2"
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
          className="w-full rounded-lg border border-border bg-card-alt px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-xs text-ink-muted mb-1">Amount (£)</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="amount w-full rounded-lg border border-border bg-card-alt px-3 py-2"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={onCancel} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-ink">
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
    <tr className="border-b border-border bg-bg">
      <td className="px-4 py-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-lg border border-border bg-card-alt px-2 py-1"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          list="edit-category-options"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-border bg-card-alt px-2 py-1"
        />
        <datalist id="edit-category-options">
          {PRESET_CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-lg border border-border bg-card-alt px-2 py-1"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="amount w-full rounded-lg border border-border bg-card-alt px-2 py-1 text-right"
        />
      </td>
      <td className="px-4 py-3"></td>
      <td className="px-4 py-3"></td>
      <td className="whitespace-nowrap px-4 py-3 text-right">
        <button onClick={save} disabled={saving} className="mr-3 text-primary hover:underline">
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={onCancel} className="text-ink-muted hover:underline">
          Cancel
        </button>
      </td>
    </tr>
  );
}
