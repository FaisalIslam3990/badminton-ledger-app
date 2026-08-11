"use client";

import { useState } from "react";
import { InfoIcon } from "@/components/icons";

export function GrantBreakdownToggle({ breakdown }: { breakdown: string }) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="pressable mt-3 block border-t border-white/15 pt-2 text-left text-[11px] text-white/60"
      >
        {breakdown}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="pressable mt-3 flex items-center gap-1.5 text-[11px] text-white/60 hover:text-white/80"
    >
      <InfoIcon className="h-3.5 w-3.5" />
      tap for grant breakdown
    </button>
  );
}
