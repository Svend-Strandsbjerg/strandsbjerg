import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-32 w-full rounded-xl border border-border/90 bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/80 focus:ring-2 focus:ring-primary/40",
        className,
      )}
      {...props}
    />
  );
}
