"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./icons";

// Shared viewer for both image and PDF receipts, so there's one place
// that owns scrim/close/swipe/scroll-lock behaviour instead of each
// file type reinventing it. Anything that isn't an image or a PDF
// (there's currently no third case — uploads only accept image/* or
// application/pdf) never reaches this component; ReceiptThumb falls
// back to a plain new-tab link for that.
export function ReceiptLightbox({
  signedUrl,
  name,
  kind,
  onClose,
}: {
  signedUrl: string;
  name: string;
  kind: "image" | "pdf";
  onClose: () => void;
}) {
  const touchStartY = useRef<number | null>(null);

  // Lock background scroll while open, and allow Escape to close —
  // closing never touches scroll position since this is an overlay,
  // not a navigation.
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

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current == null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;
    if (deltaY > 80) onClose();
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
      >
        <CloseIcon className="h-5 w-5" />
      </button>

      {kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={signedUrl}
          alt={name}
          className="max-h-full max-w-full rounded shadow-xl"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div
          className="flex h-full max-h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-card shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
            <p className="truncate text-sm text-ink-muted">{name}</p>
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-xs font-medium text-primary underline"
            >
              Open in new tab
            </a>
          </div>
          <iframe src={signedUrl} title={name} className="min-h-0 flex-1 rounded-b-lg bg-white" />
        </div>
      )}
    </div>,
    document.body,
  );
}
