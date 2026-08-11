"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type PendingConfirm = {
  message: string;
  danger: boolean;
  confirmLabel: string;
  resolve: (ok: boolean) => void;
};

let setPending: ((p: PendingConfirm | null) => void) | null = null;

// App-wide replacement for window.confirm — an in-app dialog in the
// app's own voice and styling instead of a jarring browser-chrome
// popup. Callable from anywhere (including plain async functions, not
// just components) since it's not tied to a specific component's
// state — <ConfirmDialogHost /> just needs to be mounted once, near
// the app root.
export function confirmAsync(
  message: string,
  options?: { danger?: boolean; confirmLabel?: string },
): Promise<boolean> {
  return new Promise((resolve) => {
    if (!setPending) {
      // Host not mounted for some reason — degrade to the browser
      // confirm rather than silently proceeding unconfirmed.
      resolve(window.confirm(message));
      return;
    }
    setPending({
      message,
      danger: options?.danger ?? false,
      confirmLabel: options?.confirmLabel ?? (options?.danger ? "Delete" : "Confirm"),
      resolve,
    });
  });
}

export function ConfirmDialogHost() {
  const [pending, setPendingState] = useState<PendingConfirm | null>(null);

  useEffect(() => {
    setPending = setPendingState;
    return () => {
      setPending = null;
    };
  }, []);

  if (!pending || typeof document === "undefined") return null;

  function respond(ok: boolean) {
    pending?.resolve(ok);
    setPendingState(null);
  }

  return createPortal(
    <div
      className="scrim-enter fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
      onClick={() => respond(false)}
    >
      <div
        className="sheet-enter card w-full max-w-xs rounded-b-none p-5 text-center sm:rounded-b-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden />
        <p className="text-sm text-ink">{pending.message}</p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={() => respond(false)}
            className="pressable flex-1 rounded-lg border border-border py-2 text-sm text-ink hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={() => respond(true)}
            className={`pressable flex-1 rounded-lg py-2 text-sm font-medium ${
              pending.danger
                ? "bg-unpaid text-unpaid-ink hover:opacity-90"
                : "bg-primary text-white hover:bg-primary-dark"
            }`}
          >
            {pending.confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
