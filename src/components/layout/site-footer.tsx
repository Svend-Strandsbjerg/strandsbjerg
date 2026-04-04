export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-background/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} Strandsbjerg</p>
        <p>Software engineering, architecture clarity, and integration reliability.</p>
      </div>
    </footer>
  );
}
