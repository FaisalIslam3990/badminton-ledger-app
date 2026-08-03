"use client";

import { useState } from "react";
import { ReceiptLightbox } from "./ReceiptLightbox";
import { FileIcon } from "./icons";

// Real image preview for photo/scan receipts; PDFs get a compact file
// icon. Both open the same in-page lightbox on tap (see
// ReceiptLightbox) rather than navigating anywhere.
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
      <>
        <button
          onClick={() => setOpen(true)}
          title={name}
          className={`flex ${size} items-center justify-center rounded border border-border bg-card-alt text-ink-muted hover:text-ink`}
        >
          <FileIcon className="h-5 w-5" />
        </button>
        {open && <ReceiptLightbox signedUrl={signedUrl} name={name} kind="pdf" onClose={() => setOpen(false)} />}
      </>
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
      {open && <ReceiptLightbox signedUrl={signedUrl} name={name} kind="image" onClose={() => setOpen(false)} />}
    </>
  );
}
