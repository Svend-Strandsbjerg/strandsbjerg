export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-background/80">
      <div className="site-container flex w-full flex-col gap-2 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Strandsbjerg</p>
        <p>Software engineering, architecture clarity, and integration reliability.</p>
      </div>
    </footer>
  );
}
