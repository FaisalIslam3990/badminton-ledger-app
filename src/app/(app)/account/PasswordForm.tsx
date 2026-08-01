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
        className="w-full rounded border border-brass/40 bg-white px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-brass"
      />
      <input
        type="password"
        name="confirm"
        required
        minLength={8}
        placeholder="Confirm password"
        className="w-full rounded border border-brass/40 bg-white px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-brass"
      />
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state.success && <p className="text-sm text-income-ink">Password set.</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-brass px-4 py-2 font-medium text-ink-dark disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
