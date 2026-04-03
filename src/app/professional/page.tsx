import { Section } from "@/components/ui/section";

const competencies = [
  "SAP ABAP development for complex business-critical processes",
  "Technical architecture with pragmatic modernization paths",
  "Cross-system integration patterns and operational resilience",
  "Code quality initiatives and maintainability coaching",
];

const experienceHighlights = [
  "Led ABAP redesign initiatives reducing change lead time and production defects in legacy-heavy SAP environments.",
  "Designed integration contracts between SAP and external services to stabilize data flow and support auditability.",
  "Introduced development standards and review practices that improved long-term velocity across teams.",
];

export default function ProfessionalPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight">Professional profile</h1>
        <p className="max-w-3xl text-muted-foreground">
          I help organizations move enterprise software forward without sacrificing reliability. My work combines deep
          SAP ABAP execution with architectural thinking, allowing teams to modernize deliberately and safely.
        </p>
      </header>

      <Section title="Competencies">
        <ul className="space-y-3 text-sm text-muted-foreground">
          {competencies.map((item) => (
            <li key={item} className="rounded-xl border border-border/70 bg-muted/50 p-4 text-foreground">
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Experience highlights">
        <div className="space-y-3 text-sm text-muted-foreground">
          {experienceHighlights.map((item) => (
            <p key={item} className="rounded-xl border border-border/70 bg-muted/50 p-4 text-foreground">
              {item}
            </p>
          ))}
        </div>
      </Section>

      <Section title="Technical focus areas">
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-border/70 p-4">
            <h3 className="font-medium">Architecture & maintainability</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              I prioritize boundaries, readability, and lifecycle cost over short-lived optimizations.
            </p>
          </article>
          <article className="rounded-xl border border-border/70 p-4">
            <h3 className="font-medium">Integration & quality</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              I design systems for dependable data movement, observability, and predictable operational behavior.
            </p>
          </article>
          <article className="rounded-xl border border-border/70 p-4">
            <h3 className="font-medium">Modernization strategy</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              I favor staged modernization with concrete risk control and measurable business outcomes.
            </p>
          </article>
          <article className="rounded-xl border border-border/70 p-4">
            <h3 className="font-medium">Technical leadership</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              I bridge business and engineering by making technical decisions explicit, explainable, and actionable.
            </p>
          </article>
        </div>
      </Section>
    </div>
  );
}
