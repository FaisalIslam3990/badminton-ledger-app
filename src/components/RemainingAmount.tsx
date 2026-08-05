"use client";

import { EyeIcon, EyeOffIcon } from "@/components/icons";

export function RemainingAmount({
  amount,
  negative,
  visible,
  onToggle,
}: {
  amount: string;
  negative: boolean;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="mt-1 flex items-center gap-2">
      <p className={`amount inline-block w-[10ch] whitespace-nowrap text-4xl ${negative ? "text-red-200" : ""}`}>
        {visible ? amount : "••••••"}
      </p>
      <button
        type="button"
        onClick={onToggle}
        aria-label={visible ? "Hide amounts" : "Show amounts"}
        className="shrink-0 rounded-full p-1.5 text-white/60 hover:text-white/90"
      >
        {visible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
      </button>
    </div>
  );
}
