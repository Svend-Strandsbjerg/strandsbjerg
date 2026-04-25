import Link from "next/link";

import { updateCompanyDiscAccess, updateUserDiscAccess } from "@/app/disc/admin/actions";

type DiscAdminCockpitProps = {
  query: string;
  status?: string;
  basePath: "/admin/disc" | "/disc/admin";
  users: Array<{ id: string; name: string | null; email: string | null; discMaxTierOverride: "FREE" | "STANDARD" | "DEEP" | null }>;
  companies: Array<{ id: string; name: string; discMaxTierAccess: "FREE" | "STANDARD" | "DEEP" }>;
  diagnostics: {
    productLine: string | null;
    configuredPath: string;
    versionCount: number;
    versions: Array<{
      tier: string | null;
      key: string | null;
      assessmentVersionId: string;
      itemCount: number | null;
      estimatedCompletionMinutes: number | null;
      intendedUse: string | null;
      deliveryMode: string | null;
    }>;
  } | null;
};

function tierLabel(tier: "FREE" | "STANDARD" | "DEEP" | null | undefined) {
  if (tier === "STANDARD") return "Standard";
  if (tier === "DEEP") return "Dybdegående";
  return "Gratis";
}

export function DiscAdminCockpit({ query, status, users, companies, diagnostics, basePath }: DiscAdminCockpitProps) {
  const hasFreeVersion = Boolean(diagnostics?.versions.some((version) => (version.tier ?? "").toLowerCase() === "free"));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">DISC administration</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">DISC administration</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Administrér DISC-adgang for brugere og virksomheder. Adgangsniveauer er kumulative: Standard inkluderer Gratis, og
          Dybdegående inkluderer både Standard og Gratis.
        </p>
        <form className="mt-4 flex gap-2" action={basePath} method="get">
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
            <p>Produktlinje: <span className="font-medium">{diagnostics.productLine ?? "ukendt"}</span></p>
            <p>Konfigureret sti: <span className="font-mono text-xs">{diagnostics.configuredPath}</span></p>
            <p>Antal versioner: <span className="font-medium">{diagnostics.versionCount}</span></p>
            {diagnostics.versionCount === 0 ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
                <p className="font-medium">DISC-motoren returnerer ingen versioner (versions: []).</p>
                <p className="mt-1">
                  Dette er en engine-konfiguration/seed-fejl, ikke en frontend entitlement-fejl. Motoren skal mindst eksponere den gratis
                  16-spørgsmålsversion, før tests kan startes.
                </p>
              </div>
            ) : null}
            {diagnostics.versionCount > 0 && !hasFreeVersion ? (
              <p className="text-amber-700">Advarsel: Ingen version med tier “free” blev fundet. Motoren skal eksponere den gratis 16-spørgsmålsversion.</p>
            ) : null}
            {diagnostics.versions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="p-2">Tier</th><th className="p-2">Nøgle</th><th className="p-2">Version</th><th className="p-2">Spørgsmål</th><th className="p-2">Minutter</th><th className="p-2">Brug</th><th className="p-2">Levering</th>
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
          <p className="mt-1 text-sm text-muted-foreground">
            Opdater brugerens DISC adgangsniveau. Dette område styrer kun DISC-rettigheder, ikke globale adminroller.
          </p>
          <div className="mt-3 space-y-3">
            {users.map((user) => (
              <form key={user.id} action={updateUserDiscAccess} className="rounded-lg border p-3">
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="redirectTo" value={basePath} />
                <p className="text-sm font-medium">{user.name ?? user.email ?? "Ukendt bruger"}</p>
                <p className="text-xs text-muted-foreground">Adgangsniveau: {tierLabel(user.discMaxTierOverride)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <select name="tier" defaultValue={user.discMaxTierOverride ?? "FREE"} className="h-9 rounded-md border px-2 text-sm">
                    <option value="FREE">Gratis</option>
                    <option value="STANDARD">Standard (inkl. Gratis)</option>
                    <option value="DEEP">Dybdegående (inkl. Standard + Gratis)</option>
                  </select>
                  <button type="submit" className="h-9 rounded-md border px-3 text-sm">Gem adgangsniveau</button>
                </div>
              </form>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-border/80 bg-card p-5">
          <h2 className="text-lg font-semibold">Virksomhedsadgang</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Opdater virksomhedens baseline for DISC adgangsniveau. Brugere kan stadig få individuelle overrides ovenpå baseline.
          </p>
          <div className="mt-3 space-y-3">
            {companies.map((company) => (
              <form key={company.id} action={updateCompanyDiscAccess} className="rounded-lg border p-3">
                <input type="hidden" name="companyId" value={company.id} />
                <input type="hidden" name="redirectTo" value={basePath} />
                <p className="text-sm font-medium">{company.name}</p>
                <p className="text-xs text-muted-foreground">Adgangsniveau: {tierLabel(company.discMaxTierAccess)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <select name="tier" defaultValue={company.discMaxTierAccess} className="h-9 rounded-md border px-2 text-sm">
                    <option value="FREE">Gratis</option>
                    <option value="STANDARD">Standard (inkl. Gratis)</option>
                    <option value="DEEP">Dybdegående (inkl. Standard + Gratis)</option>
                  </select>
                  <button type="submit" className="h-9 rounded-md border px-3 text-sm">Gem adgangsniveau</button>
                </div>
              </form>
            ))}
          </div>
        </article>
      </section>

      <p className="text-xs text-muted-foreground">
        <Link href="/admin" className="underline">Tilbage til Admin</Link>
      </p>
    </div>
  );
}
