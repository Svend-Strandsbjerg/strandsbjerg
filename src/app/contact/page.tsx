import { ContentContainer, PageIntro, PublicPageLayout, SectionBlock } from "@/components/ui/page-layout";

export default function ContactPage() {
  return (
    <PublicPageLayout>
      <PageIntro
        eyebrow="Contact"
        title="Let&apos;s connect"
        intro="For software development, architecture advisory, or integration-focused collaboration, feel free to reach out."
      />

      <SectionBlock title="Get in touch" subtitle="The best way to start a conversation is by email.">
        <ContentContainer>
          <a
            href="mailto:contact@example.com"
            className="inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-medium transition hover:bg-muted/50"
          >
            contact@example.com
          </a>
        </ContentContainer>
      </SectionBlock>
    </PublicPageLayout>
  );
}
