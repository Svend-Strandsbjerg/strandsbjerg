import Link from "next/link";

import { Section } from "@/components/ui/section";

const focusAreas = [
  "SAP ABAP delivery in complex enterprise landscapes",
  "Architecture decisions that lower long-term operational cost",
  "Integration reliability across SAP and external platforms",
  "Modernization paths built around maintainability and quality",
  "Technical leadership that aligns business and engineering",
  "Structured development practices for sustainable velocity",
];

export default function HomePage() {
  return (
    <div className="space-y-10 sm:space-y-14">
      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-7 shadow-sm sm:p-10 lg:p-14">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-muted/70 to-transparent" />
        <div className="relative space-y-8">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground sm:text-sm">
            Software Developer · SAP ABAP · Architecture Mindset
          </p>
          <h1 className="max-w-4xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Building enterprise software that stays clear, reliable, and maintainable as complexity grows.
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            I design and deliver SAP-centric solutions with a focus on integration quality, code health, and practical
            modernization. The result is software that supports delivery today and remains adaptable tomorrow.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/professional"
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm"
            >
              Explore professional profile
            </Link>
            <Link href="/contact" className="rounded-full border border-border px-5 py-2.5 text-sm font-medium">
              Start a conversation
            </Link>
          </div>
        </div>
      </section>

      <Section
        title="Core strengths"
        subtitle="Focused capabilities that support architecture quality, dependable delivery, and long-term maintainability."
      >
        <ul className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {focusAreas.map((item) => (
            <li key={item} className="rounded-2xl border border-border/80 bg-muted/40 px-4 py-4 text-sm leading-relaxed sm:text-base">
              {item}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
