export default function ContactPage() {
  return (
    <section className="mx-auto max-w-3xl space-y-5 rounded-3xl border border-border/80 bg-card p-7 shadow-sm sm:p-10">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground sm:text-sm">Contact</p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">Let&apos;s connect</h1>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        For software development, architecture advisory, or integration-focused collaboration, feel free to reach out.
      </p>
      <a
        href="mailto:contact@example.com"
        className="inline-flex rounded-full border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-muted/50"
      >
        contact@example.com
      </a>
    </section>
  );
}
