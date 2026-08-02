"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

// Real image preview for photo/scan receipts (tap to expand full-size,
// via a portal so it's never clipped by an ancestor's layout — same
// fix as the Mark Paid modal needed). True PDFs get a distinct icon
// and just open in a new tab, since there's nothing to usefully
// thumbnail.
export function ReceiptThumb({
  signedUrl,
  isPdf,
  name,
  size = "h-11 w-11",
}: {
  signedUrl: string;
  isPdf: boolean;
  name: string;
  size?: string;
}) {
  const [open, setOpen] = useState(false);

  if (isPdf) {
    return (
      <a
        href={signedUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={name}
        className={`flex ${size} items-center justify-center rounded border border-brass/30 bg-white text-[10px] font-medium text-ink-muted`}
      >
        PDF
      </a>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)} title={name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={signedUrl}
          alt={name}
          className={`${size} rounded border border-brass/30 object-cover`}
        />
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setOpen(false)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={signedUrl}
              alt={name}
              className="max-h-full max-w-full rounded shadow-xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
