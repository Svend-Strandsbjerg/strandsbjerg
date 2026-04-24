import Link from "next/link";

import { setDiscAdminAccess } from "@/app/admin/users/actions";
import { requireAdmin } from "@/lib/access";
import { getSingleParam } from "@/lib/admin/disc-admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AdminUsersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function statusMessage(status?: string) {
  if (status === "disc_admin_granted") return "DISC admin adgang er givet.";
  if (status === "disc_admin_removed") return "DISC admin adgang er fjernet.";
  if (status === "error") return "Kunne ikke opdatere rettigheder.";
  return null;
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  await requireAdmin();

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
      isDiscAdmin: true,
      discMaxTierOverride: true,
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Bruger- og rettighedsstyring</h1>
        <p className="mt-2 text-sm text-muted-foreground">Søg brugere og opdatér rettigheder.</p>
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
                <th className="p-2">DISC adgangsniveau</th>
                <th className="p-2">Handling</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isAdmin = user.role === "ADMIN";

                return (
                  <tr key={user.id} className="border-b align-top">
                    <td className="p-2">
                      <p className="font-medium">{user.name ?? user.email ?? "Ukendt bruger"}</p>
                      {user.email ? <p className="text-xs text-muted-foreground">{user.email}</p> : null}
                    </td>
                    <td className="p-2 text-sm">
                      <p>Admin: {isAdmin ? "Ja" : "Nej"}</p>
                      <p>DISC admin: {user.isDiscAdmin ? "Ja" : "Nej"}</p>
                    </td>
                    <td className="p-2">{user.discMaxTierOverride === "DEEP" ? "Dybdegående" : user.discMaxTierOverride === "STANDARD" ? "Standard" : "Gratis"}</td>
                    <td className="p-2">
                      <form action={setDiscAdminAccess}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="makeDiscAdmin" value={user.isDiscAdmin ? "false" : "true"} />
                        <button type="submit" className="rounded-md border px-3 py-1.5 text-xs font-medium">
                          {user.isDiscAdmin ? "Fjern DISC admin adgang" : "Giv DISC admin adgang"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        <Link href="/admin" className="underline">Tilbage til Admin</Link>
      </p>
    </div>
  );
}
