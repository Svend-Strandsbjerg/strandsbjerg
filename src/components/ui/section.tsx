import type { ReactNode } from "react";

import { SectionBlock } from "@/components/ui/page-layout";

export function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <SectionBlock title={title} subtitle={subtitle}>
      {children}
    </SectionBlock>
  );
}
