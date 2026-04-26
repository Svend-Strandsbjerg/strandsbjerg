import { redirect } from "next/navigation";

import { PasswordForm, ProfileForm } from "@/app/account/account-forms";
import { canAccessAdmin, canAccessFamily, canAccessInvestments, requireUser } from "@/lib/access";
import { formatAuthMethodLabel } from "@/lib/login-activity";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      approvalStatus: true,
      createdAt: true,
      passwordHash: true,
      passwordChangedAt: true,
      loginActivities: {
        orderBy: { timestamp: "desc" },
        take: 8,
        select: {
          id: true,
          timestamp: true,
          authMethod: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="space-y-2 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Min bruger</h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Se kontoinformation, adgangsstatus og opdater dine egne oplysninger.
        </p>
      </header>

      <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-semibold tracking-tight">Kontooplysninger</h2>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Navn</dt>
            <dd>{user.name ?? "Ikke angivet"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">E-mail</dt>
            <dd>{user.email ?? "Ingen e-mail"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Rolle</dt>
            <dd>{user.role}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd>{user.approvalStatus}</dd>
          </div>
        </dl>

        <div className="mt-4 rounded-2xl border border-border/70 bg-muted/25 p-4 text-sm">
          <p className="font-medium">Adgang og områder</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>Familie: {canAccessFamily(user) ? "Adgang" : "Ingen adgang"}</li>
            <li>Investeringer: {canAccessInvestments(user) ? "Adgang" : "Ingen adgang"}</li>
            <li>Admin: {canAccessAdmin(user) ? "Adgang" : "Ingen adgang"}</li>
          </ul>
        </div>
      </section>

      <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-semibold tracking-tight">Redigér profil</h2>
        <div className="mt-4">
          <ProfileForm defaultName={user.name ?? ""} />
        </div>
      </section>

      <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-semibold tracking-tight">Skift adgangskode</h2>
        <div className="mt-4">
          <PasswordForm hasPassword={Boolean(user.passwordHash)} />
        </div>
      </section>

      <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-semibold tracking-tight">Seneste loginaktivitet</h2>
        {user.loginActivities.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Ingen loginaktivitet registreret endnu.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {user.loginActivities.map((entry) => (
              <li key={entry.id} className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
                <span className="font-medium">{formatAuthMethodLabel(entry.authMethod)}</span>
                <span className="text-muted-foreground"> · {entry.timestamp.toLocaleString("da-DK")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
