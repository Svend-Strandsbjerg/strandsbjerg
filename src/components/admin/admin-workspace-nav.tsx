"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type AdminWorkspaceNavItem = {
  href: "/admin" | "/admin/users" | "/admin/site" | "/admin/disc";
  label: string;
};

type AdminWorkspaceNavProps = {
  items: AdminWorkspaceNavItem[];
};

function isActivePath(pathname: string, href: AdminWorkspaceNavItem["href"]) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminWorkspaceNav({ items }: AdminWorkspaceNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin navigation" className="mt-4 flex flex-wrap gap-2">
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition",
              active ? "border-foreground/40 bg-foreground/5 text-foreground" : "border-border/80 text-muted-foreground hover:border-foreground/30 hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
