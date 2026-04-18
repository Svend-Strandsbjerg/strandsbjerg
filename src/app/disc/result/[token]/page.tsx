import Link from "next/link";
import { notFound } from "next/navigation";

import { DiscResultPresentation } from "@/components/disc/disc-result-presentation";
import { ReturnToDiscButton } from "@/components/disc/return-to-disc-button";
import { getSharedDiscResultAccess } from "@/lib/disc-result-access";

type DiscResultSharePageProps = {
  params: Promise<{ token: string }>;
};

export const dynamic = "force-dynamic";

export default async function DiscResultSharePage({ params }: DiscResultSharePageProps) {
  const { token } = await params;
  const access = await getSharedDiscResultAccess(token);

  if (access.status === "missing") {
    notFound();
  }

  if (access.status === "expired") {
    return (
      <div className="mx-auto max-w-2xl space-y-4 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Resultatlinket er udløbet</h1>
        <p className="text-sm text-muted-foreground">Linket er ikke længere gyldigt. Bed virksomheden om at sende et nyt resultatlink.</p>
      </div>
    );
  }

  const assessment = access.sharedResult.assessment;
  const companyName = assessment.company?.name;
  const candidateLabel = assessment.candidateName ?? assessment.candidateEmail ?? undefined;
  const isCompleted = Boolean(assessment.submittedAt);

  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
      <header className="space-y-3 border-b border-border/70 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">DISC-profilresultat</h1>
        <p className="text-sm text-muted-foreground">
          DISC giver indsigt i, hvordan man typisk kommunikerer, træffer beslutninger og samarbejder.
        </p>
        <div className="space-y-1">
          {companyName ? <p className="text-sm text-muted-foreground">Du er inviteret af {companyName}.</p> : null}
          {candidateLabel ? <p className="text-sm font-medium text-foreground">Kandidat: {candidateLabel}</p> : null}
        </div>
      </header>

      {isCompleted ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
          <h2 className="text-base font-semibold text-emerald-900">Din DISC-besvarelse er gennemført</h2>
          <p className="mt-1 text-sm text-emerald-900/90">
            {companyName ? `Virksomheden (${companyName}) kan nu se dit resultat.` : "Virksomheden kan nu se dit resultat."}
          </p>
          <p className="mt-2 text-xs text-emerald-800/90">Du kan vende tilbage til denne side når som helst via linket.</p>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Dette sikre link giver læseadgang til en gennemført DISC-besvarelse.</p>
        <Link
          href={`/disc/result/${token}/pdf`}
          className="inline-flex h-9 shrink-0 items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Hent PDF
        </Link>
        <ReturnToDiscButton />
      </div>

      <DiscResultPresentation
        title="Resultatrapport"
        status={assessment.status}
        createdAt={assessment.createdAt}
        submittedAt={assessment.submittedAt}
        rawResponses={assessment.rawResponses}
        identityLabel={candidateLabel}
        companyLabel={companyName}
        footerNote="Resultatet er genereret med DISC-rammeværket."
      />
    </div>
  );
}
