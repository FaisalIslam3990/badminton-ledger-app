"use client";

import { useActionState, useState } from "react";
import { sendMagicLink, signInWithPassword } from "./actions";

export default function LoginPage() {
  const [mode, setMode] = useState<"magic" | "password">("password");

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="card w-full max-w-sm p-8">
        <h1 className="mb-1 text-2xl font-bold text-ink">Badminton Club</h1>
        <p className="mb-4 text-sm text-ink-muted">
          {mode === "magic"
            ? "Sign in with a magic link — no password needed."
            : "Sign in with your username (or email) and password."}
        </p>

        {mode === "magic" ? <MagicLinkForm /> : <PasswordForm />}

        <button
          type="button"
          onClick={() => setMode(mode === "magic" ? "password" : "magic")}
          className="mt-4 text-xs text-ink-muted underline hover:text-ink"
        >
          {mode === "magic" ? "Use a password instead" : "Use a magic link instead"}
        </button>
      </div>
    </main>
  );
}

function MagicLinkForm() {
  const [state, formAction, pending] = useActionState(sendMagicLink, {
    error: null,
    sent: false,
  });

  if (state.sent) {
    return <p className="text-sm text-ink">Check your email for a sign-in link.</p>;
  }

  return (
    <form action={formAction} className="space-y-4">
      <input
        type="email"
        name="email"
        required
        placeholder="you@example.com"
        className="w-full rounded-lg border border-border bg-card-alt px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {state.error && <p className="text-sm text-unpaid-ink">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-primary px-4 py-2 font-medium text-primary-ink hover:bg-primary-dark disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send magic link"}
      </button>
    </form>
  );
}

function PasswordForm() {
  const [state, formAction, pending] = useActionState(signInWithPassword, {
    error: null,
  });

  return (
    <form action={formAction} className="space-y-4">
      <input
        type="text"
        name="identifier"
        required
        placeholder="Username or email"
        autoCapitalize="off"
        autoCorrect="off"
        className="w-full rounded-lg border border-border bg-card-alt px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <input
        type="password"
        name="password"
        required
        placeholder="Password"
        className="w-full rounded-lg border border-border bg-card-alt px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {state.error && <p className="text-sm text-unpaid-ink">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-primary px-4 py-2 font-medium text-primary-ink hover:bg-primary-dark disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-xs text-ink-muted">
        Given a username by the admin? Use it here directly. Signed in by
        email before? Use a magic link, then set a password from Account.
      </p>
    </form>
  );
}
