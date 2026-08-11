"use client";

import { useActionState } from "react";
import { setPassword } from "./actions";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(setPassword, {
    error: null,
    success: false,
  });

  return (
    <form action={formAction} className="space-y-4">
      <input
        type="password"
        name="password"
        required
        minLength={8}
        placeholder="New password (min 8 characters)"
        className="w-full rounded-lg border border-border bg-card-alt px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <input
        type="password"
        name="confirm"
        required
        minLength={8}
        placeholder="Confirm password"
        className="w-full rounded-lg border border-border bg-card-alt px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {state.error && <p className="text-sm text-unpaid-ink">{state.error}</p>}
      {state.success && <p className="text-sm text-received-ink">Password set.</p>}
      <button
        type="submit"
        disabled={pending}
        className="pressable w-full rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary-dark disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
