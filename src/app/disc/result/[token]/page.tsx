import Link from "next/link";
import { notFound } from "next/navigation";

import { DiscResultPresentation } from "@/components/disc/disc-result-presentation";
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
        <h1 className="text-2xl font-semibold tracking-tight">DISC result link expired</h1>
        <p className="text-sm text-muted-foreground">This result link has expired. Please request a new shared link from the company.</p>
      </div>
    );
  }

  const assessment = access.sharedResult.assessment;

  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Shared DISC result</h1>
        <p className="text-sm text-muted-foreground">This secure link gives view-only access to one completed DISC assessment.</p>
      </div>

      <div className="flex justify-end">
        <Link
          href={`/disc/result/${token}/pdf`}
          className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Download PDF
        </Link>
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
