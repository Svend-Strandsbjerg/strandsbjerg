import type { ReactNode } from "react";

import { SectionContainer } from "@/components/ui/page-layout";

export function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <SectionContainer className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{title}</h2>
        {subtitle ? <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">{subtitle}</p> : null}
      </div>
      {children}
    </SectionContainer>
  );
}
