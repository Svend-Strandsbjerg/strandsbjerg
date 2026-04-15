import { notFound } from "next/navigation";

import { requireUser } from "@/lib/access";
import { isCompanyRecruiter } from "@/lib/company-access";
import { prisma } from "@/lib/prisma";
import { DiscResultPresentation } from "@/components/disc/disc-result-presentation";

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
    },
  });

  if (!assessment?.companyId || !(await isCompanyRecruiter(user.id, assessment.companyId))) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Kandidatresultat</h1>
      <DiscResultPresentation
        title="DISC resultat"
        status={assessment.status}
        createdAt={assessment.createdAt}
        submittedAt={assessment.submittedAt}
        rawResponses={assessment.rawResponses}
        externalSessionId={assessment.externalSessionId}
        identityLabel={assessment.candidateName ?? assessment.candidateEmail ?? "Kandidat"}
        emptyMessage="Resultatdata mangler."
      />
    </div>
  );
}
