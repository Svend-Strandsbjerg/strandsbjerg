import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ContainerProps = {
  children?: ReactNode;
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
  return <div className={cn("page-content-stack w-full", className)}>{children}</div>;
}

export function SectionContainer({ children, className }: ContainerProps) {
  return <section className={cn("section-surface w-full", className)}>{children}</section>;
}

export function PublicPageLayout({ children, className }: ContainerProps) {
  return <PageContainer className={className}>{children}</PageContainer>;
}

export function PageIntro({ eyebrow, title, intro, children, className }: PageIntroProps) {
  return (
    <SectionContainer className={cn("public-intro-block", className)}>
      {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
      <h1 className="page-title">{title}</h1>
      {intro ? <p className="page-intro">{intro}</p> : null}
      {children}
    </SectionContainer>
  );
}

export function SectionBlock({ title, subtitle, children, className }: SectionBlockProps) {
  return (
    <SectionContainer className={cn("public-section-block", className)}>
      <div className="public-section-header">
        <h2 className="section-title">{title}</h2>
        {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
      </div>
      {children}
    </SectionContainer>
  );
}

export function ContentContainer({ children, className }: ContainerProps) {
  return <div className={cn("public-content-stack", className)}>{children}</div>;
}

export const PageHeader = PageIntro;
