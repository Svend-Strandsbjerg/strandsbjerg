"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const topNavItemClasses =
  "inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium leading-none text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground active:bg-muted/70 active:text-foreground";
const topNavItemActiveClasses = "bg-muted/70 text-foreground";

type TopNavItemLinkProps = {
  href: ComponentPropsWithoutRef<typeof Link>["href"];
  children: ReactNode;
  className?: string;
  activePathPrefix?: string;
};

type TopNavItemButtonProps = {
  children: ReactNode;
  className?: string;
} & ComponentPropsWithoutRef<"button">;

function startsWithPath(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function TopNavItemLink({ href, children, className, activePathPrefix }: TopNavItemLinkProps) {
  const pathname = usePathname();
  const isActive = Boolean(activePathPrefix && startsWithPath(pathname, activePathPrefix));

  return (
    <Link href={href} className={cn(topNavItemClasses, isActive ? topNavItemActiveClasses : null, className)}>
      {children}
    </Link>
  );
}

export function TopNavItemButton({ children, className, type = "button", ...props }: TopNavItemButtonProps) {
  return (
    <button type={type} className={cn(topNavItemClasses, className)} {...props}>
      {children}
    </button>
  );
}
