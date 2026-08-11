"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import type { Entry } from "@/lib/summary";
import type { Role } from "@/lib/roles";
import { PRESET_CATEGORIES } from "@/lib/categories";
import { todayLocalISODate, formatDateUK, formatDateTimeUK } from "@/lib/date";
import { MarkPaidControl } from "./MarkPaidControl";
import { ReceiptThumb } from "./ReceiptThumb";
import { ExportCsvButton } from "./ExportCsvButton";
import { confirmAsync } from "./ConfirmDialog";
import { CloseIcon, DotsIcon, FileIcon, PencilIcon, TrashIcon, UndoIcon } from "./icons";

type Row = Entry & { receiptSignedUrl: string | null };

type PaidFilter = "unpaid" | "paid" | "awaiting" | "received" | "all";

const FILTER_LABELS: Record<PaidFilter, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  awaiting: "Awaiting",
  received: "Received",
  all: "All",
};

// Viewer's job stops at sending payment, so Awaiting vs Received is an
// admin-only distinction (it's what she needs to confirm next) — viewer
// just gets Unpaid/Paid/All.
const VIEWER_TABS: PaidFilter[] = ["unpaid", "paid", "all"];
const ADMIN_TABS: PaidFilter[] = ["unpaid", "awaiting", "received", "all"];

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

// No truncation: category is free text (the presets alone include
// "Public Liability Insurance"), and cutting it mid-word read as a
// bug. Wrapping onto a second line is the honest trade-off.
function CategoryTag({ category }: { category: string | null }) {
  return (
    <span className="inline-flex max-w-[11rem] items-start sm:max-w-[13rem]">
      <span className="font-medium leading-snug text-ink">{category ?? "—"}</span>
    </span>
  );
}

