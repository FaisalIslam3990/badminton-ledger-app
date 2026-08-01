"use client";

import { useActionState, useRef, useEffect } from "react";
import { addUser } from "./actions";

export function AddUserForm() {
  const [state, formAction, pending] = useActionState(addUser, { error: null });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) {
      formRef.current?.reset();
    }
  }, [pending, state.error]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input
        type="text"
        name="username"
        required
        placeholder="Username (e.g. caroline)"
        autoCapitalize="off"
        autoCorrect="off"
        className="w-full rounded border border-brass/40 bg-white px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-brass"
      />
      <input
        type="text"
        name="password"
        required
        minLength={8}
        placeholder="Password (min 8 characters)"
        className="w-full rounded border border-brass/40 bg-white px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-brass"
      />
      <select
        name="role"
        defaultValue="viewer"
        className="w-full rounded border border-brass/40 bg-white px-3 py-2 text-ink"
      >
        <option value="viewer">Viewer</option>
        <option value="admin">Admin</option>
      </select>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-brass px-4 py-2 font-medium text-ink-dark disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add user"}
      </button>
    </form>
  );
}
