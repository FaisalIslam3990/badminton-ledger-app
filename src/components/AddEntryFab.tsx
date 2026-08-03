import Link from "next/link";
import { PlusIcon } from "./icons";

// Fixed bottom-right, thumb-reachable on mobile — replaces the "+ Add
// Entry" button that used to live in the Ledger header. Sits above
// ledger content but below the receipt lightbox (z-50).
export function AddEntryFab() {
  return (
    <Link
      href="/add"
      aria-label="Add entry"
      className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-ink shadow-lg shadow-black/40 hover:opacity-90"
    >
      <PlusIcon className="h-6 w-6" />
    </Link>
  );
}
