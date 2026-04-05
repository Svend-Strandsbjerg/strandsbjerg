import Link from "next/link";

import { PageContainer, PageHeader } from "@/components/ui/page-layout";
import { Section } from "@/components/ui/section";
import { getHomeContent } from "@/lib/content";

export const dynamic = "force-dynamic";
export default async function HomePage() {
  const content = await getHomeContent();

  return (
    <PageContainer>
      <PageHeader eyebrow="Software Developer · Architecture Mindset" title={content.headline} intro={content.intro}>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            href="/professional"
            className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm"
          >
            View professional profile
          </Link>
          <Link href="/contact" className="inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-medium">
            Discuss your project
          </Link>
        </div>
      </PageHeader>

      <Section
        title="Core strengths"
        subtitle="Technical capabilities I prioritize to deliver robust software solutions and sustainable engineering outcomes."
      >
        <ul className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {content.sections.map((item) => (
            <li key={item} className="content-card">
              {item}
            </li>
          ))}
        </ul>
      </Section>
    </PageContainer>
  );
}
