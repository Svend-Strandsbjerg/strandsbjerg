import { notFound } from "next/navigation";

import { DiscResultPresentation } from "@/components/disc/disc-result-presentation";
import { prisma } from "@/lib/prisma";

type DiscResultSharePageProps = {
  params: Promise<{ token: string }>;
};

export const dynamic = "force-dynamic";

export default async function DiscResultSharePage({ params }: DiscResultSharePageProps) {
  const { token } = await params;

  const sharedResult = await prisma.assessmentResultShare.findUnique({
    where: { token },
    include: {
      assessment: true,
    },
  });

  if (!sharedResult) {
    notFound();
  }

  if (sharedResult.expiresAt && sharedResult.expiresAt.getTime() < Date.now()) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">DISC result link expired</h1>
        <p className="text-sm text-muted-foreground">This result link has expired. Please request a new shared link from the company.</p>
      </div>
    );
  }

  const assessment = sharedResult.assessment;

  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Shared DISC result</h1>
        <p className="text-sm text-muted-foreground">This secure link gives view-only access to one completed DISC assessment.</p>
      </div>

      <DiscResultPresentation
        title="DISC assessment report"
        status={assessment.status}
        createdAt={assessment.createdAt}
        submittedAt={assessment.submittedAt}
        rawResponses={assessment.rawResponses}
        externalSessionId={assessment.externalSessionId}
        identityLabel={assessment.candidateName ?? assessment.candidateEmail ?? undefined}
      />
    </div>
  );
}
