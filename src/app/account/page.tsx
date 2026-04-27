import { redirect } from "next/navigation";

import { ProfileForm } from "@/app/account/account-forms";
import { canAccessAdmin, canAccessDiscAdmin, requireUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatApprovalStatus(status: "PENDING" | "APPROVED" | "REJECTED") {
  if (status === "APPROVED") {
    return "Din konto er godkendt og aktiv.";
  }

  if (status === "REJECTED") {
    return "Din konto afventer manuel afklaring med support.";
  }

  return "Din konto afventer godkendelse.";
}

export default async function AccountPage() {
  const sessionUser = await requireUser({ nextPath: "/account" });
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      approvalStatus: true,
      isSiteAdmin: true,
      isDiscAdmin: true,
      role: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const hasAdminAccess = canAccessAdmin(user);
  const hasDiscAdminAccess = canAccessDiscAdmin(user);

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="space-y-2 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Min bruger</h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Her kan du se og opdatere dine personlige kontoindstillinger.
        </p>
      </header>

      <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-semibold tracking-tight">Mine oplysninger</h2>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Navn</p>
            <p>{user.name ?? "Ikke angivet"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">E-mail</p>
            <p>{user.email ?? "Ingen e-mail registreret"}</p>
            <p className="text-xs text-muted-foreground">Din e-mail kan ikke ændres her endnu.</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-border/70 bg-muted/25 p-4 text-sm text-muted-foreground">
          {formatApprovalStatus(user.approvalStatus)}
        </div>
      </section>

      <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-semibold tracking-tight">Dine rettigheder</h2>
        <ul className="mt-4 space-y-2 text-sm">
          <li className="flex items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2">
            <span>Admin adgang</span>
            <span className="text-muted-foreground">{hasAdminAccess ? "Ja" : "Nej"}</span>
          </li>
          <li className="flex items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2">
            <span>DISC admin adgang</span>
            <span className="text-muted-foreground">{hasDiscAdminAccess ? "Ja" : "Nej"}</span>
          </li>
        </ul>
      </section>

      <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-semibold tracking-tight">Opdatér profil</h2>
        <div className="mt-4">
          <ProfileForm defaultName={user.name ?? ""} email={user.email ?? ""} />
        </div>
      </section>
    </div>
  );
}
