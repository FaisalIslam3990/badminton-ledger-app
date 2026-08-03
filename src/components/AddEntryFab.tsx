"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "./icons";
import { setPendingReceipt } from "@/lib/pendingReceipt";

// Fixed bottom-right, thumb-reachable on mobile — replaces the "+ Add
// Entry" button that used to live in the Ledger header. Sits above
// ledger content but below the receipt lightbox (z-50).
//
// Tapping it opens the native file/camera picker directly — the click
// forwards synchronously to the hidden input, which is what makes this
// reliable on iOS Safari (deferring input.click() to an effect after
// navigating instead is NOT treated as a user gesture there and can
// silently no-op). The picked file is handed to the Add Entry page via
// pendingReceipt so she isn't asked to tap "Choose file" again once
// she gets there.
export function AddEntryFab() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;
    setPendingReceipt(file);
    router.push("/add");
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />
      {/* Pill instead of a bare circle, and raised further off the
          bottom edge — a plain icon-only circle sitting right at the
          edge covered the last row while scrolling. */}
      <button
        onClick={() => inputRef.current?.click()}
        aria-label="Add entry"
        className="fixed bottom-[calc(2.5rem+env(safe-area-inset-bottom))] right-5 z-40 flex h-12 items-center gap-1.5 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink shadow-lg shadow-black/40 hover:opacity-90"
      >
        <PlusIcon className="h-4 w-4" />
        Add
      </button>
    </>
  );
}
