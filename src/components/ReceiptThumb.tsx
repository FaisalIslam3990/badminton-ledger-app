"use client";

import { useState } from "react";
import { ReceiptLightbox } from "./ReceiptLightbox";
import { FileIcon, ImageIcon } from "./icons";

// Real image preview for photo/scan receipts, opening in the in-page
// lightbox. PDFs go straight to a new tab in one tap — mobile browsers
// don't reliably render a PDF inside an iframe (often just a blank
// pane), so wrapping it in a modal only added a wasted extra tap to
// "open in new tab" anyway.
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
        className={`pressable relative flex ${size} shrink-0 items-center justify-center rounded-lg border border-border bg-card-alt text-ink-muted shadow-sm hover:text-ink`}
      >
        <FileIcon className="h-1/2 w-1/2" />
        <span className="absolute -bottom-1 -right-1 rounded-md bg-unpaid px-1 py-px text-[9px] font-bold leading-none tracking-wide text-unpaid-ink shadow-sm">
          PDF
        </span>
      </a>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)} title={name} className="pressable relative shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={signedUrl}
          alt={name}
          className={`${size} rounded-lg border border-border object-cover shadow-sm`}
        />
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-md border border-border bg-card-alt text-ink-muted shadow-sm">
          <ImageIcon className="h-2.5 w-2.5" />
        </span>
      </button>
      {open && <ReceiptLightbox signedUrl={signedUrl} name={name} onClose={() => setOpen(false)} />}
    </>
  );
}
