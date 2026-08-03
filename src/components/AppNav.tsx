"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListIcon } from "./icons";

export function AppNav() {
  const pathname = usePathname();

  const items = [{ href: "/", label: "Ledger", icon: ListIcon }];

  return (
    <nav className="flex gap-2">
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${
              active ? "bg-primary text-white" : "text-ink-muted hover:bg-white/5"
            }`}
          >
            <Icon />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
