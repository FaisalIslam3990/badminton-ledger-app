"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

export function RemainingAmount({ amount, negative }: { amount: string; negative: boolean }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="mt-1 flex items-center gap-2">
      <p className={`amount text-4xl ${negative ? "text-red-200" : ""}`}>
        {visible ? amount : "••••••"}
      </p>
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide amount" : "Show amount"}
        className="shrink-0 rounded-full p-1.5 text-white/60 hover:text-white/90"
      >
        {visible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
      </button>
    </div>
  );
}
