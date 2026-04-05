import { PageContainer, PageHeader } from "@/components/ui/page-layout";
import { Section } from "@/components/ui/section";
import { getProfessionalContent } from "@/lib/content";

export default async function ProfessionalPage() {
  const content = await getProfessionalContent();

  return (
    <PageContainer>
      <PageHeader eyebrow="Professional profile" title={content.heroTitle} intro={content.heroIntro} />

      <Section title="Competencies" subtitle="Capabilities I apply to deliver dependable software in enterprise environments.">
        <ul className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {content.competencies.map((item) => (
            <li key={item} className="content-card">
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Experience highlights" subtitle="Selected examples of impact across architecture, quality, and modernization efforts.">
        <div className="space-y-3 sm:space-y-4">
          {content.experienceHighlights.map((item) => (
            <p key={item} className="content-card">
              {item}
            </p>
          ))}
        </div>
      </Section>

      <Section title="Technical focus areas" subtitle="How I approach architecture, maintainability, integration, and leadership in practice.">
        <div className="grid gap-4 md:grid-cols-2">
          {content.focusAreas.map((area) => (
            <article key={area.title} className="content-card bg-muted/30 p-5 text-left">
              <h3 className="text-lg font-semibold leading-snug tracking-tight">{area.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">{area.body}</p>
            </article>
          ))}
        </div>
      </Section>
    </PageContainer>
  );
}
