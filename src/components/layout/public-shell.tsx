import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PublicContainerProps = {
  children: ReactNode;
  className?: string;
};

export function PublicContainer({ children, className }: PublicContainerProps) {
  return <div className={cn("public-container", className)}>{children}</div>;
}

export function PublicPageShell({ children }: { children: ReactNode }) {
  return <main className="public-main-shell">{children}</main>;
}
