import Link from "next/link";
import { notFound } from "next/navigation";

import { DiscResultPresentation } from "@/components/disc/disc-result-presentation";
import { requireUser } from "@/lib/access";
import { getCompanyAreaMemberships } from "@/lib/company-access";
import { getAuthorizedCompanyForComparison, getLatestCompanyComparisonCandidates } from "@/lib/disc-company-comparison";
import { buildDiscComparisonSummary, buildDiscResultViewModel } from "@/lib/disc-result-insights";

export const dynamic = "force-dynamic";

type CompanyComparisonPageProps = {
  searchParams: Promise<{
    companyId?: string;
    assessmentIds?: string | string[];
  }>;
};

function parseAssessmentIds(input: string | string[] | undefined) {
  const values = Array.isArray(input) ? input : typeof input === "string" ? [input] : [];
  const normalized = values
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);

  return Array.from(new Set(normalized));
}

export default async function CompanyComparisonPage({ searchParams }: CompanyComparisonPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const memberships = await getCompanyAreaMemberships(user.id);
  const selectedCompanyId = params.companyId ?? memberships[0]?.company.id;

  if (!selectedCompanyId) {
    notFound();
  }

  const companyAccess = await getAuthorizedCompanyForComparison(user.id, selectedCompanyId);
  if (!companyAccess) {
    notFound();
  }

  const latestCandidates = await getLatestCompanyComparisonCandidates(selectedCompanyId);
  const candidateByAssessmentId = new Map(latestCandidates.map((candidate) => [candidate.assessmentId, candidate]));
  const selectedAssessmentIds = parseAssessmentIds(params.assessmentIds);
  const selectedCandidates = selectedAssessmentIds
    .map((assessmentId) => candidateByAssessmentId.get(assessmentId))
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
    .slice(0, 4);

  if (selectedAssessmentIds.length > 0 && selectedCandidates.length !== selectedAssessmentIds.length) {
    notFound();
  }

  const comparisonSummary = buildDiscComparisonSummary(
    selectedCandidates.map((candidate) => ({
      name: candidate.displayName,
      viewModel: buildDiscResultViewModel(candidate.rawResponses),
    })),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
      <header className="space-y-2 border-b border-border/70 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Virksomhed · DISC-sammenligning</h1>
        <p className="text-sm text-muted-foreground">
          Sammenlign gennemførte DISC-profiler for personer i {companyAccess.company.name}. Adgang er begrænset til din godkendte virksomhedskontekst.
        </p>
      </header>

      <section className="rounded-xl border border-border/70 bg-muted/20 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Vælg profiler</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          For hver person bruges den seneste gennemførte besvarelse (sorteret efter indsendelsesdato, nyeste først).
        </p>
        <form className="mt-4 space-y-3">
          <input type="hidden" name="companyId" value={selectedCompanyId} />
          <div className="grid gap-2 sm:grid-cols-2">
            {latestCandidates.map((candidate) => {
              const checked = selectedAssessmentIds.includes(candidate.assessmentId);
              return (
                <label key={candidate.assessmentId} className="flex items-center gap-2 rounded-md border border-border/70 bg-background px-3 py-2 text-sm">
                  <input type="checkbox" name="assessmentIds" value={candidate.assessmentId} defaultChecked={checked} className="h-4 w-4" />
                  <span className="font-medium">{candidate.displayName}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {candidate.submittedAt
                      ? new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit" }).format(candidate.submittedAt)
                      : "—"}
                  </span>
                </label>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Sammenlign valgte
            </button>
            <Link
              href={`/disc/company/compare?companyId=${encodeURIComponent(selectedCompanyId)}`}
              className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Nulstil valg
            </Link>
          </div>
        </form>
      </section>

      {selectedCandidates.length < 2 ? (
        <section className="rounded-xl border border-dashed border-border/80 bg-background/40 p-5 text-sm text-muted-foreground">
          Vælg mindst to personer for at åbne side-om-side sammenligningen.
        </section>
      ) : (
        <>
          <section className="rounded-xl border border-border/70 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sammenfatning</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>{comparisonSummary.paceObservation}</li>
              <li>{comparisonSummary.styleObservation}</li>
              <li>{comparisonSummary.collaborationObservation}</li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{comparisonSummary.practicalNote}</p>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            {selectedCandidates.map((candidate) => (
              <DiscResultPresentation
                key={candidate.assessmentId}
                title="DISC-profil"
                status={candidate.status}
                createdAt={candidate.submittedAt ?? new Date(0)}
                submittedAt={candidate.submittedAt}
                rawResponses={candidate.rawResponses}
                identityLabel={candidate.displayName}
                variant="compact"
                emptyMessage="Der mangler resultatdata for denne profil."
                footerNote="Intern visning til virksomhedssammenligning."
              />
            ))}
          </section>
        </>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          href="/disc/company"
          className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Tilbage til virksomheds-overblik
        </Link>
      </div>
    </div>
  );
}
