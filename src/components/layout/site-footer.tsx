export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 py-8">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Strandsbjerg.</p>
        <p>Built with Next.js, Auth.js, Prisma and calm architecture.</p>
      </div>
    </footer>
  );
}
