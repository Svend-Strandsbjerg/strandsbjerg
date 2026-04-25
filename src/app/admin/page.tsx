import Link from "next/link";

import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { canAccessAdmin, canAccessAdminCockpit, canAccessDiscAdmin, canAccessSiteAdmin, requireUser } from "@/lib/access";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const user = await requireUser();
  const canUseCockpit = canAccessAdminCockpit(user);

  if (!canUseCockpit) {
    return (
      <AdminAccessDenied
        title="Ingen adgang til administration"
        message="Du har ikke en administrativ rolle. Kontakt en generel admin for at få tildelt de nødvendige rettigheder."
      />
    );
  }

  const canUseUsers = canAccessAdmin(user);
  const canUseSite = canAccessSiteAdmin(user);
  const canUseDisc = canAccessDiscAdmin(user);
  const status = params?.status;
  const statusText = status === "adgang_nægtet" ? "Adgang nægtet: du har ikke rettigheder til den ønskede administrationsside." : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Administration</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Admincockpit</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Vælg administrationsområde. Generel admin kan se alt, mens specialiserede admins kun ser egne områder.
        </p>
        {statusText ? <p className="mt-3 text-sm text-amber-700">{statusText}</p> : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {canUseUsers ? (
          <Link href="/admin/users" className="rounded-2xl border border-border/80 bg-card p-5 transition hover:border-foreground/30">
            <h2 className="text-lg font-semibold">Brugeradministration</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Vedligehold globale roller og rettigheder: Generel admin, Site admin, DISC admin og familieadgang.
            </p>
          </Link>
        ) : null}

        {canUseSite ? (
          <Link href="/admin/site" className="rounded-2xl border border-border/80 bg-card p-5 transition hover:border-foreground/30">
            <h2 className="text-lg font-semibold">Siteadministration</h2>
            <p className="mt-1 text-sm text-muted-foreground">Redigér website-tekster og indhold på tværs af sider.</p>
          </Link>
        ) : null}

        {canUseDisc ? (
          <Link href="/admin/disc" className="rounded-2xl border border-border/80 bg-card p-5 transition hover:border-foreground/30">
            <h2 className="text-lg font-semibold">DISC administration</h2>
            <p className="mt-1 text-sm text-muted-foreground">Administrér DISC-adgangsniveauer, virksomhedsbaselines og motor-diagnostik.</p>
          </Link>
        ) : null}
      </section>
    </div>
  );
}
