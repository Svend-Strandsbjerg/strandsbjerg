import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline";
};

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition",
        variant === "default"
          ? "bg-primary text-primary-foreground hover:opacity-90"
          : "border border-border bg-card text-foreground hover:bg-muted",
        className,
      )}
      {...props}
    />
  );
}
