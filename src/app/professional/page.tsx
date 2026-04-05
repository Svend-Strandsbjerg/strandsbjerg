import { Section } from "@/components/ui/section";
import { getProfessionalContent } from "@/lib/content";

export const dynamic = "force-dynamic";
export default async function ProfessionalPage() {
  const content = await getProfessionalContent();

  return (
    <div className="space-y-10 sm:space-y-12">
      <header className="rounded-3xl border border-border/70 bg-card p-7 shadow-sm sm:p-10">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground sm:text-sm">Professional profile</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">{content.heroTitle}</h1>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">{content.heroIntro}</p>
      </header>

      <Section title="Competencies" subtitle="Capabilities I apply to deliver dependable software in enterprise environments.">
        <ul className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {content.competencies.map((item) => (
            <li key={item} className="rounded-2xl border border-border/80 bg-muted/40 px-4 py-4 text-sm leading-relaxed sm:text-base">
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Experience highlights" subtitle="Selected examples of impact across architecture, quality, and modernization efforts.">
        <div className="space-y-3 sm:space-y-4">
          {content.experienceHighlights.map((item) => (
            <p key={item} className="rounded-2xl border border-border/80 bg-muted/40 px-4 py-4 text-sm leading-relaxed sm:text-base">
              {item}
            </p>
          ))}
        </div>
      </Section>

      <Section title="Technical focus areas" subtitle="How I approach architecture, maintainability, integration, and leadership in practice.">
        <div className="grid gap-4 md:grid-cols-2">
          {content.focusAreas.map((area) => (
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
