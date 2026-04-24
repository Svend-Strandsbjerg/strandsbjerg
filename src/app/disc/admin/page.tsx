import Link from "next/link";

import { updateCompanyDiscAccess, updateUserDiscAccess } from "@/app/disc/admin/actions";
import { requireDiscAdmin } from "@/lib/access";
import { getDiscVersionDiscoveryDiagnostics } from "@/lib/disc-engine";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DiscAdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleParam(params: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function tierLabel(tier: "FREE" | "STANDARD" | "DEEP" | null | undefined) {
  if (tier === "STANDARD") return "Standard";
  if (tier === "DEEP") return "Dybdegående";
  return "Gratis";
}

export default async function DiscAdminPage({ searchParams }: DiscAdminPageProps) {
  await requireDiscAdmin();
  const params = searchParams ? await searchParams : undefined;
  const query = getSingleParam(params, "q")?.trim() ?? "";
  const status = getSingleParam(params, "status");

  const [users, companies, diagnostics] = await Promise.all([
    prisma.user.findMany({
      where: query
        ? {
            OR: [
              { email: { contains: query, mode: "insensitive" } },
              { name: { contains: query, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        email: true,
        discMaxTierOverride: true,
      },
    }),
    prisma.company.findMany({
      where: query ? { name: { contains: query, mode: "insensitive" } } : undefined,
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        discMaxTierAccess: true,
      },
    }),
    getDiscVersionDiscoveryDiagnostics().catch(() => null),
  ]);
  const hasFreeVersion = Boolean(diagnostics?.versions.some((version) => (version.tier ?? "").toLowerCase() === "free"));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Intern administration</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">DISC admin cockpit</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Administrér DISC adgang på produktniveau. Denne side er kun for DISC-admins og er adskilt fra virksomhedsadministration.
        </p>
        <form className="mt-4 flex gap-2" action="/disc/admin" method="get">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Søg bruger eller virksomhed"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
          <button type="submit" className="h-10 rounded-md border px-4 text-sm font-medium">Søg</button>
        </form>
        {status ? <p className="mt-3 text-xs text-muted-foreground">Status: {status}</p> : null}
      </section>

      <section className="rounded-2xl border border-border/80 bg-card p-5">
        <h2 className="text-lg font-semibold">Diagnostik · Versionsdiscovery</h2>
        {diagnostics ? (
          <div className="mt-3 space-y-2 text-sm">
            <p>Product line: <span className="font-medium">{diagnostics.productLine ?? "ukendt"}</span></p>
            <p>Konfigureret sti: <span className="font-mono text-xs">{diagnostics.configuredPath}</span></p>
            <p>Antal versioner: <span className="font-medium">{diagnostics.versionCount}</span></p>
            {diagnostics.versionCount === 0 ? <p className="text-amber-700">Ingen DISC-versioner er konfigureret i motoren.</p> : null}
            {diagnostics.versionCount > 0 && !hasFreeVersion ? (
              <p className="text-amber-700">Advarsel: Ingen version med tier “free” blev fundet. Gratis-testen kan derfor ikke startes.</p>
            ) : null}
            {diagnostics.versions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="p-2">Tier</th><th className="p-2">Key</th><th className="p-2">assessmentVersionId</th><th className="p-2">itemCount</th><th className="p-2">estimatedCompletionMinutes</th><th className="p-2">intendedUse</th><th className="p-2">deliveryMode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnostics.versions.map((version) => (
                      <tr key={version.assessmentVersionId} className="border-t">
                        <td className="p-2">{version.tier ?? "-"}</td><td className="p-2">{version.key ?? "-"}</td><td className="p-2 font-mono">{version.assessmentVersionId}</td><td className="p-2">{version.itemCount ?? "-"}</td><td className="p-2">{version.estimatedCompletionMinutes ?? "-"}</td><td className="p-2">{version.intendedUse ?? "-"}</td><td className="p-2">{version.deliveryMode ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Kunne ikke hente versionsdiagnostik fra DISC-motoren.</p>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-border/80 bg-card p-5">
          <h2 className="text-lg font-semibold">Brugeradgang</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tildel DISC adgang (Gratis, Standard, Dybdegående) direkte til en bruger.</p>
          <div className="mt-3 space-y-3">
            {users.map((user) => (
              <form key={user.id} action={updateUserDiscAccess} className="rounded-lg border p-3">
                <input type="hidden" name="userId" value={user.id} />
                <p className="text-sm font-medium">{user.name ?? user.email ?? "Ukendt bruger"}</p>
                <p className="text-xs text-muted-foreground">Nuværende adgang: {tierLabel(user.discMaxTierOverride)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <select name="tier" defaultValue={user.discMaxTierOverride ?? "FREE"} className="h-9 rounded-md border px-2 text-sm">
                    <option value="FREE">Gratis</option>
                    <option value="STANDARD">Standard</option>
                    <option value="DEEP">Dybdegående</option>
                  </select>
                  <button type="submit" className="h-9 rounded-md border px-3 text-sm">Gem brugeradgang</button>
                </div>
              </form>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-border/80 bg-card p-5">
          <h2 className="text-lg font-semibold">Virksomhedsadgang</h2>
          <p className="mt-1 text-sm text-muted-foreground">Opdater baseline DISC adgang for en virksomhed.</p>
          <div className="mt-3 space-y-3">
            {companies.map((company) => (
              <form key={company.id} action={updateCompanyDiscAccess} className="rounded-lg border p-3">
                <input type="hidden" name="companyId" value={company.id} />
                <p className="text-sm font-medium">{company.name}</p>
                <p className="text-xs text-muted-foreground">Nuværende adgang: {tierLabel(company.discMaxTierAccess)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <select name="tier" defaultValue={company.discMaxTierAccess} className="h-9 rounded-md border px-2 text-sm">
                    <option value="FREE">Gratis</option>
                    <option value="STANDARD">Standard</option>
                    <option value="DEEP">Dybdegående</option>
                  </select>
                  <button type="submit" className="h-9 rounded-md border px-3 text-sm">Gem virksomhedsadgang</button>
                </div>
              </form>
            ))}
          </div>
        </article>
      </section>

      <p className="text-xs text-muted-foreground">
        Mangler versioner i discovery? Tjek DISC-engine seed/konfiguration for assessment-versioner i <code>/products/disc/versions</code>.
        <Link href="/disc" className="ml-2 underline">Tilbage til DISC</Link>
      </p>
    </div>
  );
}
