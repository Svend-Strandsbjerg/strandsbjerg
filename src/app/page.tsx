import Link from "next/link";

import { Section } from "@/components/ui/section";

const focusAreas = [
  "SAP ABAP development in enterprise landscapes",
  "Architecture decisions that reduce long-term complexity",
  "Integration reliability across SAP and external platforms",
  "Modernization strategies with maintainability as a baseline",
  "Technical leadership with strong delivery discipline",
];

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="space-y-8 rounded-3xl border border-border/70 bg-card p-10">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Software Developer · SAP ABAP</p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
          I build enterprise software foundations that stay maintainable, adaptable, and trusted under pressure.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          I work at the intersection of SAP ABAP development, architecture mindset, and integration quality. The goal
          is simple: modern systems that deliver reliably today and remain sustainable tomorrow.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/professional" className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">
            View professional profile
          </Link>
          <Link href="/contact" className="rounded-full border border-border px-5 py-2 text-sm font-medium">
            Contact
          </Link>
        </div>
      </section>

      <Section title="Selected strengths" subtitle="Focused capabilities that guide delivery and decision-making.">
        <ul className="grid gap-4 md:grid-cols-2">
          {focusAreas.map((item) => (
            <li key={item} className="rounded-xl border border-border/70 bg-muted/50 p-4 text-sm">
              {item}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
