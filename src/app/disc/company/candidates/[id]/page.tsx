import Link from "next/link";
import { notFound } from "next/navigation";

import { DiscResultPresentation } from "@/components/disc/disc-result-presentation";
import { requireUser } from "@/lib/access";
import { canViewCompany } from "@/lib/company-access";
import { ensureAssessmentResultShare } from "@/lib/disc-result-share";
import { prisma } from "@/lib/prisma";

type CandidateResultPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CandidateResultPage({ params }: CandidateResultPageProps) {
  const user = await requireUser();
  const { id } = await params;

  const assessment = await prisma.discAssessment.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      externalSessionId: true,
      candidateName: true,
      candidateEmail: true,
      createdAt: true,
      submittedAt: true,
      rawResponses: true,
      companyId: true,
      company: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!assessment?.companyId || !(await canViewCompany(user.id, assessment.companyId))) {
    notFound();
  }

  const resultShare = assessment.status === "SUBMITTED" ? await ensureAssessmentResultShare(assessment.id) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-5 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
      <header className="space-y-2 border-b border-border/70 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Kandidatresultat</h1>
        <p className="text-sm text-muted-foreground">
          Resultat for {assessment.candidateName ?? assessment.candidateEmail ?? "kandidat"}
          {assessment.company?.name ? ` · ${assessment.company.name}` : ""}.
        </p>
      </header>

      <DiscResultPresentation
        title="DISC resultat"
        status={assessment.status}
        createdAt={assessment.createdAt}
        submittedAt={assessment.submittedAt}
        rawResponses={assessment.rawResponses}
        identityLabel={assessment.candidateName ?? assessment.candidateEmail ?? "Kandidat"}
        companyLabel={assessment.company?.name}
        pdfHref={resultShare ? `/disc/result/${resultShare.token}/pdf` : undefined}
        emptyMessage="Resultatdata mangler."
      />

      <div className="flex flex-wrap gap-2">
        <Link
          href="/disc/company"
          className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Tilbage til company-overblik
        </Link>
        {resultShare ? (
          <Link
            href={`/disc/result/${resultShare.token}`}
            target="_blank"
            className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Åbn delt resultatlink
          </Link>
        ) : null}
        {assessment.status === "SUBMITTED" && assessment.companyId ? (
          <Link
            href={`/disc/company/compare?companyId=${encodeURIComponent(assessment.companyId)}&assessmentIds=${encodeURIComponent(assessment.id)}`}
            className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Add to comparison
          </Link>
        ) : null}
      </div>
    </div>
  );
}
