"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GearIcon, UsersIcon } from "./icons";

export function AccountMenu({
  identity,
  role,
  isAdmin,
  signOutAction,
}: {
  identity: string;
  role: string;
  isAdmin: boolean;
  signOutAction: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initial = identity.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-black/5"
        aria-label="Account menu"
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white ${
            isAdmin ? "bg-primary" : "bg-viewer-accent"
          }`}
        >
          {initial}
        </span>
        <span className="hidden text-xs capitalize text-ink-muted sm:inline">{role}</span>
      </button>
      {open && (
        <div className="card absolute right-0 top-full z-20 mt-2 w-56 p-2 text-sm">
          <p className="truncate px-2 py-1 text-xs text-ink-muted">{identity}</p>
          <p className="px-2 pb-1 text-xs capitalize text-ink-muted">{role}</p>
          <div className="my-1 border-t border-border" />
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-ink hover:bg-bg"
          >
            <GearIcon />
            Account
          </Link>
          {isAdmin && (
            <Link
              href="/users"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-ink hover:bg-bg"
            >
              <UsersIcon />
              Users
            </Link>
          )}
          <form action={signOutAction}>
            <button
              type="submit"
              className="block w-full rounded-lg px-2 py-1.5 text-left text-primary hover:bg-bg"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
