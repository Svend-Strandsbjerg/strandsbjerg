import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

const topNavItemClasses =
  "inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium leading-none text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground active:bg-muted/70 active:text-foreground";

type TopNavItemLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

type TopNavItemButtonProps = {
  children: ReactNode;
  className?: string;
} & ComponentPropsWithoutRef<"button">;

export function TopNavItemLink({ href, children, className }: TopNavItemLinkProps) {
  return (
    <Link href={href} className={cn(topNavItemClasses, className)}>
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
