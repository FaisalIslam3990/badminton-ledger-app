"use client";

import { useActionState } from "react";
import { sendMagicLink } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(sendMagicLink, {
    error: null,
    sent: false,
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm torn-edge bg-paper-light p-8 shadow-lg">
        <h1 className="font-serif text-2xl text-ink mb-1">
          Badminton Club Ledger
        </h1>
        <p className="text-ink-muted text-sm mb-6">
          Sign in with a magic link — no password needed.
        </p>

        {state.sent ? (
          <p className="text-ink text-sm">
            Check your email for a sign-in link.
          </p>
        ) : (
          <form action={formAction} className="space-y-4">
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              className="w-full rounded border border-brass/40 bg-white px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-brass"
            />
            {state.error && (
              <p className="text-sm text-red-700">{state.error}</p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded bg-brass px-4 py-2 font-medium text-ink-dark disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
