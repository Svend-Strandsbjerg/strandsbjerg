export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-1 px-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-6">
        <p>© {new Date().getFullYear()} Strandsbjerg.</p>
        <p>Built with Next.js, Auth.js, Prisma and calm architecture.</p>
      </div>
    </footer>
  );
}