// Shared by StatusActions and the row menu's admin-only Undo item, so
// there's one place that knows how to patch an entry's payment state.
function entryActions(entry: Row, onChanged: () => void) {
  async function patch(body: Record<string, unknown>) {
    await fetch(`/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    onChanged();
  }

  return {
    async markSent(paidAt: string, reference: string) {
      await patch({ paid: true, paid_at: paidAt, payment_reference: reference || null });
    },
    async undoSent() {
      const ok = await confirmAsync("Undo this payment? This clears the payment date/reference.", {
        confirmLabel: "Undo Payment",
      });
      if (!ok) return;
      await patch({ paid: false, paid_at: null, payment_reference: null });
    },
    async confirmReceived() {
      await patch({ received: true, received_at: todayLocalISODate() });
    },
    async undoReceived() {
      const ok = await confirmAsync("Undo confirming this as received?", { confirmLabel: "Undo Received" });
      if (!ok) return;
      await patch({ received: false, received_at: null });
    },
  };
}

// Anchored, portal-rendered so it's never clipped by the table's
// `overflow-x-auto` ancestor (same problem the receipt lightbox and
// Mark Paid modal solve with a portal). Replaces the always-visible
// Edit/Delete icon pair with a single tap target per row. `undo` is
// optional and admin-only — it's the same Undo action that used to sit
// inline next to the payment status, now folded in here so it's not a
// second red-ish action competing with Delete for attention.
const ROW_MENU_WIDTH = 192; // px, matches w-48 — wide enough that "Undo Payment"/"Undo Received" never wrap

function RowMenu({
  onEdit,
  onDelete,
  undo,
}: {
  onEdit: () => void;
  onDelete: () => void;
  undo?: { label: string; onClick: () => void };
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; origin: string } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function openMenu() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      // Anchor to the button's left edge, but clamp so the menu never
      // runs off the right edge of the viewport — the button can be on
      // either side of a row (left on mobile cards, right in the
      // desktop table), so a fixed `right` or `left` offset alone isn't
      // safe for both. clientWidth (not window.innerWidth, which
      // includes the scrollbar's own width) is the actual visible
      // content area — using innerWidth left the menu's last ~15px
      // rendering underneath a classic (non-overlay) scrollbar.
      const viewportWidth = document.documentElement.clientWidth;
      const left = Math.min(rect.left, viewportWidth - ROW_MENU_WIDTH - 8);

      // The menu always opened downward from the button with no check
      // for whether it actually fits before the bottom of the screen —
      // for a row near the bottom of the visible viewport, that cut
      // "Delete" off. Flip to open upward when there isn't room below.
      const itemCount = 2 + (undo ? 1 : 0);
      const estimatedHeight = itemCount * 40 + 8;
      const viewportHeight = window.innerHeight;
      const fitsBelow = rect.bottom + 4 + estimatedHeight <= viewportHeight - 8;
      const top = fitsBelow ? rect.bottom + 4 : Math.max(rect.top - estimatedHeight - 4, 8);

      // Scale in from whichever corner is actually next to the button,
      // so the menu visually originates from what triggered it instead
      // of just appearing at a fixed point.
      const origin = `${fitsBelow ? "top" : "bottom"} left`;

      setCoords({ top, left: Math.max(left, 8), origin });
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function close() {
      setOpen(false);
    }
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={openMenu}
        aria-label="Row actions"
        className="pressable flex h-9 w-9 items-center justify-center rounded-md border border-border text-ink-muted hover:bg-white/5 hover:text-ink"
      >
        <DotsIcon className="h-4 w-4" />
      </button>
      {open &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              className="card card-floating dropdown-enter fixed z-40 w-48 p-1 text-sm"
              style={{ top: coords.top, left: coords.left, transformOrigin: coords.origin }}
            >
              {undo && (
                <button
                  onClick={() => {
                    setOpen(false);
                    undo.onClick();
                  }}
                  className="pressable flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-2 py-2 text-left text-pending-ink hover:bg-pending"
                >
                  <UndoIcon className="h-3.5 w-3.5" /> {undo.label}
                </button>
              )}
              <button
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
                className="pressable flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-2 py-2 text-left text-ink hover:bg-white/5"
              >
                <PencilIcon className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
                className="pressable flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-2 py-2 text-left text-unpaid-ink hover:bg-unpaid"
              >
                <TrashIcon className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

// Wraps RowMenu with the admin-only Undo item computed from the entry's
// current state, so neither call site (mobile card, desktop row) has to
// duplicate that logic.
function AdminRowMenu({
  entry,
  onEdit,
  onDelete,
  onChanged,
}: {
  entry: Row;
  onEdit: () => void;
  onDelete: () => void;
  onChanged: () => void;
}) {
  const { undoSent, undoReceived } = entryActions(entry, onChanged);
  const undo = entry.received
    ? { label: "Undo Received", onClick: undoReceived }
    : entry.paid
      ? { label: "Undo Payment", onClick: undoSent }
      : undefined;
  return <RowMenu onEdit={onEdit} onDelete={onDelete} undo={undo} />;
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
    const ok = await confirmAsync("Delete this entry? This can't be undone.", { danger: true });
    if (!ok) return;
    await fetch(`/api/entries/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const emptyState =
    filter === "unpaid" && role === "viewer"
      ? { emoji: "✅", text: "You're all caught up — nothing outstanding." }
      : filter === "unpaid"
        ? { emoji: "📭", text: "Nothing outstanding." }
        : filter === "paid"
          ? { emoji: "📭", text: "Nothing paid yet." }
          : filter === "awaiting"
            ? { emoji: "📭", text: "Nothing awaiting confirmation." }
            : filter === "received"
              ? { emoji: "📭", text: "Nothing received yet." }
              : { emoji: "📭", text: "No entries yet." };

  const filterCounts = {
    unpaid: entries.filter((e) => !e.paid).length,
    paid: entries.filter((e) => e.paid).length,
    awaiting: entries.filter((e) => e.paid && !e.received).length,
    received: entries.filter((e) => e.received).length,
    all: entries.length,
  };

  const tabs = role === "viewer" ? VIEWER_TABS : ADMIN_TABS;

  return (
    <div className="card">
      {/* Title, export, and filters pinned together below the app
          header while the entry list scrolls underneath. */}
      {/* rounded-t-2xl (16px) matches .card's own border-radius exactly —
          rounded-t-xl (12px) was slightly smaller, leaving a notch where
          the two arcs didn't line up at each top corner. */}
      <div className="sticky top-16 z-20 rounded-t-2xl border-b border-border bg-card/70 backdrop-blur-lg">
        <div className="flex items-center justify-between gap-3 px-4 pt-4">
          <h2 className="text-lg font-semibold text-ink">Ledger</h2>
          <ExportCsvButton />
        </div>
        <div className="scrollbar-hide flex gap-2 overflow-x-auto px-4 py-4">
          {tabs.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`pressable shrink-0 rounded-full px-4 py-2 text-xs font-medium ${
                filter === f
                  ? "bg-primary text-white"
                  : "border border-border text-ink-muted hover:bg-white/5"
              }`}
            >
              {FILTER_LABELS[f]} ({filterCounts[f]})
            </button>
          ))}
        </div>
      </div>

      {/* Mobile: stacked cards. A table crammed into a phone width just
          forces horizontal scrolling and unreadable cells. */}
      {/* overflow-hidden + rounded-b-2xl clip the last card's status
          tint to the outer .card's bottom corners — this is a sibling
          of the sticky sub-header above, not its ancestor, so it can't
          reintroduce the sticky-positioning bug that overflow:hidden on
          .card itself caused. */}
      <div className="sm:hidden divide-y divide-border overflow-hidden rounded-b-2xl">
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
              filter={filter}
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
      <div className="hidden sm:block overflow-x-auto rounded-b-2xl">
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
                  <td className="whitespace-nowrap px-4 py-4 font-medium text-ink">{entry.date}</td>
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
                        filter={filter}
                        showBadge={showBadge}
                        onChanged={() => router.refresh()}
                      />
                    </td>
                  )}
                  {role === "admin" && (
                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      <div className="flex justify-end">
                        <AdminRowMenu
                          entry={entry}
                          onEdit={() => setEditingId(entry.id)}
                          onDelete={() => deleteEntry(entry.id)}
                          onChanged={() => router.refresh()}
                        />
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
  filter,
  showBadge,
  onEdit,
  onDelete,
  onChanged,
}: {
  entry: Row;
  role: Role;
  filter: PaidFilter;
  showBadge: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onChanged: () => void;
}) {
  // Under Unpaid, an unpaid entry has nothing else in the trailing
  // column (no badge — it's implied by the filter — and viewers have no
  // row menu), so that column was sitting empty while Mark Paid took a
  // whole extra row below. Move it up there instead of leaving it below.
  const showInlineMarkPaid = role === "viewer" && filter === "unpaid" && !entry.paid && !entry.received;
  const { markSent } = entryActions(entry, onChanged);
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <div className={`p-3 ${statusBgClass(entry)}`}>
      {/* Leading thumbnail + a two-line text column reads leaner on a
          phone than stacking everything vertically — the receipt icon
          doubles as a visual anchor so the eye doesn't have to parse a
          wall of stacked lines per row. The status badge + row menu sit
          in their own trailing column, top-aligned so they read next to
          the note (the busiest line) rather than the date. Sizes here
          are deliberately small (11-width thumb, text-sm note) — every
          extra pixel given to the side columns is a pixel taken from the
          note, which is the one field long enough to actually wrap. */}
      <div className="flex items-start gap-2.5">
        {entry.receiptSignedUrl ? (
          <ReceiptThumb
            signedUrl={entry.receiptSignedUrl}
            isPdf={isPdfReceipt(entry)}
            name={entry.receipt_file_name ?? "Receipt"}
            size="h-11 w-11"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-border bg-card-alt text-ink-muted/50">
            <FileIcon className="h-4 w-4" />
          </div>
        )}

        {/* Note is single-line + ellipsis, not wrapped — the full text
            (plus vendor, payment history, and everything else) is one
            tap away in the detail sheet instead of forcing every card
            to grow to fit its longest field. */}
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          className="pressable min-w-0 flex-1 text-left"
        >
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-ink-muted">
            {entry.date} · <CategoryTag category={entry.category} />
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-ink">{entry.note ?? "—"}</p>
          <p className="amount mt-0.5 text-base text-ink">{gbp(entry.amount)}</p>
        </button>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {showInlineMarkPaid ? (
            <MarkPaidControl
              label="Mark Paid"
              buttonClassName="min-h-9 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark"
              onConfirm={markSent}
            />
          ) : (
            <>
              <StatusBadge entry={entry} showBadge={showBadge} />
              {role === "admin" && (
                <AdminRowMenu entry={entry} onEdit={onEdit} onDelete={onDelete} onChanged={onChanged} />
              )}
            </>
          )}
        </div>
      </div>

      {!showInlineMarkPaid && (
        <div className="mt-2 pl-[54px]">
          <StatusActions entry={entry} role={role} filter={filter} onChanged={onChanged} />
        </div>
      )}

      {detailOpen && (
        <EntryDetailSheet
          entry={entry}
          role={role}
          filter={filter}
          onClose={() => setDetailOpen(false)}
          onEdit={onEdit}
          onDelete={onDelete}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}

// Everything the compact card leaves out — full note, vendor, a bigger
// receipt preview, and the complete payment history — one tap away
// instead of forced onto the card itself. Slides up from the edge it
// closes back to (spatial consistency), over a translucent scrim
// rather than a flat one (materials) so it reads as a layer above the
// list, not a page swap.
function EntryDetailSheet({
  entry,
  role,
  filter,
  onClose,
  onEdit,
  onDelete,
  onChanged,
}: {
  entry: Row;
  role: Role;
  filter: PaidFilter;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onChanged: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; startTime: number } | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  // Drag lives on the handle only (not the whole sheet) so it never
  // fights with scrolling the content or tapping a button inside. The
  // sheet tracks the pointer 1:1 the whole way — checking only the
  // total distance on release (the old approach) gave no feedback
  // during the gesture, which read as broken even when it "worked".
  function onHandlePointerDown(e: React.PointerEvent) {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, startTime: performance.now() };
    if (sheetRef.current) sheetRef.current.style.transition = "none";
  }

  function onHandlePointerMove(e: React.PointerEvent) {
    if (!drag.current || !sheetRef.current) return;
    const deltaY = Math.max(0, e.clientY - drag.current.startY);
    sheetRef.current.style.transform = `translateY(${deltaY}px)`;
  }

  function onHandlePointerUp(e: React.PointerEvent) {
    if (!drag.current || !sheetRef.current) return;
    const deltaY = Math.max(0, e.clientY - drag.current.startY);
    const elapsed = Math.max(1, performance.now() - drag.current.startTime);
    const velocity = deltaY / elapsed; // px/ms
    drag.current = null;
    sheetRef.current.style.transition = "";

    // Either a deliberate drag past the threshold, or a quick flick
    // that hadn't traveled far yet — both should dismiss.
    if (deltaY > 120 || velocity > 0.5) {
      onClose();
      return;
    }
    sheetRef.current.classList.add("sheet-snapback");
    sheetRef.current.style.transform = "";
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="scrim-enter fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        className="sheet-enter card w-full max-w-md rounded-b-none p-5 sm:rounded-b-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          className="touch-none sm:hidden -mt-1 mb-2 flex justify-center py-2"
        >
          <div className="h-1 w-10 rounded-full bg-border" aria-hidden />
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-ink-muted">
              {entry.date} · <CategoryTag category={entry.category} />
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="pressable flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-white/5 hover:text-ink"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <p className="amount mt-3 text-3xl tracking-tight text-ink">{gbp(entry.amount)}</p>

        <div className="mt-4 space-y-4 border-t border-border pt-4 text-sm">
          {entry.vendor && (
            <div>
              <p className="text-xs text-ink-muted">Vendor</p>
              <p className="mt-0.5 text-ink">{entry.vendor}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-ink-muted">Note</p>
            <p className="mt-0.5 text-ink">{entry.note || "—"}</p>
          </div>
          <div>
            <p className="mb-1.5 text-xs text-ink-muted">Receipt</p>
            {entry.receiptSignedUrl ? (
              <div className="inline-flex rounded-xl border border-border bg-card-alt p-2">
                <ReceiptThumb
                  signedUrl={entry.receiptSignedUrl}
                  isPdf={isPdfReceipt(entry)}
                  name={entry.receipt_file_name ?? "Receipt"}
                  size="h-28 w-28"
                />
              </div>
            ) : (
              <p className="text-ink-muted">No receipt attached</p>
            )}
          </div>
          <div>
            <p className="mb-1.5 text-xs text-ink-muted">Status</p>
            <StatusBadge entry={entry} showBadge />
            <div className="mt-2">
              <StatusActions entry={entry} role={role} filter={filter} onChanged={onChanged} />
            </div>
          </div>
        </div>

        {role === "admin" && (
          <div className="mt-5 flex gap-2 border-t border-border pt-4">
            <button
              onClick={() => {
                onClose();
                onEdit();
              }}
              className="pressable flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-sm text-ink hover:bg-white/5"
            >
              <PencilIcon className="h-3.5 w-3.5" /> Edit
            </button>
            <button
              onClick={() => {
                onClose();
                onDelete();
              }}
              className="pressable flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-sm text-unpaid-ink hover:bg-unpaid"
            >
              <TrashIcon className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
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
function StatusActions({
  entry,
  role,
  filter,
  onChanged,
}: {
  entry: Row;
  role: Role;
  filter: PaidFilter;
  onChanged: () => void;
}) {
  const { markSent, undoSent, confirmReceived } = entryActions(entry, onChanged);

  if (entry.received) {
    // Admin's Undo for this state lives in the row menu (see
    // AdminRowMenu) instead of inline here — viewer never reaches this
    // branch's undo since only admin can confirm Received in the first
    // place, and she has no row menu to put an inline one next to.
    return (
      <div>
        <p className="text-xs text-ink-muted">{entry.received_at ? formatDateUK(entry.received_at) : ""}</p>
        {entry.received_marked_at && (
          <p className="text-[10px] text-ink-muted">confirmed {formatDateTimeUK(entry.received_marked_at)}</p>
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
          {/* Admin's Undo for this state lives in the row menu instead
              (see AdminRowMenu) — viewer has no row menu, so hers stays
              inline. */}
          {role === "viewer" && (
            <button onClick={undoSent} className="flex min-h-6 items-center gap-1 text-xs font-medium text-unpaid-ink hover:underline">
              <UndoIcon className="h-3.5 w-3.5" /> Undo
            </button>
          )}
        </div>
      </div>
    );
  }

  // Only under Unpaid — under All, the same button is one tab away and
  // just clutters a view that's meant to be a full read of everything.
  if (role === "viewer" && filter === "unpaid") {
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
  filter,
  showBadge,
  onChanged,
}: {
  entry: Row;
  role: Role;
  filter: PaidFilter;
  showBadge: boolean;
  onChanged: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <StatusBadge entry={entry} showBadge={showBadge} />
      <StatusActions entry={entry} role={role} filter={filter} onChanged={onChanged} />
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
