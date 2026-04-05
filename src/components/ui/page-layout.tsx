import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ContainerProps = {
  children: ReactNode;
  className?: string;
};

type PageHeaderProps = ContainerProps & {
  eyebrow?: string;
  title: string;
  intro?: string;
};

export function PageContainer({ children, className }: ContainerProps) {
  return <div className={cn("page-content-stack", className)}>{children}</div>;
}

export function SectionContainer({ children, className }: ContainerProps) {
  return <section className={cn("section-surface", className)}>{children}</section>;
}

export function PageHeader({ eyebrow, title, intro, children, className }: PageHeaderProps) {
  return (
    <SectionContainer className={cn("space-y-5", className)}>
      {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
      <h1 className="page-title">{title}</h1>
      {intro ? <p className="page-intro">{intro}</p> : null}
      {children}
    </SectionContainer>
  );
}
