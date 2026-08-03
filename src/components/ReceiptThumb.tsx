"use client";

import { useState } from "react";
import { ReceiptLightbox } from "./ReceiptLightbox";
import { FileIcon } from "./icons";

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
        className={`flex ${size} items-center justify-center rounded border border-border bg-card-alt text-ink-muted hover:text-ink`}
      >
        <FileIcon className="h-5 w-5" />
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
          className={`${size} rounded border border-border object-cover`}
        />
      </button>
      {open && <ReceiptLightbox signedUrl={signedUrl} name={name} onClose={() => setOpen(false)} />}
    </>
  );
}
