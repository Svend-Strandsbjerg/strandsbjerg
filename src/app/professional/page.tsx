import { Section } from "@/components/ui/section";

const competencies = [
  "SAP ABAP development for business-critical domains",
  "Architecture design grounded in maintainability and lifecycle cost",
  "Integration patterns for robust SAP ↔ external system collaboration",
  "Code quality standards and engineering discipline across teams",
];

const experienceHighlights = [
  "Led ABAP redesign initiatives that reduced defect rates and improved release confidence in legacy-heavy environments.",
  "Designed integration contracts that stabilized operational data flow and improved observability across system boundaries.",
  "Introduced pragmatic development standards and review practices that raised team-level maintainability over time.",
];

const focusAreas = [
  {
    title: "Approach to software development",
    body: "I optimize for readable code, explicit tradeoffs, and repeatable delivery. Fast iteration matters, but only when quality scales with it.",
  },
  {
    title: "Approach to architecture",
    body: "I define boundaries and responsibilities early, reducing accidental coupling and making modernization decisions safer and more predictable.",
  },
  {
    title: "Integration and reliability",
    body: "I design integration flows for resilience: clear contracts, failure handling, and operational transparency from day one.",
  },
  {
    title: "Technical leadership",
    body: "I help teams connect business intent to engineering execution by making architecture choices practical, visible, and measurable.",
  },
];

export default function ProfessionalPage() {
  return (
    <div className="space-y-10 sm:space-y-12">
      <header className="rounded-3xl border border-border/70 bg-card p-7 shadow-sm sm:p-10">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground sm:text-sm">Professional profile</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Technical depth with architectural clarity</h1>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          I help organizations modernize SAP-centric software without sacrificing reliability. My work combines ABAP
          execution discipline with architecture thinking to build systems that remain healthy under real enterprise pressure.
        </p>
      </header>

      <Section title="Competencies" subtitle="Practical strengths applied in delivery, architecture, and modernization work.">
        <ul className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {competencies.map((item) => (
            <li key={item} className="rounded-2xl border border-border/80 bg-muted/40 px-4 py-4 text-sm leading-relaxed sm:text-base">
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Experience highlights" subtitle="Representative outcomes from enterprise software initiatives.">
        <div className="space-y-3 sm:space-y-4">
          {experienceHighlights.map((item) => (
            <p key={item} className="rounded-2xl border border-border/80 bg-muted/40 px-4 py-4 text-sm leading-relaxed sm:text-base">
              {item}
            </p>
          ))}
        </div>
      </Section>

      <Section title="Technical focus areas" subtitle="How I think about architecture, maintainability, and long-term technical quality.">
        <div className="grid gap-4 md:grid-cols-2">
          {focusAreas.map((area) => (
            <article key={area.title} className="rounded-2xl border border-border/80 bg-muted/30 p-5">
              <h3 className="text-lg font-medium tracking-tight">{area.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">{area.body}</p>
            </article>
          ))}
        </div>
      </Section>
    </div>
  );
}
