import Link from "next/link";

import { requireAdmin } from "@/lib/access";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireAdmin(searchParams ? await searchParams : undefined);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">Vælg et administrationsområde.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link href="/admin/users" className="rounded-2xl border border-border/80 bg-card p-5 transition hover:border-foreground/30">
          <h2 className="text-lg font-semibold">Bruger- og rettighedsstyring</h2>
          <p className="mt-1 text-sm text-muted-foreground">Administrér brugere, rettigheder og DISC-adminadgang.</p>
        </Link>

        <Link href="/admin/disc" className="rounded-2xl border border-border/80 bg-card p-5 transition hover:border-foreground/30">
          <h2 className="text-lg font-semibold">DISC administration</h2>
          <p className="mt-1 text-sm text-muted-foreground">Administrér adgangsniveau og DISC-diagnostik.</p>
        </Link>
      </section>
    </div>
  );
}
