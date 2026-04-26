import { setUserPassword, updateUserPermissions } from "@/app/admin/users/actions";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { canAccessAdmin, requireUser } from "@/lib/access";
import { getSingleParam } from "@/lib/admin/disc-admin";
import { formatAuthMethodLabel } from "@/lib/login-activity";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AdminUsersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function statusMessage(status?: string) {
  if (status === "updated") return "Brugerens rettigheder er opdateret.";
  if (status === "password_updated") return "Kodeord er opdateret.";
  if (status === "password_error") return "Kunne ikke opdatere kodeord. Tjek felterne og prøv igen.";
  if (status === "error") return "Kunne ikke opdatere brugeren.";
  return null;
}

function tierLabel(tier: "FREE" | "STANDARD" | "DEEP" | null) {
  if (tier === "STANDARD") return "Standard";
  if (tier === "DEEP") return "Dybdegående";
  return "Gratis";
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const user = await requireUser();

  if (!canAccessAdmin(user)) {
    return (
      <AdminAccessDenied
        title="Ingen adgang til brugeradministration"
        message="Kun Generel admin må ændre globale roller, adgangsflag og brugerrettigheder."
      />
    );
  }

  const params = searchParams ? await searchParams : undefined;
  const query = getSingleParam(params, "q")?.trim() ?? "";
  const status = getSingleParam(params, "status");

  const users = await prisma.user.findMany({
    where: query
      ? {
          OR: [{ email: { contains: query, mode: "insensitive" } }, { name: { contains: query, mode: "insensitive" } }],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      approvalStatus: true,
      isSiteAdmin: true,
      isDiscAdmin: true,
      discMaxTierOverride: true,
      createdAt: true,
      loginActivities: {
        orderBy: { timestamp: "desc" },
        take: 3,
        select: { id: true, timestamp: true, authMethod: true },
      },
      _count: {
        select: { loginActivities: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Brugeradministration</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Brugeradministration</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Højeste administrationsniveau: vedligehold Generel admin, Site admin, DISC admin, Familieadgang og DISC adgangsniveau.
        </p>
        <form className="mt-4 flex gap-2" action="/admin/users" method="get">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Søg bruger"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
          <button type="submit" className="h-10 rounded-md border px-4 text-sm font-medium">Søg</button>
        </form>
        {statusMessage(status) ? <p className="mt-3 text-sm text-muted-foreground">{statusMessage(status)}</p> : null}
      </section>

      <section className="rounded-2xl border border-border/80 bg-card p-5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="p-2">Bruger</th>
                <th className="p-2">Rettigheder</th>
                <th className="p-2">Familieadgang</th>
                <th className="p-2">DISC adgangsniveau</th>
                <th className="p-2">Loginaktivitet</th>
                <th className="p-2">Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {users.map((row) => (
                <tr key={row.id} className="border-b align-top">
                  <td className="p-2">
                    <p className="font-medium">{row.name ?? row.email ?? "Ukendt bruger"}</p>
                    {row.email ? <p className="text-xs text-muted-foreground">{row.email}</p> : null}
                    <p className="mt-1 text-xs text-muted-foreground">Oprettet: {row.createdAt.toISOString().slice(0, 10)}</p>
                  </td>
                  <td className="p-2 text-xs">
                    <p>Generel admin: {row.role === "ADMIN" ? "Ja" : "Nej"}</p>
                    <p>Site admin: {row.isSiteAdmin ? "Ja" : "Nej"}</p>
                    <p>DISC admin: {row.isDiscAdmin ? "Ja" : "Nej"}</p>
                  </td>
                  <td className="p-2 text-xs">
                    <p>{row.approvalStatus === "APPROVED" ? "Aktiv" : "Ikke aktiv"}</p>
                    <p className="text-muted-foreground">Styres via godkendelsesstatus</p>
                  </td>
                  <td className="p-2 text-xs">
                    {tierLabel(row.discMaxTierOverride)}
                    <p className="text-muted-foreground">Kumulativ: Standard inkluderer Gratis, Dybdegående inkluderer Standard+Gratis.</p>
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">
                    <p>{row._count.loginActivities} logins i alt</p>
                    <p>Seneste: {row.loginActivities[0] ? row.loginActivities[0].timestamp.toLocaleString() : "Aldrig"}</p>
                    {row.loginActivities.length > 0 ? (
                      <ul className="mt-1 space-y-0.5">
                        {row.loginActivities.map((entry) => (
                          <li key={entry.id}>
                            {formatAuthMethodLabel(entry.authMethod)} · {entry.timestamp.toLocaleString()}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </td>
                  <td className="p-2">
                    <form action={updateUserPermissions} className="space-y-2 rounded-lg border p-3">
                      <input type="hidden" name="userId" value={row.id} />
                      <div className="grid gap-2 md:grid-cols-2">
                        <label className="text-xs">Generel admin
                          <select name="role" defaultValue={row.role} className="mt-1 h-8 w-full rounded-md border px-2">
                            <option value="USER">Nej</option>
                            <option value="ADMIN">Ja</option>
                          </select>
                        </label>
                        <label className="text-xs">Familieadgang
                          <select name="approvalStatus" defaultValue={row.approvalStatus} className="mt-1 h-8 w-full rounded-md border px-2">
                            <option value="APPROVED">Aktiv</option>
                            <option value="PENDING">Afventer</option>
                            <option value="REJECTED">Afvist</option>
                          </select>
                        </label>
                        <label className="text-xs">Site admin
                          <select name="isSiteAdmin" defaultValue={String(row.isSiteAdmin)} className="mt-1 h-8 w-full rounded-md border px-2">
                            <option value="false">Nej</option>
                            <option value="true">Ja</option>
                          </select>
                        </label>
                        <label className="text-xs">DISC admin
                          <select name="isDiscAdmin" defaultValue={String(row.isDiscAdmin)} className="mt-1 h-8 w-full rounded-md border px-2">
                            <option value="false">Nej</option>
                            <option value="true">Ja</option>
                          </select>
                        </label>
                      </div>
                      <label className="block text-xs">DISC adgangsniveau
                        <select name="discMaxTierOverride" defaultValue={row.discMaxTierOverride ?? "FREE"} className="mt-1 h-8 w-full rounded-md border px-2">
                          <option value="FREE">Gratis</option>
                          <option value="STANDARD">Standard (inkl. Gratis)</option>
                          <option value="DEEP">Dybdegående (inkl. Standard + Gratis)</option>
                        </select>
                      </label>
                      <button type="submit" className="rounded-md border px-3 py-1.5 text-xs font-medium">Gem rettigheder</button>
                    </form>

                    <form action={setUserPassword} className="mt-2 space-y-2 rounded-lg border p-3">
                      <input type="hidden" name="userId" value={row.id} />
                      <p className="text-xs font-medium">Sæt nyt kodeord</p>
                      <input type="password" name="newPassword" required minLength={8} placeholder="Nyt kodeord" className="h-8 w-full rounded-md border px-2 text-xs" />
                      <input
                        type="password"
                        name="confirmPassword"
                        required
                        minLength={8}
                        placeholder="Gentag kodeord"
                        className="h-8 w-full rounded-md border px-2 text-xs"
                      />
                      <button type="submit" className="rounded-md border px-3 py-1.5 text-xs font-medium">Gem kodeord</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
