import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none ring-primary transition focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}
