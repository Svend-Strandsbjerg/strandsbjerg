"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { INVESTMENTS_TABS } from "@/lib/investments";
import { cn } from "@/lib/utils";

export function InvestmentsSubnav() {
  const pathname = usePathname();

  return (
    <nav className="rounded-2xl border border-border/80 bg-card p-2 shadow-sm">
      <ul className="flex flex-wrap gap-2">
        {INVESTMENTS_TABS.map((tab) => {
          const isActive = pathname === tab.href;

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  "block rounded-xl px-3 py-2 text-sm transition",
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
