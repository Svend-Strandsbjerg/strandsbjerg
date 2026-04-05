import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ContainerProps = {
  children: ReactNode;
  className?: string;
};

type PageIntroProps = ContainerProps & {
  eyebrow?: string;
  title: string;
  intro?: string;
};

type SectionBlockProps = ContainerProps & {
  title: string;
  subtitle?: string;
};

export function PageContainer({ children, className }: ContainerProps) {
  return <div className={cn("page-content-stack", className)}>{children}</div>;
}

export function SectionContainer({ children, className }: ContainerProps) {
  return <section className={cn("section-surface", className)}>{children}</section>;
}

export function PublicPageLayout({ children, className }: ContainerProps) {
  return <PageContainer className={className}>{children}</PageContainer>;
}

export function PageIntro({ eyebrow, title, intro, children, className }: PageIntroProps) {
  return (
    <SectionContainer className={cn("space-y-5", className)}>
      {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
      <h1 className="page-title">{title}</h1>
      {intro ? <p className="page-intro">{intro}</p> : null}
      {children}
    </SectionContainer>
  );
}

export function SectionBlock({ title, subtitle, children, className }: SectionBlockProps) {
  return (
    <SectionContainer className={cn("space-y-6", className)}>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{title}</h2>
        {subtitle ? <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">{subtitle}</p> : null}
      </div>
      {children}
    </SectionContainer>
  );
}

export function ContentContainer({ children, className }: ContainerProps) {
  return <div className={cn("space-y-4 sm:space-y-5", className)}>{children}</div>;
}

export const PageHeader = PageIntro;
