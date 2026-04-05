import { ContentContainer, PageIntro, PublicPageLayout, SectionBlock } from "@/components/ui/page-layout";
import { getProfessionalContent } from "@/lib/content";

export const dynamic = "force-dynamic";
export default async function ProfessionalPage() {
  const content = await getProfessionalContent();

  return (
    <PublicPageLayout>
      <PageIntro eyebrow="Professional profile" title={content.heroTitle} intro={content.heroIntro} />

      <SectionBlock title="Competencies" subtitle="Capabilities I apply to deliver dependable software in enterprise environments.">
        <ContentContainer>
          <ul className="grid gap-3 sm:gap-4 md:grid-cols-2">
            {content.competencies.map((item) => (
              <li key={item} className="content-card">
                {item}
              </li>
            ))}
          </ul>
        </ContentContainer>
      </SectionBlock>

      <SectionBlock
        title="Experience highlights"
        subtitle="Selected examples of impact across architecture, quality, and modernization efforts."
      >
        <ContentContainer>
          {content.experienceHighlights.map((item) => (
            <p key={item} className="content-card">
              {item}
            </p>
          ))}
        </ContentContainer>
      </SectionBlock>

      <SectionBlock title="Technical focus areas" subtitle="How I approach architecture, maintainability, integration, and leadership in practice.">
        <ContentContainer>
          <div className="grid gap-4 md:grid-cols-2">
            {content.focusAreas.map((area) => (
              <article key={area.title} className="content-card bg-muted/30">
                <h3 className="text-lg font-semibold leading-snug tracking-tight">{area.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">{area.body}</p>
              </article>
            ))}
          </div>
        </ContentContainer>
      </SectionBlock>
    </PublicPageLayout>
  );
}
