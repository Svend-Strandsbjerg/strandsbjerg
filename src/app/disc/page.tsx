import Link from "next/link";

import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DiscLandingPage() {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user?.id);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">DISC gateway</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Én DISC-platform · to tydelige veje</h1>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
          Brug DISC som personlig udvikling eller som virksomhedsværktøj til kandidat- og medarbejderforløb. Du kan altid følge dit
          eget resultat i dit DISC-overblik.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {isAuthenticated ? (
            <>
              <Button asChild>
                <Link href="/disc/overview">Mit personlige overblik</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/disc/company">Virksomheds-overblik</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild>
                <Link href="/disc/signup">Opret profil</Link>
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
          <h2 className="text-lg font-semibold">Personlig DISC</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Opret profil og log ind</li>
            <li>Tag DISC-test i dit eget tempo</li>
            <li>Se seneste og tidligere resultater i /disc/overview</li>
            <li>Download PDF af dine rapporter</li>
          </ul>
          <Button asChild variant="outline" className="mt-4">
            <Link href={isAuthenticated ? "/disc/overview" : "/disc/signup"}>Start personlig DISC</Link>
          </Button>
        </article>

        <article className="rounded-2xl border border-border/80 bg-card p-5">
          <h2 className="text-lg font-semibold">Virksomhed / leder</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Opret virksomhed og inviter kandidater</li>
            <li>Følg invitationer: oprettet, startet, gennemført</li>
            <li>Åbn kandidatens resultat direkte fra overblikket</li>
            <li>Administrér invite-links og genafsendelser</li>
          </ul>
          <Button asChild variant="outline" className="mt-4">
            <Link href={isAuthenticated ? "/disc/company" : "/disc/login"}>Gå til virksomhedsflow</Link>
          </Button>
        </article>
      </section>

      <section className="rounded-2xl border border-border/80 bg-card p-5">
        <h2 className="text-lg font-semibold">Invitationsflow for kandidater</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Kandidaten åbner invite-link → logger ind/opretter bruger → vender automatisk tilbage til invitationen → gennemfører testen →
          ser resultatet og finder det bagefter i sit personlige overblik.
        </p>
      </section>
    </div>
  );
}
