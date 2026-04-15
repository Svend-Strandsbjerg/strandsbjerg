import Link from "next/link";

import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function DiscLandingPage() {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user?.id);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">DISC platform</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">DISC til privatpersoner og virksomheder</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Start din DISC-profil som privat bruger, eller inviter kandidater via en virksomhedsprofil. Første version fokuserer på
          enkel onboarding, invitationer og sikker adgang til resultater.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {isAuthenticated ? (
            <>
              <Button asChild>
                <Link href="/disc/overview">Gå til mit DISC-overblik</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/disc/company">Gå til virksomhedsflow</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild>
                <Link href="/disc/signup">Opret bruger</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/disc/login">Log ind</Link>
              </Button>
            </>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-border/80 bg-card p-5">
          <h2 className="text-lg font-semibold">Privat bruger</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Opret konto og log ind</li>
            <li>Tag DISC-test og se egne profiler</li>
            <li>Åbn nyeste resultat og del link/PDF når tilgængeligt</li>
          </ul>
        </article>

        <article className="rounded-2xl border border-border/80 bg-card p-5">
          <h2 className="text-lg font-semibold">Leder / virksomhed</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Opret virksomhedsprofil</li>
            <li>Generér invitationslinks til kandidater</li>
            <li>Se gennemførte DISC-profiler for egne invitationer</li>
          </ul>
        </article>
      </section>

      <section className="rounded-2xl border border-border/80 bg-card p-5">
        <h2 className="text-lg font-semibold">Invitationer</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Kandidater åbner et unikt invitationslink, opretter sig eller logger ind, og fortsætter direkte til testen. Resultatet
          knyttes både til kandidaten og den inviterende virksomhed.
        </p>
      </section>
    </div>
  );
}
