import { Section } from "@/components/ui/section";

const competencies = [
  "SAP ABAP engineering for complex, business-critical process flows",
  "Architecture design with explicit tradeoffs and maintainability focus",
  "Integration strategy for stable SAP-to-platform communication",
  "Quality-driven development standards for long-term delivery performance",
];

const experienceHighlights = [
  "Led ABAP modernization workstreams that improved release confidence while reducing defect carryover from legacy code.",
  "Defined integration contracts and error-handling patterns that increased operational stability across system boundaries.",
  "Established practical code quality and review standards that improved maintainability and onboarding speed in delivery teams.",
];

const focusAreas = [
  {
    title: "Approach to software development",
    body: "I prioritize clarity and consistency over short-term shortcuts. Code should be easy to reason about, safe to change, and resilient in production.",
  },
  {
    title: "Approach to architecture",
    body: "I treat architecture as a delivery enabler: clear boundaries, deliberate coupling, and decisions that hold up under evolving requirements.",
  },
  {
    title: "Integration and reliability",
    body: "I design integration flows for transparency and control, with clear contracts, failure handling, and predictable operational behavior.",
  },
  {
    title: "Technical leadership",
    body: "I align engineers, stakeholders, and delivery goals by translating technical complexity into clear priorities and actionable decisions.",
  },
];

export default function ProfessionalPage() {
  return (
    <div className="space-y-10 sm:space-y-12">
      <header className="rounded-3xl border border-border/70 bg-card p-7 shadow-sm sm:p-10">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground sm:text-sm">Professional profile</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">SAP ABAP expertise shaped by architectural thinking</h1>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          I help organizations improve SAP landscapes without compromising reliability. My work combines hands-on ABAP
          delivery with architectural discipline to create systems that stay stable, maintainable, and easier to evolve.
        </p>
      </header>

      <Section title="Competencies" subtitle="Capabilities I apply to deliver dependable SAP software in enterprise environments.">
        <ul className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {competencies.map((item) => (
            <li key={item} className="rounded-2xl border border-border/80 bg-muted/40 px-4 py-4 text-sm leading-relaxed sm:text-base">
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Experience highlights" subtitle="Selected examples of impact across architecture, quality, and modernization efforts.">
        <div className="space-y-3 sm:space-y-4">
          {experienceHighlights.map((item) => (
            <p key={item} className="rounded-2xl border border-border/80 bg-muted/40 px-4 py-4 text-sm leading-relaxed sm:text-base">
              {item}
            </p>
          ))}
        </div>
      </Section>

      <Section title="Technical focus areas" subtitle="How I approach architecture, maintainability, integration, and leadership in practice.">
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
