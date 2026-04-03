import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline";
};

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-60",
        variant === "default"
          ? "bg-primary text-primary-foreground shadow-sm hover:opacity-90"
          : "border border-border bg-card text-foreground hover:bg-muted",
        className,
      )}
      {...props}
    />
  );
}
