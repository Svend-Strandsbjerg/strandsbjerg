import Link from "next/link";

type DiscAdminAccessDeniedProps = {
  hasAdminAccess: boolean;
  hasDiscAdminAccess: boolean;
};

export function DiscAdminAccessDenied({ hasAdminAccess, hasDiscAdminAccess }: DiscAdminAccessDeniedProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">DISC administration</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Ingen adgang til DISC administration</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Du har ikke de nødvendige rettigheder til DISC admin-cockpittet.
        </p>
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p>
            Adgang kræver enten generel adminrolle (<span className="font-medium">isAdmin</span>) eller DISC-adminrolle (
            <span className="font-medium">isDiscAdmin</span>).
          </p>
          <p className="mt-2">
            Din aktuelle adgang: isAdmin=<span className="font-medium">{String(hasAdminAccess)}</span>, isDiscAdmin=
            <span className="font-medium">{String(hasDiscAdminAccess)}</span>.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/admin" className="rounded-md border px-3 py-2 text-sm">
            Tilbage til Admin
          </Link>
          <Link href="/admin/users" className="rounded-md border px-3 py-2 text-sm">
            Åbn /admin/users for at tildele rolle
          </Link>
        </div>
      </section>
    </div>
  );
}
